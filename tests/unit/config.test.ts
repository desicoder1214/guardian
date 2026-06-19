import { createConfiguration } from '../../src/core/config/index';
import { ConfigurationSchema } from '../../src/core/config/schema';

type AppConfig = {
  readonly appName: string;
  readonly enabled: boolean;
};

const schema: ConfigurationSchema<AppConfig> = {
  appName: { type: 'string', required: true },
  enabled: { type: 'boolean', required: true, default: false },
};

test('createConfiguration returns expected configuration object', () => {
  const values: AppConfig = { appName: 'guardian', enabled: true };
  const configuration = createConfiguration(schema, values);

  expect(configuration.schema).toBe(schema);
  expect(configuration.values).toEqual(values);
});
