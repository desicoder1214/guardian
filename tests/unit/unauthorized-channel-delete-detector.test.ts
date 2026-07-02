import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedChannelDeleteDetector } from '../../src/core/runtime/discord/unauthorized-channel-delete-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-channel-delete-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      channelId: 'channel-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedChannelDeleteDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedChannelDeleteDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.CHANNEL_DELETE,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedChannelIds: Object.freeze([]),
      authorizedActorIds: Object.freeze([]),
      trustedActorIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('authorized channel deletion produces CLEAN finding', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedChannelIds: Object.freeze(['channel-1']),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('trusted administrator deletion produces CLEAN finding', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedChannelIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('unauthorized channel deletion is MALICIOUS and force-blocked', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.detectorId).toBe('unauthorized-channel-delete-detector');
  expect(result.matched).toBe(true);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  const findingMetadata = result.findings[0]?.metadata as { runtimeThreatOverrides?: readonly unknown[] } | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
});

test('explicit policy violation is malicious even when actor is trusted', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          channelId: 'channel-1',
          channelPolicyViolation: true,
        },
      }),
      metadata: Object.freeze({
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates channel deletion policy');
});

test('non-channel-delete events are ignored', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({ eventName: 'WEBHOOK_CREATE' }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toBe('Event does not represent channel deletion');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedChannelDeleteDetector();
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
  const detector = new UnauthorizedChannelDeleteDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-channel-delete-detector.ts');
  const source = readFileSync(detectorFilePath, 'utf8');

  const forbiddenPatterns = [
    /discord\.js/i,
    /node:fs|from\s+['"]fs['"]/i,
    /fetch\s*\(/i,
    /database|typeorm|prisma|mongoose|sequelize/i,
    /persist|repository|save\s*\(/i,
    /ban\s*\(|kick\s*\(|quarantine/i,
    /lockdown/i,
    /recovery/i,
    /punishment/i,
  ];

  for (const pattern of forbiddenPatterns) {
    expect(source).not.toMatch(pattern);
  }
});
