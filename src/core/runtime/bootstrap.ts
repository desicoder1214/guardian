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
  RuntimeStartupCoordinationRequestFactoryId,
  StartupRuntimeCoordinatorId,
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
import { GuardianRuntimeMode, resolveGuardianRuntimeMode } from './runtime-mode';
import {
  createProductionStartupRuntimeCoordinator,
  InMemoryRuntimeStartupCoordinationRequestFactory,
} from './security/startup-runtime-integration';
import { IntegratedCanonicalGuardianRuntime } from './canonical-runtime';
import { RuntimeHealthService } from './health';
import { LoggerFactory } from './logger';
import { InMemoryEventBus } from '../event/bus';
import { ConfigurationError } from '../../shared/errors';

function requireEnvironmentVariable(key: string): string {
  const value = process.env[key]?.trim();
  if (value && value.length > 0) {
    return value;
  }

  throw new ConfigurationError(
    `Missing required environment variable: ${key}. Update .env (see .env.example) and set a non-empty value before starting Guardian.`,
  );
}

function validateStartupEnvironment(): void {
  const requiredKeys = [
    'GUARDIAN_RUNTIME_MODE',
    'GUARDIAN_RUNTIME_ID',
    'GUARDIAN_GUILD_ID',
    'DISCORD_BOT_TOKEN',
    'DISCORD_GATEWAY_INTENTS',
  ] as const;

  for (const key of requiredKeys) {
    requireEnvironmentVariable(key);
  }
}

export class ApplicationBootstrap {
  private readonly container = new ServiceContainer();
  private readonly mode: GuardianRuntimeMode;
  private readonly runtimeId: string;
  private readonly guildId: string;
  private canonicalRuntime?: IntegratedCanonicalGuardianRuntime;

  constructor() {
    validateStartupEnvironment();
    this.mode = resolveGuardianRuntimeMode();
    this.runtimeId = requireEnvironmentVariable('GUARDIAN_RUNTIME_ID');
    this.guildId = requireEnvironmentVariable('GUARDIAN_GUILD_ID');

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
    this.container.registerSingleton(
      DiscordClientAdapterId,
      new DiscordClientAdapterFactory(this.mode),
    );
    this.container.registerSingleton(
      DiscordRuntimeAdapterId,
      new DiscordRuntimeAdapterFactory(this.container, this.mode),
    );

    if (this.mode === GuardianRuntimeMode.PRODUCTION) {
      this.container.registerFactory(
        StartupRuntimeCoordinatorId,
        () => createProductionStartupRuntimeCoordinator(),
        'singleton',
      );
      this.container.registerFactory(
        RuntimeStartupCoordinationRequestFactoryId,
        () => new InMemoryRuntimeStartupCoordinationRequestFactory(this.runtimeId, this.guildId),
        'singleton',
      );
    }

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
    const canonicalRuntime = this.getCanonicalRuntime();
    await canonicalRuntime.start();

    const runtimeManager = this.container.resolve(RuntimeManagerId);
    return runtimeManager;
  }

  async startDiscordRuntime(): Promise<DiscordRuntimeAdapter> {
    const canonicalRuntime = this.getCanonicalRuntime();
    await canonicalRuntime.start();

    const discordRuntime = this.container.resolve(DiscordRuntimeAdapterId);
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
    if (this.canonicalRuntime) {
      await this.canonicalRuntime.stop();
    } else {
      const runtimeManager = this.container.resolve(RuntimeManagerId);
      await runtimeManager.stop();
    }
  }

  getRuntimeMode(): GuardianRuntimeMode {
    return this.mode;
  }

  getCanonicalRuntime(): IntegratedCanonicalGuardianRuntime {
    if (this.canonicalRuntime) {
      return this.canonicalRuntime;
    }

    const runtimeManager = this.container.resolve(RuntimeManagerId);
    const discordRuntime = this.container.resolve(DiscordRuntimeAdapterId);
    const eventBus = this.container.resolve(EventBusId) as InMemoryEventBus;
    const healthService = this.container.resolve(HealthServiceId) as RuntimeHealthService;
    const loggerFactory = this.container.resolve(LoggerFactoryId) as LoggerFactory;

    this.canonicalRuntime = new IntegratedCanonicalGuardianRuntime(
      this.mode,
      runtimeManager,
      discordRuntime,
      eventBus,
      healthService,
      loggerFactory,
      this.runtimeId,
      this.guildId,
    );

    return this.canonicalRuntime;
  }
}
