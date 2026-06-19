export type ConfigurationType = 'string' | 'number' | 'boolean';

export interface ConfigurationField<T> {
  readonly type: ConfigurationType;
  readonly default?: T;
  readonly required?: boolean;
  readonly description?: string;
}

export type ConfigurationSchema<T extends object> = {
  readonly [K in keyof T]: ConfigurationField<T[K]>;
};

export function isConfigurationField(value: unknown): value is ConfigurationField<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as ConfigurationField<unknown>).type !== undefined
  );
}
