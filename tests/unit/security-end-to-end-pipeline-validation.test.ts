import fs from 'node:fs';
import path from 'node:path';
import {
  AuditActionType,
  AuditLogEntry,
} from '../../src/core/runtime/discord/audit-attribution-types';
import { InMemoryAuditAttributionEngine } from '../../src/core/runtime/discord/audit-attribution-engine';
import { InMemoryAuditLogProvider } from '../../src/core/runtime/discord/audit-log-provider';
import {
  DetectionContext,
  InMemoryDetectionEngine,
} from '../../src/core/runtime/discord/detection-engine';
import {
  DiscordBotRemovalOperation,
  DiscordExecutionStatus,
  DiscordExecutionErrorCode,
  ProductionDiscordExecutionService,
} from '../../src/core/runtime/discord/discord-execution-service';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import {
  ActionExecutionStatus,
  ActionExecutionResult,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import {
  InMemorySecurityActionPlanner,
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { DiscordBotExecutor, SecurityBotExecutionStatus } from '../../src/core/runtime/discord/security-bot-executor';
import { InMemorySecurityDecisionEngine } from '../../src/core/runtime/discord/security-decision-engine';
import { InMemorySecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  SecurityDomainExecutionRequest,
  SecurityExecutionRouteDecision,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemorySecurityPolicyEngine } from '../../src/core/runtime/discord/policy-engine';
import { InMemorySecurityContextBuilder } from '../../src/core/runtime/discord/security-context';
import { InMemorySecurityPolicyProvider } from '../../src/core/runtime/discord/security-policy-provider';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from '../../src/core/runtime/discord/security-policy-types';
import { Clock, InMemoryThresholdTracker } from '../../src/core/runtime/discord/threshold-tracker';
import { UnauthorizedBotAddDetector } from '../../src/core/runtime/discord/unauthorized-bot-add-detector';

class FixedClock implements Clock {
  constructor(private readonly currentMs: number) {}

  now(): number {
    return this.currentMs;
  }
}

class StubRouterActionExecutor implements SecurityActionExecutor {
  constructor(private readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'stub-router-action-executor' }),
    });
  }
}

function buildNormalizedEvent(): DiscordGatewayNormalizedEvent {
  return Object.freeze({
    eventName: 'BOT_ADD',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-e2e-1',
    payload: Object.freeze({
      guildId: 'guild-e2e-1',
      actorId: 'actor-e2e-1',
      botId: 'bot-e2e-1',
      targetId: 'bot-e2e-1',
      resourceId: 'bot-e2e-1',
    }),
  });
}

function buildDetectionContext(normalizedEvent: DiscordGatewayNormalizedEvent): DetectionContext {
  return Object.freeze({
    normalizedEvent,
    actorId: 'actor-e2e-1',
    guildId: 'guild-e2e-1',
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: 'corr-e2e-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    metadata: Object.freeze({
      authorizedBotIds: Object.freeze([]),
      trustedBotIds: Object.freeze([]),
    }),
  });
}

function buildAuditEntry(): AuditLogEntry {
  return Object.freeze({
    id: 'audit-entry-e2e-1',
    guildId: 'guild-e2e-1',
    actorId: 'actor-e2e-1',
    actionType: AuditActionType.BOT_ADD,
    targetId: 'bot-e2e-1',
    resourceId: 'bot-e2e-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    metadata: Object.freeze({ source: 'e2e-pipeline-test' }),
  });
}

function createPipelineHarness(operation: DiscordBotRemovalOperation) {
  const fixedNow = Date.parse('2026-01-01T00:00:01.000Z');
  const clock = new FixedClock(fixedNow);

  const detectorRegistry = new InMemoryDetectorPluginRegistry();
  detectorRegistry.register(new UnauthorizedBotAddDetector());
  const detectionEngine = new InMemoryDetectionEngine(detectorRegistry);

  const auditLogProvider = new InMemoryAuditLogProvider(clock);
  auditLogProvider.record(buildAuditEntry());
  const attributionEngine = new InMemoryAuditAttributionEngine(auditLogProvider, 10_000);

  const policyProvider = new InMemorySecurityPolicyProvider();
  policyProvider.setPolicy(
    'guild-e2e-1',
    Object.freeze({
      guildId: 'guild-e2e-1',
      rules: Object.freeze([
        Object.freeze({
          actionType: SecurityPolicyActionType.BOT_ADD,
          enabled: true,
          threshold: 0,
          windowMs: 60_000,
          decisionOnViolation: SecurityDecision.BLOCK,
        }),
      ]),
      trustedUserIds: Object.freeze([]),
    }),
  );

  const thresholdTracker = new InMemoryThresholdTracker(clock);
  const policyEngine = new InMemorySecurityPolicyEngine(policyProvider, thresholdTracker);
  const decisionEngine = new InMemorySecurityDecisionEngine();
  const contextBuilder = new InMemorySecurityContextBuilder();
  const evaluationPipeline = new InMemorySecurityEvaluationPipeline(
    contextBuilder,
    attributionEngine,
    policyEngine,
    decisionEngine,
  );

  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const hotPathPlanner = new InMemorySecurityHotPathPlanner();
  const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();

  const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
  actionExecutorRegistry.register(new StubRouterActionExecutor(SecurityActionType.REMOVE_UNAUTHORIZED_BOT));

  const productionService = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const botExecutor = new DiscordBotExecutor(productionService);

  const domainExecutorRegistry = new InMemorySecurityDomainExecutorRegistry();
  domainExecutorRegistry.register(botExecutor);

  const executionRouter = new InMemorySecurityExecutionRouter(actionExecutorRegistry);
  const executionDispatcher = new InMemorySecurityExecutionDispatcher(domainExecutorRegistry);

  return {
    detectionEngine,
    evaluationPipeline,
    actionPlanner,
    executionPlanner,
    hotPathPlanner,
    authorizationEngine,
    executionRouter,
    executionDispatcher,
    botExecutor,
    productionService,
  };
}

async function runInMemoryPipeline(operation: DiscordBotRemovalOperation) {
  const harness = createPipelineHarness(operation);
  const normalizedEvent = buildNormalizedEvent();
  const detectionContext = buildDetectionContext(normalizedEvent);

  const detectionResults = await harness.detectionEngine.evaluate(detectionContext);
  harness.evaluationPipeline.stageDetectionResults(detectionResults);

  const securityDecision = await harness.evaluationPipeline.evaluate(
    normalizedEvent,
    detectionContext.actorId,
    detectionContext.actionType,
  );

  const threatAssessment =
    (securityDecision.metadata as { threatAssessment?: unknown } | undefined)?.threatAssessment;
  const actionPlan = harness.actionPlanner.plan(securityDecision);
  const executionPlan = harness.executionPlanner.plan(actionPlan, securityDecision);
  const hotPathPlan = harness.hotPathPlanner.plan(executionPlan);
  const authorizationResult = harness.authorizationEngine.authorize(
    Object.freeze({ executionPlan }),
  );
  const routingResult = harness.executionRouter.route(
    Object.freeze({
      hotPathPlan,
      authorizationResult,
    }),
  );
  const dispatchResult = harness.executionDispatcher.dispatch(routingResult);

  return {
    harness,
    detectionResults,
    threatAssessment,
    securityDecision,
    actionPlan,
    executionPlan,
    hotPathPlan,
    authorizationResult,
    routingResult,
    dispatchResult,
  };
}

function readSource(fileName: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../../src/core/runtime/discord/${fileName}`), 'utf8');
}

test('end-to-end in-memory pipeline preserves correlation, threat assessment, and decision through planning stages', async () => {
  const pipeline = await runInMemoryPipeline({
    async removeUnauthorizedBot() {
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  expect(pipeline.detectionResults).toHaveLength(1);
  expect(pipeline.detectionResults[0].correlationId).toBe('corr-e2e-1');
  expect(Object.isFrozen(pipeline.detectionResults[0])).toBe(true);

  expect(pipeline.threatAssessment).toBeDefined();
  expect(pipeline.securityDecision.correlationId).toBe('corr-e2e-1');
  expect(pipeline.actionPlan.correlationId).toBe('corr-e2e-1');
  expect(pipeline.executionPlan.correlationId).toBe('corr-e2e-1');
  expect(pipeline.hotPathPlan.correlationId).toBe('corr-e2e-1');
  expect(pipeline.authorizationResult.correlationId).toBe('corr-e2e-1');
  expect(pipeline.routingResult.correlationId).toBe('corr-e2e-1');
  expect(pipeline.dispatchResult.correlationId).toBe('corr-e2e-1');

  expect(pipeline.actionPlan.metadata?.threatAssessment).toEqual(pipeline.threatAssessment);
  expect(pipeline.executionPlan.threatAssessment).toEqual(pipeline.threatAssessment);
  expect(pipeline.hotPathPlan.threatAssessment).toEqual(pipeline.threatAssessment);
  expect(pipeline.authorizationResult.threatAssessment).toEqual(pipeline.threatAssessment);

  expect(pipeline.securityDecision.decision).toBe(SecurityDecision.BLOCK);
  expect(pipeline.actionPlan.decision).toBe(SecurityDecision.BLOCK);
  expect(pipeline.executionPlan.securityDecision.decision).toBe(SecurityDecision.BLOCK);
  expect(pipeline.hotPathPlan.securityDecision.decision).toBe(SecurityDecision.BLOCK);

  expect(Object.isFrozen(pipeline.actionPlan)).toBe(true);
  expect(Object.isFrozen(pipeline.executionPlan)).toBe(true);
  expect(Object.isFrozen(pipeline.hotPathPlan)).toBe(true);
  expect(Object.isFrozen(pipeline.authorizationResult)).toBe(true);
  expect(Object.isFrozen(pipeline.routingResult)).toBe(true);
  expect(Object.isFrozen(pipeline.dispatchResult)).toBe(true);

  expect(pipeline.hotPathPlan.actions.map((action) => action.actionType)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);

  expect(pipeline.authorizationResult.metadata).toEqual({
    source: 'in-memory-security-execution-authorization-engine',
  });
  expect(pipeline.routingResult.authorizationResult.metadata).toEqual({
    source: 'in-memory-security-execution-authorization-engine',
  });
  expect(pipeline.routingResult.routes.every((route) => route.authorizationResult.correlationId === 'corr-e2e-1')).toBe(true);
});

test('pipeline outputs are deterministic for identical inputs', async () => {
  const first = await runInMemoryPipeline({
    async removeUnauthorizedBot() {
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  const second = await runInMemoryPipeline({
    async removeUnauthorizedBot() {
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  expect(first.securityDecision).toEqual(second.securityDecision);
  expect(first.actionPlan).toEqual(second.actionPlan);
  expect(first.executionPlan).toEqual(second.executionPlan);
  expect(first.hotPathPlan).toEqual(second.hotPathPlan);
  expect(first.authorizationResult).toEqual(second.authorizationResult);
  expect(first.routingResult).toEqual(second.routingResult);
  expect(first.dispatchResult).toEqual(second.dispatchResult);
});

test('dispatcher executable intent can be executed through bot executor and production service with mocked operation', async () => {
  const calls: Array<{ correlationId: string; guildId: string; botUserId: string }> = [];
  const pipeline = await runInMemoryPipeline({
    async removeUnauthorizedBot(request) {
      calls.push({
        correlationId: request.correlationId,
        guildId: request.guildId,
        botUserId: request.botUserId,
      });
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  });

  const executableBotIntent = pipeline.dispatchResult.intents.find(
    (intent) =>
      intent.dispatchDecision === SecurityExecutionRouteDecision.EXECUTABLE &&
      intent.executionRequest !== undefined &&
      intent.targetedCapability === 'REMOVE_UNAUTHORIZED_BOT',
  );

  expect(executableBotIntent).toBeDefined();

  const baseRequest = executableBotIntent?.executionRequest as SecurityDomainExecutionRequest;
  expect(baseRequest.metadata?.threatAssessment).toBeDefined();
  expect(baseRequest.metadata?.securityDecision).toBeDefined();
  const executionRequest = Object.freeze({
    ...baseRequest,
    metadata: Object.freeze({
      ...(baseRequest.metadata ?? {}),
      guildId: 'guild-e2e-1',
      botUserId: 'bot-e2e-1',
    }),
  });

  const executionResult = await pipeline.harness.botExecutor.execute(executionRequest);

  expect(executionResult.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(executionResult.correlationId).toBe('corr-e2e-1');
  expect(calls).toEqual([
    {
      correlationId: 'corr-e2e-1',
      guildId: 'guild-e2e-1',
      botUserId: 'bot-e2e-1',
    },
  ]);
  expect(Object.isFrozen(executionResult)).toBe(true);
});

test('production execution service preserves idempotency, retry metadata, and unsupported operation semantics', async () => {
  let successCallCount = 0;
  const successService = new ProductionDiscordExecutionService(
    {
      async removeUnauthorizedBot() {
        successCallCount += 1;
        return Object.freeze({ ok: true, statusCode: 204 });
      },
    },
    { maxAttempts: 2 },
  );

  const first = await successService.bot.removeUnauthorizedBot({
    correlationId: 'corr-idem-1',
    guildId: 'guild-e2e-1',
    botUserId: 'bot-e2e-1',
    idempotencyKey: 'idem-e2e-1',
  });
  const second = await successService.bot.removeUnauthorizedBot({
    correlationId: 'corr-idem-1',
    guildId: 'guild-e2e-1',
    botUserId: 'bot-e2e-1',
    idempotencyKey: 'idem-e2e-1',
  });

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(successCallCount).toBe(1);

  let retryCallCount = 0;
  const retryService = new ProductionDiscordExecutionService(
    {
      async removeUnauthorizedBot() {
        retryCallCount += 1;
        return Object.freeze({
          ok: false,
          statusCode: 429,
          error: Object.freeze({ message: 'rate-limited', retryable: true }),
          rateLimit: Object.freeze({ retryAfterMs: 250, bucketId: 'bucket-e2e', global: false }),
        });
      },
    },
    { maxAttempts: 2 },
  );

  const retried = await retryService.bot.removeUnauthorizedBot({
    correlationId: 'corr-retry-1',
    guildId: 'guild-e2e-1',
    botUserId: 'bot-e2e-1',
    idempotencyKey: 'idem-retry-1',
  });

  const retriedMetadata = retried.metadata as {
    retry: { attemptCount: number; maxAttempts: number; exhausted: boolean; bounded: boolean };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
    rateLimit: { limited: boolean; retryAfterMs?: number };
  };

  expect(retryCallCount).toBe(2);
  expect(retried.status).toBe(DiscordExecutionStatus.FAILED);
  expect(retriedMetadata.retry).toEqual({ bounded: true, attemptCount: 2, maxAttempts: 2, exhausted: true });
  expect(retriedMetadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(retriedMetadata.error.retryable).toBe(true);
  expect(retriedMetadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250 });

  await expect(successService.webhook.freezeWebhooks('corr-unsupported')).resolves.toEqual({
    status: DiscordExecutionStatus.NOT_SUPPORTED,
    executionTimeMs: 0,
    correlationId: 'corr-unsupported',
    metadata: {
      mode: 'production-discord-execution-service',
      reason: 'operation-not-supported-in-foundation',
      service: 'webhook',
      operation: 'freezeWebhooks',
    },
  });
});

test('pipeline and execution sources contain no forbidden side-effect surfaces', () => {
  const files = [
    'security-evaluation-pipeline.ts',
    'security-execution-planner.ts',
    'security-hot-path-planner.ts',
    'security-execution-authorization-engine.ts',
    'security-execution-router.ts',
    'security-execution-dispatcher.ts',
    'discord-execution-service.ts',
    'security-bot-executor.ts',
  ];

  const sources = files.map((fileName) => readSource(fileName));

  for (const source of sources) {
    expect(source).not.toMatch(/discord\.js|WebhookClient/i);
    expect(source).not.toMatch(/fetch\s*\(|axios|XMLHttpRequest/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink|readFileSync/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
    expect(source).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(|\.timeout\s*\(|\.lockdown\s*\(|\.recover\s*\(/i);
    expect(source).not.toMatch(/freezeWebhooks\s*\([^)]*guild\.|freezeWebhooks\s*\([^)]*channel\./i);
  }
});
