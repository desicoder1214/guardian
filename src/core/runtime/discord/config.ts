import { ConfigurationProvider, EnvironmentConfigurationSource } from '../../config/provider';
import { Configuration, ConfigurationSource, createConfiguration } from '../../config/index';
import { ConfigurationSchema } from '../../config/schema';
import { ConfigurationError } from '../../../shared/errors';

export interface DiscordRuntimeConfiguration {
  readonly botToken: string;
  readonly gatewayIntents: string;
  readonly presenceStatus: string;
}

export const discordRuntimeConfigSchema: ConfigurationSchema<DiscordRuntimeConfiguration> = {
  botToken: { type: 'string', required: true, description: 'Discord bot token' },
  gatewayIntents: { type: 'string', required: true, description: 'Gateway intents configuration' },
  presenceStatus: { type: 'string', default: 'online', description: 'Discord presence status' },
};

const discordEnvKeys: Record<keyof DiscordRuntimeConfiguration, string> = {
  botToken: 'DISCORD_BOT_TOKEN',
  gatewayIntents: 'DISCORD_GATEWAY_INTENTS',
  presenceStatus: 'DISCORD_PRESENCE_STATUS',
};

export class DiscordConfigurationProvider
  implements ConfigurationProvider<DiscordRuntimeConfiguration>
{
  constructor(
    public readonly schema: ConfigurationSchema<DiscordRuntimeConfiguration> = discordRuntimeConfigSchema,
    private readonly source: ConfigurationSource = new EnvironmentConfigurationSource(),
  ) {}

  getConfig(): Configuration<DiscordRuntimeConfiguration> {
    const values = this.loadFromSource();
    return createConfiguration(this.schema, values);
  }

  reload(): Configuration<DiscordRuntimeConfiguration> {
    return this.getConfig();
  }

  private loadFromSource(): DiscordRuntimeConfiguration {
    type MutableDiscordRuntimeConfiguration = {
      -readonly [K in keyof DiscordRuntimeConfiguration]?: DiscordRuntimeConfiguration[K];
    };

    const values: MutableDiscordRuntimeConfiguration = {};

    for (const key of Object.keys(this.schema) as Array<keyof DiscordRuntimeConfiguration>) {
      const field = this.schema[key];
      const rawValue = this.source.get<string>(discordEnvKeys[key]);

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (field.default !== undefined) {
          values[key] = field.default as DiscordRuntimeConfiguration[typeof key];
          continue;
        }

        if (field.required) {
          throw new ConfigurationError(
            `Missing required Discord configuration key: ${discordEnvKeys[key]}`,
          );
        }

        continue;
      }

      values[key] = this.parseValue(
        rawValue,
        field.type,
      ) as DiscordRuntimeConfiguration[typeof key];
    }

    return values as DiscordRuntimeConfiguration;
  }

  private parseValue(
    value: string,
    type: ConfigurationSchema<DiscordRuntimeConfiguration>[keyof DiscordRuntimeConfiguration]['type'],
  ): unknown {
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
