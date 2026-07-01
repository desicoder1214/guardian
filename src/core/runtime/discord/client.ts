import { DiscordClientAdapter } from './types';

export class MockDiscordClientAdapter implements DiscordClientAdapter {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Lifecycle-only Discord client adapter.
 *
 * This validates bot token presence and tracks connect/disconnect state, but it
 * does not provide real gateway transport.
 */
export class TokenValidatingDiscordClientAdapter implements DiscordClientAdapter {
  private connected = false;

  constructor(private readonly botToken: string) {}

  async connect(): Promise<void> {
    if (!this.botToken || this.botToken.trim().length === 0) {
      throw new Error('TokenValidatingDiscordClientAdapter requires DISCORD_BOT_TOKEN');
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
