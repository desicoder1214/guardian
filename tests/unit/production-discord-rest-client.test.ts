import fs from 'node:fs';
import path from 'node:path';
import {
  ProductionDiscordRestClient,
  ProductionDiscordRestErrorCode,
} from '../../src/core/runtime/discord/production-discord-rest-client';

interface MutableHeaderBag {
  readonly get: (name: string) => string | null;
}

function headers(values: Record<string, string> = {}): MutableHeaderBag {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return Object.freeze({
    get(name: string): string | null {
      const value = normalized[name.toLowerCase()];
      return typeof value === 'string' ? value : null;
    },
  });
}

function response(overrides: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: MutableHeaderBag;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
} = {}) {
  return Object.freeze({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: headers(),
    ...overrides,
  });
}

test('successful 2xx response is returned with immutable shape', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () => response({ status: 204 }),
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/guilds/guild-1/members/bot-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(result.ok).toBe(true);
  expect(result.status).toBe(204);
  expect(result.metadata.attemptCount).toBe(1);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.metadata)).toBe(true);
});

test('403 permission failure is passed through', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () =>
      response({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => Object.freeze({ code: 'PERMISSION_DENIED', message: 'Missing Permissions' }),
      }),
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/webhooks/webhook-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(result.ok).toBe(false);
  expect(result.status).toBe(403);
  await expect(result.json?.()).resolves.toEqual({ code: 'PERMISSION_DENIED', message: 'Missing Permissions' });
});

test('404 unknown resource failure is passed through', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () =>
      response({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_RESOURCE', message: 'Not Found' }),
      }),
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/channels/channel-1/permissions/overwrite-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(result.ok).toBe(false);
  expect(result.status).toBe(404);
  await expect(result.json?.()).resolves.toEqual({ code: 'UNKNOWN_RESOURCE', message: 'Not Found' });
});

test('429 response extracts rate-limit metadata', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () =>
      response({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headers({
          'retry-after': '0.25',
          'x-ratelimit-reset-after': '0.40',
          'x-ratelimit-bucket': 'bucket-1',
          'x-ratelimit-global': 'true',
        }),
      }),
    maxAttempts: 1,
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/guilds/guild-1/members/bot-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(result.status).toBe(429);
  expect(result.metadata.rateLimit).toEqual({
    retryAfterMs: 250,
    resetAfterMs: 400,
    bucketId: 'bucket-1',
    global: true,
  });
});

test('5xx failure is classified retryable and retried with bounded attempts', async () => {
  let callCount = 0;
  const client = new ProductionDiscordRestClient({
    fetchFn: async () => {
      callCount += 1;
      return response({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });
    },
    maxAttempts: 2,
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/guilds/guild-1/members/bot-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(503);
  expect(result.metadata.retryableFailure).toBe(true);
  expect(result.metadata.error).toMatchObject({
    code: ProductionDiscordRestErrorCode.RETRYABLE_HTTP_FAILURE,
    retryable: true,
  });
});

test('timeout behavior returns structured timeout response', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () => new Promise(() => {}),
    requestTimeoutMs: 5,
    maxAttempts: 1,
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/webhooks/webhook-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(result.ok).toBe(false);
  expect(result.status).toBe(408);
  expect(result.metadata.timedOut).toBe(true);
  expect(result.metadata.error?.code).toBe(ProductionDiscordRestErrorCode.REQUEST_TIMEOUT);
});

test('network failures return structured network response after bounded retries', async () => {
  let callCount = 0;
  const client = new ProductionDiscordRestClient({
    fetchFn: async () => {
      callCount += 1;
      throw new Error('socket hang up');
    },
    maxAttempts: 2,
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/guilds/guild-1/members/bot-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(callCount).toBe(2);
  expect(result.ok).toBe(false);
  expect(result.status).toBe(599);
  expect(result.metadata.error?.code).toBe(ProductionDiscordRestErrorCode.NETWORK_FAILURE);
  expect(result.metadata.error?.retryable).toBe(true);
});

test('response object remains immutable', async () => {
  const client = new ProductionDiscordRestClient({
    fetchFn: async () => response({ status: 204 }),
  });

  const result = await client.request({
    method: 'DELETE',
    url: 'https://discord.example/api/v10/guilds/guild-1/members/bot-1',
    headers: Object.freeze({ Authorization: 'Bot test-token' }),
  });

  expect(() => {
    (result as unknown as { status: number }).status = 500;
  }).toThrow(TypeError);
});

test('rest client source has no discord.js import, env reads, or persistence writes', () => {
  const filePath = path.join(process.cwd(), 'src/core/runtime/discord/production-discord-rest-client.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  expect(source).not.toMatch(/from\s+['\"]discord\.js['\"]/i);
  expect(source).not.toMatch(/process\.env\b/i);
  expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream|typeorm|prisma|mongoose|sequelize/i);
});
