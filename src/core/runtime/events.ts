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
  DiscordEventPipelineStarting = 'DiscordEventPipelineStarting',
  DiscordEventPipelineStarted = 'DiscordEventPipelineStarted',
  DiscordEventPipelineStopping = 'DiscordEventPipelineStopping',
  DiscordEventPipelineStopped = 'DiscordEventPipelineStopped',
  DiscordGatewayEventReceived = 'DiscordGatewayEventReceived',
  DiscordGatewayEventNormalized = 'DiscordGatewayEventNormalized',
  DiscordGatewayEventDispatched = 'DiscordGatewayEventDispatched',
  DiscordGatewayEventDispatchFailed = 'DiscordGatewayEventDispatchFailed',
  DiscordEventSubscriptionRegistered = 'DiscordEventSubscriptionRegistered',
  DiscordEventSubscriptionRemoved = 'DiscordEventSubscriptionRemoved',
  DiscordEventPipelineError = 'DiscordEventPipelineError',
}

export interface RuntimeEvent {
  readonly type: RuntimeEventType;
  readonly timestamp: string;
  readonly payload?: unknown;
}
