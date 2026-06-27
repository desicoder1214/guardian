import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import {
  ExecutionAuthorizationDecision,
  ExecutionAuthorizationEngine,
  ExecutionAuthorizationReason,
  InMemoryExecutionAuthorizationEngine,
  InMemoryExecutionAuthorizationProvider,
} from './execution-authorization';
import { SecurityEvaluationPipeline } from './security-evaluation-pipeline';
import {
  InMemorySecurityActionPlanner,
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPlanner,
  SecurityActionType,
} from './security-action-planner';
import { InMemorySecurityActionExecutorRegistry } from './security-executor-registry';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionState,
} from './security-execution-types';
import { SecurityDecisionModel } from './security-decision-types';
import { IncidentEscalationLevel } from './incident-severity-types';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from './security-policy-types';

export interface SecurityRuntimeResult {
  readonly decision: SecurityDecisionModel;
  readonly actionPlan: SecurityActionPlan;
  readonly executionResults: readonly ActionExecutionResult[];
  readonly correlationId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityRuntimeOrchestrator {
  orchestrate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult>;
}

export class InMemorySecurityRuntimeOrchestrator implements SecurityRuntimeOrchestrator {
  constructor(
    private readonly securityEvaluationPipeline: SecurityEvaluationPipeline,
    private readonly securityActionPlanner: SecurityActionPlanner = new InMemorySecurityActionPlanner(),
    private readonly executorRegistry: InMemorySecurityActionExecutorRegistry,
    private readonly authorizationEngine: ExecutionAuthorizationEngine = new InMemoryExecutionAuthorizationEngine(
      new InMemoryExecutionAuthorizationProvider(),
    ),
  ) {}

  async orchestrate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult> {
    const decision = await this.securityEvaluationPipeline.evaluate(normalizedEvent, actorId, actionType);
    const actionPlan = this.securityActionPlanner.plan(decision);
    const executionResults: ActionExecutionResult[] = [];

    for (const action of actionPlan.actions) {
      if (action.type === SecurityActionType.NONE) {
        continue;
      }

      const authorizationResult = this.authorizationEngine.authorize({
        action,
        actionPlan,
        runtimeDecision: decision,
        normalizedEvent,
        correlationId: decision.correlationId,
        guildId: decision.guildId,
        actorId: decision.actorId,
        metadata: {
          source: 'security-runtime-orchestrator',
        },
      });

      if (authorizationResult.decision === ExecutionAuthorizationDecision.DRY_RUN) {
        executionResults.push({
          success: true,
          state: ExecutionState.DRY_RUN,
          actionType: action.type,
          executorId: 'authorization-engine',
          metadata: {
            skipped: true,
            policyControlled: true,
            authorizationDecision: authorizationResult.decision,
            authorizationReason: authorizationResult.reason,
          },
        });
        continue;
      }

      if (authorizationResult.decision === ExecutionAuthorizationDecision.SKIP) {
        executionResults.push({
          success: true,
          state: ExecutionState.SKIPPED,
          actionType: action.type,
          executorId: 'authorization-engine',
          metadata: {
            skipped: true,
            policyControlled: true,
            authorizationDecision: authorizationResult.decision,
            authorizationReason: authorizationResult.reason,
          },
        });
        continue;
      }

      if (authorizationResult.decision === ExecutionAuthorizationDecision.DENY) {
        executionResults.push({
          success: true,
          state: ExecutionState.DENIED,
          actionType: action.type,
          executorId: 'authorization-engine',
          metadata: {
            denied: true,
            policyControlled: true,
            authorizationDecision: authorizationResult.decision,
            authorizationReason: authorizationResult.reason,
          },
        });
        continue;
      }

      if (authorizationResult.reason === ExecutionAuthorizationReason.UNSUPPORTED_ACTION) {
        executionResults.push({
          success: false,
          state: ExecutionState.SKIPPED,
          actionType: action.type,
          executorId: 'authorization-engine',
          metadata: {
            skipped: true,
            authorizationDecision: authorizationResult.decision,
            authorizationReason: authorizationResult.reason,
          },
        });
        continue;
      }

      const executors = [...this.executorRegistry.resolveAll(action.type)];
      if (executors.length === 0) {
        executionResults.push({
          success: false,
          state: ExecutionState.SKIPPED,
          actionType: action.type,
          executorId: 'unregistered-executor',
          metadata: {
            skipped: true,
            reason: `No executor registered for action type ${action.type}`,
          },
        });
        continue;
      }

      for (const executor of executors) {
        if (!executor.supports(action)) {
          executionResults.push({
            success: false,
            state: ExecutionState.SKIPPED,
            actionType: action.type,
            executorId: executor.executorId,
            metadata: {
              skipped: true,
              reason: `Executor ${executor.executorId} does not support action type ${action.type}`,
            },
          });
          continue;
        }

        try {
          const context = this.buildExecutionContext(decision, actionPlan, action, normalizedEvent);
          const executionResult = await executor.execute(context, action);
          executionResults.push({
            ...executionResult,
            state: executionResult.success ? ExecutionState.SUCCESS : ExecutionState.FAILED,
          });
        } catch (error) {
          executionResults.push({
            success: false,
            state: ExecutionState.FAILED,
            actionType: action.type,
            executorId: executor.executorId,
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown execution error',
              safelyHandled: true,
            },
          });
        }
      }
    }

    const immutableExecutionResults = Object.freeze(
      executionResults.map((executionResult) =>
        Object.freeze({
          ...executionResult,
          metadata: executionResult.metadata ? Object.freeze({ ...executionResult.metadata }) : undefined,
        }),
      ),
    );

    return Object.freeze({
      decision,
      actionPlan,
      executionResults: immutableExecutionResults,
      correlationId: decision.correlationId,
      metadata: Object.freeze({
        orchestrator: 'in-memory-security-runtime-orchestrator',
        eventName: normalizedEvent.eventName,
      }),
    });
  }

  private buildExecutionContext(
    decision: SecurityDecisionModel,
    actionPlan: SecurityActionPlan,
    action: SecurityAction,
    event: DiscordGatewayNormalizedEvent,
  ): ExecutionContext {
    return {
      correlationId: decision.correlationId,
      incidentId: `incident-${decision.correlationId}`,
      guildId: decision.guildId,
      actorId: decision.actorId,
      correlationIds: [event.correlationId, decision.correlationId],
      decision: decision.decision,
      actionPlan,
      severity: this.mapSeverity(decision.decision),
      timestamp: event.timestamp,
      executionId: `${decision.correlationId}:${action.type}`,
      metadata: {
        source: 'security-runtime-orchestrator',
        eventName: event.eventName,
      },
      executionState: ExecutionState.RUNNING,
    };
  }

  private mapSeverity(decision: SecurityDecision): IncidentEscalationLevel {
    switch (decision) {
      case SecurityDecision.BLOCK:
        return IncidentEscalationLevel.CRITICAL;
      case SecurityDecision.CONTAIN:
        return IncidentEscalationLevel.HIGH;
      case SecurityDecision.INVESTIGATE:
        return IncidentEscalationLevel.MEDIUM;
      case SecurityDecision.IGNORE:
        return IncidentEscalationLevel.LOW;
      case SecurityDecision.ALLOW:
      default:
        return IncidentEscalationLevel.NONE;
    }
  }
}
