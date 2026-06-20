import { ServiceContainer } from '../../infra/di/container';
import {
  RuntimeConfigurationProviderFactory,
  RuntimeConfigurationId,
  LoggerFactoryFactory,
  LoggerFactoryId,
  LoggerId,
  EventBusFactory,
  EventBusId,
  RuntimeHealthServiceFactory,
  HealthServiceId,
  RuntimeServiceFactory,
  RuntimeManagerId,
} from './container-extensions';
import {
  DiscordConfigurationProviderFactory,
  DiscordConfigurationProviderId,
  DiscordClientAdapterFactory,
  DiscordClientAdapterId,
  DiscordRuntimeAdapterFactory,
  DiscordRuntimeAdapterId,
} from './discord/container-extensions';
import { RuntimeManager } from './lifecycle';
import { DiscordRuntimeAdapter } from './discord/types';

export class ApplicationBootstrap {
  private readonly container = new ServiceContainer();

  constructor() {
    this.container.registerSingleton(
      RuntimeConfigurationId,
      new RuntimeConfigurationProviderFactory(),
    );
    this.container.registerSingleton(LoggerFactoryId, new LoggerFactoryFactory());
    this.container.registerSingleton(EventBusId, new EventBusFactory());
    this.container.registerSingleton(HealthServiceId, new RuntimeHealthServiceFactory());
    this.container.registerSingleton(RuntimeManagerId, new RuntimeServiceFactory(this.container));

    this.container.registerSingleton(
      DiscordConfigurationProviderId,
      new DiscordConfigurationProviderFactory(),
    );
    this.container.registerSingleton(DiscordClientAdapterId, new DiscordClientAdapterFactory());
    this.container.registerSingleton(
      DiscordRuntimeAdapterId,
      new DiscordRuntimeAdapterFactory(this.container),
    );

    this.container.registerFactory(
      LoggerId,
      () => {
        const loggerFactory = this.container.resolve(LoggerFactoryId);
        return loggerFactory.createLogger();
      },
      'singleton',
    );
  }

  async start(): Promise<RuntimeManager> {
    const runtimeManager = this.container.resolve(RuntimeManagerId);
    await runtimeManager.start();
    return runtimeManager;
  }

  async startDiscordRuntime(): Promise<DiscordRuntimeAdapter> {
    const discordRuntime = this.container.resolve(DiscordRuntimeAdapterId);
    await discordRuntime.start();
    return discordRuntime;
  }

  async reconnectDiscordRuntime(): Promise<void> {
    const discordRuntime = this.container.resolve(DiscordRuntimeAdapterId);
    await discordRuntime.reconnect();
  }

  async stopDiscordRuntime(): Promise<void> {
    const discordRuntime = this.container.resolve(DiscordRuntimeAdapterId);
    await discordRuntime.stop();
  }

  async stop(): Promise<void> {
    const runtimeManager = this.container.resolve(RuntimeManagerId);
    await runtimeManager.stop();
  }
}
