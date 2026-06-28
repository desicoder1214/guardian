import {
  AuthorizationEvaluationContext,
  SecurityExecutionAuthorizationEngine,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionDispatcher,
  SecurityExecutionDispatchResult,
  SecurityExecutionPlan,
  SecurityExecutionRouter,
  SecurityExecutionRoutingResult,
  SecurityHotPathPlan,
  SecurityHotPathPlanner,
} from './security-execution-types';
import { InMemorySecurityExecutionAuthorizationEngine } from './security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from './security-execution-dispatcher';
import { InMemorySecurityHotPathPlanner } from './security-hot-path-planner';
import { InMemorySecurityExecutionRouter } from './security-execution-router';
import {
  InMemorySecurityExecutorRegistry,
  SecurityExecutorRegistryRoutingResult,
} from './executor-registry';
import {
  CoordinatedContainmentExecutionDependencies,
  CoordinatedContainmentExecutionResult,
  InMemoryCoordinatedContainmentExecution,
} from './coordinated-containment-execution';

export {
  CoordinatedContainmentActionStatus,
} from './coordinated-containment-execution';
export type {
  CoordinatedContainmentActionResult,
  CoordinatedContainmentExecutionResult,
  CoordinatedContainmentExecutionDependencies,
} from './coordinated-containment-execution';

export interface SecurityExecutionOrchestrationContext {
  readonly executionPlan: SecurityExecutionPlan;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionOrchestrationResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly securityDecisionPreserved: boolean;
  readonly threatAssessmentPreserved: boolean;
  readonly hotPathPlan: SecurityHotPathPlan;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
  readonly executorRegistryResult: SecurityExecutorRegistryRoutingResult;
  readonly routingResult: SecurityExecutionRoutingResult;
  readonly dispatchResult: SecurityExecutionDispatchResult;
  readonly metadata: {
    readonly source: 'in-memory-security-execution-orchestrator';
    readonly idempotencyKey: string;
    readonly idempotentReplay: boolean;
  };
}

export interface SecurityExecutionOrchestrator {
  orchestrate(context: SecurityExecutionOrchestrationContext): SecurityExecutionOrchestrationResult;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function toIdempotencyKey(executionPlan: SecurityExecutionPlan): string {
  return `${executionPlan.planId}:${executionPlan.correlationId}`;
}

function freezeResult(
  result: Omit<SecurityExecutionOrchestrationResult, 'metadata'>,
  idempotencyKey: string,
  idempotentReplay: boolean,
): SecurityExecutionOrchestrationResult {
  return Object.freeze({
    planId: result.planId,
    executionPlanId: result.executionPlanId,
    correlationId: result.correlationId,
    securityDecisionPreserved: result.securityDecisionPreserved,
    threatAssessmentPreserved: result.threatAssessmentPreserved,
    hotPathPlan: result.hotPathPlan,
    authorizationResult: result.authorizationResult,
    executorRegistryResult: result.executorRegistryResult,
    routingResult: result.routingResult,
    dispatchResult: result.dispatchResult,
    metadata: Object.freeze({
      source: 'in-memory-security-execution-orchestrator',
      idempotencyKey,
      idempotentReplay,
    }),
  });
}

export class InMemorySecurityExecutionOrchestrator implements SecurityExecutionOrchestrator {
  private readonly completedByKey = new Map<string, SecurityExecutionOrchestrationResult>();
  private readonly coordinatedContainmentExecution = new InMemoryCoordinatedContainmentExecution();

  constructor(
    private readonly hotPathPlanner: SecurityHotPathPlanner = new InMemorySecurityHotPathPlanner(),
    private readonly authorizationEngine: SecurityExecutionAuthorizationEngine =
      new InMemorySecurityExecutionAuthorizationEngine(),
    private readonly executorRegistry: InMemorySecurityExecutorRegistry = new InMemorySecurityExecutorRegistry(),
    private readonly executionRouter: SecurityExecutionRouter = new InMemorySecurityExecutionRouter(),
    private readonly executionDispatcher: SecurityExecutionDispatcher = new InMemorySecurityExecutionDispatcher(),
  ) {}

  orchestrate(context: SecurityExecutionOrchestrationContext): SecurityExecutionOrchestrationResult {
    const key = toIdempotencyKey(context.executionPlan);
    const cached = this.completedByKey.get(key);
    if (cached) {
      return cached;
    }

    const hotPathPlan = this.hotPathPlanner.plan(context.executionPlan);
    const authorizationResult = this.authorizationEngine.authorize(
      Object.freeze({
        executionPlan: context.executionPlan,
        metadata: freezeMetadata(context.metadata),
      }) as AuthorizationEvaluationContext,
    );

    const executorRegistryResult = this.executorRegistry.route(
      Object.freeze({
        executionPlan: context.executionPlan,
        hotPathPlan,
        authorizationResult,
      }),
    );

    const routingResult = this.executionRouter.route(
      Object.freeze({
        hotPathPlan,
        authorizationResult,
        metadata: freezeMetadata(context.metadata),
      }),
    );

    const dispatchResult = this.executionDispatcher.dispatch(routingResult);

    const created = freezeResult(
      {
        planId: hotPathPlan.planId,
        executionPlanId: context.executionPlan.planId,
        correlationId: context.executionPlan.correlationId,
        securityDecisionPreserved:
          context.executionPlan.securityDecision.decision === hotPathPlan.securityDecision.decision,
        threatAssessmentPreserved:
          context.executionPlan.threatAssessment?.rationale === hotPathPlan.threatAssessment?.rationale,
        hotPathPlan,
        authorizationResult,
        executorRegistryResult,
        routingResult,
        dispatchResult,
      },
      key,
      false,
    );

    this.completedByKey.set(key, created);
    return created;
  }

  async executeCoordinatedContainment(
    context: SecurityExecutionOrchestrationContext,
    dependencies: CoordinatedContainmentExecutionDependencies,
  ): Promise<CoordinatedContainmentExecutionResult> {
    const orchestration = this.orchestrate(context);
    return this.coordinatedContainmentExecution.execute(orchestration, dependencies);
  }
}
