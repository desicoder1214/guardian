import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedEmojiStickerDeletionDetector } from '../../src/core/runtime/discord/unauthorized-emoji-sticker-deletion-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_EMOJIS_UPDATE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-emoji-sticker-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      deletedEmojiIds: ['emoji-1'],
      targetId: 'emoji-1',
      resourceId: 'emoji-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedEmojiStickerDeletionDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedEmojiStickerDeletionDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.MEMBER_KICK,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedEmojiIds: Object.freeze([]),
      authorizedStickerIds: Object.freeze([]),
      authorizedActorIds: Object.freeze([]),
      trustedActorIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('detector identity and capabilities are stable', () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  expect(detector.detectorId).toBe('unauthorized-emoji-sticker-deletion-detector');
  expect(detector.version).toBe('1.0.0');
  expect(detector.priority).toBe(97);
  expect(detector.supportedActionTypes).toEqual([SecurityActionType.MEMBER_KICK]);
  expect(detector.enabled(buildContext())).toBe(true);
});

test('unauthorized emoji deletion is detected as MALICIOUS', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  expect(result.findings[0]?.reason).toContain('not authorized');
});

test('authorized emoji deletion is CLEAN', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedEmojiIds: Object.freeze(['emoji-1']),
        authorizedStickerIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('authorized sticker deletion is CLEAN', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        eventName: 'STICKER_DELETE',
        correlationId: 'corr-emoji-sticker-2',
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          stickerId: 'sticker-1',
          targetId: 'sticker-1',
          resourceId: 'sticker-1',
        },
      }),
      correlationId: 'corr-emoji-sticker-2',
      metadata: Object.freeze({
        authorizedEmojiIds: Object.freeze([]),
        authorizedStickerIds: Object.freeze(['sticker-1']),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('trusted actor is respected for emoji/sticker deletion', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedEmojiIds: Object.freeze([]),
        authorizedStickerIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('emoji update without deletion signal is ignored', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          emojiId: 'emoji-1',
          action: 'UPDATE',
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toBe('Event does not represent emoji/sticker deletion');
});

test('explicit policy violation is malicious even for authorized resource', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          deletedEmojiIds: ['emoji-1'],
          emojiStickerDeletionPolicyViolation: true,
        },
      }),
      metadata: Object.freeze({
        authorizedEmojiIds: Object.freeze(['emoji-1']),
        authorizedStickerIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates containment policy');
});

test('metadata and correlationId are preserved', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();

  const result = await detector.evaluate(
    buildContext({
      correlationId: 'corr-emoji-sticker-9',
      normalizedEvent: buildEvent({
        correlationId: 'corr-emoji-sticker-9',
      }),
    }),
  );

  expect(result.correlationId).toBe('corr-emoji-sticker-9');
  expect(result.findings[0]?.correlationId).toBe('corr-emoji-sticker-9');

  const findingMetadata = result.findings[0]?.metadata as
    | { runtimeThreatOverrides?: readonly unknown[]; deletedResourceIds?: readonly string[]; actorId?: string }
    | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
  expect(findingMetadata?.deletedResourceIds).toEqual(['emoji-1']);
  expect(findingMetadata?.actorId).toBe('actor-1');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedEmojiStickerDeletionDetector();
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
  const detector = new UnauthorizedEmojiStickerDeletionDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-emoji-sticker-deletion-detector.ts');
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
