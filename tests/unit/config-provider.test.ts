import { EnvironmentConfigurationProvider } from '../../src/core/config/provider';

interface AppConfig {
  readonly appName: string;
  readonly environment: string;
}

afterEach(() => {
  delete process.env.APPNAME;
  delete process.env.ENVIRONMENT;
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

test('EnvironmentConfigurationProvider throws for missing required keys', () => {
  const schema: Record<'appName', { type: 'string'; required: true }> = {
    appName: { type: 'string', required: true },
  };

  const provider = new EnvironmentConfigurationProvider<{ appName: string }>(schema);

  expect(() => provider.getConfig()).toThrow(/Missing required configuration key/);
});
