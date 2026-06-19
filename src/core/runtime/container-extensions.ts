import { ServiceContainer, ServiceFactory, ServiceIdentifier } from '../../infra/di/container';
import { ConfigurationProvider, EnvironmentConfigurationProvider } from '../config/provider';
import { ConfigurationSchema } from '../config/schema';
import { LoggerFactory } from './logger';
import { RuntimeHealthService } from './health';
import { RuntimeManager } from './lifecycle';
import { InMemoryEventBus } from '../event/bus';

export interface RuntimeConfiguration {
  readonly appName: string;
  readonly environment: string;
}

export const RuntimeConfigurationId: ServiceIdentifier<
  ConfigurationProvider<RuntimeConfiguration>
> = {
  name: 'RuntimeConfiguration',
};

export const LoggerFactoryId: ServiceIdentifier<LoggerFactory> = {
  name: 'LoggerFactory',
};

export const LoggerId: ServiceIdentifier<ReturnType<LoggerFactory['createLogger']>> = {
  name: 'Logger',
};

export const HealthServiceId: ServiceIdentifier<RuntimeHealthService> = {
  name: 'HealthService',
};

export const RuntimeManagerId: ServiceIdentifier<RuntimeManager> = {
  name: 'RuntimeManager',
};

export const EventBusId: ServiceIdentifier<InMemoryEventBus> = {
  name: 'EventBus',
};

export class RuntimeServiceFactory implements ServiceFactory<RuntimeManager> {
  constructor(private readonly container: ServiceContainer) {}

  create(): RuntimeManager {
    const logger = this.container.resolve(LoggerId);
    const healthService = this.container.resolve(HealthServiceId);
    const eventBus = this.container.resolve(EventBusId);

    return new RuntimeManager(logger, healthService, eventBus);
  }
}

export class RuntimeHealthServiceFactory implements ServiceFactory<RuntimeHealthService> {
  create(): RuntimeHealthService {
    return new RuntimeHealthService();
  }
}

export class LoggerFactoryFactory implements ServiceFactory<LoggerFactory> {
  create(): LoggerFactory {
    return new LoggerFactory();
  }
}

export class EventBusFactory implements ServiceFactory<InMemoryEventBus> {
  create(): InMemoryEventBus {
    return new InMemoryEventBus();
  }
}

export class RuntimeConfigurationProviderFactory
  implements ServiceFactory<ConfigurationProvider<RuntimeConfiguration>>
{
  create(): ConfigurationProvider<RuntimeConfiguration> {
    const schema: ConfigurationSchema<RuntimeConfiguration> = {
      appName: { type: 'string', required: true },
      environment: { type: 'string', required: true },
    };

    return new EnvironmentConfigurationProvider(schema);
  }
}
