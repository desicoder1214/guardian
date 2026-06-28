import { ProductionDiscordChannelContainmentOperation } from '../../src/core/runtime/discord/discord-channel-containment-operation';

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

test('operation performs successful Discord REST channel containment', async () => {
  const fetchMock = jest.fn(async () =>
    createResponse({
      ok: true,
      status: 200,
      headers: { 'x-ratelimit-bucket': 'bucket-channel-1' },
    }),
  );

  const operation = new ProductionDiscordChannelContainmentOperation({
    botToken: 'token-1',
    fetchFn: fetchMock,
  });

  const response = await operation.containChannel({
    correlationId: 'corr-channel-success',
    guildId: 'g-1',
    channelId: 'c-1',
    reason: 'guardian channel containment',
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const firstCall = (fetchMock.mock.calls[0] as unknown) as [string, { method: string }];
  expect(firstCall[0]).toContain('/api/v10/channels/c-1');
  expect(firstCall[1]).toMatchObject({ method: 'PATCH' });

  expect(response).toEqual({
    ok: true,
    statusCode: 200,
    rateLimit: {
      bucketId: 'bucket-channel-1',
      global: false,
      retryAfterMs: undefined,
    },
    metadata: {
      endpoint: 'https://discord.com/api/v10/channels/c-1',
      correlationId: 'corr-channel-success',
      guildId: 'g-1',
      channelId: 'c-1',
    },
  });
});

test('operation classifies already contained channel from 409 response', async () => {
  const operation = new ProductionDiscordChannelContainmentOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 409,
        jsonPayload: { message: 'Already locked' },
      }),
  });

  const response = await operation.containChannel({
    correlationId: 'corr-channel-409',
    guildId: 'g-1',
    channelId: 'c-1',
  });

  expect(response.ok).toBe(false);
  expect(response.statusCode).toBe(409);
  expect(response.error?.code).toBe('ALREADY_CONTAINED');
  expect(response.error?.retryable).toBe(false);
});

test('operation propagates permission and rate limit metadata', async () => {
  const operation = new ProductionDiscordChannelContainmentOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 429,
        headers: {
          'retry-after': '0.5',
          'x-ratelimit-bucket': 'bucket-channel-rate-1',
        },
        jsonPayload: { code: 'RATE_LIMITED', message: 'Too many requests' },
      }),
  });

  const response = await operation.containChannel({
    correlationId: 'corr-channel-rate',
    guildId: 'g-1',
    channelId: 'c-1',
  });

  expect(response.error).toEqual({
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    retryable: true,
  });
  expect(response.rateLimit).toEqual({
    retryAfterMs: 500,
    bucketId: 'bucket-channel-rate-1',
    global: false,
  });
});
