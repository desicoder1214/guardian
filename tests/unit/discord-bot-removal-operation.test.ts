import {
  ProductionDiscordBotRemovalOperation,
} from '../../src/core/runtime/discord/discord-bot-removal-operation';

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

test('operation performs successful Discord REST bot removal', async () => {
  const fetchMock = jest.fn(async () =>
    createResponse({
      ok: true,
      status: 204,
      headers: { 'x-ratelimit-bucket': 'bucket-1' },
    }),
  );

  const operation = new ProductionDiscordBotRemovalOperation({
    botToken: 'token-1',
    fetchFn: fetchMock,
  });

  const response = await operation.removeUnauthorizedBot({
    correlationId: 'corr-op-success',
    guildId: 'g-1',
    botUserId: 'b-1',
    reason: 'guardian unauthorized bot removal',
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const firstCall = (fetchMock.mock.calls[0] as unknown) as [string, { method: string }];
  expect(firstCall[0]).toContain('/api/v10/guilds/g-1/members/b-1');
  expect(firstCall[1]).toMatchObject({
    method: 'DELETE',
  });

  expect(response).toEqual({
    ok: true,
    statusCode: 204,
    rateLimit: {
      bucketId: 'bucket-1',
      global: false,
      retryAfterMs: undefined,
    },
    metadata: {
      endpoint: 'https://discord.com/api/v10/guilds/g-1/members/b-1',
      correlationId: 'corr-op-success',
    },
  });
  expect(Object.isFrozen(response)).toBe(true);
});

test('operation classifies already-removed bot from 404 response', async () => {
  const operation = new ProductionDiscordBotRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 404,
        jsonPayload: { message: 'Unknown Member' },
      }),
  });

  const response = await operation.removeUnauthorizedBot({
    correlationId: 'corr-op-404',
    guildId: 'g-1',
    botUserId: 'b-1',
  });

  expect(response.ok).toBe(false);
  expect(response.statusCode).toBe(404);
  expect(response.error?.code).toBe('ALREADY_REMOVED');
  expect(response.error?.retryable).toBe(false);
});

test('operation classifies permission failures from 403 response', async () => {
  const operation = new ProductionDiscordBotRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 403,
        jsonPayload: { code: 50013, message: 'Missing Permissions' },
      }),
  });

  const response = await operation.removeUnauthorizedBot({
    correlationId: 'corr-op-403',
    guildId: 'g-1',
    botUserId: 'b-1',
  });

  expect(response.error?.code).toBe('50013');
  expect(response.error?.message).toBe('Missing Permissions');
  expect(response.error?.retryable).toBe(false);
});

test('operation propagates Discord API error payload and rate-limit headers', async () => {
  const operation = new ProductionDiscordBotRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 429,
        headers: {
          'retry-after': '1.5',
          'x-ratelimit-bucket': 'bucket-rate-1',
          'x-ratelimit-global': 'true',
        },
        jsonPayload: { code: 'RATE_LIMITED', message: 'Too many requests' },
      }),
  });

  const response = await operation.removeUnauthorizedBot({
    correlationId: 'corr-op-rate',
    guildId: 'g-1',
    botUserId: 'b-1',
  });

  expect(response.error).toEqual({
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    retryable: true,
  });
  expect(response.rateLimit).toEqual({
    retryAfterMs: 1500,
    bucketId: 'bucket-rate-1',
    global: true,
  });
});

test('operation throws when no fetch implementation is available', async () => {
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;
  (globalThis as { fetch?: unknown }).fetch = undefined;

  try {
    const operation = new ProductionDiscordBotRemovalOperation({ botToken: 'token-1' });
    await expect(
      operation.removeUnauthorizedBot({
        correlationId: 'corr-op-no-fetch',
        guildId: 'g-1',
        botUserId: 'b-1',
      }),
    ).rejects.toThrow(
      'No fetch implementation available for ProductionDiscordBotRemovalOperation',
    );
  } finally {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
  }
});
