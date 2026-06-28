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
import {
  SecurityRuntimeExecutionAdapter,
  UnauthorizedBotAddFastPathExecutionAdapter,
} from './unauthorized-bot-fast-path-adapter';

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
    private readonly executionAdapter: SecurityRuntimeExecutionAdapter = new UnauthorizedBotAddFastPathExecutionAdapter(),
  ) {}

  async orchestrate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult> {
    const decision = await this.securityEvaluationPipeline.evaluate(normalizedEvent, actorId, actionType);
    const actionPlan = this.securityActionPlanner.plan(decision);
    const executionResults: ActionExecutionResult[] = [];

    const partition = this.executionAdapter.partition(decision, actionPlan, actionType);
    const immediateResults = await this.executeActions(
      partition.immediateActions,
      decision,
      actionPlan,
      normalizedEvent,
      actionType,
    );
    executionResults.push(...immediateResults);

    const deferredResults = await Promise.all(
      partition.deferredActions.map((action) =>
        this.executeSingleAction(action, decision, actionPlan, normalizedEvent, actionType),
      ),
    );
    executionResults.push(...deferredResults);

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
        ...(partition.metadata ?? {}),
      }),
    });
  }

  private async executeActions(
    actions: readonly SecurityAction[],
    decision: SecurityDecisionModel,
    actionPlan: SecurityActionPlan,
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: SecurityPolicyActionType,
  ): Promise<readonly ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      if (action.type === SecurityActionType.NONE) {
        continue;
      }

      results.push(await this.executeSingleAction(action, decision, actionPlan, normalizedEvent, actionType));
    }

    return Object.freeze(results);
  }

  private async executeSingleAction(
    action: SecurityAction,
    decision: SecurityDecisionModel,
    actionPlan: SecurityActionPlan,
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: SecurityPolicyActionType,
  ): Promise<ActionExecutionResult> {
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
        actionType,
      },
    });

    if (authorizationResult.decision === ExecutionAuthorizationDecision.DRY_RUN) {
      return Object.freeze({
        success: true,
        state: ExecutionState.DRY_RUN,
        actionType: action.type,
        executorId: 'authorization-engine',
        metadata: Object.freeze({
          skipped: true,
          policyControlled: true,
          authorizationDecision: authorizationResult.decision,
          authorizationReason: authorizationResult.reason,
        }),
      });
    }

    if (authorizationResult.decision === ExecutionAuthorizationDecision.SKIP) {
      return Object.freeze({
        success: true,
        state: ExecutionState.SKIPPED,
        actionType: action.type,
        executorId: 'authorization-engine',
        metadata: Object.freeze({
          skipped: true,
          policyControlled: true,
          authorizationDecision: authorizationResult.decision,
          authorizationReason: authorizationResult.reason,
        }),
      });
    }

    if (authorizationResult.decision === ExecutionAuthorizationDecision.DENY) {
      return Object.freeze({
        success: true,
        state: ExecutionState.DENIED,
        actionType: action.type,
        executorId: 'authorization-engine',
        metadata: Object.freeze({
          denied: true,
          policyControlled: true,
          authorizationDecision: authorizationResult.decision,
          authorizationReason: authorizationResult.reason,
        }),
      });
    }

    if (authorizationResult.reason === ExecutionAuthorizationReason.UNSUPPORTED_ACTION) {
      return Object.freeze({
        success: false,
        state: ExecutionState.SKIPPED,
        actionType: action.type,
        executorId: 'authorization-engine',
        metadata: Object.freeze({
          skipped: true,
          authorizationDecision: authorizationResult.decision,
          authorizationReason: authorizationResult.reason,
        }),
      });
    }

    const executors = [...this.executorRegistry.resolveAll(action.type)];
    if (executors.length === 0) {
      return Object.freeze({
        success: false,
        state: ExecutionState.SKIPPED,
        actionType: action.type,
        executorId: 'unregistered-executor',
        metadata: Object.freeze({
          skipped: true,
          reason: `No executor registered for action type ${action.type}`,
        }),
      });
    }

    for (const executor of executors) {
      if (!executor.supports(action)) {
        return Object.freeze({
          success: false,
          state: ExecutionState.SKIPPED,
          actionType: action.type,
          executorId: executor.executorId,
          metadata: Object.freeze({
            skipped: true,
            reason: `Executor ${executor.executorId} does not support action type ${action.type}`,
          }),
        });
      }

      try {
        const context = this.buildExecutionContext(decision, actionPlan, action, normalizedEvent);
        const executionResult = await executor.execute(context, action);
        return Object.freeze({
          ...executionResult,
          state: executionResult.success ? ExecutionState.SUCCESS : ExecutionState.FAILED,
          metadata: executionResult.metadata ? Object.freeze({ ...executionResult.metadata }) : undefined,
        });
      } catch (error) {
        return Object.freeze({
          success: false,
          state: ExecutionState.FAILED,
          actionType: action.type,
          executorId: executor.executorId,
          metadata: Object.freeze({
            error: error instanceof Error ? error.message : 'Unknown execution error',
            safelyHandled: true,
          }),
        });
      }
    }

    return Object.freeze({
      success: false,
      state: ExecutionState.SKIPPED,
      actionType: action.type,
      executorId: 'unreachable-executor',
      metadata: Object.freeze({ skipped: true, reason: 'No execution result resolved' }),
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
