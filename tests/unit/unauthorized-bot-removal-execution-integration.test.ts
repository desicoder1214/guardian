import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';
import {
  DiscordBotRemovalOperation,
  DiscordExecutionStatus,
  ProductionDiscordExecutionService,
} from '../../src/core/runtime/discord/discord-execution-service';
import { ActionExecutionStatus } from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import { SecurityAction, SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { DiscordBotExecutor, SecurityBotExecutionStatus } from '../../src/core/runtime/discord/security-bot-executor';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  ExecutionAuthorizationRequirement,
  SecurityContainmentStrategy,
  SecurityExecutionPlan,
  SecurityExecutionRouteDecision,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityHotPathAction,
  SecurityHotPathExecutionLane,
  SecurityHotPathPlan,
  SecurityHotPathPriority,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';
import {
  InMemoryUnauthorizedBotRemovalExecutionIntegration,
} from '../../src/core/runtime/discord/security-unauthorized-bot-execution-integration';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { SecurityActionType as SecurityPolicyActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

class RouterActionExecutorStub implements SecurityActionExecutor {
  constructor(private readonly supportedType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedType;
  }

  async execute(action: SecurityAction, correlationId: string) {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'router-action-executor-stub' }),
    });
  }
}

function buildDecisionModel(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-bot',
    guildId: 'guild-bot',
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: 'corr-bot-e2e',
    auditLogCorrelationId: 'audit-bot-e2e',
    metadata: Object.freeze({ source: 'unauthorized-bot-removal-execution-integration-test' }),
  });
}

function buildAuthorizationRequirements(
  decision: SecurityDecision = SecurityDecision.BLOCK,
): readonly ExecutionAuthorizationRequirement[] {
  return Object.freeze([
    Object.freeze({
      actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      sequence: 1,
      requiresAuthorization: true,
      decision,
      correlationId: 'corr-bot-e2e',
    }),
  ]);
}

function buildExecutionPlan(
  requirementDecision: SecurityDecision = SecurityDecision.BLOCK,
): SecurityExecutionPlan {
  return Object.freeze({
    planId: 'execution-plan:corr-bot-e2e:BLOCK',
    correlationId: 'corr-bot-e2e',
    securityDecision: buildDecisionModel(),
    plannedActions: Object.freeze([
      Object.freeze({
        type: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        priority: SecurityActionPriority.CRITICAL,
        sequence: 1,
      }),
    ]),
    authorizationRequirements: buildAuthorizationRequirements(requirementDecision),
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner',
      planId: 'execution-plan:corr-bot-e2e:BLOCK',
      plannedActionCount: 1,
      plannedActionTypes: Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]),
    }),
    auditMetadata: Object.freeze({
      planId: 'execution-plan:corr-bot-e2e:BLOCK',
      correlationId: 'corr-bot-e2e',
      decision: SecurityDecision.BLOCK,
      decisionReason: SecurityDecisionReason.POLICY_ALLOW,
      threatDisposition: DetectionDisposition.MALICIOUS,
      threatSeverity: DetectionSeverity.CRITICAL,
      threatConfidence: DetectionConfidence.HIGH,
    }),
    rollbackMetadata: Object.freeze({
      supported: false,
      strategy: 'none',
      reason: 'no rollback in foundation',
    }),
  });
}

function buildHotPathPlan(): SecurityHotPathPlan {
  const botAction: SecurityHotPathAction = Object.freeze({
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    sequence: 1,
    priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
    lane: SecurityHotPathExecutionLane.IMMEDIATE,
    action: Object.freeze({
      type: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      priority: SecurityActionPriority.CRITICAL,
      sequence: 1,
    }),
    containmentTarget: Object.freeze({
      resourceType: SecurityResourceType.BOT,
      resourceId: 'bot-target-1',
      correlationId: 'corr-bot-e2e',
      metadata: Object.freeze({
        guildId: 'guild-bot',
        botUserId: 'bot-user-1',
      }),
    }),
    containmentStrategy: SecurityContainmentStrategy.REMOVE,
    authorizationRequirement: Object.freeze({
      actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      sequence: 1,
      requiresAuthorization: true,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-bot-e2e',
    }),
  });

  const nonIntegratedAction: SecurityHotPathAction = Object.freeze({
    actionType: SecurityActionType.FREEZE_WEBHOOKS,
    sequence: 2,
    priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
    lane: SecurityHotPathExecutionLane.IMMEDIATE,
    action: Object.freeze({
      type: SecurityActionType.FREEZE_WEBHOOKS,
      priority: SecurityActionPriority.HIGH,
      sequence: 2,
    }),
    containmentTarget: Object.freeze({
      resourceType: SecurityResourceType.WEBHOOK,
      resourceId: 'webhook-target-1',
      correlationId: 'corr-bot-e2e',
    }),
    containmentStrategy: SecurityContainmentStrategy.FREEZE,
  });

  return Object.freeze({
    planId: 'hot-path:execution-plan:corr-bot-e2e:BLOCK',
    executionPlanId: 'execution-plan:corr-bot-e2e:BLOCK',
    correlationId: 'corr-bot-e2e',
    securityDecision: buildDecisionModel(),
    actions: Object.freeze([botAction, nonIntegratedAction]),
    containmentPlan: Object.freeze({
      planId: 'containment:execution-plan:corr-bot-e2e:BLOCK',
      correlationId: 'corr-bot-e2e',
      actions: Object.freeze([
        Object.freeze({
          actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
          sequence: 1,
          strategy: SecurityContainmentStrategy.REMOVE,
          target: botAction.containmentTarget!,
        }),
      ]),
      metadata: Object.freeze({
        source: 'in-memory-security-hot-path-planner',
        targetCount: 1,
        strategyCount: 1,
      }),
    }),
    authorizationRequirements: buildAuthorizationRequirements(),
    metadata: Object.freeze({
      source: 'in-memory-security-hot-path-planner',
      immediateActionCount: 2,
      backgroundActionCount: 0,
    }),
  });
}

function buildIntegration(operation: DiscordBotRemovalOperation): InMemoryUnauthorizedBotRemovalExecutionIntegration {
  const productionService = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const botExecutor = new DiscordBotExecutor(productionService);

  const routerRegistry = new InMemorySecurityDomainExecutorRegistry();
  routerRegistry.register(botExecutor);

  const actionRegistry = new InMemorySecurityActionExecutorRegistry();
  actionRegistry.register(new RouterActionExecutorStub(SecurityActionType.REMOVE_UNAUTHORIZED_BOT));

  const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();
  const router = new InMemorySecurityExecutionRouter(actionRegistry);
  const dispatcher = new InMemorySecurityExecutionDispatcher(routerRegistry);

  return new InMemoryUnauthorizedBotRemovalExecutionIntegration(botExecutor, authorizationEngine, router, dispatcher);
}

test('end-to-end integration executes only unauthorized bot removal and preserves correlation', async () => {
  let operationCallCount = 0;
  const integration = buildIntegration({
    async removeUnauthorizedBot(request) {
      operationCallCount += 1;
      return Object.freeze({
        ok: true,
        statusCode: 204,
        metadata: Object.freeze({
          requestedGuildId: request.guildId,
          requestedBotUserId: request.botUserId,
        }),
      });
    },
  });

  const result = await integration.execute(
    Object.freeze({
      executionPlan: buildExecutionPlan(),
      hotPathPlan: buildHotPathPlan(),
    }),
  );

  expect(result.authorizationResult.decision).toBe('AUTHORIZED');
  expect(result.routingResult.routes.find((route) => route.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.decision).toBe(
    SecurityExecutionRouteDecision.EXECUTABLE,
  );
  expect(result.routingResult.routes.find((route) => route.actionType === SecurityActionType.FREEZE_WEBHOOKS)?.decision).toBe(
    SecurityExecutionRouteDecision.SKIPPED,
  );

  const botRecord = result.executionRecords.find((record) => record.result.capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);
  expect(botRecord?.result.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(botRecord?.result.correlationId).toBe('corr-bot-e2e');
  expect(botRecord?.result.metadata?.discordExecutionStatus).toBe(DiscordExecutionStatus.SUCCESS);
  expect(operationCallCount).toBe(1);
});

test('duplicate execution requests are suppressed end-to-end', async () => {
  let operationCallCount = 0;
  const integration = buildIntegration({
    async removeUnauthorizedBot() {
      operationCallCount += 1;
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  const context = Object.freeze({
    executionPlan: buildExecutionPlan(),
    hotPathPlan: buildHotPathPlan(),
  });

  const first = await integration.execute(context);
  const second = await integration.execute(context);

  const firstBotRecord = first.executionRecords.find((record) => record.result.capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);
  const secondBotRecord = second.executionRecords.find((record) => record.result.capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);

  expect(firstBotRecord?.result.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(secondBotRecord?.result.status).toBe(SecurityBotExecutionStatus.SKIPPED_DUPLICATE);
  expect(operationCallCount).toBe(1);
});

test('execution failure and rate-limit metadata propagate through integration', async () => {
  const integration = buildIntegration({
    async removeUnauthorizedBot() {
      return Object.freeze({
        ok: false,
        statusCode: 429,
        error: Object.freeze({ message: 'rate limit', retryable: true }),
        rateLimit: Object.freeze({ retryAfterMs: 500, bucketId: 'bucket-bot-1', global: false }),
      });
    },
  });

  const result = await integration.execute(
    Object.freeze({
      executionPlan: buildExecutionPlan(),
      hotPathPlan: buildHotPathPlan(),
    }),
  );

  const botRecord = result.executionRecords.find((record) => record.result.capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);

  expect(botRecord?.result.status).toBe(SecurityBotExecutionStatus.REJECTED);
  const metadata = botRecord?.result.metadata as { discordExecutionMetadata?: { rateLimit?: { retryAfterMs?: number }; error?: { code?: string } } };
  expect(metadata.discordExecutionMetadata?.rateLimit?.retryAfterMs).toBe(500);
  expect(metadata.discordExecutionMetadata?.error?.code).toBe('RATE_LIMITED');
});

test('authorization denial prevents execution call path', async () => {
  let operationCallCount = 0;
  const integration = buildIntegration({
    async removeUnauthorizedBot() {
      operationCallCount += 1;
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  const result = await integration.execute(
    Object.freeze({
      executionPlan: buildExecutionPlan(SecurityDecision.CONTAIN),
      hotPathPlan: buildHotPathPlan(),
    }),
  );

  expect(result.authorizationResult.decision).toBe('DENIED');
  expect(result.executionRecords.every((record) => record.result.status === SecurityBotExecutionStatus.REJECTED)).toBe(true);
  expect(operationCallCount).toBe(0);
});

test('integration results are immutable', async () => {
  const integration = buildIntegration({
    async removeUnauthorizedBot() {
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  const result = await integration.execute(
    Object.freeze({
      executionPlan: buildExecutionPlan(),
      hotPathPlan: buildHotPathPlan(),
    }),
  );

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.executionRecords)).toBe(true);
  expect(Object.isFrozen(result.executionRecords[0].result)).toBe(true);

  expect(() => {
    (result as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);
});
