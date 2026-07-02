import { EventEmitter } from 'events';
import { Client, Events, type Guild, type GuildMember } from 'discord.js';
import { ProductionDiscordGatewayClientAdapter } from '../../src/core/runtime/discord/client';

class FakeGuild {
  readonly roles: {
    cache: Map<string, { id: string; position: number }>;
    fetch: jest.Mock<Promise<void>, []>;
  };

  readonly members: {
    fetchMe: jest.Mock<Promise<GuildMember>, []>;
  };

  constructor(
    readonly id: string,
    options: {
      adminPermission: boolean;
      botRolePosition: number;
      maxRolePosition: number;
    },
  ) {
    this.roles = {
      cache: new Map<string, { id: string; position: number }>([
        ['bot-role', { id: 'bot-role', position: options.botRolePosition }],
        ['max-role', { id: 'max-role', position: options.maxRolePosition }],
      ]),
      fetch: jest.fn(async () => undefined),
    };

    const member = {
      id: 'bot-user',
      guild: this,
      permissions: {
        has: jest.fn(() => options.adminPermission),
      },
      roles: {
        highest: {
          id: 'bot-role',
          position: options.botRolePosition,
        },
      },
    } as unknown as GuildMember;

    this.members = {
      fetchMe: jest.fn(async () => member),
    };
  }
}

class FakeDiscordClient {
  private readonly emitter = new EventEmitter();
  readonly guildCache = new Map<string, Guild>();
  readonly guilds = {
    cache: this.guildCache,
    fetch: jest.fn(async (guildId: string) => this.guildCache.get(guildId)),
  };
  readonly login = jest.fn(async (_token: string) => {
    if (this.loginError) {
      throw this.loginError;
    }

    if (this.emitReadyOnLogin) {
      this.emitter.emit(Events.ClientReady, this);
    }

    return 'ok';
  });
  readonly destroy = jest.fn(() => undefined);
  readonly user = { id: 'bot-user' };

  loginError?: Error;
  emitReadyOnLogin = true;

  on(eventName: string, listener: (...args: unknown[]) => void): this {
    this.emitter.on(eventName, listener);
    return this;
  }

  once(eventName: string, listener: (...args: unknown[]) => void): this {
    this.emitter.once(eventName, listener);
    return this;
  }

  off(eventName: string, listener: (...args: unknown[]) => void): this {
    this.emitter.off(eventName, listener);
    return this;
  }

  emit(eventName: string, ...args: unknown[]): void {
    this.emitter.emit(eventName, ...args);
  }
}

function createAdapter(client: FakeDiscordClient, guildId = 'guild-1', botToken = 'test-token') {
  return new ProductionDiscordGatewayClientAdapter({
    botToken,
    gatewayIntents: 'GUILDS,GUILD_MEMBERS,GUILD_WEBHOOKS',
    guildId,
    readyTimeoutMs: 25,
    createClient: () => client as unknown as Client,
  });
}

test('successful login path connects after READY and startup validation', async () => {
  const fakeClient = new FakeDiscordClient();
  const guild = new FakeGuild('guild-1', {
    adminPermission: true,
    botRolePosition: 20,
    maxRolePosition: 20,
  });
  fakeClient.guildCache.set(guild.id, guild as unknown as Guild);

  const adapter = createAdapter(fakeClient);

  await adapter.connect();

  expect(fakeClient.login).toHaveBeenCalledWith('test-token');
  expect(adapter.isConnected()).toBe(true);
});

test('gateway login trims whitespace from DISCORD_BOT_TOKEN-derived input', async () => {
  const fakeClient = new FakeDiscordClient();
  const guild = new FakeGuild('guild-1', {
    adminPermission: true,
    botRolePosition: 20,
    maxRolePosition: 20,
  });
  fakeClient.guildCache.set(guild.id, guild as unknown as Guild);

  const adapter = createAdapter(fakeClient, 'guild-1', '  test-token  ');

  await adapter.connect();

  expect(fakeClient.login).toHaveBeenCalledWith('test-token');
});

test('login failure surfaces actionable startup error', async () => {
  const fakeClient = new FakeDiscordClient();
  fakeClient.loginError = new Error('invalid token');

  const adapter = createAdapter(fakeClient);

  await expect(adapter.connect()).rejects.toThrow('Discord login failed');
  expect(adapter.isConnected()).toBe(false);
});

test('startup fails when READY is not received in time', async () => {
  jest.useFakeTimers();
  const fakeClient = new FakeDiscordClient();
  fakeClient.emitReadyOnLogin = false;

  const adapter = createAdapter(fakeClient);

  const connectPromise = adapter.connect().then(
    () => undefined,
    (error) => error,
  );
  await jest.advanceTimersByTimeAsync(30);

  const startupError = await connectPromise;
  expect(startupError).toBeInstanceOf(Error);
  expect((startupError as Error).message).toContain('READY was not received');
  expect(adapter.isConnected()).toBe(false);
  jest.useRealTimers();
});

test('gateway event forwarding emits canonical raw events', async () => {
  const fakeClient = new FakeDiscordClient();
  const guild = new FakeGuild('guild-1', {
    adminPermission: true,
    botRolePosition: 20,
    maxRolePosition: 20,
  });
  fakeClient.guildCache.set(guild.id, guild as unknown as Guild);

  const adapter = createAdapter(fakeClient);
  const received: string[] = [];
  adapter.subscribe((event) => {
    received.push(event.t);
  });

  await adapter.connect();
  fakeClient.emit(Events.GuildCreate, guild);
  fakeClient.emit(Events.GuildUpdate, guild, guild);
  fakeClient.emit(Events.WebhooksUpdate, { id: 'channel-1', guild: { id: guild.id } });

  expect(received).toEqual(expect.arrayContaining(['READY', 'GUILD_CREATE', 'GUILD_UPDATE', 'WEBHOOK_UPDATE']));
});

test('GuildMemberAdd forwarding preserves discord.js bot payload shape', async () => {
  const fakeClient = new FakeDiscordClient();
  const guild = new FakeGuild('guild-1', {
    adminPermission: true,
    botRolePosition: 20,
    maxRolePosition: 20,
  });
  fakeClient.guildCache.set(guild.id, guild as unknown as Guild);

  const adapter = createAdapter(fakeClient);
  const received: Array<{ t: string; d: unknown }> = [];
  adapter.subscribe((event) => {
    received.push({ t: event.t, d: event.d });
  });

  await adapter.connect();

  const member = {
    id: 'bot-user-1',
    guild,
    user: {
      id: 'bot-user-1',
      bot: true,
    },
  } as unknown as GuildMember;

  fakeClient.emit(Events.GuildMemberAdd, member);

  const forwarded = received.find((event) => event.t === 'GUILD_MEMBER_ADD');
  expect(forwarded).toBeDefined();
  expect(forwarded?.d).toEqual(
    expect.objectContaining({
      guildId: 'guild-1',
      userId: 'bot-user-1',
      memberUserId: 'bot-user-1',
      botId: 'bot-user-1',
      targetId: 'bot-user-1',
      user: expect.objectContaining({ id: 'bot-user-1', bot: true }),
      member: expect.objectContaining({
        id: 'bot-user-1',
        user: expect.objectContaining({ id: 'bot-user-1', bot: true }),
      }),
    }),
  );
});

test('disconnect destroys gateway client cleanly', async () => {
  const fakeClient = new FakeDiscordClient();
  const guild = new FakeGuild('guild-1', {
    adminPermission: true,
    botRolePosition: 20,
    maxRolePosition: 20,
  });
  fakeClient.guildCache.set(guild.id, guild as unknown as Guild);

  const adapter = createAdapter(fakeClient);

  await adapter.connect();
  await adapter.disconnect();

  expect(fakeClient.destroy).toHaveBeenCalledTimes(1);
  expect(adapter.isConnected()).toBe(false);
});
