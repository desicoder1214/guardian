import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedMemberModerationDetector } from '../../src/core/runtime/discord/unauthorized-member-moderation-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_BAN_ADD',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-member-mod-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      memberUserId: 'member-1',
      targetId: 'member-1',
      resourceId: 'member-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedMemberModerationDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedMemberModerationDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.MEMBER_BAN,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedMemberIds: Object.freeze([]),
      authorizedActorIds: Object.freeze([]),
      trustedActorIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('detector identity and capabilities are stable', () => {
  const detector = new UnauthorizedMemberModerationDetector();

  expect(detector.detectorId).toBe('unauthorized-member-moderation-detector');
  expect(detector.version).toBe('1.0.0');
  expect(detector.priority).toBe(97);
  expect(detector.supportedActionTypes).toEqual([
    SecurityActionType.MEMBER_BAN,
    SecurityActionType.MEMBER_KICK,
  ]);
  expect(detector.enabled(buildContext())).toBe(true);
});

test('unauthorized member ban is detected as MALICIOUS', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  expect(result.findings[0]?.reason).toContain('not authorized');
});

test('authorized member moderation is ignored (CLEAN)', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedMemberIds: Object.freeze(['member-1']),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('trusted actor is respected for member moderation', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedMemberIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('guild member remove without kick indicators is ignored', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(
    buildContext({
      actionType: SecurityActionType.MEMBER_KICK,
      normalizedEvent: buildEvent({
        eventName: 'GUILD_MEMBER_REMOVE',
        correlationId: 'corr-member-mod-2',
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          memberUserId: 'member-1',
          targetId: 'member-1',
          resourceId: 'member-1',
        },
      }),
      correlationId: 'corr-member-mod-2',
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toContain('does not represent ban/kick moderation');
});

test('member remove with kick indicator is treated as kick moderation', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(
    buildContext({
      actionType: SecurityActionType.MEMBER_KICK,
      normalizedEvent: buildEvent({
        eventName: 'GUILD_MEMBER_REMOVE',
        correlationId: 'corr-member-mod-3',
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          memberUserId: 'member-1',
          targetId: 'member-1',
          resourceId: 'member-1',
          kicked: true,
        },
      }),
      correlationId: 'corr-member-mod-3',
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('kick is not authorized');
});

test('metadata and correlationId are preserved', async () => {
  const detector = new UnauthorizedMemberModerationDetector();

  const result = await detector.evaluate(
    buildContext({
      correlationId: 'corr-member-mod-9',
      normalizedEvent: buildEvent({
        correlationId: 'corr-member-mod-9',
      }),
    }),
  );

  expect(result.correlationId).toBe('corr-member-mod-9');
  expect(result.findings[0]?.correlationId).toBe('corr-member-mod-9');

  const findingMetadata = result.findings[0]?.metadata as
    | { runtimeThreatOverrides?: readonly unknown[]; memberUserId?: string; actorId?: string }
    | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
  expect(findingMetadata?.memberUserId).toBe('member-1');
  expect(findingMetadata?.actorId).toBe('actor-1');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedMemberModerationDetector();
  const context = buildContext();

  const first = await detector.evaluate(context);
  const second = await detector.evaluate(context);

  expect(first).toEqual(second);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.findings)).toBe(true);

  expect(() => {
    (first as { matched: boolean }).matched = false;
  }).toThrow(TypeError);
});

test('plugin registration and detection engine execution work', async () => {
  const detector = new UnauthorizedMemberModerationDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  expect(registry.getPlugin(detector.detectorId)).toBe(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-member-moderation-detector.ts');
  const source = readFileSync(detectorFilePath, 'utf8');

  const forbiddenPatterns = [
    /discord\.js/i,
    /node:fs|from\s+['"]fs['"]/i,
    /fetch\s*\(/i,
    /database|typeorm|prisma|mongoose|sequelize/i,
    /persist|repository|save\s*\(/i,
    /lockdown/i,
    /recovery/i,
  ];

  for (const pattern of forbiddenPatterns) {
    expect(source).not.toMatch(pattern);
  }
});
