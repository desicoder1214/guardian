import { InMemoryDiscordGatewayAdapter } from '../../src/core/runtime/discord/gateway-adapter';
import { DiscordGatewayEventSource, DiscordGatewayEventListener } from '../../src/core/runtime/discord/gateway-types';
import { DiscordEventPipeline, DiscordGatewayRawEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemoryEventBus } from '../../src/core/event/bus';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

class MockGatewayEventSource implements DiscordGatewayEventSource {
  private listener: DiscordGatewayEventListener | undefined;
  private isConnectedFlag = false;

  async connect(): Promise<void> {
    this.isConnectedFlag = true;
  }

  async disconnect(): Promise<void> {
    this.isConnectedFlag = false;
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  subscribe(listener: DiscordGatewayEventListener): () => void {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  }

  // Helper method to emit an event (for testing)
  emitEvent(raw: DiscordGatewayRawEvent): void {
    if (this.listener) {
      const result = this.listener(raw);
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    }
  }
}

class MockDiscordEventPipeline implements DiscordEventPipeline {
  ingestedEvents: DiscordGatewayRawEvent[] = [];

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async ingest(raw: DiscordGatewayRawEvent): Promise<void> {
    this.ingestedEvents.push(raw);
  }

  subscribe(): () => void {
    return () => {};
  }
}

test('Gateway adapter calls afterSourceConnect() immediately after source.connect()', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const source = new MockGatewayEventSource();
  const pipeline = new MockDiscordEventPipeline();

  const adapter = new InMemoryDiscordGatewayAdapter({
    source,
    pipeline,
    eventBus,
    healthService,
    logger,
  });

  await adapter.connect();

  // Verify source is connected
  expect(source.isConnected()).toBe(true);

  // Emit a test event through the source
  const testEvent: DiscordGatewayRawEvent = {
    t: 'READY',
    s: 1,
    op: 0,
  };

  source.emitEvent(testEvent);

  // Verify the event was ingested by the pipeline
  expect(pipeline.ingestedEvents).toHaveLength(1);
  expect(pipeline.ingestedEvents[0]).toEqual(testEvent);
});

test('Gateway adapter forwards raw gateway events to pipeline after start()', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const source = new MockGatewayEventSource();
  const pipeline = new MockDiscordEventPipeline();

  const adapter = new InMemoryDiscordGatewayAdapter({
    source,
    pipeline,
    eventBus,
    healthService,
    logger,
  });

  await adapter.start();

  // Verify source is connected after start
  expect(source.isConnected()).toBe(true);

  // Emit multiple test events
  const event1: DiscordGatewayRawEvent = {
    t: 'READY',
    s: 1,
    op: 0,
  };

  const event2: DiscordGatewayRawEvent = {
    t: 'MESSAGE_CREATE',
    s: 2,
    op: 0,
    d: { content: 'test message' },
  };

  source.emitEvent(event1);
  source.emitEvent(event2);

  // Verify both events were ingested by the pipeline
  expect(pipeline.ingestedEvents).toHaveLength(2);
  expect(pipeline.ingestedEvents[0]).toEqual(event1);
  expect(pipeline.ingestedEvents[1]).toEqual(event2);
});

test('Gateway adapter releases subscription on disconnect()', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const source = new MockGatewayEventSource();
  const pipeline = new MockDiscordEventPipeline();

  const adapter = new InMemoryDiscordGatewayAdapter({
    source,
    pipeline,
    eventBus,
    healthService,
    logger,
  });

  await adapter.connect();

  // Emit event while connected
  const event1: DiscordGatewayRawEvent = {
    t: 'READY',
    s: 1,
    op: 0,
  };
  source.emitEvent(event1);
  expect(pipeline.ingestedEvents).toHaveLength(1);

  // Disconnect
  await adapter.disconnect();

  // Emit event after disconnect
  const event2: DiscordGatewayRawEvent = {
    t: 'MESSAGE_CREATE',
    s: 2,
    op: 0,
  };
  source.emitEvent(event2);

  // Verify only the first event was ingested
  expect(pipeline.ingestedEvents).toHaveLength(1);
});

test('Gateway adapter releases subscription on stop()', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const source = new MockGatewayEventSource();
  const pipeline = new MockDiscordEventPipeline();

  const adapter = new InMemoryDiscordGatewayAdapter({
    source,
    pipeline,
    eventBus,
    healthService,
    logger,
  });

  await adapter.start();

  // Emit event while started
  const event1: DiscordGatewayRawEvent = {
    t: 'READY',
    s: 1,
    op: 0,
  };
  source.emitEvent(event1);
  expect(pipeline.ingestedEvents).toHaveLength(1);

  // Stop
  await adapter.stop();

  // Emit event after stop
  const event2: DiscordGatewayRawEvent = {
    t: 'MESSAGE_CREATE',
    s: 2,
    op: 0,
  };
  source.emitEvent(event2);

  // Verify only the first event was ingested
  expect(pipeline.ingestedEvents).toHaveLength(1);
});
