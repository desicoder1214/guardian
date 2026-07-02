import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedWebhookMutationDetector } from '../../src/core/runtime/discord/unauthorized-webhook-mutation-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'WEBHOOK_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-webhook-mutation-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      webhookId: 'webhook-1',
      ownerIntegrationId: 'integration-1',
    },
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<Parameters<UnauthorizedWebhookMutationDetector['evaluate']>[0]> = {},
): Parameters<UnauthorizedWebhookMutationDetector['evaluate']>[0] {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.WEBHOOK_DELETE,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedWebhookIds: Object.freeze([]),
      authorizedIntegrationIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('authorized webhook mutation produces CLEAN finding', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedWebhookIds: Object.freeze(['webhook-1']),
        authorizedIntegrationIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.detectorId).toBe('unauthorized-webhook-mutation-detector');
  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('authorized integration mutation produces CLEAN finding', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedWebhookIds: Object.freeze([]),
        authorizedIntegrationIds: Object.freeze(['integration-1']),
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
});

test('unauthorized webhook mutation produces MALICIOUS finding with force-block override', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  const findingMetadata = result.findings[0]?.metadata as { runtimeThreatOverrides?: readonly unknown[] } | undefined;
  expect(Array.isArray(findingMetadata?.runtimeThreatOverrides)).toBe(true);
  expect(findingMetadata?.runtimeThreatOverrides).toHaveLength(1);
});

test('explicit policy violation is malicious even for authorized webhook', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          webhookId: 'webhook-1',
          ownerIntegrationId: 'integration-1',
          webhookMutationPolicyViolation: true,
        },
      }),
      metadata: Object.freeze({
        authorizedWebhookIds: Object.freeze(['webhook-1']),
        authorizedIntegrationIds: Object.freeze(['integration-1']),
      }),
    }),
  );

  expect(result.matched).toBe(true);
  expect(result.findings[0]?.reason).toContain('violates webhook mutation policy');
});

test('non-webhook-delete events are ignored', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({ eventName: 'CHANNEL_DELETE' }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings[0]?.reason).toBe('Event does not represent webhook update or deletion');
});

test('detector output is immutable and deterministic', async () => {
  const detector = new UnauthorizedWebhookMutationDetector();
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
  const detector = new UnauthorizedWebhookMutationDetector();
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe(detector.detectorId);
});

test('detector source has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-webhook-mutation-detector.ts');
  const source = require('node:fs').readFileSync(detectorFilePath, 'utf8');

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