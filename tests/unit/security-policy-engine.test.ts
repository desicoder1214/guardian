import { InMemorySecurityPolicyProvider } from '../../src/core/runtime/discord/security-policy-provider';
import { InMemorySecurityPolicyEngine } from '../../src/core/runtime/discord/policy-engine';
import {
  GuildSecurityPolicy,
  SecurityActionType,
  SecurityDecision,
  ThresholdRule,
} from '../../src/core/runtime/discord/security-policy-types';
import { Clock, InMemoryThresholdTracker } from '../../src/core/runtime/discord/threshold-tracker';
import {
  InMemorySecurityContextBuilder,
  SecurityContext,
} from '../../src/core/runtime/discord/security-context';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';

class FakeClock implements Clock {
  constructor(private currentMs: number) {}

  now(): number {
    return this.currentMs;
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }
}

function buildEvent(guildId: string): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'TEST_EVENT',
    source: 'discord-gateway',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-1',
    payload: {
      guildId,
      targetId: 'target-1',
      resourceType: 'channel',
      resourceId: 'resource-1',
      auditLogCorrelationId: 'audit-1',
      metadata: { note: 'context metadata' },
    },
  };
}

function buildPolicy(guildId: string, rule: ThresholdRule): GuildSecurityPolicy {
  return {
    guildId,
    rules: [rule],
    trustedUserIds: [],
  };
}

function buildRule(enabled = true): ThresholdRule {
  return {
    actionType: SecurityActionType.CHANNEL_DELETE,
    enabled,
    threshold: 2,
    windowMs: 1000,
    decisionOnViolation: SecurityDecision.CONTAIN,
  };
}

function buildContext(guildId: string, actorId = 'actor-1'): SecurityContext {
  const builder = new InMemorySecurityContextBuilder();
  return builder.build(buildEvent(guildId), actorId, SecurityActionType.CHANNEL_DELETE);
}

test('SecurityContext is built correctly', () => {
  const builder = new InMemorySecurityContextBuilder();
  const context = builder.build(buildEvent('guild-1'), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(context).toEqual({
    guildId: 'guild-1',
    actorId: 'actor-1',
    targetId: 'target-1',
    actionType: SecurityActionType.CHANNEL_DELETE,
    eventName: 'TEST_EVENT',
    resourceType: 'channel',
    resourceId: 'resource-1',
    timestamp: expect.any(String),
    correlationId: 'corr-1',
    auditLogCorrelationId: 'audit-1',
    metadata: {
      guildId: 'guild-1',
      targetId: 'target-1',
      resourceType: 'channel',
      resourceId: 'resource-1',
      auditLogCorrelationId: 'audit-1',
      metadata: { note: 'context metadata' },
    },
  });
});

test('Action below threshold returns ALLOW', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  provider.setPolicy('guild-1', buildPolicy('guild-1', buildRule()));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  const result = await engine.evaluate(buildContext('guild-1'));

  expect(result.decision).toBe(SecurityDecision.ALLOW);
});

test('Action exceeding threshold returns configured violation decision', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  provider.setPolicy('guild-1', buildPolicy('guild-1', buildRule()));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  await engine.evaluate(buildContext('guild-1'));
  await engine.evaluate(buildContext('guild-1'));
  const result = await engine.evaluate(buildContext('guild-1'));

  expect(result.decision).toBe(SecurityDecision.CONTAIN);
});

test('Separate actors are counted separately', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  provider.setPolicy('guild-1', buildPolicy('guild-1', buildRule()));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  await engine.evaluate(buildContext('guild-1', 'actor-1'));
  await engine.evaluate(buildContext('guild-1', 'actor-1'));
  const actorTwoResult = await engine.evaluate(buildContext('guild-1', 'actor-2'));

  expect(actorTwoResult.decision).toBe(SecurityDecision.ALLOW);
});

test('Separate guilds are counted separately', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  const rule = buildRule();
  provider.setPolicy('guild-1', buildPolicy('guild-1', rule));
  provider.setPolicy('guild-2', buildPolicy('guild-2', rule));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  await engine.evaluate(buildContext('guild-1', 'actor-1'));
  await engine.evaluate(buildContext('guild-1', 'actor-1'));
  const guildTwoResult = await engine.evaluate(buildContext('guild-2', 'actor-1'));

  expect(guildTwoResult.decision).toBe(SecurityDecision.ALLOW);
});

test('Expired windows reset counts', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  provider.setPolicy('guild-1', buildPolicy('guild-1', buildRule()));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  await engine.evaluate(buildContext('guild-1'));
  await engine.evaluate(buildContext('guild-1'));

  clock.advance(1001);

  const resultAfterWindow = await engine.evaluate(buildContext('guild-1'));

  expect(resultAfterWindow.decision).toBe(SecurityDecision.ALLOW);
});

test('Disabled rules do not trigger', async () => {
  const provider = new InMemorySecurityPolicyProvider();
  provider.setPolicy('guild-1', buildPolicy('guild-1', buildRule(false)));

  const clock = new FakeClock(1000);
  const tracker = new InMemoryThresholdTracker(clock);
  const engine = new InMemorySecurityPolicyEngine(provider, tracker);

  await engine.evaluate(buildContext('guild-1'));
  await engine.evaluate(buildContext('guild-1'));
  const result = await engine.evaluate(buildContext('guild-1'));

  expect(result.decision).toBe(SecurityDecision.ALLOW);
});
