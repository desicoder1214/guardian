import { InMemoryDetectorPipeline, SecurityEvaluationDetectionPipeline } from '../../src/core/runtime/discord/generic-detector-pipeline';
import { InMemoryDetectorRegistry } from '../../src/core/runtime/discord/generic-detector-registry';
import {
  BotAddDetector,
  ChannelCreateDetector,
  ChannelDeleteDetector,
  RoleCreateDetector,
  RoleDeleteDetector,
  WebhookCreateDetector,
} from '../../src/core/runtime/discord/generic-placeholder-detectors';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { DetectionResult, Detector } from '../../src/core/runtime/discord/generic-detector-types';

class RecordingSecurityEvaluationPipeline implements SecurityEvaluationDetectionPipeline {
  readonly forwarded: DetectionResult[] = [];

  async evaluateDetection(_: DiscordGatewayNormalizedEvent, detection: DetectionResult): Promise<void> {
    this.forwarded.push(detection);
  }
}

class SecondaryChannelDeleteDetector implements Detector {
  id(): string {
    return 'secondary-channel-delete-detector';
  }

  supports(eventName: string): boolean {
    return eventName === 'CHANNEL_DELETE';
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    return {
      detectorId: this.id(),
      detectorName: 'SecondaryChannelDeleteDetector',
      eventType: normalizedEvent.eventName,
      detected: true,
      confidence: 0.7,
      metadata: { placeholder: true, secondary: true },
      correlationId: normalizedEvent.correlationId,
    };
  }
}

class ExplodingChannelDeleteDetector implements Detector {
  id(): string {
    return 'exploding-channel-delete-detector';
  }

  supports(eventName: string): boolean {
    return eventName === 'CHANNEL_DELETE';
  }

  async detect(_: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    throw new Error('boom');
  }
}

const baseEvent: DiscordGatewayNormalizedEvent = {
  eventName: 'CHANNEL_DELETE',
  source: 'discord-gateway',
  timestamp: '2026-01-01T00:00:00.000Z',
  correlationId: 'corr-phase-5a-1',
  payload: { channelId: '123' },
};

test('pipeline executes matching detectors and forwards only positive detections', async () => {
  const registry = new InMemoryDetectorRegistry();
  const securityEvaluation = new RecordingSecurityEvaluationPipeline();

  registry.register(new ChannelDeleteDetector());
  registry.register(new RoleDeleteDetector());
  registry.register(new SecondaryChannelDeleteDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, securityEvaluation);
  const results = await pipeline.execute(baseEvent);

  expect(results.map((result) => result.detectorId)).toEqual([
    'channel-delete-detector',
    'secondary-channel-delete-detector',
  ]);
  expect(results.every((result) => result.detected)).toBe(true);
  expect(securityEvaluation.forwarded.map((detection) => detection.detectorId)).toEqual([
    'channel-delete-detector',
    'secondary-channel-delete-detector',
  ]);
});

test('pipeline returns empty results for unsupported events', async () => {
  const registry = new InMemoryDetectorRegistry();
  const securityEvaluation = new RecordingSecurityEvaluationPipeline();

  registry.register(new ChannelDeleteDetector());
  registry.register(new RoleDeleteDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, securityEvaluation);
  const results = await pipeline.execute({ ...baseEvent, eventName: 'UNKNOWN_EVENT' });

  expect(results).toEqual([]);
  expect(securityEvaluation.forwarded).toEqual([]);
});

test('placeholder detectors recognize only their mapped events', async () => {
  const detections: Array<{ detector: Detector; eventName: string; detectorId: string }> = [
    { detector: new ChannelDeleteDetector(), eventName: 'CHANNEL_DELETE', detectorId: 'channel-delete-detector' },
    { detector: new ChannelCreateDetector(), eventName: 'CHANNEL_CREATE', detectorId: 'channel-create-detector' },
    { detector: new RoleDeleteDetector(), eventName: 'ROLE_DELETE', detectorId: 'role-delete-detector' },
    { detector: new RoleCreateDetector(), eventName: 'ROLE_CREATE', detectorId: 'role-create-detector' },
    { detector: new WebhookCreateDetector(), eventName: 'WEBHOOKS_UPDATE', detectorId: 'webhook-create-detector' },
    { detector: new BotAddDetector(), eventName: 'GUILD_MEMBER_ADD', detectorId: 'bot-add-detector' },
  ];

  for (const expectation of detections) {
    const result = await expectation.detector.detect({ ...baseEvent, eventName: expectation.eventName });
    expect(result.detected).toBe(true);
    expect(result.detectorId).toBe(expectation.detectorId);
  }

  const falsePositiveResult = await detections[0].detector.detect({ ...baseEvent, eventName: 'ROLE_DELETE' });
  expect(falsePositiveResult.detected).toBe(false);
});

test('detection result propagates correlation id and detector name', async () => {
  const detector = new ChannelDeleteDetector();
  const result = await detector.detect({ ...baseEvent, correlationId: 'corr-propagation-9' });

  expect(result.correlationId).toBe('corr-propagation-9');
  expect(result.detectorName).toBe('ChannelDeleteDetector');
});

test('detector isolation keeps pipeline running when one detector fails', async () => {
  const registry = new InMemoryDetectorRegistry();
  const securityEvaluation = new RecordingSecurityEvaluationPipeline();

  registry.register(new ChannelDeleteDetector());
  registry.register(new ExplodingChannelDeleteDetector());
  registry.register(new SecondaryChannelDeleteDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, securityEvaluation);
  const results = await pipeline.execute(baseEvent);

  expect(results).toHaveLength(3);
  expect(results[0].detected).toBe(true);
  expect(results[1].detected).toBe(false);
  expect(results[2].detected).toBe(true);
  expect(securityEvaluation.forwarded.map((entry) => entry.detectorId)).toEqual([
    'channel-delete-detector',
    'secondary-channel-delete-detector',
  ]);
});

test('detector framework and placeholders perform no side effects', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const registry = new InMemoryDetectorRegistry();
    const securityEvaluation = new RecordingSecurityEvaluationPipeline();

    registry.register(new ChannelDeleteDetector());
    registry.register(new ChannelCreateDetector());
    registry.register(new RoleDeleteDetector());
    registry.register(new RoleCreateDetector());
    registry.register(new WebhookCreateDetector());
    registry.register(new BotAddDetector());

    const pipeline = new InMemoryDetectorPipeline(registry, securityEvaluation);

    await pipeline.execute({ ...baseEvent, eventName: 'CHANNEL_DELETE' });
    await pipeline.execute({ ...baseEvent, eventName: 'CHANNEL_CREATE' });
    await pipeline.execute({ ...baseEvent, eventName: 'ROLE_DELETE' });
    await pipeline.execute({ ...baseEvent, eventName: 'ROLE_CREATE' });
    await pipeline.execute({ ...baseEvent, eventName: 'WEBHOOKS_UPDATE' });
    await pipeline.execute({ ...baseEvent, eventName: 'GUILD_MEMBER_ADD' });

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
