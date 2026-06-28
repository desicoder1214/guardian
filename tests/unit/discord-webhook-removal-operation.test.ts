import { ProductionDiscordWebhookRemovalOperation } from '../../src/core/runtime/discord/discord-webhook-removal-operation';

interface MockResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers: { get(name: string): string | null };
  readonly json?: () => Promise<unknown>;
  readonly text?: () => Promise<string>;
}

function createHeaders(values: Record<string, string | undefined>) {
  const lowered = Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    get(name: string): string | null {
      return lowered[name.toLowerCase()] ?? null;
    },
  };
}

function createResponse(response: {
  ok: boolean;
  status: number;
  statusText?: string;
  headers?: Record<string, string | undefined>;
  jsonPayload?: unknown;
  textPayload?: string;
}): MockResponse {
  const textPayload = response.textPayload;
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: createHeaders(response.headers ?? {}),
    json: response.jsonPayload !== undefined ? async () => response.jsonPayload : undefined,
    text: textPayload !== undefined ? async () => textPayload : undefined,
  };
}

test('operation performs successful Discord REST webhook removal', async () => {
  const fetchMock = jest.fn(async () =>
    createResponse({
      ok: true,
      status: 204,
      headers: { 'x-ratelimit-bucket': 'bucket-webhook-1' },
    }),
  );

  const operation = new ProductionDiscordWebhookRemovalOperation({
    botToken: 'token-1',
    fetchFn: fetchMock,
  });

  const response = await operation.removeDangerousWebhook({
    correlationId: 'corr-webhook-success',
    guildId: 'g-1',
    webhookId: 'wh-1',
    reason: 'guardian dangerous webhook containment',
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const firstCall = (fetchMock.mock.calls[0] as unknown) as [string, { method: string }];
  expect(firstCall[0]).toContain('/api/v10/webhooks/wh-1');
  expect(firstCall[1]).toMatchObject({ method: 'DELETE' });

  expect(response).toEqual({
    ok: true,
    statusCode: 204,
    rateLimit: {
      bucketId: 'bucket-webhook-1',
      global: false,
      retryAfterMs: undefined,
    },
    metadata: {
      endpoint: 'https://discord.com/api/v10/webhooks/wh-1',
      correlationId: 'corr-webhook-success',
      guildId: 'g-1',
    },
  });
});

test('operation classifies already removed webhook from 404 response', async () => {
  const operation = new ProductionDiscordWebhookRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 404,
        jsonPayload: { message: 'Unknown Webhook' },
      }),
  });

  const response = await operation.removeDangerousWebhook({
    correlationId: 'corr-webhook-404',
    guildId: 'g-1',
    webhookId: 'wh-1',
  });

  expect(response.ok).toBe(false);
  expect(response.statusCode).toBe(404);
  expect(response.error?.code).toBe('UNKNOWN_WEBHOOK');
  expect(response.error?.retryable).toBe(false);
});

test('operation propagates permission and rate limit metadata', async () => {
  const operation = new ProductionDiscordWebhookRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 429,
        headers: {
          'retry-after': '0.5',
          'x-ratelimit-bucket': 'bucket-webhook-rate-1',
        },
        jsonPayload: { code: 'RATE_LIMITED', message: 'Too many requests' },
      }),
  });

  const response = await operation.removeDangerousWebhook({
    correlationId: 'corr-webhook-rate',
    guildId: 'g-1',
    webhookId: 'wh-1',
  });

  expect(response.error).toEqual({
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    retryable: true,
  });
  expect(response.rateLimit).toEqual({
    retryAfterMs: 500,
    bucketId: 'bucket-webhook-rate-1',
    global: false,
  });
});
