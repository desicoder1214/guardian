import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InMemoryDetectionEngine } from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedBotAddDetector } from '../../src/core/runtime/discord/unauthorized-bot-add-detector';

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_MEMBER_ADD',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-bot-add-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      user: {
        id: 'bot-1',
        bot: true,
      },
    },
    ...overrides,
  };
}

function buildContext(overrides: Partial<Parameters<UnauthorizedBotAddDetector['evaluate']>[0]> = {}) {
  const normalizedEvent = buildEvent();

  return {
    normalizedEvent,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityActionType.BOT_ADD,
    correlationId: normalizedEvent.correlationId,
    timestamp: normalizedEvent.timestamp,
    metadata: Object.freeze({
      authorizedBotIds: Object.freeze([]),
      trustedBotIds: Object.freeze([]),
    }),
    ...overrides,
  };
}

test('authorized bot add produces CLEAN finding', async () => {
  const detector = new UnauthorizedBotAddDetector();

  const result = await detector.evaluate(
    buildContext({
      metadata: Object.freeze({
        authorizedBotIds: Object.freeze(['bot-1']),
        trustedBotIds: Object.freeze([]),
      }),
    }),
  );

  expect(result.detectorId).toBe('unauthorized-bot-add-detector');
  expect(result.matched).toBe(false);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.correlationId).toBe('corr-bot-add-1');
});

test('unauthorized bot add produces MALICIOUS finding', async () => {
  const detector = new UnauthorizedBotAddDetector();

  const result = await detector.evaluate(buildContext());

  expect(result.matched).toBe(true);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('MALICIOUS');
  expect(result.findings[0]?.severity).toBe('CRITICAL');
  expect(result.findings[0]?.reason).toBe('Bot bot-1 is not authorized for addition');
});

test('non-bot member add events are ignored', async () => {
  const detector = new UnauthorizedBotAddDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        payload: {
          guildId: 'guild-1',
          actorId: 'actor-1',
          user: {
            id: 'user-1',
            bot: false,
          },
        },
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toBe('Event does not represent a bot add operation');
});

test('non bot/member event types are ignored', async () => {
  const detector = new UnauthorizedBotAddDetector();

  const result = await detector.evaluate(
    buildContext({
      normalizedEvent: buildEvent({
        eventName: 'MESSAGE_CREATE',
      }),
    }),
  );

  expect(result.matched).toBe(false);
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]?.disposition).toBe('CLEAN');
  expect(result.findings[0]?.reason).toBe('Event does not represent a bot add operation');
});

test('detection result is immutable', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.evaluate(buildContext());

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.findings)).toBe(true);
  expect(Object.isFrozen(result.findings[0] ?? {})).toBe(true);

  expect(() => {
    (result as { matched: boolean }).matched = false;
  }).toThrow(TypeError);

  expect(() => {
    (result.findings as unknown as unknown[]).push('mutated');
  }).toThrow(TypeError);
});

test('detector output is deterministic', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const context = buildContext();

  const first = await detector.evaluate(context);
  const second = await detector.evaluate(context);

  expect(second).toEqual(first);
});

test('correlationId is preserved', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.evaluate(
    buildContext({
      correlationId: 'corr-bot-add-9',
      normalizedEvent: buildEvent({ correlationId: 'corr-bot-add-9' }),
    }),
  );

  expect(result.correlationId).toBe('corr-bot-add-9');
  expect(result.findings[0]?.correlationId).toBe('corr-bot-add-9');
});

test('plugin registration works', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  const detector = new UnauthorizedBotAddDetector();

  registry.register(detector);

  expect(registry.getPlugin(detector.detectorId)).toBe(detector);
  expect(registry.getPlugins().map((plugin) => plugin.detectorId)).toEqual(['unauthorized-bot-add-detector']);
});

test('detection engine executes unauthorized bot detector once', async () => {
  const registry = new InMemoryDetectorPluginRegistry();
  const detector = new UnauthorizedBotAddDetector();
  const evaluateSpy = jest.spyOn(detector, 'evaluate');
  registry.register(detector);

  const engine = new InMemoryDetectionEngine(registry);
  const results = await engine.evaluate(buildContext());

  expect(evaluateSpy).toHaveBeenCalledTimes(1);
  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe('unauthorized-bot-add-detector');
});

test('legacy detector wrapper remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const detector = new UnauthorizedBotAddDetector();
    const result = await detector.detect(buildEvent());

    expect(result.detectorId).toBe('unauthorized-bot-add-detector');
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});

test('detector foundation has no forbidden integration surfaces', () => {
  const detectorFilePath = path.join(process.cwd(), 'src/core/runtime/discord/unauthorized-bot-add-detector.ts');
  const source = readFileSync(detectorFilePath, 'utf8');

  const forbiddenPatterns = [
    /discord\.js/i,
    /node:fs|from\s+['"]fs['"]/i,
    /fetch\s*\(/i,
    /REST/i,
    /database|typeorm|prisma|mongoose|sequelize/i,
    /persist|repository|save\s*\(/i,
    /ban\s*\(|kick\s*\(|quarantine/i,
    /lockdown/i,
    /webhook/i,
    /recovery/i,
    /punishment/i,
  ];

  for (const pattern of forbiddenPatterns) {
    expect(source).not.toMatch(pattern);
  }
});
