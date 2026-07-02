import { ServiceContainer, ServiceFactory, ServiceIdentifier } from '../../../infra/di/container';
import { DiscordConfigurationProvider, discordRuntimeConfigSchema } from './config';
import { DiscordClientAdapter, DiscordRuntimeAdapter } from './types';
import { DiscordRuntimeLifecycleAdapter } from './adapter';
import { MockDiscordClientAdapter, ProductionDiscordGatewayClientAdapter } from './client';
import { resolveDiscordBotTokenFromEnvironment } from './auth-token';
import { EventBus } from '../../event/bus';
import { HealthService } from '../health';
import { LoggerFactory } from '../logger';
import { EventBusId, HealthServiceId, LoggerFactoryId } from '../container-extensions';
import { GuardianRuntimeMode, isProductionMode } from '../runtime-mode';

export const DiscordConfigurationProviderId: ServiceIdentifier<DiscordConfigurationProvider> = {
  name: 'DiscordConfigurationProvider',
};

export const DiscordClientAdapterId: ServiceIdentifier<DiscordClientAdapter> = {
  name: 'DiscordClientAdapter',
};

export const DiscordRuntimeAdapterId: ServiceIdentifier<DiscordRuntimeAdapter> = {
  name: 'DiscordRuntimeAdapter',
};

export class DiscordConfigurationProviderFactory
  implements ServiceFactory<DiscordConfigurationProvider>
{
  create(): DiscordConfigurationProvider {
    return new DiscordConfigurationProvider(discordRuntimeConfigSchema);
  }
}

export class DiscordClientAdapterFactory implements ServiceFactory<DiscordClientAdapter> {
  constructor(private readonly mode: GuardianRuntimeMode = GuardianRuntimeMode.TESTING) {}

  create(): DiscordClientAdapter {
    if (isProductionMode(this.mode)) {
      const botToken = resolveDiscordBotTokenFromEnvironment().token;

      return new ProductionDiscordGatewayClientAdapter({
        botToken,
        gatewayIntents: process.env.DISCORD_GATEWAY_INTENTS ?? '',
        guildId: process.env.GUARDIAN_GUILD_ID ?? '',
      });
    }

    return new MockDiscordClientAdapter();
  }
}

export class DiscordRuntimeAdapterFactory implements ServiceFactory<DiscordRuntimeAdapter> {
  constructor(
    private readonly container: ServiceContainer,
    private readonly mode: GuardianRuntimeMode = GuardianRuntimeMode.TESTING,
  ) {}

  create(): DiscordRuntimeAdapter {
    const configProvider = this.container.resolve(DiscordConfigurationProviderId);
    const config = configProvider.getConfig().values;
    const client = this.container.resolve(DiscordClientAdapterId);
    const eventBus = this.container.resolve(EventBusId) as EventBus;
    const healthService = this.container.resolve(HealthServiceId) as HealthService;
    const loggerFactory = this.container.resolve(LoggerFactoryId) as LoggerFactory;
    const logger = loggerFactory.createLogger();

    return new DiscordRuntimeLifecycleAdapter({
      client,
      config,
      eventBus,
      healthService,
      logger,
    });
  }
}
