import {
  DiscordBotRemovalVerificationOutcome,
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordExecutionAdapterOptions,
  ProductionDiscordHttpClient,
  ProductionDiscordHttpResponse,
} from '../../src/core/runtime/discord/production-discord-execution-adapter';

function headers(values: Record<string, string> = {}): { get(name: string): string | null } {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return Object.freeze({
    get(name: string): string | null {
      const value = normalized[name.toLowerCase()];
      return typeof value === 'string' ? value : null;
    },
  });
}

function response(overrides: Partial<ProductionDiscordHttpResponse> = {}): ProductionDiscordHttpResponse {
  return Object.freeze({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: headers(),
    ...overrides,
  });
}

function createAdapter(
  client: ProductionDiscordHttpClient,
  overrides: Partial<ProductionDiscordExecutionAdapterOptions> = {},
): ProductionDiscordExecutionAdapter {
  return new ProductionDiscordExecutionAdapter({
    httpClient: client,
    botToken: 'test-token',
    maxAttempts: 2,
    ...overrides,
  });
}

test('successful execution returns structured success and uses injected HTTP client', async () => {
  const calls: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      calls.push(request);
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client, { apiBaseUrl: 'https://discord.example', apiVersion: 10 });
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-success-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-success-1',
    reason: 'guardian containment',
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe('DELETE');
  expect(calls[0].url).toBe('https://discord.example/api/v10/guilds/guild-1/members/bot-1');
  expect(calls[0].headers.Authorization).toBe('Bot test-token');
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(result.correlationId).toBe('corr-success-1');
  const metadata = result.metadata as {
    idempotencyKey: string;
    httpStatus: number;
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
  };
  expect(metadata.idempotencyKey).toBe('idem-success-1');
  expect(metadata.httpStatus).toBe(204);
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
});

test('permission denied returns failed result with permission verification outcome', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => Object.freeze({ code: 'PERMISSION_DENIED', message: 'Missing Permissions' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-permission-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-permission-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('rate limit response is classified as retryable bounded failure', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headers({ 'retry-after': '0.25', 'x-ratelimit-bucket': 'bucket-1' }),
        json: async () => Object.freeze({ message: 'Rate limited' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-rate-limit-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-rate-limit-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250, bucketId: 'bucket-1' });
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(metadata.error.retryable).toBe(true);
});

test('retryable transport failure retries and then succeeds', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('socket reset');
      }
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-transport-retry-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-transport-retry-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as {
    retry: { attemptCount: number; maxAttempts: number; exhausted: boolean };
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
  };
  expect(metadata.retry).toEqual({ attemptCount: 2, maxAttempts: 2, bounded: true, exhausted: false });
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
});

test('non-retryable API failure does not retry', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => Object.freeze({ code: 'API_ERROR', message: 'Bad Request' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-api-failure-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-api-failure-1',
  });

  expect(callCount).toBe(1);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as { error: { code: DiscordExecutionErrorCode; retryable: boolean } };
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('idempotent repeated requests are skipped without extra HTTP calls', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-idem-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-1',
  });

  const first = await adapter.bot.removeUnauthorizedBot(request);
  const second = await adapter.bot.removeUnauthorizedBot(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(callCount).toBe(1);
  const metadata = second.metadata as { duplicate?: boolean };
  expect(metadata.duplicate).toBe(true);
});

test('metadata propagation preserves authorization and threat metadata', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => Object.freeze({ code: 'PERMISSION_DENIED', message: 'Missing Permissions' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-metadata-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-metadata-1',
    metadata: Object.freeze({
      authorizationMetadata: Object.freeze({ decision: 'AUTHORIZED', source: 'auth-engine' }),
      threatAssessment: Object.freeze({ severity: 'HIGH' }),
      securityDecision: Object.freeze({ decision: 'BLOCK' }),
      executionVerification: Object.freeze({ expected: 'REMOVE_UNAUTHORIZED_BOT' }),
    }),
  });

  const metadata = result.metadata as {
    metadata: {
      authorizationMetadata: { decision: string; source: string };
      threatAssessment: { severity: string };
      securityDecision: { decision: string };
      executionVerification: { expected: string };
    };
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
  };

  expect(metadata.metadata.authorizationMetadata).toEqual({ decision: 'AUTHORIZED', source: 'auth-engine' });
  expect(metadata.metadata.threatAssessment).toEqual({ severity: 'HIGH' });
  expect(metadata.metadata.securityDecision).toEqual({ decision: 'BLOCK' });
  expect(metadata.metadata.executionVerification).toEqual({ expected: 'REMOVE_UNAUTHORIZED_BOT' });
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE);
});

test('verification outcomes include already-removed classification', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_MEMBER', message: 'Unknown Member' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.bot.removeUnauthorizedBot({
    correlationId: 'corr-already-removed-1',
    guildId: 'guild-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-already-removed-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as { verification: { outcome: DiscordBotRemovalVerificationOutcome } };
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.ALREADY_REMOVED);
});
