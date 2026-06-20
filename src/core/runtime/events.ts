export enum RuntimeEventType {
  ApplicationStarting = 'ApplicationStarting',
  ApplicationStarted = 'ApplicationStarted',
  ApplicationStopping = 'ApplicationStopping',
  ApplicationStopped = 'ApplicationStopped',
  ConfigurationLoaded = 'ConfigurationLoaded',
  ConfigurationInvalid = 'ConfigurationInvalid',
  HealthChanged = 'HealthChanged',
  DiscordRuntimeStarting = 'DiscordRuntimeStarting',
  DiscordRuntimeStarted = 'DiscordRuntimeStarted',
  DiscordRuntimeStopping = 'DiscordRuntimeStopping',
  DiscordRuntimeStopped = 'DiscordRuntimeStopped',
  DiscordRuntimeDisconnected = 'DiscordRuntimeDisconnected',
  DiscordRuntimeReconnecting = 'DiscordRuntimeReconnecting',
  DiscordRuntimeError = 'DiscordRuntimeError',
  DiscordConfigurationLoaded = 'DiscordConfigurationLoaded',
  DiscordConfigurationInvalid = 'DiscordConfigurationInvalid',
}

export interface RuntimeEvent {
  readonly type: RuntimeEventType;
  readonly timestamp: string;
  readonly payload?: unknown;
}
