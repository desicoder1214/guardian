import { InMemoryDiscordExecutionService, DiscordExecutionStatus } from '../../src/core/runtime/discord/discord-execution-service';

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
