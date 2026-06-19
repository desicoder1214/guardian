import { ConfigurationSchema } from './schema';

export interface ConfigurationSource {
  get<T = string>(key: string): T | undefined;
}

export interface Configuration<T extends object> {
  readonly schema: ConfigurationSchema<T>;
  readonly values: T;
}

export interface ConfigurationLoader<T extends object> {
  load(source: ConfigurationSource): Configuration<T>;
}

export function createConfiguration<T extends object>(
  schema: ConfigurationSchema<T>,
  values: T,
): Configuration<T> {
  return { schema, values };
}
