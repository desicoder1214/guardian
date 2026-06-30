import { Configuration, ConfigurationSource, createConfiguration } from './index';
import { ConfigurationSchema } from './schema';
import { ConfigurationError } from '../../shared/errors';

export interface ConfigurationProvider<T extends object> {
  readonly schema: ConfigurationSchema<T>;
  getConfig(): Configuration<T>;
  reload(): Configuration<T>;
}

export interface ConfigurationReloadable {
  reload(): void;
}

export class EnvironmentConfigurationSource implements ConfigurationSource {
  get<T = string>(key: string): T | undefined {
    const value = process.env[key];
    return value === undefined ? undefined : (value as unknown as T);
  }
}

export class EnvironmentConfigurationProvider<T extends object>
  implements ConfigurationProvider<T>
{
  constructor(
    public readonly schema: ConfigurationSchema<T>,
    private readonly source: ConfigurationSource = new EnvironmentConfigurationSource(),
  ) {}

  getConfig(): Configuration<T> {
    const parsed = this.loadFromSource();
    return createConfiguration(this.schema, parsed);
  }

  reload(): Configuration<T> {
    return this.getConfig();
  }

  private loadFromSource(): T {
    const values: Partial<T> = {};

    for (const key of Object.keys(this.schema) as Array<keyof T>) {
      const field = this.schema[key];
      const rawValue = this.resolveRawValue(String(key));

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (field.default !== undefined) {
          values[key] = field.default;
          continue;
        }

        if (field.required) {
          throw new ConfigurationError(`Missing required configuration key: ${String(key)}`);
        }

        continue;
      }

      values[key] = this.parseValue(rawValue, field.type) as T[keyof T];
    }

    return values as T;
  }

  private resolveRawValue(key: string): string | undefined {
    // Canonical precedence is deterministic regardless of OS environment behavior:
    // 1) exact schema key, 2) uppercase alias, 3) uppercase snake-case alias.
    const candidates = this.buildEnvironmentCandidates(key);

    for (const candidate of candidates) {
      const value = this.source.get<string>(candidate);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  private buildEnvironmentCandidates(key: string): readonly string[] {
    const upper = key.toUpperCase();
    const upperSnake = key
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[-\s]+/g, '_')
      .toUpperCase();

    return Object.freeze([...new Set([key, upper, upperSnake])]);
  }

  private parseValue(value: string, type: ConfigurationSchema<T>[keyof T]['type']): unknown {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1';
      case 'number': {
        const numeric = Number(value);
        if (Number.isNaN(numeric)) {
          throw new ConfigurationError(`Invalid number configuration value: ${value}`);
        }
        return numeric;
      }
      case 'string':
        return value;
      default:
        return value;
    }
  }
}
