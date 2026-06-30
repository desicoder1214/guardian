import {
  EnvironmentConfigurationProvider,
} from '../../src/core/config/provider';
import { ConfigurationSource } from '../../src/core/config';

interface AppConfig {
  readonly appName: string;
  readonly environment: string;
}

afterEach(() => {
  delete process.env.APPNAME;
  delete process.env.appName;
  delete process.env.ENVIRONMENT;
  delete process.env.environment;
});

test('EnvironmentConfigurationProvider loads typed values', () => {
  process.env.APPNAME = 'guardian';
  process.env.ENVIRONMENT = 'test';

  const schema: Record<keyof AppConfig, { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
    environment: { type: 'string', required: true },
  };

  const provider = new EnvironmentConfigurationProvider<AppConfig>(schema);
  const config = provider.getConfig();

  expect(config.values.appName).toBe('guardian');
  expect(config.values.environment).toBe('test');
});

test('EnvironmentConfigurationProvider resolves exact schema key before APPNAME alias', () => {
  const schema: Record<keyof AppConfig, { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
    environment: { type: 'string', required: true },
  };

  const provider = new EnvironmentConfigurationProvider<AppConfig>(
    schema,
    new MapConfigurationSource({
      appName: 'guardian-camel',
      APPNAME: 'guardian-upper',
      environment: 'dev-camel',
      ENVIRONMENT: 'dev-upper',
    }),
  );
  const config = provider.getConfig();

  expect(config.values.appName).toBe('guardian-camel');
  expect(config.values.environment).toBe('dev-camel');
});

test('EnvironmentConfigurationProvider resolves APPNAME alias when appName key is absent', () => {
  process.env.APPNAME = 'guardian-upper';
  process.env.ENVIRONMENT = 'test-upper';

  const schema: Record<keyof AppConfig, { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
    environment: { type: 'string', required: true },
  };

  const provider = new EnvironmentConfigurationProvider<AppConfig>(schema);
  const config = provider.getConfig();

  expect(config.values.appName).toBe('guardian-upper');
  expect(config.values.environment).toBe('test-upper');
});

class MapConfigurationSource implements ConfigurationSource {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    const value = this.values[key];
    return value === undefined ? undefined : (value as unknown as T);
  }
}

class CaseInsensitiveMapConfigurationSource implements ConfigurationSource {
  private readonly normalized: Record<string, string | undefined>;

  constructor(values: Record<string, string | undefined>) {
    this.normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.toUpperCase(), value]),
    );
  }

  get<T = string>(key: string): T | undefined {
    const value = this.normalized[key.toUpperCase()];
    return value === undefined ? undefined : (value as unknown as T);
  }
}

test('EnvironmentConfigurationProvider behaves identically on case-sensitive and case-insensitive sources', () => {
  const schema: Record<keyof AppConfig, { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
    environment: { type: 'string', required: true },
  };

  const caseSensitiveProvider = new EnvironmentConfigurationProvider<AppConfig>(
    schema,
    new MapConfigurationSource({
      APPNAME: 'guardian-ci',
      ENVIRONMENT: 'linux',
    }),
  );
  const caseInsensitiveProvider = new EnvironmentConfigurationProvider<AppConfig>(
    schema,
    new CaseInsensitiveMapConfigurationSource({
      APPNAME: 'guardian-ci',
      ENVIRONMENT: 'linux',
    }),
  );

  expect(caseSensitiveProvider.getConfig().values).toEqual(
    caseInsensitiveProvider.getConfig().values,
  );
  expect(caseSensitiveProvider.getConfig().values).toEqual({
    appName: 'guardian-ci',
    environment: 'linux',
  });
});

test('EnvironmentConfigurationProvider throws for missing required keys', () => {
  const schema: Record<'appName', { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
  };

  const provider = new EnvironmentConfigurationProvider<{ appName: string }>(schema);

  expect(() => provider.getConfig()).toThrow(/Missing required configuration key/);
});
