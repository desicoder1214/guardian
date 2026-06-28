import { AuditActionType, AuditLogEntry } from '../../src/core/runtime/discord/audit-attribution-types';
import { InMemoryAuditAttributionEngine } from '../../src/core/runtime/discord/audit-attribution-engine';
import { InMemoryAuditLogProvider } from '../../src/core/runtime/discord/audit-log-provider';
import { DetectionContext, InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { ProductionDiscordExecutionAdapter } from '../../src/core/runtime/discord/production-discord-execution-adapter';
import { ProductionDiscordBotRemovalOperation } from '../../src/core/runtime/discord/discord-bot-removal-operation';
import {
  InMemorySecurityActionPlanner,
  SecurityAction,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import { ActionExecutionResult, ActionExecutionStatus } from '../../src/core/runtime/discord/security-action-dispatcher';
import { InMemorySecurityContextBuilder } from '../../src/core/runtime/discord/security-context';
import { InMemorySecurityDecisionEngine } from '../../src/core/runtime/discord/security-decision-engine';
import { InMemorySecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import { InMemorySecurityPolicyEngine } from '../../src/core/runtime/discord/policy-engine';
import { InMemorySecurityPolicyProvider } from '../../src/core/runtime/discord/security-policy-provider';
import { SecurityActionType as SecurityPolicyActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import { InMemorySecurityExecutionOrchestrator } from '../../src/core/runtime/discord/security-execution-orchestrator';
import { InMemorySecurityExecutorRegistry } from '../../src/core/runtime/discord/executor-registry';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { ProductionDiscordRestClient } from '../../src/core/runtime/discord/production-discord-rest-client';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { Clock, InMemoryThresholdTracker } from '../../src/core/runtime/discord/threshold-tracker';
import { UnauthorizedBotAddDetector } from '../../src/core/runtime/discord/unauthorized-bot-add-detector';
import {
  CoordinatedContainmentActionStatus,
  CoordinatedContainmentExecutionResult,
} from '../../src/core/runtime/discord/coordinated-containment-execution';
import { DiscordBotRemovalVerificationOutcome } from '../../src/core/runtime/discord/discord-execution-service';

class FixedClock implements Clock {
  constructor(private readonly currentMs: number) {}

  now(): number {
    return this.currentMs;
  }
}

class BotOnlyRouterActionExecutor implements SecurityActionExecutor {
  supports(actionType: SecurityActionType): boolean {
    return actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'bot-only-router-action-executor' }),
    });
  }
}

function buildNormalizedEvent(): DiscordGatewayNormalizedEvent {
  return Object.freeze({
    eventName: 'BOT_ADD',
    source: 'discord-gateway',
    timestamp: '2026-06-28T00:00:00.000Z',
    correlationId: 'corr-prod-e2e-1',
    payload: Object.freeze({
      guildId: 'guild-prod-e2e-1',
      actorId: 'actor-prod-e2e-1',
      botId: 'bot-prod-e2e-1',
      targetId: 'bot-prod-e2e-1',
      resourceId: 'bot-prod-e2e-1',
    }),
  });
}

function buildDetectionContext(normalizedEvent: DiscordGatewayNormalizedEvent): DetectionContext {
  return Object.freeze({
    normalizedEvent,
    actorId: 'actor-prod-e2e-1',
    guildId: 'guild-prod-e2e-1',
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: 'corr-prod-e2e-1',
    timestamp: '2026-06-28T00:00:00.000Z',
    metadata: Object.freeze({
      authorizedBotIds: Object.freeze([]),
      trustedBotIds: Object.freeze([]),
    }),
  });
}

function buildAuditEntry(): AuditLogEntry {
  return Object.freeze({
    id: 'audit-prod-e2e-1',
    guildId: 'guild-prod-e2e-1',
    actorId: 'actor-prod-e2e-1',
    actionType: AuditActionType.BOT_ADD,
    targetId: 'bot-prod-e2e-1',
    resourceId: 'bot-prod-e2e-1',
    timestamp: '2026-06-28T00:00:00.000Z',
    metadata: Object.freeze({ source: 'production-unauthorized-bot-e2e-test' }),
  });
}

function createProductionPipelineHarness(fetchFn: (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}>) {
  const clock = new FixedClock(Date.parse('2026-06-28T00:00:01.000Z'));

  const detectorRegistry = new InMemoryDetectorPluginRegistry();
  detectorRegistry.register(new UnauthorizedBotAddDetector());
  const detectionEngine = new InMemoryDetectionEngine(detectorRegistry);

  const auditLogProvider = new InMemoryAuditLogProvider(clock);
  auditLogProvider.record(buildAuditEntry());
  const attributionEngine = new InMemoryAuditAttributionEngine(auditLogProvider, 10_000);

  const policyProvider = new InMemorySecurityPolicyProvider();
  policyProvider.setPolicy(
    'guild-prod-e2e-1',
    Object.freeze({
      guildId: 'guild-prod-e2e-1',
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
  const contextBuilder = new InMemorySecurityContextBuilder();
  const decisionEngine = new InMemorySecurityDecisionEngine();
  const evaluationPipeline = new InMemorySecurityEvaluationPipeline(
    contextBuilder,
    attributionEngine,
    policyEngine,
    decisionEngine,
  );

  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();

  const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
  actionExecutorRegistry.register(new BotOnlyRouterActionExecutor());

  const restClient = new ProductionDiscordRestClient({
    fetchFn,
    requestTimeoutMs: 2_000,
    maxAttempts: 2,
  });

  let adapterRequestCount = 0;
  let lastAdapterRequest:
    | { readonly method: string; readonly url: string; readonly headers: Record<string, string>; readonly body?: string }
    | undefined;

  const adapter = new ProductionDiscordExecutionAdapter({
    httpClient: {
      async request(request) {
        adapterRequestCount += 1;
        lastAdapterRequest = request;
        return restClient.request(request);
      },
    },
    botToken: 'test-token',
    apiBaseUrl: 'https://discord.example',
    apiVersion: 10,
    maxAttempts: 2,
  });

  const executionRouter = new InMemorySecurityExecutionRouter(actionExecutorRegistry);
  const executionDispatcher = new InMemorySecurityExecutionDispatcher();

  const orchestrator = new InMemorySecurityExecutionOrchestrator(
    new InMemorySecurityHotPathPlanner(),
    new InMemorySecurityExecutionAuthorizationEngine(),
    new InMemorySecurityExecutorRegistry(),
    executionRouter,
    executionDispatcher,
  );

  return {
    detectionEngine,
    evaluationPipeline,
    actionPlanner,
    executionPlanner,
    orchestrator,
    adapter,
    readAdapterRequestCount: () => adapterRequestCount,
    readLastAdapterRequest: () => lastAdapterRequest,
  };
}

async function runFullPipelineAndContainment(
  fetchFn: Parameters<typeof createProductionPipelineHarness>[0],
): Promise<{
  result: CoordinatedContainmentExecutionResult;
  adapterRequestCount: number;
  adapterRequest: ReturnType<ReturnType<typeof createProductionPipelineHarness>['readLastAdapterRequest']>;
}> {
  const harness = createProductionPipelineHarness(fetchFn);
  const event = buildNormalizedEvent();
  const detectionContext = buildDetectionContext(event);

  const detectionResults = await harness.detectionEngine.evaluate(detectionContext);
  harness.evaluationPipeline.stageDetectionResults(detectionResults);

  const decision = await harness.evaluationPipeline.evaluate(event, detectionContext.actorId, detectionContext.actionType);
  const actionPlan = harness.actionPlanner.plan(decision);
  const executionPlan = harness.executionPlanner.plan(actionPlan, decision);

  const result = await harness.orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan }),
    Object.freeze({ discordExecutionService: harness.adapter }),
  );

  return {
    result,
    adapterRequestCount: harness.readAdapterRequestCount(),
    adapterRequest: harness.readLastAdapterRequest(),
  };
}

describe('production unauthorized bot end-to-end integration', () => {
  test('runs full pipeline and preserves correlation, threat, decision, authorization, idempotency and verification metadata', async () => {
    let fetchCallCount = 0;
    let lastFetchUrl: string | undefined;

    const operationSpy = jest.spyOn(ProductionDiscordBotRemovalOperation.prototype, 'removeUnauthorizedBot');

    const run = await runFullPipelineAndContainment(async (url) => {
      fetchCallCount += 1;
      lastFetchUrl = url;
      return Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({
          get() {
            return null;
          },
        }),
      });
    });

    expect(run.adapterRequestCount).toBe(1);
    expect(fetchCallCount).toBe(1);
    expect(operationSpy).toHaveBeenCalledTimes(1);

    expect(run.result.correlationId).toBe('corr-prod-e2e-1');
    expect(run.result.actionResults).toHaveLength(4);

    const botResult = run.result.actionResults.find(
      (item) => item.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    );
    expect(botResult?.status).toBe(CoordinatedContainmentActionStatus.SUCCEEDED);
    expect(botResult?.correlationId).toBe('corr-prod-e2e-1');

    const executionMetadata = botResult?.metadata as {
      idempotencyKey?: string;
      verification?: { outcome?: DiscordBotRemovalVerificationOutcome };
      metadata?: {
        correlationId?: string;
        threatAssessment?: unknown;
        securityDecision?: unknown;
        authorizationMetadata?: unknown;
      };
    };

    expect(executionMetadata.idempotencyKey).toBeDefined();
    expect(executionMetadata.verification?.outcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
    expect(executionMetadata.metadata?.correlationId).toBe('corr-prod-e2e-1');
    expect(executionMetadata.metadata?.threatAssessment).toBeDefined();
    expect(executionMetadata.metadata?.securityDecision).toBeDefined();
    expect(executionMetadata.metadata?.authorizationMetadata).toBeDefined();

    expect(lastFetchUrl).toBe('https://discord.example/api/v10/guilds/guild-prod-e2e-1/members/bot-prod-e2e-1');
    expect(Object.isFrozen(run.adapterRequest ?? {})).toBe(true);
    expect(Object.isFrozen(run.result)).toBe(true);
    expect(Object.isFrozen(run.result.actionResults)).toBe(true);
    expect(Object.isFrozen(botResult ?? {})).toBe(true);

    operationSpy.mockRestore();
  });

  test('suppresses duplicate execution and propagates failures without mutating metadata', async () => {
    let fetchCallCount = 0;

    const harness = createProductionPipelineHarness(async () => {
      fetchCallCount += 1;
      return Object.freeze({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: Object.freeze({
          get() {
            return null;
          },
        }),
        json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
      });
    });

    const event = buildNormalizedEvent();
    const detectionContext = buildDetectionContext(event);
    const detectionResults = await harness.detectionEngine.evaluate(detectionContext);
    harness.evaluationPipeline.stageDetectionResults(detectionResults);
    const decision = await harness.evaluationPipeline.evaluate(event, detectionContext.actorId, detectionContext.actionType);
    const actionPlan = harness.actionPlanner.plan(decision);
    const executionPlan = harness.executionPlanner.plan(actionPlan, decision);

    const first = await harness.orchestrator.executeCoordinatedContainment(
      Object.freeze({ executionPlan }),
      Object.freeze({ discordExecutionService: harness.adapter }),
    );

    const second = await harness.orchestrator.executeCoordinatedContainment(
      Object.freeze({ executionPlan }),
      Object.freeze({ discordExecutionService: harness.adapter }),
    );

    const firstBot = first.actionResults.find((item) => item.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    const secondBot = second.actionResults.find((item) => item.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);

    expect(firstBot?.status).toBe(CoordinatedContainmentActionStatus.FAILED);
    expect(secondBot?.status).toBe(CoordinatedContainmentActionStatus.FAILED);
    expect(fetchCallCount).toBe(2);

    const firstMetadata = firstBot?.metadata as {
      error?: { code?: string };
      verification?: { outcome?: DiscordBotRemovalVerificationOutcome };
      metadata?: { authorizationMetadata?: unknown };
    };

    expect(firstMetadata.error?.code).toBe('API_ERROR');
    expect(firstMetadata.verification?.outcome).toBe(DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE);
    expect(firstMetadata.metadata?.authorizationMetadata).toBeDefined();

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.actionResults)).toBe(true);
    expect(Object.isFrozen(firstBot ?? {})).toBe(true);
    expect(Object.isFrozen(firstMetadata ?? {})).toBe(true);

    expect(() => {
      (firstMetadata.metadata as { authorizationMetadata?: unknown }).authorizationMetadata = undefined;
    }).toThrow(TypeError);
  });
});
