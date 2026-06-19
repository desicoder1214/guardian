export enum RuntimeEventType {
  ApplicationStarting = 'ApplicationStarting',
  ApplicationStarted = 'ApplicationStarted',
  ApplicationStopping = 'ApplicationStopping',
  ApplicationStopped = 'ApplicationStopped',
  ConfigurationLoaded = 'ConfigurationLoaded',
  ConfigurationInvalid = 'ConfigurationInvalid',
  HealthChanged = 'HealthChanged',
}

export interface RuntimeEvent {
  readonly type: RuntimeEventType;
  readonly timestamp: string;
  readonly payload?: unknown;
}
