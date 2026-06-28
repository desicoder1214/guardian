import {
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
  DiscordWebhookRemovalVerificationOutcome,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
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

function buildAdapter(httpClient: ProductionDiscordHttpClient): ProductionDiscordExecutionAdapter {
  return new ProductionDiscordExecutionAdapter({
    httpClient,
    botToken: 'test-token',
    apiBaseUrl: 'https://discord.example',
    apiVersion: 10,
    maxAttempts: 2,
  });
}

test('successful dangerous webhook removal flow preserves metadata and endpoint through production adapter path', async () => {
  const requests: Array<{ method: string; url: string }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      requests.push({ method: request.method, url: request.url });
      return buildHttpResponse({ status: 204 });
    },
  };

  const adapter = buildAdapter(client);
  const execution = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-e2e-1',
    guildId: 'guild-webhook-e2e-1',
    webhookId: 'webhook-dangerous-e2e-1',
    idempotencyKey: 'idem-webhook-e2e-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({ severity: 'CRITICAL' }),
      securityDecision: Object.freeze({ decision: 'BLOCK' }),
      authorizationMetadata: Object.freeze({ source: 'auth-engine' }),
    }),
  });

  expect(execution.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(requests).toEqual([
    {
      method: 'DELETE',
      url: 'https://discord.example/api/v10/webhooks/webhook-dangerous-e2e-1',
    },
  ]);

  const metadata = execution.metadata as {
    idempotencyKey: string;
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
    metadata: { threatAssessment: unknown; securityDecision: unknown; authorizationMetadata: unknown };
  };

  expect(metadata.idempotencyKey).toBe('idem-webhook-e2e-1');
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.SUCCESS);
  expect(metadata.metadata.threatAssessment).toBeDefined();
  expect(metadata.metadata.securityDecision).toBeDefined();
  expect(metadata.metadata.authorizationMetadata).toBeDefined();
});

test('webhook already removed returns ALREADY_REMOVED verification', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return buildHttpResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_WEBHOOK', message: 'Unknown Webhook' }),
      });
    },
  };

  const adapter = buildAdapter(client);
  const execution = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-e2e-404',
    guildId: 'guild-webhook-e2e-1',
    webhookId: 'webhook-dangerous-e2e-1',
  });

  expect(execution.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = execution.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
  };
  expect(metadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.ALREADY_REMOVED);
});

test('permission failures and rate limits are classified on webhook containment path', async () => {
  let call = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      call += 1;
      if (call === 1) {
        return buildHttpResponse({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
        });
      }

      return buildHttpResponse({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: Object.freeze({
          get(name: string): string | null {
            if (name.toLowerCase() === 'retry-after') {
              return '0.5';
            }

            if (name.toLowerCase() === 'x-ratelimit-bucket') {
              return 'bucket-webhook-e2e-1';
            }

            return null;
          },
        }),
      });
    },
  };

  const adapter = buildAdapter(client);
  const permissionFailure = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-e2e-perm',
    guildId: 'guild-webhook-e2e-1',
    webhookId: 'webhook-dangerous-e2e-1',
  });

  expect(permissionFailure.status).toBe(DiscordExecutionStatus.FAILED);
  const permissionMetadata = permissionFailure.metadata as {
    verification: { outcome: DiscordWebhookRemovalVerificationOutcome };
  };
  expect(permissionMetadata.verification.outcome).toBe(DiscordWebhookRemovalVerificationOutcome.PERMISSION_FAILURE);

  const rateLimited = await adapter.webhook.deleteWebhook({
    correlationId: 'corr-webhook-e2e-rate',
    guildId: 'guild-webhook-e2e-1',
    webhookId: 'webhook-dangerous-e2e-1',
  });

  expect(rateLimited.status).toBe(DiscordExecutionStatus.FAILED);

  const rateMetadata = rateLimited.metadata as {
    error: { code: DiscordExecutionErrorCode };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
  };
  expect(rateMetadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(rateMetadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 500, bucketId: 'bucket-webhook-e2e-1' });
});

test('retryable transport failure retries and duplicate requests are deterministically idempotent', async () => {
  let calls = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      calls += 1;
      if (calls === 1) {
        throw new Error('socket reset');
      }

      return buildHttpResponse({ status: 204 });
    },
  };

  const adapter = buildAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-webhook-e2e-retry',
    guildId: 'guild-webhook-e2e-1',
    webhookId: 'webhook-dangerous-e2e-1',
    idempotencyKey: 'idem-webhook-e2e-retry',
  });

  const first = await adapter.webhook.deleteWebhook(request);
  const second = await adapter.webhook.deleteWebhook(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(calls).toBe(2);

  const firstMetadata = first.metadata as { idempotencyKey: string; retry: { attemptCount: number } };
  expect(firstMetadata.idempotencyKey).toBe('idem-webhook-e2e-retry');
  expect(firstMetadata.retry.attemptCount).toBe(2);
});
