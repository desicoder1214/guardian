const DISCORD_BOT_TOKEN_ENV_KEY = 'DISCORD_BOT_TOKEN';

export interface DiscordBotTokenResolution {
  readonly source: typeof DISCORD_BOT_TOKEN_ENV_KEY;
  readonly token: string;
  readonly present: boolean;
  readonly rawLength: number;
  readonly trimmedLength: number;
  readonly whitespaceTrimmed: boolean;
}

export function normalizeDiscordBotToken(token: string): string {
  return token.trim();
}

export function resolveDiscordBotTokenFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): DiscordBotTokenResolution {
  const rawToken = env[DISCORD_BOT_TOKEN_ENV_KEY] ?? '';
  const token = normalizeDiscordBotToken(rawToken);

  return Object.freeze({
    source: DISCORD_BOT_TOKEN_ENV_KEY,
    token,
    present: rawToken.length > 0,
    rawLength: rawToken.length,
    trimmedLength: token.length,
    whitespaceTrimmed: rawToken.length !== token.length,
  });
}