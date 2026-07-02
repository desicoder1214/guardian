import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedIntegrationManagementDetector } from '../../src/core/runtime/discord/unauthorized-integration-management-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'INTEGRATION_CREATE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-integration-management-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      integrationId: 'integration-1',
      applicationId: 'application-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedIntegrationManagementDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedIntegrationManagementDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.INTEGRATION_MANAGEMENT,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedIntegrationIds: Object.freeze([]),
      authorizedApplicationIds: Object.freeze([]),
      trustedActorIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('authorized integration management produces CLEAN finding', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedIntegrationIds: Object.freeze(['integration-1']),
        authorizedApplicationIds: Object.freeze([]),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('authorized application management produces CLEAN finding', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedIntegrationIds: Object.freeze([]),
        authorizedApplicationIds: Object.freeze(['application-1']),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('trusted actor integration management produces CLEAN finding', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedIntegrationIds: Object.freeze([]),
        authorizedApplicationIds: Object.freeze([]),
        trustedActorIds: Object.freeze(['actor-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toContain('Trusted actor exemption');
});

test('unauthorized integration management is MALICIOUS and force-blocked', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  const findingMetadata = result.findings[0]?.metadata as { runtimeThreatOverrides?: readonly unknown[] } | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
});

test('policy violation is malicious even when authorized', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          integrationId: 'integration-1',
          applicationId: 'application-1',
          integrationPolicyViolation: true,
        },
      }),
      metadata: Object.freeze({
        authorizedIntegrationIds: Object.freeze(['integration-1']),
        authorizedApplicationIds: Object.freeze(['application-1']),
        trustedActorIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates policy');
});

test('non-integration management events are ignored', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({ eventName: 'CHANNEL_DELETE' }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toBe('Event does not represent integration or application management');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedIntegrationManagementDetector();
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
  const detector = new UnauthorizedIntegrationManagementDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(
    process.cwd(),
    'src/core/runtime/discord/unauthorized-integration-management-detector.ts',
  );
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
