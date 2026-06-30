import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import { ActionExecutionStatus } from '../../src/core/runtime/discord/security-action-dispatcher';
import { InMemorySecurityActionPlanner, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  AuthorizationEvaluationContext,
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutionAuthorizationEngine,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionDispatchResult,
  SecurityExecutionDispatcher,
  SecurityExecutionPlan,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import {
  InMemorySecurityExecutionOrchestrator,
  SecurityExecutionOrchestrationContext,
} from '../../src/core/runtime/discord/security-execution-orchestrator';
import {
  InMemorySecurityExecutorRegistry,
  SecurityExecutionProvider,
  SecurityExecutorRegistryRoutingContext,
  SecurityExecutorRegistryRoutingResult,
  SecurityExecutorResolutionReason,
} from '../../src/core/runtime/discord/executor-registry';
import { RuntimeThreatOverrideType } from '../../src/core/runtime/discord/runtime-threat-interpretation';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';

class StubProvider implements SecurityExecutionProvider {
  constructor(
    readonly providerId: string,
    readonly supportedActionTypes: readonly SecurityActionType[],
  ) {}

  supports(actionType: SecurityActionType): boolean {
    return this.supportedActionTypes.includes(actionType);
  }
}

class RouterActionExecutorStub implements SecurityActionExecutor {
  constructor(private readonly supportedType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedType;
  }

  async execute(action: import('../../src/core/runtime/discord/security-action-planner').SecurityAction, correlationId: string) {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'router-action-executor-stub' }),
    });
  }
}

class CountingDomainExecutor {
  readonly executorId = 'counting-domain-bot-executor';
  readonly domain = SecurityExecutorDomain.BOT;
  readonly supportedCapabilities = Object.freeze([SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]);
  prepareCalls = 0;

  supports(capability: SecurityExecutorCapability): boolean {
    return capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT;
  }

  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult {
    this.prepareCalls += 1;
    return Object.freeze({
      domain: request.domain,
      capability: request.capability,
      accepted: true,
      reason: 'INTENT_ACCEPTED',
      metadata: Object.freeze({ source: this.executorId }),
    });
  }
}

class CountingAuthorizationEngine implements SecurityExecutionAuthorizationEngine {
  calls = 0;

  constructor(private readonly inner: SecurityExecutionAuthorizationEngine) {}

  authorize(context: AuthorizationEvaluationContext): SecurityExecutionAuthorizationResult {
    this.calls += 1;
    return this.inner.authorize(context);
  }
}

class CountingExecutorRegistry extends InMemorySecurityExecutorRegistry {
  calls = 0;

  override route(context: SecurityExecutorRegistryRoutingContext): SecurityExecutorRegistryRoutingResult {
    this.calls += 1;
    return super.route(context);
  }
}

class CountingDispatcher implements SecurityExecutionDispatcher {
  calls = 0;

  constructor(private readonly inner: SecurityExecutionDispatcher) {}

  dispatch(routingResult: import('../../src/core/runtime/discord/security-execution-types').SecurityExecutionRoutingResult): SecurityExecutionDispatchResult {
    this.calls += 1;
    return this.inner.dispatch(routingResult);
  }
}

function buildExecutionPlan(decision: SecurityDecision): SecurityExecutionPlan {
  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();

  const decisionModel = Object.freeze({
    decision,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-orchestrator-1',
    guildId: 'guild-orchestrator-1',
    actionType: SecurityEventActionType.BOT_ADD,
    correlationId: 'corr-orchestrator-1',
    auditLogCorrelationId: 'audit-orchestrator-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: 'orchestrator foundation threat assessment',
        correlationIds: Object.freeze(['corr-orchestrator-1']),
        overrides: Object.freeze([
          Object.freeze({
            type: RuntimeThreatOverrideType.FORCE_BLOCK,
            applicableEventTypes: Object.freeze(['BOT_ADD']),
            reason: 'orchestrator foundation override',
          }),
        ]),
      }),
    }),
  });

  const actionPlan = actionPlanner.plan(decisionModel);
  return executionPlanner.plan(actionPlan, decisionModel);
}

function buildOrchestratorSetup(includeExecutors: boolean) {
  const executionPlan = buildExecutionPlan(SecurityDecision.BLOCK);

  const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
  const domainExecutorRegistry = new InMemorySecurityDomainExecutorRegistry();
  const countingDomainExecutor = new CountingDomainExecutor();

  if (includeExecutors) {
    actionExecutorRegistry.register(new RouterActionExecutorStub(SecurityActionType.REMOVE_UNAUTHORIZED_BOT));
    domainExecutorRegistry.register(countingDomainExecutor);
  }

  const countingAuthorization = new CountingAuthorizationEngine(
    new InMemorySecurityExecutionAuthorizationEngine(),
  );

  const countingExecutorRegistry = new CountingExecutorRegistry();
  if (includeExecutors) {
    countingExecutorRegistry.register(
      new StubProvider('provider-bot', Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT])),
    );
  }

  const dispatcher = new CountingDispatcher(
    new InMemorySecurityExecutionDispatcher(domainExecutorRegistry),
  );

  const orchestrator = new InMemorySecurityExecutionOrchestrator(
    new InMemorySecurityHotPathPlanner(),
    countingAuthorization,
    countingExecutorRegistry,
    new InMemorySecurityExecutionRouter(actionExecutorRegistry),
    dispatcher,
  );

  const context: SecurityExecutionOrchestrationContext = Object.freeze({
    executionPlan,
    metadata: Object.freeze({ source: 'security-execution-orchestrator-foundation-test' }),
  });

  return {
    orchestrator,
    context,
    countingAuthorization,
    countingExecutorRegistry,
    dispatcher,
    countingDomainExecutor,
  };
}

test('deterministic orchestration produces identical outputs for identical plans', () => {
  const first = buildOrchestratorSetup(true);
  const second = buildOrchestratorSetup(true);

  const firstResult = first.orchestrator.orchestrate(first.context);
  const secondResult = second.orchestrator.orchestrate(second.context);

  expect(firstResult).toEqual(secondResult);
});

test('orchestration result is immutable', () => {
  const setup = buildOrchestratorSetup(true);
  const result = setup.orchestrator.orchestrate(setup.context);

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.metadata)).toBe(true);
  expect(Object.isFrozen(result.dispatchResult.intents)).toBe(true);

  expect(() => {
    (result as { correlationId: string }).correlationId = 'mutated';
  }).toThrow(TypeError);
});

test('authorization, executor registry, and dispatcher are each invoked exactly once', () => {
  const setup = buildOrchestratorSetup(true);

  setup.orchestrator.orchestrate(setup.context);

  expect(setup.countingAuthorization.calls).toBe(1);
  expect(setup.countingExecutorRegistry.calls).toBe(1);
  expect(setup.dispatcher.calls).toBe(1);
});

test('correlationId and threat assessment are preserved end-to-end', () => {
  const setup = buildOrchestratorSetup(true);
  const result = setup.orchestrator.orchestrate(setup.context);

  expect(result.correlationId).toBe('corr-orchestrator-1');
  expect(result.authorizationResult.correlationId).toBe('corr-orchestrator-1');
  expect(result.routingResult.correlationId).toBe('corr-orchestrator-1');
  expect(result.dispatchResult.correlationId).toBe('corr-orchestrator-1');
  expect(result.threatAssessmentPreserved).toBe(true);
  expect(result.securityDecisionPreserved).toBe(true);
});

test('unsupported executors are handled deterministically', () => {
  const setup = buildOrchestratorSetup(false);
  const result = setup.orchestrator.orchestrate(setup.context);

  expect(result.executorRegistryResult.actionResolutions.some((resolution) => resolution.reason === SecurityExecutorResolutionReason.NO_PROVIDER_REGISTERED)).toBe(true);
  expect(result.routingResult.routes.some((route) => route.decision === 'SKIPPED')).toBe(true);
  expect(result.dispatchResult.intents.every((intent) => intent.executionResult?.accepted !== true)).toBe(true);
});

test('orchestration is idempotent and avoids duplicated execution preparation', () => {
  const setup = buildOrchestratorSetup(true);

  const first = setup.orchestrator.orchestrate(setup.context);
  const second = setup.orchestrator.orchestrate(setup.context);

  expect(second).toBe(first);
  expect(setup.countingAuthorization.calls).toBe(1);
  expect(setup.countingExecutorRegistry.calls).toBe(1);
  expect(setup.dispatcher.calls).toBe(1);
  expect(setup.countingDomainExecutor.prepareCalls).toBe(1);
});
