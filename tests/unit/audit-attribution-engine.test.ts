import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditLogEntry,
} from '../../src/core/runtime/discord/audit-attribution-types';
import { InMemoryAuditLogProvider } from '../../src/core/runtime/discord/audit-log-provider';
import { InMemoryAuditAttributionEngine } from '../../src/core/runtime/discord/audit-attribution-engine';
import { Clock } from '../../src/core/runtime/discord/threshold-tracker';

class FakeClock implements Clock {
  constructor(private currentMs: number) {}

  now(): number {
    return this.currentMs;
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }
}

function buildEvent(guildId: string, payloadOverrides: Record<string, unknown> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'TEST_EVENT',
    source: 'discord-gateway',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-1',
    payload: {
      guildId,
      ...payloadOverrides,
    },
  };
}

function buildEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'audit-1',
    guildId: 'guild-1',
    actorId: 'actor-1',
    targetId: 'target-1',
    actionType: AuditActionType.MEMBER_BAN,
    resourceId: 'resource-1',
    timestamp: new Date().toISOString(),
    metadata: { source: 'audit-log' },
    ...overrides,
  };
}

test('matching audit entry returns HIGH confidence', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_500).toISOString(),
      actorId: 'actor-1',
      targetId: 'target-9',
      resourceId: 'resource-9',
      id: 'audit-high',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);
  const result = await engine.attribute(
    buildEvent('guild-1', { targetId: 'target-9', resourceId: 'resource-9' }),
    AuditActionType.CHANNEL_DELETE,
  );

  expect(result.confidence).toBe(AuditAttributionConfidence.HIGH);
  expect(result.actorId).toBe('actor-1');
  expect(result.targetId).toBe('target-9');
  expect(result.auditLogCorrelationId).toBe('audit-high');
});

test('no matching audit entry returns NONE', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);

  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
  expect(result.actorId).toBe('');
});

test('wrong guild does not match', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      guildId: 'guild-2',
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_500).toISOString(),
      id: 'audit-wrong-guild',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);
  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
});

test('wrong action type does not match', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      guildId: 'guild-1',
      actionType: AuditActionType.CHANNEL_CREATE,
      timestamp: new Date(1_500).toISOString(),
      id: 'audit-wrong-action',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);
  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
});

test('recent entry is preferred over older entry', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      guildId: 'guild-1',
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_100).toISOString(),
      actorId: 'older-actor',
      targetId: 'older-target',
      id: 'audit-older',
    }),
  );
  provider.record(
    buildEntry({
      guildId: 'guild-1',
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_900).toISOString(),
      actorId: 'newer-actor',
      targetId: 'newer-target',
      id: 'audit-newer',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);
  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.HIGH);
  expect(result.actorId).toBe('newer-actor');
  expect(result.auditLogCorrelationId).toBe('audit-newer');
});

test('attribution does not perform punishment or Discord API calls', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      guildId: 'guild-1',
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_500).toISOString(),
      id: 'audit-safe',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000);
  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.HIGH);
  expect(provider.findRecentEntries('guild-1', AuditActionType.CHANNEL_DELETE, 1_000)).toHaveLength(1);
});

test('delayed audit entry is resolved within bounded timeout', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  const engine = new InMemoryAuditAttributionEngine(provider, 1_000, 120, 10);

  setTimeout(() => {
    clock.advance(20);
    provider.record(
      buildEntry({
        id: 'audit-delayed',
        actionType: AuditActionType.CHANNEL_DELETE,
        timestamp: new Date(1_980).toISOString(),
        actorId: 'actor-delayed',
        resourceId: 'resource-delayed',
      }),
    );
  }, 20);

  const result = await engine.attribute(
    buildEvent('guild-1', { resourceId: 'resource-delayed' }),
    AuditActionType.CHANNEL_DELETE,
  );

  expect(result.confidence).toBe(AuditAttributionConfidence.HIGH);
  expect(result.actorId).toBe('actor-delayed');
  expect(result.auditLogCorrelationId).toBe('audit-delayed');
});

test('missing attribution returns NONE after bounded timeout', async () => {
  const clock = new FakeClock(2_000);
  const provider = new InMemoryAuditLogProvider(clock);
  const engine = new InMemoryAuditAttributionEngine(provider, 1_000, 30, 10);

  const result = await engine.attribute(buildEvent('guild-1'), AuditActionType.CHANNEL_DELETE);

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
  expect(result.reason).toContain('bounded attribution timeout');
});

test('conflicting actors resolve deterministically by resource and timestamp correlation', async () => {
  const clock = new FakeClock(10_000);
  const provider = new InMemoryAuditLogProvider(clock);

  provider.record(
    buildEntry({
      id: 'audit-conflict-a',
      actorId: 'actor-z',
      actionType: AuditActionType.CHANNEL_DELETE,
      resourceId: 'resource-conflict',
      timestamp: new Date(9_940).toISOString(),
    }),
  );
  provider.record(
    buildEntry({
      id: 'audit-conflict-b',
      actorId: 'actor-a',
      actionType: AuditActionType.CHANNEL_DELETE,
      resourceId: 'resource-conflict',
      timestamp: new Date(9_940).toISOString(),
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 2_000, 1, 1, 60_000);
  const result = await engine.attribute(
    {
      ...buildEvent('guild-1', { resourceId: 'resource-conflict' }),
      timestamp: new Date(9_940).toISOString(),
    },
    AuditActionType.CHANNEL_DELETE,
  );

  expect(result.confidence).toBe(AuditAttributionConfidence.MEDIUM);
  expect(result.auditLogCorrelationId).toBe('audit-conflict-b');
  expect(result.reason).toContain('conflicting audit entries resolved deterministically');
});

test('stale audit entries are rejected by event timestamp skew guard', async () => {
  const clock = new FakeClock(40_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      id: 'audit-stale',
      actionType: AuditActionType.CHANNEL_DELETE,
      timestamp: new Date(1_000).toISOString(),
      resourceId: 'resource-stale',
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 60_000, 1, 1, 5_000);
  const result = await engine.attribute(
    {
      ...buildEvent('guild-1', { resourceId: 'resource-stale' }),
      timestamp: new Date(40_000).toISOString(),
    },
    AuditActionType.CHANNEL_DELETE,
  );

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
  expect(result.reason).toContain('stale audit entries rejected');
});

test('action type mismatch is never correlated even when resource id and timestamp match', async () => {
  const clock = new FakeClock(5_000);
  const provider = new InMemoryAuditLogProvider(clock);
  provider.record(
    buildEntry({
      id: 'audit-action-mismatch',
      actionType: AuditActionType.WEBHOOK_CREATE,
      resourceId: 'resource-same',
      timestamp: new Date(4_950).toISOString(),
    }),
  );

  const engine = new InMemoryAuditAttributionEngine(provider, 1_000, 1, 1, 30_000);
  const result = await engine.attribute(
    {
      ...buildEvent('guild-1', { resourceId: 'resource-same' }),
      timestamp: new Date(4_950).toISOString(),
    },
    AuditActionType.CHANNEL_DELETE,
  );

  expect(result.confidence).toBe(AuditAttributionConfidence.NONE);
});
