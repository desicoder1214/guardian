import fs from 'node:fs';
import path from 'node:path';
import {
  DiscordBotRemovalVerificationOutcome,
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
  DiscordBotRemovalOperation,
  InMemoryDiscordExecutionService,
  ProductionDiscordExecutionService,
} from '../../src/core/runtime/discord/discord-execution-service';

test('in-memory execution service throws in production by default', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    expect(() => new InMemoryDiscordExecutionService()).toThrow(
      'InMemoryDiscordExecutionService is test/dev-only and is disabled in production unless allowInMemoryExecution=true',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test('in-memory execution service can be explicitly allowed in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    expect(() => new InMemoryDiscordExecutionService(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { allowInMemoryExecution: true })).not.toThrow();
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test('in-memory discord execution service is side-effect free', async () => {
  const service = new InMemoryDiscordExecutionService();

  await expect(service.guild.createIncident('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'guild',
      operation: 'createIncident',
    },
  });
  await expect(service.guild.notifyAudit('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'guild',
      operation: 'notifyAudit',
    },
  });
  await expect(service.guild.restoreResource('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'guild',
      operation: 'restoreResource',
    },
  });
  await expect(service.guild.escalate('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'guild',
      operation: 'escalate',
    },
  });
  await expect(service.member.banMember('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'member',
      operation: 'banMember',
    },
  });
  await expect(service.member.kickMember('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'member',
      operation: 'kickMember',
    },
  });
  await expect(service.member.removeRoles('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'member',
      operation: 'removeRoles',
    },
  });
  await expect(service.role.restoreRole('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'role',
      operation: 'restoreRole',
    },
  });
  await expect(service.channel.lockChannel('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'channel',
      operation: 'lockChannel',
    },
  });
  await expect(service.channel.unlockChannel('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'channel',
      operation: 'unlockChannel',
    },
  });
  await expect(service.channel.restoreChannel('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'channel',
      operation: 'restoreChannel',
    },
  });
  await expect(service.webhook.deleteWebhook('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'webhook',
      operation: 'deleteWebhook',
    },
  });
  await expect(service.webhook.restoreWebhook('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'webhook',
      operation: 'restoreWebhook',
    },
  });
  await expect(service.webhook.freezeWebhooks('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'webhook',
      operation: 'freezeWebhooks',
    },
  });
  await expect(service.emoji.restoreEmoji('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'emoji',
      operation: 'restoreEmoji',
    },
  });
  await expect(service.vanity.restoreVanity('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'vanity',
      operation: 'restoreVanity',
    },
  });
  await expect(service.integration.restoreIntegration('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'integration',
      operation: 'restoreIntegration',
    },
  });
  await expect(service.bot.removeUnauthorizedBot('corr-1')).resolves.toEqual({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId: 'corr-1',
    metadata: {
      mode: 'in-memory-placeholder',
      service: 'bot',
      operation: 'removeUnauthorizedBot',
    },
  });
});

test('production service executes successful REMOVE_UNAUTHORIZED_BOT and records correlation and latency', async () => {
  const observedRequests: Array<{ correlationId: string; guildId: string; botUserId: string; reason?: string }> = [];
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot(request) {
      observedRequests.push(request);
      return Object.freeze({
        ok: true,
        statusCode: 204,
        metadata: Object.freeze({ apiRoute: '/guilds/g-1/members/bot-1' }),
      });
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const result = await service.bot.removeUnauthorizedBot({
    correlationId: 'corr-prod-success',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-1',
    reason: 'guardian containment',
    metadata: Object.freeze({ source: 'unit-test' }),
  });

  expect(observedRequests).toHaveLength(1);
  expect(observedRequests[0]).toEqual({
    correlationId: 'corr-prod-success',
    guildId: 'g-1',
    botUserId: 'bot-1',
    reason: 'guardian containment',
  });
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(result.correlationId).toBe('corr-prod-success');
  expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

  const metadata = result.metadata as {
    operation: string;
    idempotencyKey: string;
    httpStatus: number;
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
    retry: { bounded: boolean; attemptCount: number; maxAttempts: number; exhausted: boolean };
    rateLimit: { limited: boolean };
  };
  expect(metadata.operation).toBe('REMOVE_UNAUTHORIZED_BOT');
  expect(metadata.idempotencyKey).toBe('idem-1');
  expect(metadata.httpStatus).toBe(204);
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
  expect(metadata.retry).toEqual({ bounded: true, attemptCount: 1, maxAttempts: 2, exhausted: false });
  expect(metadata.rateLimit.limited).toBe(false);
});

test('production service treats already-removed bot as verified success', async () => {
  let callCount = 0;
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      callCount += 1;
      return Object.freeze({
        ok: false,
        statusCode: 404,
        error: Object.freeze({ code: 'ALREADY_REMOVED', message: 'Unknown Member', retryable: false }),
      });
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const result = await service.bot.removeUnauthorizedBot({
    correlationId: 'corr-prod-already-removed',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-already-removed',
  });

  expect(callCount).toBe(1);
  expect(result.status).toBe(DiscordExecutionStatus.SUCCESS);
  const metadata = result.metadata as {
    httpStatus: number;
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
  };
  expect(metadata.httpStatus).toBe(404);
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.ALREADY_REMOVED);
});

test('production service classifies permission failures with verified outcome and non-retryable error', async () => {
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      return Object.freeze({
        ok: false,
        statusCode: 403,
        error: Object.freeze({ code: 'PERMISSION_DENIED', message: 'Missing Permissions', retryable: false }),
      });
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const result = await service.bot.removeUnauthorizedBot({
    correlationId: 'corr-prod-permission-failure',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-permission-failure',
  });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as {
    httpStatus: number;
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
    error: { code: DiscordExecutionErrorCode; retryable: boolean };
  };
  expect(metadata.httpStatus).toBe(403);
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE);
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.API_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('production service returns structured failure with bounded retry metadata', async () => {
  let callCount = 0;
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      callCount += 1;
      return Object.freeze({
        ok: false,
        statusCode: 429,
        error: Object.freeze({ message: 'rate-limited', retryable: true }),
        rateLimit: Object.freeze({ retryAfterMs: 250, bucketId: 'bucket-1', global: false }),
      });
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const result = await service.bot.removeUnauthorizedBot({
    correlationId: 'corr-prod-failure',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-failure',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  expect(result.correlationId).toBe('corr-prod-failure');

  const metadata = result.metadata as {
    httpStatus: number;
    verification: { outcome: DiscordBotRemovalVerificationOutcome };
    retry: { bounded: boolean; attemptCount: number; maxAttempts: number; exhausted: boolean };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
    error: { code: DiscordExecutionErrorCode; message: string; retryable: boolean };
  };
  expect(metadata.httpStatus).toBe(429);
  expect(metadata.verification.outcome).toBe(DiscordBotRemovalVerificationOutcome.FAILURE);
  expect(metadata.retry).toEqual({ bounded: true, attemptCount: 2, maxAttempts: 2, exhausted: true });
  expect(metadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 250, bucketId: 'bucket-1' });
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(metadata.error.retryable).toBe(true);
});

test('production service classifies thrown operation failures as network errors with bounded retries', async () => {
  let callCount = 0;
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      callCount += 1;
      throw new Error('socket hang up');
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const result = await service.bot.removeUnauthorizedBot({
    correlationId: 'corr-prod-network-failure',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-network-failure',
  });

  expect(callCount).toBe(2);
  expect(result.status).toBe(DiscordExecutionStatus.FAILED);

  const metadata = result.metadata as {
    retry: { bounded: boolean; attemptCount: number; maxAttempts: number; exhausted: boolean };
    error: { code: DiscordExecutionErrorCode; message: string; retryable: boolean; cause?: string };
  };

  expect(metadata.retry).toEqual({ bounded: true, attemptCount: 2, maxAttempts: 2, exhausted: true });
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.NETWORK_ERROR);
  expect(metadata.error.retryable).toBe(true);
  expect(metadata.error.message).toBe('socket hang up');
  expect(metadata.error.cause).toBe('socket hang up');
});

test('production service supports idempotent duplicate execution behavior', async () => {
  let callCount = 0;
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      callCount += 1;
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  };

  const service = new ProductionDiscordExecutionService(operation, { maxAttempts: 2 });
  const request = Object.freeze({
    correlationId: 'corr-prod-dup',
    guildId: 'g-1',
    botUserId: 'bot-1',
    idempotencyKey: 'idem-dup',
  });

  const first = await service.bot.removeUnauthorizedBot(request);
  const second = await service.bot.removeUnauthorizedBot(request);

  expect(first.status).toBe(DiscordExecutionStatus.SUCCESS);
  expect(second.status).toBe(DiscordExecutionStatus.SKIPPED);
  expect(callCount).toBe(1);

  const duplicateMetadata = second.metadata as { duplicate?: boolean };
  expect(duplicateMetadata.duplicate).toBe(true);
});

test('production foundation validates required bot execution request fields', async () => {
  const operation: DiscordBotRemovalOperation = {
    async removeUnauthorizedBot() {
      return Object.freeze({ ok: true, statusCode: 204 });
    },
  };

  const service = new ProductionDiscordExecutionService(operation);
  const result = await service.bot.removeUnauthorizedBot({ correlationId: 'corr-missing-fields' });

  expect(result.status).toBe(DiscordExecutionStatus.FAILED);
  const metadata = result.metadata as { error: { code: DiscordExecutionErrorCode; retryable: boolean } };
  expect(metadata.error.code).toBe(DiscordExecutionErrorCode.VALIDATION_ERROR);
  expect(metadata.error.retryable).toBe(false);
});

test('production service does not include planning, routing, policy, or detector logic', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/discord-execution-service.ts'),
    'utf8',
  );

  expect(source).not.toMatch(/security-action-planner|execution-planner|hot-path-planner/i);
  expect(source).not.toMatch(/policy-engine|security-policy|decision-engine/i);
  expect(source).not.toMatch(/execution-router|routingResult|dispatchIntent|topologyResolver|strategyResolver/i);
  expect(source).not.toMatch(/detector|threat-interpretation/i);
});
