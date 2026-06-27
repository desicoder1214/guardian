import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemoryDetectorRegistry } from '../../src/core/runtime/discord/generic-detector-registry';
import { DetectionResult, Detector } from '../../src/core/runtime/discord/generic-detector-types';

class StubDetector implements Detector {
  constructor(
    private readonly detectorId: string,
    private readonly detectorName: string,
    private readonly eventType: string,
    private readonly shouldThrow = false,
  ) {}

  id(): string {
    return this.detectorId;
  }

  supports(eventName: string): boolean {
    return eventName === this.eventType;
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    if (this.shouldThrow) {
      throw new Error('detector exploded');
    }

    return {
      detectorId: this.detectorId,
      detectorName: this.detectorName,
      eventType: normalizedEvent.eventName,
      detected: this.supports(normalizedEvent.eventName),
      confidence: 1,
      metadata: { stub: true },
      correlationId: normalizedEvent.correlationId,
    };
  }
}

const baseEvent: DiscordGatewayNormalizedEvent = {
  eventName: 'CHANNEL_DELETE',
  source: 'discord-gateway',
  timestamp: '2026-01-01T00:00:00.000Z',
  correlationId: 'corr-registry-1',
  payload: { channelId: '123' },
};

test('detector registration and listing preserves order', () => {
  const registry = new InMemoryDetectorRegistry();
  const first = new StubDetector('d1', 'D1', 'CHANNEL_DELETE');
  const second = new StubDetector('d2', 'D2', 'ROLE_DELETE');

  registry.register(first);
  registry.register(second);

  expect(registry.list()).toEqual([first, second]);
});

test('unregister removes detector by id', () => {
  const registry = new InMemoryDetectorRegistry();
  const first = new StubDetector('d1', 'D1', 'CHANNEL_DELETE');
  const second = new StubDetector('d2', 'D2', 'CHANNEL_DELETE');

  registry.register(first);
  registry.register(second);
  registry.unregister('d1');

  expect(registry.resolve('CHANNEL_DELETE')).toEqual([second]);
});

test('detector resolution returns all matching detectors in deterministic order', () => {
  const registry = new InMemoryDetectorRegistry();
  const first = new StubDetector('d1', 'D1', 'CHANNEL_DELETE');
  const second = new StubDetector('d2', 'D2', 'ROLE_DELETE');
  const third = new StubDetector('d3', 'D3', 'CHANNEL_DELETE');

  registry.register(first);
  registry.register(second);
  registry.register(third);

  expect(registry.resolve('CHANNEL_DELETE')).toEqual([first, third]);
});

test('unsupported events resolve to an empty detector set', () => {
  const registry = new InMemoryDetectorRegistry();
  registry.register(new StubDetector('d1', 'D1', 'CHANNEL_DELETE'));

  expect(registry.resolve('UNKNOWN_EVENT')).toEqual([]);
});

test('registry execute runs all matching detectors in deterministic order', async () => {
  const registry = new InMemoryDetectorRegistry();
  registry.register(new StubDetector('d1', 'DetectorOne', 'CHANNEL_DELETE'));
  registry.register(new StubDetector('d2', 'DetectorTwo', 'ROLE_DELETE'));
  registry.register(new StubDetector('d3', 'DetectorThree', 'CHANNEL_DELETE'));

  const results = await registry.execute(baseEvent);

  expect(results.map((result) => result.detectorId)).toEqual(['d1', 'd3']);
  expect(results.map((result) => result.detectorName)).toEqual(['DetectorOne', 'DetectorThree']);
});

test('registry execute isolates detector failures and continues processing', async () => {
  const registry = new InMemoryDetectorRegistry();
  registry.register(new StubDetector('d1', 'HealthyOne', 'CHANNEL_DELETE'));
  registry.register(new StubDetector('d2', 'Boom', 'CHANNEL_DELETE', true));
  registry.register(new StubDetector('d3', 'HealthyTwo', 'CHANNEL_DELETE'));

  const results = await registry.execute(baseEvent);

  expect(results).toHaveLength(3);
  expect(results[0].detected).toBe(true);
  expect(results[1].detected).toBe(false);
  expect(results[1].metadata).toMatchObject({ isolatedFailure: true });
  expect(results[2].detected).toBe(true);
});
