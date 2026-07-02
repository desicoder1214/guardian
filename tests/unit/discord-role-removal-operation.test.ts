import {
  ProductionDiscordRoleRemovalOperation,
} from '../../src/core/runtime/discord/discord-role-removal-operation';

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

test('operation performs successful Discord REST role removal', async () => {
  const fetchMock = jest.fn(async () =>
    createResponse({
      ok: true,
      status: 204,
      headers: { 'x-ratelimit-bucket': 'bucket-role-1' },
    }),
  );

  const operation = new ProductionDiscordRoleRemovalOperation({
    botToken: 'token-1',
    fetchFn: fetchMock,
  });

  const response = await operation.removeDangerousRole({
    correlationId: 'corr-role-success',
    guildId: 'g-1',
    memberUserId: 'u-1',
    roleId: 'r-1',
    reason: 'guardian dangerous role containment',
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const firstCall = (fetchMock.mock.calls[0] as unknown) as [string, { method: string }];
  expect(firstCall[0]).toContain('/api/v10/guilds/g-1/members/u-1/roles/r-1');
  expect(firstCall[1]).toMatchObject({ method: 'DELETE' });

  expect(response).toEqual({
    ok: true,
    statusCode: 204,
    rateLimit: {
      bucketId: 'bucket-role-1',
      global: false,
      retryAfterMs: undefined,
    },
    metadata: {
      endpoint: 'https://discord.com/api/v10/guilds/g-1/members/u-1/roles/r-1',
      correlationId: 'corr-role-success',
    },
  });
});

test('operation classifies already absent role from 404 response', async () => {
  const operation = new ProductionDiscordRoleRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 404,
        jsonPayload: { message: 'Unknown Role' },
      }),
  });

  const response = await operation.removeDangerousRole({
    correlationId: 'corr-role-404',
    guildId: 'g-1',
    memberUserId: 'u-1',
    roleId: 'r-1',
  });

  expect(response.ok).toBe(false);
  expect(response.statusCode).toBe(404);
  expect(response.error?.code).toBe('ALREADY_ABSENT');
  expect(response.error?.retryable).toBe(false);
});

test('operation deletes guild role directly when memberUserId is absent', async () => {
  const fetchMock = jest.fn(async () =>
    createResponse({
      ok: true,
      status: 204,
      headers: { 'x-ratelimit-bucket': 'bucket-role-guild-1' },
    }),
  );

  const operation = new ProductionDiscordRoleRemovalOperation({
    botToken: 'token-1',
    fetchFn: fetchMock,
  });

  const response = await operation.removeDangerousRole({
    correlationId: 'corr-role-guild-delete',
    guildId: 'g-1',
    roleId: 'r-created-1',
    reason: 'guardian unauthorized role creation containment',
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const firstCall = (fetchMock.mock.calls[0] as unknown) as [string, { method: string }];
  expect(firstCall[0]).toContain('/api/v10/guilds/g-1/roles/r-created-1');
  expect(firstCall[0]).not.toContain('/members/');
  expect(firstCall[1]).toMatchObject({ method: 'DELETE' });
  expect(response.ok).toBe(true);
});

test('operation propagates permission and rate limit metadata', async () => {
  const operation = new ProductionDiscordRoleRemovalOperation({
    botToken: 'token-1',
    fetchFn: async () =>
      createResponse({
        ok: false,
        status: 429,
        headers: {
          'retry-after': '0.5',
          'x-ratelimit-bucket': 'bucket-role-rate-1',
        },
        jsonPayload: { code: 'RATE_LIMITED', message: 'Too many requests' },
      }),
  });

  const response = await operation.removeDangerousRole({
    correlationId: 'corr-role-rate',
    guildId: 'g-1',
    memberUserId: 'u-1',
    roleId: 'r-1',
  });

  expect(response.error).toEqual({
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    retryable: true,
  });
  expect(response.rateLimit).toEqual({
    retryAfterMs: 500,
    bucketId: 'bucket-role-rate-1',
    global: false,
  });
});
