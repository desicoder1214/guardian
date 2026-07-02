import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedRoleCreateDetector } from '../../src/core/runtime/discord/unauthorized-role-create-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'ROLE_CREATE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-role-create-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      roleId: 'role-1',
      permissions: ['VIEW_CHANNEL', 'ADMINISTRATOR'],
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedRoleCreateDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedRoleCreateDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.ROLE_CREATE,
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
  const detector = new UnauthorizedRoleCreateDetector();

  expect(detector.detectorId).toBe('unauthorized-role-create-detector');
  expect(detector.version).toBe('1.0.0');
  expect(detector.priority).toBe(95);
  expect(detector.supportedActionTypes).toEqual([SecurityActionType.ROLE_CREATE]);
  expect(detector.enabled(buildContext())).toBe(true);
});

test('unauthorized dangerous role creation is detected as MALICIOUS', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  expect(result.findings[0]?.reason).toContain('dangerous permissions');
});

test('authorized role creation is ignored (CLEAN)', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedRoleIds: Object.freeze(['role-1']),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          roleId: 'role-1',
          permissions: ['VIEW_CHANNEL'],
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('trusted actor is respected for non-dangerous role creation', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedRoleIds: Object.freeze([]),
        authorizedActorIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          roleId: 'role-1',
          permissions: ['VIEW_CHANNEL'],
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toContain('authorized');
});

test('explicit policy violation is malicious even for trusted actor', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        trustedActorIds: Object.freeze(['actor-1']),
      }),
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          roleId: 'role-1',
          permissions: ['VIEW_CHANNEL'],
          rolePolicyViolation: true,
        },
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates role creation policy');
});

test('missing attribution follows fail-closed policy via unknown-actor', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(
    buildContext({
      actorId: '',
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          roleId: 'role-1',
          permissions: ['ADMINISTRATOR'],
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
  expect(result.findings[0]?.reason).toContain('dangerous permissions');
  const resultMetadata = result.metadata as { actorId?: string } | undefined;
  expect(resultMetadata?.actorId).toBe('unknown-actor');
});

test('metadata includes policy neutralization override and force-block', async () => {
  const detector = new UnauthorizedRoleCreateDetector();

  const result = await detector.evaluate(buildContext());

  const findingMetadata = result.findings[0]?.metadata as
    | { runtimeThreatOverrides?: readonly unknown[]; policyNeutralizeTarget?: boolean }
    | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
  expect(findingMetadata?.policyNeutralizeTarget).toBe(false);
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedRoleCreateDetector();
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
  const detector = new UnauthorizedRoleCreateDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  expect(registry.getPlugin(detector.detectorId)).toBe(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-role-create-detector.ts');
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
