import { InMemoryDiscordEventPipeline } from '../../src/core/runtime/discord/pipeline';
import { InMemoryEventBus } from '../../src/core/event/bus';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

test('Discord Event Pipeline starts, ingests, and dispatches normalized event', async () => {
  const eventBus = new InMemoryEventBus();
  const health = new RuntimeHealthService();
  const pipeline = new InMemoryDiscordEventPipeline(eventBus, health, logger);

  await pipeline.start();

  const received: DiscordGatewayNormalizedEvent[] = [];
  const unsub = pipeline.subscribe(async (e) => {
    received.push(e);
  });

  await pipeline.ingest({
    t: 'MESSAGE_CREATE',
    d: { content: 'hi' },
    ts: new Date().toISOString(),
  });

  expect(received.length).toBe(1);
  expect(received[0].eventName).toBe('MESSAGE_CREATE');

  unsub();
  await pipeline.stop();
});

test('Pipeline rejects ingest when not started', async () => {
  const eventBus = new InMemoryEventBus();
  const health = new RuntimeHealthService();
  const pipeline = new InMemoryDiscordEventPipeline(eventBus, health, logger);

  await expect(pipeline.ingest({ t: 'READY' })).rejects.toThrow('pipeline not started');
});
