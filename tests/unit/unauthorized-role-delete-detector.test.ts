import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedRoleDeleteDetector } from '../../src/core/runtime/discord/unauthorized-role-delete-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'ROLE_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-role-delete-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      roleId: 'role-1',
      targetId: 'role-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedRoleDeleteDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedRoleDeleteDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.ROLE_DELETE,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedRoleIds: Object.freeze([]),
      authorizedActorIds: Object.freeze([]),
      trustedActorIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('detector identity and capabilities are stable', () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  expect(detector.detectorId).toBe('unauthorized-role-delete-detector');
  expect(detector.version).toBe('1.0.0');
  expect(detector.priority).toBe(95);
  expect(detector.supportedActionTypes).toEqual([SecurityActionType.ROLE_DELETE]);
  expect(detector.enabled(buildContext())).toBe(true);
});

test('unauthorized role deletion is detected as MALICIOUS', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  expect(result.findings[0]?.reason).toContain('not authorized');
});

test('authorized role deletion is ignored (CLEAN)', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedRoleIds: Object.freeze(['role-1']),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('trusted actor is respected for role deletion', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedRoleIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('missing attribution follows fail-closed policy via unknown-actor', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      actorId: '',
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          roleId: 'role-1',
          targetId: 'role-1',
        },
      }),
      metadata: Object.freeze({
        authorizedRoleIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.reason).toContain('unknown-actor');
  const resultMetadata = result.metadata as { actorId?: string } | undefined;
  expect(resultMetadata?.actorId).toBe('unknown-actor');
});

test('metadata and correlationId are preserved', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();

  const result = await detector.evaluate(
    buildContext({
      correlationId: 'corr-role-delete-9',
      normalizedEvent: buildEvent({
        correlationId: 'corr-role-delete-9',
      }),
    }),
  );

  expect(result.correlationId).toBe('corr-role-delete-9');
  expect(result.findings[0]?.correlationId).toBe('corr-role-delete-9');

  const findingMetadata = result.findings[0]?.metadata as
    | { runtimeThreatOverrides?: readonly unknown[]; roleId?: string; actorId?: string }
    | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
  expect(findingMetadata?.roleId).toBe('role-1');
  expect(findingMetadata?.actorId).toBe('actor-1');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedRoleDeleteDetector();
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
  const detector = new UnauthorizedRoleDeleteDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  expect(registry.getPlugin(detector.detectorId)).toBe(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-role-delete-detector.ts');
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
