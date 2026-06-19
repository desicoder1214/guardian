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
import { RuntimeManager } from './lifecycle';

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

  async stop(): Promise<void> {
    const runtimeManager = this.container.resolve(RuntimeManagerId);
    await runtimeManager.stop();
  }
}
