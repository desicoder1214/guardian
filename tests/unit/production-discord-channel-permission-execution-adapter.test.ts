import {
  DiscordChannelContainmentVerificationOutcome,
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
  DiscordPermissionOverwriteVerificationOutcome,
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

test('successful channel containment returns verified success and expected endpoint', async () => {
  const calls: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      calls.push(request);
      return response({ status: 200 });
    },
  };

  const adapter = createAdapter(client, { apiBaseUrl: 'https://discord.example', apiVersion: 10 });
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-channel-success-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    idempotencyKey: 'idem-channel-1',
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe('PATCH');
  expect(calls[0].url).toBe('https://discord.example/api/v10/channels/channel-1');
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as {
    verification: { outcome: DiscordChannelContainmentVerificationOutcome };
    idempotencyKey: string;
  };
  expect(metadata.verification.outcome).toBe(DiscordChannelContainmentVerificationOutcome.SUCCESS);
  expect(metadata.idempotencyKey).toBe('idem-channel-1');
});

test('already contained channel is classified as verified success', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => Object.freeze({ code: 'ALREADY_CONTAINED', message: 'Already contained' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-channel-contained-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as { verification: { outcome: DiscordChannelContainmentVerificationOutcome } };
  expect(metadata.verification.outcome).toBe(DiscordChannelContainmentVerificationOutcome.ALREADY_CONTAINED);
});

test('channel permission failure is classified with verification metadata', async () => {
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
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-channel-permission-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordChannelContainmentVerificationOutcome };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.verification.outcome).toBe(DiscordChannelContainmentVerificationOutcome.PERMISSION_FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('channel rate limit preserves retry metadata', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headers({ 'retry-after': '0.25', 'x-ratelimit-bucket': 'bucket-channel-rate-1' }),
        json: async () => Object.freeze({ message: 'rate-limited' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-channel-rate-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
  };
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(metadata.error.retryable).toBe(true);
  expect(metadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250, bucketId: 'bucket-channel-rate-1' });
});

test('duplicate channel containment requests are idempotently suppressed', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({ status: 200 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-channel-dup-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    idempotencyKey: 'idem-channel-dup-1',
  });

  const first = await adapter.channel.lockChannel(request);
  const second = await adapter.channel.lockChannel(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(callCount).toBe(1);
  const metadata = second.metadata as { duplicate?: boolean };
  expect(metadata.duplicate).toBe(true);
});

test('channel metadata propagation and deterministic idempotency key are preserved', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({ status: 200 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-channel-meta-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    idempotencyKey: 'idem-channel-meta-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({ severity: 'HIGH' }),
      securityDecision: Object.freeze({ decision: 'BLOCK' }),
      authorizationMetadata: Object.freeze({ source: 'auth-engine' }),
    }),
  });

  const first = await adapter.channel.lockChannel(request);
  const second = await adapter.channel.lockChannel(request);

  const firstMetadata = first.metadata as {
    idempotencyKey: string;
    metadata: {
      threatAssessment: { severity: string };
      securityDecision: { decision: string };
      authorizationMetadata: { source: string };
    };
  };

  expect(firstMetadata.idempotencyKey).toBe('idem-channel-meta-1');
  expect(firstMetadata.metadata.threatAssessment).toEqual({ severity: 'HIGH' });
  expect(firstMetadata.metadata.securityDecision).toEqual({ decision: 'BLOCK' });
  expect(firstMetadata.metadata.authorizationMetadata).toEqual({ source: 'auth-engine' });

  const secondMetadata = second.metadata as { idempotencyKey: string };
  expect(secondMetadata.idempotencyKey).toBe('idem-channel-meta-1');
});

test('permission overwrite restore supports success and metadata propagation', async () => {
  const calls: Array<{ method: string; url: string }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      calls.push({ method: request.method, url: request.url });
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client, { apiBaseUrl: 'https://discord.example', apiVersion: 10 });
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-overwrite-success-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
    idempotencyKey: 'idem-overwrite-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({ severity: 'HIGH' }),
      securityDecision: Object.freeze({ decision: 'RESTORE' }),
      authorizationMetadata: Object.freeze({ source: 'auth-engine' }),
    }),
  });

  expect(calls).toEqual([
    {
      method: 'DELETE',
      url: 'https://discord.example/api/v10/channels/channel-1/permissions/overwrite-1',
    },
  ]);
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as {
    verification: { outcome: DiscordPermissionOverwriteVerificationOutcome };
    metadata: {
      threatAssessment: { severity: string };
      securityDecision: { decision: string };
      authorizationMetadata: { source: string };
    };
  };
  expect(metadata.verification.outcome).toBe(DiscordPermissionOverwriteVerificationOutcome.SUCCESS);
  expect(metadata.metadata.threatAssessment).toEqual({ severity: 'HIGH' });
  expect(metadata.metadata.securityDecision).toEqual({ decision: 'RESTORE' });
  expect(metadata.metadata.authorizationMetadata).toEqual({ source: 'auth-engine' });
});

test('already restored permission overwrite is classified as verified success', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_OVERWRITE', message: 'Unknown Overwrite' }),
      });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-overwrite-absent-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as { verification: { outcome: DiscordPermissionOverwriteVerificationOutcome } };
  expect(metadata.verification.outcome).toBe(DiscordPermissionOverwriteVerificationOutcome.ALREADY_RESTORED);
});

test('permission overwrite permission failure is classified with verification metadata', async () => {
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
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-overwrite-permission-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordPermissionOverwriteVerificationOutcome };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.verification.outcome).toBe(DiscordPermissionOverwriteVerificationOutcome.PERMISSION_FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('permission overwrite rate limit preserves retry metadata', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: headers({ 'retry-after': '0.25', 'x-ratelimit-bucket': 'bucket-overwrite-rate-1' }),
        json: async () => Object.freeze({ message: 'rate-limited' }),
      });
    },
  };

  const adapter = createAdapter(client, { maxAttempts: 2 });
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-overwrite-rate-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
  };
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(metadata.error.retryable).toBe(true);
  expect(metadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250, bucketId: 'bucket-overwrite-rate-1' });
});

test('duplicate permission overwrite restore requests are idempotently suppressed', async () => {
  let callCount = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      callCount += 1;
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const request = Object.freeze({
    correlationId: 'corr-overwrite-dup-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
    idempotencyKey: 'idem-overwrite-dup-1',
  });

  const first = await adapter.channel.restoreChannel(request);
  const second = await adapter.channel.restoreChannel(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(callCount).toBe(1);
  const metadata = second.metadata as { duplicate?: boolean };
  expect(metadata.duplicate).toBe(true);
});

test('channel validation failure is returned when required fields are missing', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({ status: 200 });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-validation-channel-1',
    guildId: 'guild-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordChannelContainmentVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordChannelContainmentVerificationOutcome.FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.VALIDATION_ERROR);
});

test('channel unknown failure classification is surfaced for unknown upstream errors', async () => {
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
  const result = await adapter.channel.lockChannel({
    correlationId: 'corr-unknown-channel-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordChannelContainmentVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordChannelContainmentVerificationOutcome.UNKNOWN_ERROR);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.UNKNOWN_ERROR);
});

test('permission overwrite validation failure is returned when required fields are missing', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return response({ status: 204 });
    },
  };

  const adapter = createAdapter(client);
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-validation-overwrite-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordPermissionOverwriteVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordPermissionOverwriteVerificationOutcome.FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.VALIDATION_ERROR);
});

test('permission overwrite unknown failure classification is surfaced for unknown upstream errors', async () => {
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
  const result = await adapter.channel.restoreChannel({
    correlationId: 'corr-unknown-overwrite-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    overwriteId: 'overwrite-1',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    verification: { outcome: DiscordPermissionOverwriteVerificationOutcome };
    error: { code: DiscordExecutionErrorCode };
  };
  expect(metadata.verification.outcome).toBe(DiscordPermissionOverwriteVerificationOutcome.UNKNOWN_ERROR);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.UNKNOWN_ERROR);
});
