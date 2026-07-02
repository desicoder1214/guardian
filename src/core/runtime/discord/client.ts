import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
  type Guild,
  type GuildMember,
  type Role,
} from 'discord.js';
import { DiscordGatewayRawEvent } from './pipeline-types';
import { DiscordClientAdapter } from './types';

const READY_TIMEOUT_MS = 20_000;
const FORWARDED_GATEWAY_EVENTS = [
  'READY',
  'GUILD_CREATE',
  'GUILD_MEMBER_ADD',
  'GUILD_MEMBER_REMOVE',
  'GUILD_ROLE_CREATE',
  'GUILD_ROLE_DELETE',
  'GUILD_ROLE_UPDATE',
  'CHANNEL_CREATE',
  'CHANNEL_DELETE',
  'CHANNEL_UPDATE',
  'WEBHOOK_UPDATE',
  'GUILD_UPDATE',
] as const;

type ForwardedGatewayEventName = (typeof FORWARDED_GATEWAY_EVENTS)[number];
type GatewayEventListener = (event: DiscordGatewayRawEvent) => Promise<void> | void;

export interface ProductionDiscordGatewayClientAdapterOptions {
  readonly botToken: string;
  readonly gatewayIntents: string;
  readonly guildId: string;
  readonly readyTimeoutMs?: number;
  readonly createClient?: (intents: number) => Client;
}

function createDiscordClient(intents: number): Client {
  return new Client({ intents });
}

function normalizeIntentName(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function parseGatewayIntents(raw: string): number {
  const tokens = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (tokens.length === 0) {
    throw new Error(
      'DISCORD_GATEWAY_INTENTS is empty. Configure at least one intent (for example: GUILDS,GUILD_MEMBERS).',
    );
  }

  const lookup = new Map<string, number>();
  for (const [name, value] of Object.entries(GatewayIntentBits)) {
    if (typeof value === 'number') {
      lookup.set(normalizeIntentName(name), value);
    }
  }

  let bitmask = 0;
  const unknown: string[] = [];

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      bitmask |= Number(token);
      continue;
    }

    const mapped = lookup.get(normalizeIntentName(token));
    if (mapped === undefined) {
      unknown.push(token);
      continue;
    }

    bitmask |= mapped;
  }

  if (unknown.length > 0) {
    throw new Error(
      `DISCORD_GATEWAY_INTENTS includes unknown intent names: ${unknown.join(', ')}. Use Discord intent names such as GUILDS,GUILD_MEMBERS,GUILD_WEBHOOKS.`,
    );
  }

  return bitmask;
}

function buildChannelPayload(channel: unknown): { guildId?: string; channelId?: string } {
  if (!channel || typeof channel !== 'object') {
    return {};
  }

  const candidate = channel as {
    id?: unknown;
    guild?: { id?: unknown };
  };

  return {
    guildId: typeof candidate.guild?.id === 'string' ? candidate.guild.id : undefined,
    channelId: typeof candidate.id === 'string' ? candidate.id : undefined,
  };
}

function buildGuildMemberAddPayload(member: GuildMember): {
  guildId: string;
  userId: string;
  memberUserId: string;
  botId?: string;
  targetId?: string;
  user: {
    id: string;
    bot: boolean;
  };
  member: {
    id: string;
    user: {
      id: string;
      bot: boolean;
    };
  };
} {
  const userId = member.user.id;
  const bot = member.user.bot === true;

  return {
    guildId: member.guild.id,
    userId,
    memberUserId: userId,
    ...(bot
      ? {
          botId: userId,
          targetId: userId,
        }
      : {}),
    user: {
      id: userId,
      bot,
    },
    member: {
      id: userId,
      user: {
        id: userId,
        bot,
      },
    },
  };
}

export class MockDiscordClientAdapter implements DiscordClientAdapter {
  private connected = false;
  private listeners: GatewayEventListener[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(listener: GatewayEventListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async emit(raw: DiscordGatewayRawEvent): Promise<void> {
    const snapshot = [...this.listeners];
    for (const listener of snapshot) {
      await listener(raw);
    }
  }
}

export class ProductionDiscordGatewayClientAdapter implements DiscordClientAdapter {
  private connected = false;
  private readonly listeners: GatewayEventListener[] = [];
  private readonly readyTimeoutMs: number;
  private readonly createClient: (intents: number) => Client;
  private readonly gatewayIntentsBitmask: number;
  private client?: Client;
  private cleanupListeners: Array<() => void> = [];

  constructor(private readonly options: ProductionDiscordGatewayClientAdapterOptions) {
    this.readyTimeoutMs = options.readyTimeoutMs ?? READY_TIMEOUT_MS;
    this.createClient = options.createClient ?? createDiscordClient;
    this.gatewayIntentsBitmask = parseGatewayIntents(options.gatewayIntents);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const botToken = this.options.botToken.trim();
    if (botToken.length === 0) {
      throw new Error(
        'Startup validation failed: DISCORD_BOT_TOKEN is empty. Set a valid bot token before starting Guardian.',
      );
    }

    const guildId = this.options.guildId.trim();
    if (guildId.length === 0) {
      throw new Error(
        'Startup validation failed: GUARDIAN_GUILD_ID is empty. Set the target guild ID before starting Guardian.',
      );
    }

    const client = this.createClient(this.gatewayIntentsBitmask);
    this.client = client;

    try {
      this.registerGatewayForwarders(client);
      const readyGuild = await this.loginAndAwaitReady(client, botToken, guildId);
      await this.validateGuildAccess(readyGuild);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      await this.destroyClient();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      this.connected = false;
      return;
    }

    await this.destroyClient();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(listener: GatewayEventListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async loginAndAwaitReady(client: Client, token: string, guildId: string): Promise<Guild> {
    const readyPromise = this.waitForReady(client);
    readyPromise.catch(() => undefined);

    try {
      await client.login(token);
    } catch (error) {
      throw new Error(
        `Startup validation failed: Discord login failed. Verify DISCORD_BOT_TOKEN and bot access. Details: ${this.stringifyError(error)}`,
      );
    }

    const readyClient = await readyPromise;
    const guild =
      readyClient.guilds.cache.get(guildId) ??
      (await readyClient.guilds.fetch(guildId).catch(() => undefined));

    if (!guild) {
      throw new Error(
        `Startup validation failed: configured guild ${guildId} is unavailable to the bot. Invite the bot to the guild and verify GUARDIAN_GUILD_ID.`,
      );
    }

    return guild;
  }

  private waitForReady(client: Client): Promise<Client<true>> {
    return new Promise<Client<true>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Startup validation failed: READY was not received within ${this.readyTimeoutMs}ms. Check gateway connectivity, intents, and bot token validity.`,
          ),
        );
      }, this.readyTimeoutMs);

      const onReady = (readyClient: Client<true>): void => {
        cleanup();
        resolve(readyClient);
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(new Error(`Discord gateway emitted an error before READY: ${error.message}`));
      };

      const cleanup = (): void => {
        clearTimeout(timeout);
        client.off(Events.ClientReady, onReady);
        client.off(Events.Error, onError);
      };

      client.once(Events.ClientReady, onReady);
      client.once(Events.Error, onError);
    });
  }

  private async validateGuildAccess(guild: Guild): Promise<void> {
    await guild.roles.fetch();
    const me = await guild.members.fetchMe();

    if (!me.permissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new Error(
        `Startup validation failed: bot is missing Administrator permission in guild ${guild.id}. Grant Administrator to role ${me.roles.highest.id}.`,
      );
    }

    const highestGuildRolePosition = this.getHighestGuildRolePosition(guild);
    if (me.roles.highest.position < highestGuildRolePosition) {
      throw new Error(
        `Startup validation failed: bot role ${me.roles.highest.id} is not highest in guild ${guild.id}. Move the bot role above all other roles.`,
      );
    }
  }

  private getHighestGuildRolePosition(guild: Guild): number {
    let highest = 0;
    for (const role of guild.roles.cache.values()) {
      if (role.position > highest) {
        highest = role.position;
      }
    }

    return highest;
  }

  private registerGatewayForwarders(client: Client): void {
    this.disposeGatewayForwarders();

    this.bindGatewayEvent(
      client,
      Events.ClientReady,
      () => ({
        userId: client.user?.id,
        guildCount: client.guilds.cache.size,
      }),
      'READY',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildCreate,
      (guild: Guild) => ({ guildId: guild.id }),
      'GUILD_CREATE',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildMemberAdd,
      (member: GuildMember) => buildGuildMemberAddPayload(member),
      'GUILD_MEMBER_ADD',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildMemberRemove,
      (member: GuildMember) => ({ guildId: member.guild.id, userId: member.id }),
      'GUILD_MEMBER_REMOVE',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildRoleCreate,
      (role: Role) => ({ guildId: role.guild.id, roleId: role.id }),
      'GUILD_ROLE_CREATE',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildRoleDelete,
      (role: Role) => ({ guildId: role.guild.id, roleId: role.id }),
      'GUILD_ROLE_DELETE',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildRoleUpdate,
      (_oldRole: Role, newRole: Role) => ({ guildId: newRole.guild.id, roleId: newRole.id }),
      'GUILD_ROLE_UPDATE',
    );
    this.bindGatewayEvent(
      client,
      Events.ChannelCreate,
      (channel: unknown) => buildChannelPayload(channel),
      'CHANNEL_CREATE',
    );
    this.bindGatewayEvent(
      client,
      Events.ChannelDelete,
      (channel: unknown) => buildChannelPayload(channel),
      'CHANNEL_DELETE',
    );
    this.bindGatewayEvent(
      client,
      Events.ChannelUpdate,
      (_oldChannel: unknown, newChannel: unknown) => buildChannelPayload(newChannel),
      'CHANNEL_UPDATE',
    );
    this.bindGatewayEvent(
      client,
      Events.WebhooksUpdate,
      (channel: unknown) => buildChannelPayload(channel),
      'WEBHOOK_UPDATE',
    );
    this.bindGatewayEvent(
      client,
      Events.GuildUpdate,
      (_oldGuild: Guild, newGuild: Guild) => ({ guildId: newGuild.id }),
      'GUILD_UPDATE',
    );
  }

  private bindGatewayEvent<TArgs extends unknown[]>(
    client: Client,
    eventName: string,
    payloadFactory: (...args: TArgs) => unknown,
    forwardedName: ForwardedGatewayEventName,
  ): void {
    const handler = (...args: unknown[]): void => {
      const payload = payloadFactory(...(args as TArgs));
      this.dispatchGatewayEvent(forwardedName, payload);
    };

    client.on(eventName, handler);
    this.cleanupListeners.push(() => client.off(eventName, handler));
  }

  private dispatchGatewayEvent(type: ForwardedGatewayEventName, payload: unknown): void {
    const event: DiscordGatewayRawEvent = {
      t: type,
      d: payload,
      ts: new Date().toISOString(),
    };

    const listeners = [...this.listeners];
    for (const listener of listeners) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          result.catch(() => undefined);
        }
      } catch {
        // ignore listener failures to avoid interrupting gateway handling
      }
    }
  }

  private async destroyClient(): Promise<void> {
    this.disposeGatewayForwarders();

    if (this.client) {
      this.client.destroy();
      this.client = undefined;
    }
  }

  private disposeGatewayForwarders(): void {
    const cleanup = [...this.cleanupListeners];
    this.cleanupListeners = [];

    for (const dispose of cleanup) {
      dispose();
    }
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
