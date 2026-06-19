import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { RuntimeManager } from '../../src/core/runtime/lifecycle';
import { InMemoryEventBus } from '../../src/core/event/bus';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

test('RuntimeManager starts and stops without error', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const runtime = new RuntimeManager(logger, healthService, eventBus);

  await runtime.start();
  expect(healthService.getReadiness().healthy).toBe(true);

  await runtime.stop();
  expect(healthService.getLiveness().healthy).toBe(false);
});

test('RuntimeManager publishes runtime events', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const received: string[] = [];
  eventBus.subscribe({
    handle: async (event) => {
      received.push(event.type);
    },
  });

  const runtime = new RuntimeManager(logger, healthService, eventBus);

  await runtime.start();
  await runtime.stop();

  expect(received).toEqual([
    'ApplicationStarting',
    'ApplicationStarted',
    'ApplicationStopping',
    'ApplicationStopped',
  ]);
});
