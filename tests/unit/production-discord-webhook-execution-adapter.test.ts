import {
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
  DiscordWebhookRemovalVerificationOutcome,
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

test('successful dangerous webhook removal returns verified success and expected endpoint', async () => {
  const calls: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      calls.push(request);
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client, { apiBaseUrl: 'https://discord.example', apiVersion: 10 });
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-success-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
    idempotencyKey: 'idem-webhook-1',
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe('DELETE');
  expect(calls[0].url).toBe('https://discord.example/api/v10/webhooks/webhook-1');
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
    idempotencyKey: string;
  };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.SUCCESS);
  expect(metadata.idempotencyKey).toBe('idem-webhook-1');
});

test('already removed webhook is classified as verified success', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_WEBHOOK', message: 'Unknown Webhook' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-absent-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as { verification: { outcome: DiscordWebhookRemovalVerificationOutcome } };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.ALREADY_REMOVED);
});

test('permission failure is classified with verification metadata', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-permission-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.PERMISSION_FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('rate limit preserves retry metadata', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headers({ 'retry-after': '0.25', 'x-ratelimit-bucket': 'bucket-webhook-rate-1' }),
        json: async () => Object.freeze({ message: 'rate-limited' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-rate-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
  };
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(metadata.error.retryable).toBe(true);
  expect(metadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250, bucketId: 'bucket-webhook-rate-1' });
});

test('retryable transport failure retries and then succeeds for webhook removal', async () => {
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
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-transport-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as { retry: { attemptCount: number; maxAttempts: number } };
  expect(metadata.retry).toEqual({ bounded: true, attemptCount: 2, maxAttempts: 2, exhausted: false });
});

test('duplicate webhook removal requests are idempotently suppressed', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-webhook-dup-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
    idempotencyKey: 'idem-webhook-dup-1',
  });

  const first = await adapter.webhook.deleteWebhook(request);
  const second = await adapter.webhook.deleteWebhook(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(callCount).toBe(1);
  const metadata = second.metadata as { duplicate?: boolean };
  expect(metadata.duplicate).toBe(true);
});

test('metadata propagation and deterministic idempotency key are preserved for webhook removal', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-webhook-meta-1',
    guildId: 'guild-1',
    webhookId: 'webhook-1',
    idempotencyKey: 'idem-webhook-meta-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({ severity: 'HIGH' }),
      securityDecision: Object.freeze({ decision: 'BLOCK' }),
      authorizationMetadata: Object.freeze({ source: 'auth-engine' }),
    }),
  });

  const first = await adapter.webhook.deleteWebhook(request);
  const second = await adapter.webhook.deleteWebhook(request);

  const firstMetadata = first.metadata as {
    idempotencyKey: string;
    metadata: {
      threatAssessment: { severity: string };
      securityDecision: { decision: string };
      authorizationMetadata: { source: string };
    };
  };

  expect(firstMetadata.idempotencyKey).toBe('idem-webhook-meta-1');
  expect(firstMetadata.metadata.threatAssessment).toEqual({ severity: 'HIGH' });
  expect(firstMetadata.metadata.securityDecision).toEqual({ decision: 'BLOCK' });
  expect(firstMetadata.metadata.authorizationMetadata).toEqual({ source: 'auth-engine' });

  const secondMetadata = second.metadata as { idempotencyKey: string };
  expect(secondMetadata.idempotencyKey).toBe('idem-webhook-meta-1');
});

test('validation failure is returned when required webhook fields are missing', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-validation-webhook-1',
    guildId: 'guild-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.VALIDATION_ERROR);
});

test('unknown failure classification is surfaced for webhook containment', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => Object.freeze({ code: 'UNKNOWN_ERROR', message: 'unknown failure' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 1 });
  const result = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-unknown-webhook-1',
    guildId: 'guild-1',
    webhookId: 'wh-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.UNKNOWN_ERROR);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.UNKNOWN_ERROR);
});
