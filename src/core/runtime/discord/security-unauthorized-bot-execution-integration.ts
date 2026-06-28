import { SecurityBotExecutionResult, SecurityBotExecutionStatus } from './security-bot-executor';
import { SecurityBotExecutor } from './security-action-executor';
import {
  AuthorizationEvaluationContext,
  SecurityDomainExecutionRequest,
  SecurityExecutionAuthorizationEngine,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionDispatcher,
  SecurityExecutionDispatchResult,
  SecurityExecutionPlan,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouter,
  SecurityExecutionRoutingResult,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityHotPathPlan,
} from './security-execution-types';
import { InMemorySecurityExecutionAuthorizationEngine } from './security-execution-authorization-engine';
import { InMemorySecurityExecutionRouter } from './security-execution-router';
import { InMemorySecurityExecutionDispatcher } from './security-execution-dispatcher';

export interface UnauthorizedBotRemovalExecutionRecord {
  readonly routeId: string;
  readonly correlationId: string;
  readonly executed: boolean;
  readonly result: SecurityBotExecutionResult;
}

export interface UnauthorizedBotRemovalExecutionIntegrationResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
  readonly routingResult: SecurityExecutionRoutingResult;
  readonly dispatchResult: SecurityExecutionDispatchResult;
  readonly executionRecords: readonly UnauthorizedBotRemovalExecutionRecord[];
  readonly metadata: {
    readonly source: 'in-memory-unauthorized-bot-removal-execution-integration';
    readonly executedCount: number;
    readonly skippedCount: number;
    readonly rejectedCount: number;
  };
}

export interface UnauthorizedBotRemovalExecutionIntegrationContext {
  readonly executionPlan: SecurityExecutionPlan;
  readonly hotPathPlan: SecurityHotPathPlan;
  readonly metadata?: Record<string, unknown>;
}

interface ExecutableSecurityBotExecutor extends SecurityBotExecutor {
  execute(request: SecurityDomainExecutionRequest): SecurityBotExecutionResult | Promise<SecurityBotExecutionResult>;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeBotExecutionResult(result: SecurityBotExecutionResult): SecurityBotExecutionResult {
  return Object.freeze({
    status: result.status,
    domain: result.domain,
    capability: result.capability,
    correlationId: result.correlationId,
    planId: result.planId,
    executionPlanId: result.executionPlanId,
    metadata: freezeMetadata(result.metadata),
  });
}

function freezeExecutionRecord(record: UnauthorizedBotRemovalExecutionRecord): UnauthorizedBotRemovalExecutionRecord {
  return Object.freeze({
    routeId: record.routeId,
    correlationId: record.correlationId,
    executed: record.executed,
    result: freezeBotExecutionResult(record.result),
  });
}

function rejectedResult(
  routeId: string,
  correlationId: string,
  planId: string,
  executionPlanId: string,
  reason: string,
): UnauthorizedBotRemovalExecutionRecord {
  return freezeExecutionRecord({
    routeId,
    correlationId,
    executed: false,
    result: Object.freeze({
      status: SecurityBotExecutionStatus.REJECTED,
      domain: SecurityExecutorDomain.BOT,
      capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      correlationId,
      planId,
      executionPlanId,
      metadata: Object.freeze({ reason }),
    }),
  });
}

export class InMemoryUnauthorizedBotRemovalExecutionIntegration {
  constructor(
    private readonly botExecutor: ExecutableSecurityBotExecutor,
    private readonly authorizationEngine: SecurityExecutionAuthorizationEngine =
      new InMemorySecurityExecutionAuthorizationEngine(),
    private readonly executionRouter: SecurityExecutionRouter = new InMemorySecurityExecutionRouter(),
    private readonly executionDispatcher: SecurityExecutionDispatcher = new InMemorySecurityExecutionDispatcher(),
  ) {}

  async execute(
    context: UnauthorizedBotRemovalExecutionIntegrationContext,
  ): Promise<UnauthorizedBotRemovalExecutionIntegrationResult> {
    const authorizationResult = this.authorizationEngine.authorize(
      Object.freeze({
        executionPlan: context.executionPlan,
        metadata: context.metadata,
      }) as AuthorizationEvaluationContext,
    );

    const routingResult = this.executionRouter.route(
      Object.freeze({
        hotPathPlan: context.hotPathPlan,
        authorizationResult,
        metadata: context.metadata,
      }),
    );

    const dispatchResult = this.executionDispatcher.dispatch(routingResult);

    const executionRecords: UnauthorizedBotRemovalExecutionRecord[] = [];

    for (const intent of dispatchResult.intents) {
      if (intent.dispatchDecision !== SecurityExecutionRouteDecision.EXECUTABLE) {
        executionRecords.push(
          rejectedResult(
            intent.route.routeId,
            intent.route.correlationId,
            context.hotPathPlan.planId,
            context.hotPathPlan.executionPlanId,
            'intent-not-executable',
          ),
        );
        continue;
      }

      if (
        intent.targetedDomain !== this.botExecutor.domain ||
        intent.targetedCapability === undefined ||
        !this.botExecutor.supports(intent.targetedCapability)
      ) {
        executionRecords.push(
          rejectedResult(
            intent.route.routeId,
            intent.route.correlationId,
            context.hotPathPlan.planId,
            context.hotPathPlan.executionPlanId,
            'non-bot-capability-not-integrated',
          ),
        );
        continue;
      }

      if (!intent.executionRequest) {
        executionRecords.push(
          rejectedResult(
            intent.route.routeId,
            intent.route.correlationId,
            context.hotPathPlan.planId,
            context.hotPathPlan.executionPlanId,
            'missing-execution-request',
          ),
        );
        continue;
      }

      const executionResult = await this.botExecutor.execute(intent.executionRequest);
      executionRecords.push(
        freezeExecutionRecord({
          routeId: intent.route.routeId,
          correlationId: intent.route.correlationId,
          executed: executionResult.status !== SecurityBotExecutionStatus.REJECTED,
          result: executionResult,
        }),
      );
    }

    const immutableExecutionRecords = Object.freeze(executionRecords.map((record) => freezeExecutionRecord(record)));

    const executedCount = immutableExecutionRecords.filter((record) => record.executed).length;
    const skippedCount = immutableExecutionRecords.filter(
      (record) => record.result.status === SecurityBotExecutionStatus.SKIPPED_DUPLICATE,
    ).length;
    const rejectedCount = immutableExecutionRecords.filter(
      (record) => record.result.status === SecurityBotExecutionStatus.REJECTED,
    ).length;

    return Object.freeze({
      planId: context.hotPathPlan.planId,
      executionPlanId: context.hotPathPlan.executionPlanId,
      correlationId: context.hotPathPlan.correlationId,
      authorizationResult,
      routingResult,
      dispatchResult,
      executionRecords: immutableExecutionRecords,
      metadata: Object.freeze({
        source: 'in-memory-unauthorized-bot-removal-execution-integration',
        executedCount,
        skippedCount,
        rejectedCount,
      }),
    });
  }
}
