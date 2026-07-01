import { MockDiscordClientAdapter } from '../../src/core/runtime/discord/client';
import { DiscordRuntimeLifecycleAdapter } from '../../src/core/runtime/discord/adapter';
import { DiscordRuntimeConfiguration } from '../../src/core/runtime/discord/config';
import { InMemoryEventBus } from '../../src/core/event/bus';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

const config: DiscordRuntimeConfiguration = {
  botToken: 'test-token',
  gatewayIntents: 'GUILDS',
  presenceStatus: 'online',
};

test('Discord runtime adapter starts, stops, and reconnects', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const client = new MockDiscordClientAdapter();
  const adapter = new DiscordRuntimeLifecycleAdapter({
    client,
    config,
    eventBus,
    healthService,
    logger,
  });

  expect(adapter.getState()).toBe('disconnected');

  await adapter.start();
  expect(adapter.getState()).toBe('connected');
  expect(client.isConnected()).toBe(true);

  await adapter.reconnect();
  expect(adapter.getState()).toBe('connected');
  expect(client.isConnected()).toBe(true);

  await adapter.stop();
  expect(adapter.getState()).toBe('disconnected');
  expect(client.isConnected()).toBe(false);
});

test('Discord runtime adapter publishes error event on failure', async () => {
  const eventBus = new InMemoryEventBus();
  const healthService = new RuntimeHealthService();
  const loggerWithTransport = new LoggerFactory([new ConsoleTransport()]).createLogger();

  const failingClient = {
    connect: async () => {
      throw new Error('connect failed');
    },
    disconnect: async () => {},
    isConnected: () => false,
  };

  const adapter = new DiscordRuntimeLifecycleAdapter({
    client: failingClient,
    config,
    eventBus,
    healthService,
    logger: loggerWithTransport,
  });

  await expect(adapter.start()).rejects.toThrow('connect failed');
  expect(adapter.getState()).toBe('disconnected');
});
