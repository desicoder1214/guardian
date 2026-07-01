import { InMemorySecurityContextBuilder } from '../../src/core/runtime/discord/security-context';
import { InMemorySecurityDecisionEngine } from '../../src/core/runtime/discord/security-decision-engine';
import { InMemoryAuditAttributionEngine } from '../../src/core/runtime/discord/audit-attribution-engine';
import { InMemoryAuditLogProvider } from '../../src/core/runtime/discord/audit-log-provider';
import { AuditActionType, AuditAttributionConfidence, AuditLogEntry } from '../../src/core/runtime/discord/audit-attribution-types';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import { SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
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

function buildNormalizedEvent(guildId: string, targetId = 'target-1'): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-1',
    payload: {
      guildId,
      targetId,
      resourceId: 'resource-1',
      auditLogCorrelationId: 'audit-context-1',
    },
  };
}

function buildContext(guildId: string, actorId = 'actor-1') {
  return new InMemorySecurityContextBuilder().build(
    buildNormalizedEvent(guildId),
    actorId,
    SecurityActionType.CHANNEL_DELETE,
  );
}

function buildAttribution(overrides: Partial<{ actorId: string; confidence: AuditAttributionConfidence; auditLogCorrelationId: string; targetId: string }>) {
  return {
    actorId: 'actor-1',
    targetId: 'target-1',
    auditLogCorrelationId: 'audit-1',
    confidence: AuditAttributionConfidence.HIGH,
    reason: 'matched',
    matchedEntry: undefined,
    ...overrides,
  };
}

function buildPolicyDecision(overrides: Partial<{ enabled: boolean; decision: SecurityDecision; thresholdExceeded: boolean; trustedActorIds: readonly string[] }>) {
  return {
    enabled: true,
    decision: SecurityDecision.CONTAIN,
    thresholdExceeded: true,
    trustedActorIds: [],
    ...overrides,
  };
}

test('threshold exceeded returns configured policy decision', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ confidence: AuditAttributionConfidence.HIGH }),
    buildPolicyDecision({ decision: SecurityDecision.BLOCK, thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.BLOCK);
  expect(result.reason).toBe(SecurityDecisionReason.POLICY_BLOCK);
});

test('no attribution returns INVESTIGATE', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ actorId: '', confidence: AuditAttributionConfidence.NONE, auditLogCorrelationId: undefined }),
    buildPolicyDecision({ thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.INVESTIGATE);
  expect(result.reason).toBe(SecurityDecisionReason.ATTRIBUTION_FAILED);
});

test('low confidence returns INVESTIGATE', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ confidence: AuditAttributionConfidence.LOW }),
    buildPolicyDecision({ thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.INVESTIGATE);
  expect(result.reason).toBe(SecurityDecisionReason.ATTRIBUTION_LOW_CONFIDENCE);
});

test('disabled rule returns IGNORE', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ confidence: AuditAttributionConfidence.HIGH }),
    buildPolicyDecision({ enabled: false, thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.IGNORE);
  expect(result.reason).toBe(SecurityDecisionReason.NO_POLICY);
});

test('trusted placeholder returns ALLOW', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1', 'trusted-user'),
    buildAttribution({ actorId: 'trusted-user', confidence: AuditAttributionConfidence.HIGH }),
    buildPolicyDecision({ trustedActorIds: ['trusted-user'], thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.ALLOW);
  expect(result.reason).toBe(SecurityDecisionReason.TRUSTED_ACTOR);
});

test('trusted actor does not bypass forced fast-path blocking', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1', 'trusted-user'),
    buildAttribution({ actorId: 'trusted-user', confidence: AuditAttributionConfidence.HIGH }),
    {
      ...buildPolicyDecision({
        trustedActorIds: ['trusted-user'],
        thresholdExceeded: true,
        decision: SecurityDecision.BLOCK,
      }),
      metadata: Object.freeze({ fastPathEnforcement: true }),
    },
  );

  expect(result.decision).toBe(SecurityDecision.BLOCK);
  expect(result.reason).toBe(SecurityDecisionReason.POLICY_BLOCK);
});

test('policy allow returns ALLOW', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ confidence: AuditAttributionConfidence.HIGH }),
    buildPolicyDecision({ decision: SecurityDecision.ALLOW, thresholdExceeded: false }),
  );

  expect(result.decision).toBe(SecurityDecision.ALLOW);
  expect(result.reason).toBe(SecurityDecisionReason.POLICY_ALLOW);
});

test('policy block returns BLOCK', async () => {
  const engine = new InMemorySecurityDecisionEngine();
  const result = await engine.evaluate(
    buildContext('guild-1'),
    buildAttribution({ confidence: AuditAttributionConfidence.HIGH }),
    buildPolicyDecision({ decision: SecurityDecision.BLOCK, thresholdExceeded: true }),
  );

  expect(result.decision).toBe(SecurityDecision.BLOCK);
  expect(result.reason).toBe(SecurityDecisionReason.POLICY_BLOCK);
});
