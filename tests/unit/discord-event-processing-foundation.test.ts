import { InMemoryEventBus } from '../../src/core/event/bus';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';
import { InMemoryDiscordGatewayAdapter } from '../../src/core/runtime/discord/gateway-adapter';
import { InMemoryDiscordEventPipeline } from '../../src/core/runtime/discord/pipeline';
import { DiscordGatewayEventListener, DiscordGatewayEventSource } from '../../src/core/runtime/discord/gateway-types';
import { DiscordGatewayRawEvent, DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemoryDiscordDetectorRegistry } from '../../src/core/runtime/discord/detector-registry';
import { InMemoryDiscordEventRouter } from '../../src/core/runtime/discord/event-router';
import { DiscordEventDetector } from '../../src/core/runtime/discord/detector-types';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

class MockGatewayEventSource implements DiscordGatewayEventSource {
  private listener: DiscordGatewayEventListener | undefined;
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(listener: DiscordGatewayEventListener): () => void {
    this.listener = listener;

    return () => {
      this.listener = undefined;
    };
  }

  async emit(raw: DiscordGatewayRawEvent): Promise<void> {
    if (!this.listener) {
      return;
    }

    await this.listener(raw);
  }
}

class RecordingDetector implements DiscordEventDetector {
  readonly id = 'recording-detector';
  readonly events: DiscordGatewayNormalizedEvent[] = [];

  async handle(event: DiscordGatewayNormalizedEvent): Promise<void> {
    this.events.push(event);
  }
}

test('Raw gateway event reaches registered detector through pipeline foundation', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const source = new MockGatewayEventSource();

  const detectorRegistry = new InMemoryDiscordDetectorRegistry();
  const detector = new RecordingDetector();
  detectorRegistry.register(detector);

  const router = new InMemoryDiscordEventRouter(detectorRegistry);
  const pipeline = new InMemoryDiscordEventPipeline(
    eventBus,
    healthService,
    logger,
    undefined,
    undefined,
    undefined,
    router,
  );
  const gatewayAdapter = new InMemoryDiscordGatewayAdapter({
    source,
    pipeline,
    eventBus,
    healthService,
    logger,
  });

  await pipeline.start();
  await gatewayAdapter.start();

  await source.emit({
    t: 'MESSAGE_CREATE',
    d: { content: 'phase-2b' },
    ts: new Date().toISOString(),
  });

  expect(detector.events).toHaveLength(1);
  expect(detector.events[0].eventName).toBe('MESSAGE_CREATE');
  expect(detector.events[0].payload).toEqual({ content: 'phase-2b' });

  await gatewayAdapter.stop();
  await pipeline.stop();
});
