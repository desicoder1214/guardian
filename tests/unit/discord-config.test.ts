import { DiscordConfigurationProvider } from '../../src/core/runtime/discord/config';

afterEach(() => {
  delete process.env.DISCORD_BOT_TOKEN;
  delete process.env.DISCORD_GATEWAY_INTENTS;
  delete process.env.DISCORD_PRESENCE_STATUS;
});

test('DiscordConfigurationProvider loads typed Discord runtime configuration', () => {
  process.env.DISCORD_BOT_TOKEN = 'test-token';
  process.env.DISCORD_GATEWAY_INTENTS = 'GUILDS';
  process.env.DISCORD_PRESENCE_STATUS = 'online';

  const provider = new DiscordConfigurationProvider();
  const config = provider.getConfig();

  expect(config.values.botToken).toBe('test-token');
  expect(config.values.gatewayIntents).toBe('GUILDS');
  expect(config.values.presenceStatus).toBe('online');
});

test('DiscordConfigurationProvider throws when required discord configuration is missing', () => {
  expect(() => new DiscordConfigurationProvider().getConfig()).toThrow(
    /Missing required Discord configuration key/,
  );
});
