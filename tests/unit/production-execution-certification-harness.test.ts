import {
  InMemoryProductionExecutionCertificationHarness,
  ProductionExecutionCertificationOutcome,
  ProductionExecutionCertificationRequest,
  ProductionExecutionCertificationScenario,
  ProductionExecutionCertificationScenarioType,
} from '../../src/core/runtime/discord/production-execution-certification-harness';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityExecutorCapability } from '../../src/core/runtime/discord/security-execution-types';
import {
  ProductionDiscordHttpClient,
  ProductionDiscordHttpResponse,
} from '../../src/core/runtime/discord/production-discord-execution-adapter';

function buildHttpResponse(overrides: Partial<ProductionDiscordHttpResponse> = {}): ProductionDiscordHttpResponse {
  return Object.freeze({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: Object.freeze({
      get(): string | null {
        return null;
      },
    }),
    ...overrides,
  });
}

function buildClient(calls: Array<{ method: string; url: string }>): ProductionDiscordHttpClient {
  return Object.freeze({
    async request(request: Parameters<ProductionDiscordHttpClient['request']>[0]) {
      calls.push({ method: request.method, url: request.url });
      if (request.url.includes('/channels/') && request.method === 'PATCH') {
        return buildHttpResponse({ status: 200, statusText: 'OK' });
      }

      return buildHttpResponse();
    },
  });
}

function buildRequest(overrides: Partial<{
  scenarioMatrix: readonly ProductionExecutionCertificationScenario[];
  productionDiscordHttpClient: ProductionDiscordHttpClient;
}> = {}) {
  const calls: Array<{ method: string; url: string }> = [];
  const request: ProductionExecutionCertificationRequest = {
    correlationId: 'corr-prod-cert-1',
    transactionId: 'txn-prod-cert-1',
    runtimeId: 'runtime-prod-cert-1',
    guildId: 'guild-prod-cert-1',
    botToken: 'test-token',
    productionDiscordHttpClient:
      overrides.productionDiscordHttpClient ?? buildClient(calls),
    ...(overrides.scenarioMatrix ? { scenarioMatrix: overrides.scenarioMatrix } : {}),
  };

  return {
    request: Object.freeze(request),
    calls,
  };
}

test('successful certification validates continuity, adapter selection, fail-closed checks, and no live gateway operations', async () => {
  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request, calls } = buildRequest();

  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const report = await harness.certify(request);
    expect(report.success).toBe(true);
    expect(report.outcome).toBe(ProductionExecutionCertificationOutcome.CERTIFIED);
    expect(report.scenarioReports).toHaveLength(5);
    expect(report.scenarioReports.every((scenario) => scenario.status === 'PASSED')).toBe(true);
    expect(report.failClosedVerification.authorizationGatesEnforced).toBe(true);
    expect(report.failClosedVerification.unsupportedRouteFailsClosed).toBe(true);
    expect(report.metadataVerification.preserved).toBe(true);
    expect(report.noLiveDiscordRestOrGatewayOperations).toBe(true);
    expect(report.routesExercised).toHaveLength(5);
    expect(report.adaptersSelected).toEqual([
      'bot.removeUnauthorizedBot',
      'webhook.deleteWebhook',
      'role.removeDangerousRole',
      'channel.lockChannel',
      'channel.restoreChannel',
    ]);
    expect(calls).toHaveLength(5);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});

test('missing metadata fails closed', async () => {
  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request } = buildRequest({
    scenarioMatrix: [
      Object.freeze({
        scenarioId: 'scenario-missing-target',
        scenarioType: ProductionExecutionCertificationScenarioType.DANGEROUS_WEBHOOK,
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        expectedCapability: SecurityExecutorCapability.FREEZE_WEBHOOKS,
        expectedAdapterBinding: 'webhook.deleteWebhook',
        targetId: '',
        metadata: Object.freeze({ webhookId: 'webhook-cert-1' }),
      }),
    ],
  });

  const report = await harness.certify(request);

  expect(report.success).toBe(false);
  expect(report.outcome).toBe(ProductionExecutionCertificationOutcome.FAILED);
  expect(report.failureReason).toContain('metadata-verification-failed');
});

test('unsupported scenario route fails closed', async () => {
  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request } = buildRequest({
    scenarioMatrix: [
      Object.freeze({
        scenarioId: 'scenario-unsupported-route',
        scenarioType: ProductionExecutionCertificationScenarioType.CHANNEL_PERMISSION_DRIFT,
        actionType: SecurityActionType.ESCALATE,
        expectedCapability: SecurityExecutorCapability.ESCALATE,
        expectedAdapterBinding: 'channel.lockChannel',
        targetId: 'target-unsupported',
        metadata: Object.freeze({ channelId: 'channel-cert-1' }),
      }),
    ],
  });

  const report = await harness.certify(request);

  expect(report.success).toBe(false);
  expect(report.scenarioReports[0].status).toBe('FAILED');
  expect(report.scenarioReports[0].failureReason).toContain('unexpected-adapter-selection:unsupported');
});

test('adapter execution failure fails certification', async () => {
  const failingClient: ProductionDiscordHttpClient = Object.freeze({
    async request() {
      return buildHttpResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS' }),
      });
    },
  });

  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request } = buildRequest({
    productionDiscordHttpClient: failingClient,
  });

  const report = await harness.certify(request);

  expect(report.success).toBe(false);
  expect(report.failureReason).toContain('scenario-failed');
});

test('deterministic replay preserves certification id and marks idempotent replay', async () => {
  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request } = buildRequest();

  const first = await harness.certify(request);
  const second = await harness.certify(request);

  expect(first.certificationId).toBe(second.certificationId);
  expect(first.idempotentReplay).toBe(false);
  expect(second.idempotentReplay).toBe(true);
});

test('immutable report is deeply frozen', async () => {
  const harness = new InMemoryProductionExecutionCertificationHarness();
  const { request } = buildRequest();
  const report = await harness.certify(request);

  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.routesExercised)).toBe(true);
  expect(Object.isFrozen(report.adaptersSelected)).toBe(true);
  expect(Object.isFrozen(report.scenarioReports)).toBe(true);
  expect(Object.isFrozen(report.metadataVerification)).toBe(true);
  expect(Object.isFrozen(report.failClosedVerification)).toBe(true);

  expect(() => {
    (report as { success: boolean }).success = false;
  }).toThrow(TypeError);
});
