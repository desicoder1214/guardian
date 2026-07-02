import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedGuildConfigurationDetector } from '../../src/core/runtime/discord/unauthorized-guild-configuration-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_UPDATE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-guild-config-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      changedKeys: ['name', 'icon'],
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedGuildConfigurationDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedGuildConfigurationDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.GUILD_CONFIGURATION_UPDATE,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      guildConfigurationAuthorization: Object.freeze({
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
        ownerIds: Object.freeze([]),
      }),
    }),
    ...overrides,
  };
}

test('detector supports GUILD_CONFIGURATION_UPDATE action', () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  expect(detector.supportedActionTypes).toEqual([SecurityActionType.GUILD_CONFIGURATION_UPDATE]);
});

test('unauthorized guild configuration update is MALICIOUS and force-blocked', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.detectorId).toBe('unauthorized-guild-configuration-detector');
  expect(result.matched).toBe(true);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  const findingMetadata = result.findings[0]?.metadata as { runtimeThreatOverrides?: readonly unknown[] } | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
});

test('authorized actor guild configuration update is CLEAN', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        guildConfigurationAuthorization: Object.freeze({
          authorizedActorIds: Object.freeze(['actor-1']),
          trustedActorIds: Object.freeze([]),
          ownerIds: Object.freeze([]),
        }),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('trusted actor guild configuration update is CLEAN', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        guildConfigurationAuthorization: Object.freeze({
          authorizedActorIds: Object.freeze([]),
          trustedActorIds: Object.freeze(['actor-1']),
          ownerIds: Object.freeze([]),
        }),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('guild owner exemption keeps finding CLEAN', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'owner-1',
          ownerId: 'owner-1',
          changedKeys: ['name'],
        },
      }),
      actorId: 'owner-1',
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toContain('owner exemption');
});

test('policy violation is malicious even for trusted actor', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          changedKeys: ['name'],
          guildConfigurationPolicyViolation: true,
        },
      }),
      metadata: Object.freeze({
        guildConfigurationAuthorization: Object.freeze({
          authorizedActorIds: Object.freeze([]),
          trustedActorIds: Object.freeze(['actor-1']),
          ownerIds: Object.freeze([]),
        }),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates policy');
});

test('non-security-relevant guild update is CLEAN', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          changedKeys: ['vanity_url_code'],
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toContain('No security-relevant');
});

test('non-guild-configuration events are ignored', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        eventName: 'CHANNEL_DELETE',
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toBe('Event does not represent guild configuration update');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedGuildConfigurationDetector();
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
  const detector = new UnauthorizedGuildConfigurationDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-guild-configuration-detector.ts');
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
