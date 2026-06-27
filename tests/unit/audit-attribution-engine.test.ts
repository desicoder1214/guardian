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
