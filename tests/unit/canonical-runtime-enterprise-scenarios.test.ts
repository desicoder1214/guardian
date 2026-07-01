import { InMemoryEventBus } from '../../src/core/event/bus';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import { RuntimeManager } from '../../src/core/runtime/lifecycle';
import {
  LoggerFactory,
  LogLevel,
  LogTransport,
} from '../../src/core/runtime/logger';
import {
  IntegratedCanonicalGuardianRuntime,
} from '../../src/core/runtime/canonical-runtime';
import { GuardianRuntimeMode } from '../../src/core/runtime/runtime-mode';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { InMemoryRecoveryEngine } from '../../src/core/runtime/recovery/recovery-engine';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import {
  DiscordRuntimeAdapter,
  DiscordRuntimeState,
} from '../../src/core/runtime/discord/types';

interface CapturedLog {
  readonly level: LogLevel;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

class CapturingLogTransport implements LogTransport {
  readonly entries: CapturedLog[] = [];

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    this.entries.push(
      Object.freeze({
        level,
        message,
        metadata,
      }),
    );
  }
}

class StubDiscordRuntimeAdapter implements DiscordRuntimeAdapter {
  private state: DiscordRuntimeState = 'disconnected';

  async start(): Promise<void> {
    this.state = 'connected';
  }

  async stop(): Promise<void> {
    this.state = 'stopping';
  }

  async reconnect(): Promise<void> {
    this.state = 'reconnecting';
  }

  getState(): DiscordRuntimeState {
    return this.state;
  }
}

const SUPPORTED_SCENARIOS = Object.freeze([
  { scenario: 'UNAUTHORIZED_BOT_ADDITION', eventName: 'BOT_ADD', expectedActionType: 'BOT_ADD' },
  { scenario: 'DUPLICATE_BOT_IDENTITY', eventName: 'BOT_DUPLICATE_IDENTITY', expectedActionType: 'BOT_ADD' },
  { scenario: 'DANGEROUS_WEBHOOK_CREATION', eventName: 'WEBHOOK_CREATE', expectedActionType: 'WEBHOOK_CREATE' },
  { scenario: 'WEBHOOK_MODIFICATION', eventName: 'WEBHOOK_MODIFICATION', expectedActionType: 'WEBHOOK_DELETE' },
  { scenario: 'DANGEROUS_ROLE_GRANT', eventName: 'GUILD_MEMBER_UPDATE', expectedActionType: 'ROLE_CREATE' },
  { scenario: 'PRIVILEGED_PERMISSION_ESCALATION', eventName: 'PRIVILEGED_PERMISSION_ESCALATION', expectedActionType: 'ROLE_CREATE' },
  { scenario: 'CHANNEL_PERMISSION_DRIFT', eventName: 'CHANNEL_PERMISSION_DRIFT', expectedActionType: 'CHANNEL_DELETE' },
]);

const FAIL_CLOSED_SCENARIOS = Object.freeze([
  {
    scenario: 'MISSING_AUTHORIZED_BOT',
    eventName: 'BOT_AUTHORIZED_MISSING',
    expectedReason: 'Requires startup inventory reconciliation baseline, unavailable in canonical event-only detector path',
  },
  {
    scenario: 'STARTUP_RECONCILIATION_AFTER_DOWNTIME',
    eventName: 'STARTUP_RECONCILIATION_AFTER_DOWNTIME',
    expectedReason: 'Requires startup reconciliation coordinator state, unavailable in canonical event-only detector path',
  },
  {
    scenario: 'RECOVERY_RESTORATION',
    eventName: 'RECOVERY_RESTORATION',
    expectedReason: 'Requires recovery snapshot restore context, unavailable in canonical event-only detector path',
  },
]);

describe('IntegratedCanonicalGuardianRuntime enterprise scenario contracts', () => {
  test('routes supported scenarios through canonical detector path and marks unsupported scenarios fail-closed', async () => {
    const transport = new CapturingLogTransport();
    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.TESTING,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-cert-1',
      'guild-cert-1',
    );

    await runtime.start();

    for (const scenario of SUPPORTED_SCENARIOS) {
      const isBotAddScenario = scenario.expectedActionType === 'BOT_ADD';
      await runtime.ingestGatewayEvent({
        t: scenario.eventName,
        d: {
          actorId: `actor-${scenario.scenario.toLowerCase()}`,
          scenario: scenario.scenario,
          ...(isBotAddScenario
            ? {
                botId: `bot-${scenario.scenario.toLowerCase()}`,
              }
            : {}),
        },
      });
    }

    for (const scenario of FAIL_CLOSED_SCENARIOS) {
      await runtime.ingestGatewayEvent({
        t: scenario.eventName,
        d: {
          actorId: `actor-${scenario.scenario.toLowerCase()}`,
          scenario: scenario.scenario,
        },
      });
    }

    await runtime.stop();

    const detectorPathLogs = transport.entries.filter(
      (entry) => entry.level === 'info' && entry.message === 'Canonical Guardian detector path evaluated',
    );
    const failClosedLogs = transport.entries.filter(
      (entry) => entry.level === 'warn' && entry.message === 'Canonical Guardian scenario fail-closed',
    );

    expect(detectorPathLogs).toHaveLength(SUPPORTED_SCENARIOS.length);
    expect(failClosedLogs).toHaveLength(FAIL_CLOSED_SCENARIOS.length);

    for (const scenario of SUPPORTED_SCENARIOS) {
      const log = detectorPathLogs.find((entry) => entry.metadata?.scenario === scenario.scenario);
      expect(log).toBeDefined();
      expect(log?.metadata?.eventName).toBe(scenario.eventName);
      expect(log?.metadata?.actionType).toBe(scenario.expectedActionType);
      expect(log?.metadata?.detectorCount).toBeGreaterThan(0);
    }

    for (const scenario of FAIL_CLOSED_SCENARIOS) {
      const log = failClosedLogs.find((entry) => entry.metadata?.scenario === scenario.scenario);
      expect(log).toBeDefined();
      expect(log?.metadata?.eventName).toBe(scenario.eventName);
      expect(log?.metadata?.failClosed).toBe(true);
      expect(log?.metadata?.reason).toBe(scenario.expectedReason);
    }
  });
});

function createFetchResponse(status: number): {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: { get(name: string): string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
} {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status-${status}`,
    headers: {
      get: () => null,
    },
    json: async () => Object.freeze({}),
    text: async () => '',
  };
}

describe('IntegratedCanonicalGuardianRuntime unauthorized bot vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_INVITER_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_BOT_IDS;
    delete process.env.GUARDIAN_TRUSTED_BOT_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('production mode uses production adapter and issues correct unauthorized bot DELETE request', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const transport = new CapturingLogTransport();
    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-1',
      'guild-bot-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent({
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-1',
        actorId: 'inviter-1',
        botId: 'bot-unauthorized-1',
        member: {
          user: {
            id: 'bot-unauthorized-1',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:00:00.000Z',
    });
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    const firstCall = fetchSpy.mock.calls[0] as unknown[];
    const url = firstCall[0] as string;
    const init = firstCall[1] as { method: string; headers: Record<string, string> };
    expect(url).toContain('/api/v10/guilds/guild-bot-slice-1/members/bot-unauthorized-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bot test-bot-token');
  });

  test('authorized bot is not removed', async () => {
    process.env.GUARDIAN_AUTHORIZED_BOT_IDS = 'bot-authorized-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-2',
      'guild-bot-slice-2',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent({
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-2',
        actorId: 'inviter-2',
        botId: 'bot-authorized-1',
        member: {
          user: {
            id: 'bot-authorized-1',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:01:00.000Z',
    });
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted inviter adding unauthorized bot still triggers containment unless bot is authorized', async () => {
    process.env.GUARDIAN_TRUSTED_INVITER_IDS = 'trusted-inviter-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-3',
      'guild-bot-slice-3',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent({
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-3',
        actorId: 'trusted-inviter-1',
        botId: 'bot-unauthorized-3',
        member: {
          user: {
            id: 'bot-unauthorized-3',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:02:00.000Z',
    });
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
  });

  test('duplicate/replay events are suppressed and do not re-execute', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-4',
      'guild-bot-slice-4',
    );

    await runtime.start();
    const replayEvent = {
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-4',
        actorId: 'inviter-4',
        botId: 'bot-unauthorized-4',
        member: {
          user: {
            id: 'bot-unauthorized-4',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:03:00.000Z',
    } as const;

    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(
      transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed'),
    ).toBe(true);
  });

  test('replay suppression expires and allows a later reprocessing', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    let nowMs = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-ttl',
      'guild-bot-slice-ttl',
    );

    const replayEvent = {
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-ttl',
        actorId: 'inviter-ttl',
        botId: 'bot-unauthorized-ttl',
        member: {
          user: {
            id: 'bot-unauthorized-ttl',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:06:00.000Z',
    } as const;

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    nowMs += 16 * 60_000;
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('webhook containment and rogue inviter punishment are planned when unauthorized bot add is detected', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const plannerSpy = jest.spyOn(InMemorySecurityExecutionPlanner.prototype, 'plan');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-bot-slice-5',
      'guild-bot-slice-5',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent({
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-bot-slice-5',
        actorId: 'rogue-inviter-5',
        botId: 'bot-unauthorized-5',
        member: {
          user: {
            id: 'bot-unauthorized-5',
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:04:00.000Z',
    });
    await runtime.stop();

    expect(plannerSpy).toHaveBeenCalled();
    const lastCall = plannerSpy.mock.calls[plannerSpy.mock.calls.length - 1];
    const actionPlan = lastCall[0] as { actions: readonly { type: SecurityActionType }[] };
    const decisionModel = lastCall[1] as { metadata?: Record<string, unknown> };

    expect(actionPlan.actions.some((action) => action.type === SecurityActionType.FREEZE_WEBHOOKS)).toBe(true);
    expect(decisionModel.metadata?.rogueInviterPunishmentPlanned).toBe(true);
    expect(decisionModel.metadata?.runtimeId).toBe('runtime-bot-slice-5');
    expect(decisionModel.metadata?.guildId).toBe('guild-bot-slice-5');
    expect(decisionModel.metadata?.actorId).toBe('rogue-inviter-5');
    expect(decisionModel.metadata?.botId).toBe('bot-unauthorized-5');
  });

  test.each([403, 429, 500])('failures (%i) fail closed and trigger recovery/report path', async (statusCode) => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/members/')) {
        return createFetchResponse(statusCode);
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      `runtime-bot-slice-fail-${statusCode}`,
      `guild-bot-slice-fail-${statusCode}`,
    );

    await runtime.start();
    await runtime.ingestGatewayEvent({
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: `guild-bot-slice-fail-${statusCode}`,
        actorId: `inviter-fail-${statusCode}`,
        botId: `bot-unauthorized-fail-${statusCode}`,
        member: {
          user: {
            id: `bot-unauthorized-fail-${statusCode}`,
            bot: true,
          },
        },
      },
      ts: '2026-07-01T13:05:00.000Z',
    });
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });
});

describe('IntegratedCanonicalGuardianRuntime dangerous role grant vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_INVITER_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildDangerousRoleGrantEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'GUILD_MEMBER_UPDATE',
      d: {
        guildId: 'guild-role-slice-1',
        actorId: 'actor-role-slice-1',
        memberUserId: 'member-role-slice-1',
        roleId: 'role-dangerous-slice-1',
        beforePermissions: ['VIEW_CHANNEL'],
        afterPermissions: ['VIEW_CHANNEL', 'ADMINISTRATOR'],
        ...overrides,
      },
      ts: '2026-07-01T14:00:00.000Z',
    };
  }

  test('dangerous role grant executes containment through production role adapter path', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const plannerSpy = jest.spyOn(InMemorySecurityExecutionPlanner.prototype, 'plan');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-1',
      'guild-role-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildDangerousRoleGrantEvent());
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    const calls = fetchSpy.mock.calls as unknown as Array<[
      string,
      { method: string; headers?: Record<string, string> },
    ]>;
    const roleCall = calls.find((call) => call[0].includes('/roles/role-dangerous-slice-1'));

    expect(roleCall).toBeDefined();
    const roleUrl = roleCall?.[0] ?? '';
    const roleInit = roleCall?.[1] ?? { method: '' };
    expect(roleUrl).toContain('/api/v10/guilds/guild-role-slice-1/members/member-role-slice-1/roles/role-dangerous-slice-1');
    expect(roleInit.method).toBe('DELETE');

    const planCall = plannerSpy.mock.calls[plannerSpy.mock.calls.length - 1];
    const actionPlan = planCall[0] as { actions: readonly { type: SecurityActionType }[] };
    expect(actionPlan.actions.map((action) => action.type)).toEqual([
      SecurityActionType.REMOVE_DANGEROUS_ROLE,
      SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
      SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
      SecurityActionType.CREATE_INCIDENT,
      SecurityActionType.NOTIFY_AUDIT,
    ]);
  });

  test('normal onboarding role update does not execute containment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-2',
      'guild-role-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildDangerousRoleGrantEvent({
        roleId: 'role-onboarding-safe-1',
        afterPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted actor does not bypass mandatory dangerous role containment', async () => {
    process.env.GUARDIAN_TRUSTED_INVITER_IDS = 'trusted-admin-role-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-3',
      'guild-role-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildDangerousRoleGrantEvent({
        actorId: 'trusted-admin-role-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
  });

  test('duplicate/replay dangerous role events are suppressed', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-4',
      'guild-role-slice-1',
    );

    const replayEvent = buildDangerousRoleGrantEvent({
      actorId: 'actor-role-replay-1',
      roleId: 'role-dangerous-replay-1',
      memberUserId: 'member-role-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const replayRoleCalls = fetchSpy.mock.calls.filter((call) => String((call as unknown[])[0] ?? '').includes('/roles/'));
    const replayKickCalls = fetchSpy.mock.calls.filter(
      (call) => String((call as unknown[])[0] ?? '').includes('/members/') && !String((call as unknown[])[0] ?? '').includes('/roles/'),
    );
    const replayBanCalls = fetchSpy.mock.calls.filter((call) => String((call as unknown[])[0] ?? '').includes('/bans/'));
    expect(replayRoleCalls).toHaveLength(1);
    expect(replayKickCalls).toHaveLength(1);
    expect(replayBanCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test.each([403, 429, 500])(
    'dangerous role containment failure (%i) triggers recovery scheduling',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes('/roles/')) {
          return createFetchResponse(statusCode);
        }

        return createFetchResponse(204);
      });
      (globalThis as { fetch?: unknown }).fetch = fetchSpy;

      const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

      const eventBus = new InMemoryEventBus();
      const health = new RuntimeHealthService();
      const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
      const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

      const runtime = new IntegratedCanonicalGuardianRuntime(
        GuardianRuntimeMode.PRODUCTION,
        runtimeManager,
        new StubDiscordRuntimeAdapter(),
        eventBus,
        health,
        loggerFactory,
        `runtime-role-slice-fail-${statusCode}`,
        'guild-role-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildDangerousRoleGrantEvent({
          actorId: `actor-role-fail-${statusCode}`,
          memberUserId: `member-role-fail-${statusCode}`,
          roleId: `role-dangerous-fail-${statusCode}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('role already removed (404) is treated as verified containment and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/roles/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_ROLE', message: 'Unknown Role' }),
        };
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-404',
      'guild-role-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildDangerousRoleGrantEvent({
        actorId: 'actor-role-404',
        memberUserId: 'member-role-404',
        roleId: 'role-dangerous-404',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test('protected dangerous role respects policy by skipping punishment and neutralization', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const plannerSpy = jest.spyOn(InMemorySecurityExecutionPlanner.prototype, 'plan');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-role-slice-protected',
      'guild-role-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildDangerousRoleGrantEvent({
        roleId: 'role-protected-dangerous-1',
        protectedRole: true,
      }),
    );
    await runtime.stop();

    const planCall = plannerSpy.mock.calls[plannerSpy.mock.calls.length - 1];
    const actionPlan = planCall[0] as { actions: readonly { type: SecurityActionType }[] };
    expect(actionPlan.actions.map((action) => action.type)).toEqual([
      SecurityActionType.REMOVE_DANGEROUS_ROLE,
      SecurityActionType.CREATE_INCIDENT,
      SecurityActionType.NOTIFY_AUDIT,
    ]);
    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe('IntegratedCanonicalGuardianRuntime webhook creation abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_INVITER_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_WEBHOOK_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_INTEGRATION_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildWebhookCreateEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'WEBHOOK_CREATE',
      d: {
        guildId: 'guild-webhook-slice-1',
        actorId: 'actor-webhook-slice-1',
        webhookId: 'webhook-dangerous-slice-1',
        ownerIntegrationId: 'integration-untrusted-slice-1',
        ...overrides,
      },
      ts: '2026-07-01T15:00:00.000Z',
    };
  }

  test('unauthorized webhook create executes webhook removal and actor punishment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-1',
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildWebhookCreateEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-slice-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-webhook-slice-1/members/actor-webhook-slice-1'))).toBe(true);
  });

  test('authorized integration webhook create performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_INTEGRATION_IDS = 'integration-safe-slice-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-2',
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildWebhookCreateEvent({
        ownerIntegrationId: 'integration-safe-slice-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted administrator policy can suppress punishment but not mandatory webhook containment', async () => {
    process.env.GUARDIAN_TRUSTED_INVITER_IDS = 'trusted-admin-webhook-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-3',
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildWebhookCreateEvent({
        actorId: 'trusted-admin-webhook-1',
        policyPunishActor: false,
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-slice-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-webhook-slice-1/members/trusted-admin-webhook-1'))).toBe(false);
  });

  test('duplicate/replay webhook create events are suppressed', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-4',
      'guild-webhook-slice-1',
    );

    const replayEvent = buildWebhookCreateEvent({
      actorId: 'actor-webhook-replay-1',
      webhookId: 'webhook-dangerous-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const webhookCalls = fetchSpy.mock.calls.filter((call) =>
      String((call as unknown[])[0] ?? '').includes('/api/v10/webhooks/webhook-dangerous-replay-1'),
    );
    expect(webhookCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('webhook already deleted (404) is treated as verified and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/webhooks/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_WEBHOOK', message: 'Unknown Webhook' }),
        };
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-404',
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildWebhookCreateEvent({ webhookId: 'webhook-dangerous-404' }));
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test.each([403, 429, 500])('webhook containment failure (%i) triggers recovery scheduling', async (statusCode) => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/webhooks/')) {
        return createFetchResponse(statusCode);
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      `runtime-webhook-slice-fail-${statusCode}`,
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildWebhookCreateEvent({
        actorId: `actor-webhook-fail-${statusCode}`,
        webhookId: `webhook-dangerous-fail-${statusCode}`,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('multiple rapid webhook creations are each contained', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-webhook-slice-5',
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildWebhookCreateEvent({ actorId: 'actor-webhook-1', webhookId: 'webhook-dangerous-1' }),
    );
    await runtime.ingestGatewayEvent(
      buildWebhookCreateEvent({ actorId: 'actor-webhook-2', webhookId: 'webhook-dangerous-2' }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-2'))).toBe(true);
  });
});

describe('IntegratedCanonicalGuardianRuntime dangerous role via invite abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_INVITER_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_BOT_IDS;
    delete process.env.GUARDIAN_TRUSTED_BOT_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildJoinRoleCatalog() {
    return Object.freeze([
      Object.freeze({
        roleId: 'role-onboarding-1',
        name: 'Onboarding',
        permissions: Object.freeze(['VIEW_CHANNEL']),
        protectedRole: false,
        privilegedRole: false,
        dangerousRole: false,
        nukerCapable: false,
      }),
      Object.freeze({
        roleId: 'role-cosmetic-1',
        name: 'Cosmetic',
        permissions: Object.freeze(['VIEW_CHANNEL']),
        protectedRole: false,
        privilegedRole: false,
        dangerousRole: false,
        nukerCapable: false,
      }),
      Object.freeze({
        roleId: 'role-dangerous-join-1',
        name: 'Dangerous Join',
        permissions: Object.freeze(['ADMINISTRATOR']),
        protectedRole: false,
        privilegedRole: true,
        dangerousRole: true,
        nukerCapable: true,
      }),
      Object.freeze({
        roleId: 'role-protected-join-1',
        name: 'Protected Join',
        permissions: Object.freeze(['MANAGE_GUILD']),
        protectedRole: true,
        privilegedRole: false,
        dangerousRole: false,
        nukerCapable: false,
      }),
    ]);
  }

  function buildJoinEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'GUILD_MEMBER_ADD',
      d: {
        guildId: 'guild-join-slice-1',
        actorId: 'inviter-join-slice-1',
        memberUserId: 'member-join-slice-1',
        roleIds: ['role-dangerous-join-1'],
        roleCatalog: buildJoinRoleCatalog(),
        ...overrides,
      },
      ts: '2026-07-01T16:00:00.000Z',
    };
  }

  test('dangerous join role is contained through canonical runtime and production role adapter', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const plannerSpy = jest.spyOn(InMemorySecurityExecutionPlanner.prototype, 'plan');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-1',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildJoinEvent({ inviteCode: 'invite-join-1' }));
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    const firstCall = fetchSpy.mock.calls[0] as unknown[];
    const url = firstCall[0] as string;
    expect(url).toContain('/api/v10/guilds/guild-join-slice-1/members/member-join-slice-1/roles/role-dangerous-join-1');

    const planCall = plannerSpy.mock.calls[plannerSpy.mock.calls.length - 1];
    const actionPlan = planCall[0] as { actions: readonly { type: SecurityActionType }[] };
    expect(actionPlan.actions.map((action) => action.type)).toEqual([
      SecurityActionType.REMOVE_DANGEROUS_ROLE,
      SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
      SecurityActionType.CREATE_INCIDENT,
      SecurityActionType.NOTIFY_AUDIT,
    ]);
  });

  test('onboarding and self-selectable roles do not trigger containment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-2',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        memberUserId: 'member-onboarding-safe',
        roleIds: ['role-onboarding-1'],
        onboardingAssigned: true,
      }),
    );
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        memberUserId: 'member-cosmetic-safe',
        roleIds: ['role-cosmetic-1'],
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted administrator cannot bypass mandatory containment for dangerous join role', async () => {
    process.env.GUARDIAN_TRUSTED_INVITER_IDS = 'trusted-admin-inviter-1';

    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-3',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        actorId: 'trusted-admin-inviter-1',
        inviteCode: 'invite-trusted-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
  });

  test('duplicate/replay join events are suppressed', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-replay',
      'guild-join-slice-1',
    );

    const replayEvent = buildJoinEvent({
      memberUserId: 'member-replay-join-1',
      roleIds: ['role-dangerous-join-1'],
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const replayRoleCalls = fetchSpy.mock.calls.filter((call) => String((call as unknown[])[0] ?? '').includes('/roles/'));
    const replayKickCalls = fetchSpy.mock.calls.filter(
      (call) => String((call as unknown[])[0] ?? '').includes('/members/') && !String((call as unknown[])[0] ?? '').includes('/roles/'),
    );
    expect(replayRoleCalls).toHaveLength(1);
    expect(replayKickCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test.each([403, 429, 500])(
    'join dangerous role containment failure (%i) triggers recovery',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes('/roles/')) {
          return createFetchResponse(statusCode);
        }

        return createFetchResponse(204);
      });
      (globalThis as { fetch?: unknown }).fetch = fetchSpy;

      const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

      const eventBus = new InMemoryEventBus();
      const health = new RuntimeHealthService();
      const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
      const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

      const runtime = new IntegratedCanonicalGuardianRuntime(
        GuardianRuntimeMode.PRODUCTION,
        runtimeManager,
        new StubDiscordRuntimeAdapter(),
        eventBus,
        health,
        loggerFactory,
        `runtime-join-slice-fail-${statusCode}`,
        'guild-join-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildJoinEvent({
          memberUserId: `member-join-fail-${statusCode}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('role already removed is verified and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/roles/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_ROLE', message: 'Unknown Role' }),
        };
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-404',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildJoinEvent({ memberUserId: 'member-join-404' }));
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test('missing invite attribution does not block mandatory containment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-missing-attr',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        inviteCode: undefined,
        onboardingAssigned: false,
        integrationAssigned: false,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
  });

  test('rogue inviter attribution plans punishment action', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const plannerSpy = jest.spyOn(InMemorySecurityExecutionPlanner.prototype, 'plan');

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-rogue',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        suspectedRogueAdminId: 'rogue-inviter-join-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();

    const planCall = plannerSpy.mock.calls[plannerSpy.mock.calls.length - 1];
    const actionPlan = planCall[0] as { actions: readonly { type: SecurityActionType }[] };
    expect(actionPlan.actions.map((action) => action.type)).toEqual([
      SecurityActionType.REMOVE_DANGEROUS_ROLE,
      SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
      SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
      SecurityActionType.CREATE_INCIDENT,
      SecurityActionType.NOTIFY_AUDIT,
    ]);
  });

  test('authorized/trusted bot joins remain on bot path and do not trigger role containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_BOT_IDS = 'bot-authorized-join-1';
    process.env.GUARDIAN_TRUSTED_BOT_IDS = 'bot-trusted-join-1';

    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    const runtime = new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-join-slice-bots',
      'guild-join-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        memberUserId: 'bot-authorized-join-1',
        botId: 'bot-authorized-join-1',
        member: { user: { id: 'bot-authorized-join-1', bot: true } },
      }),
    );
    await runtime.ingestGatewayEvent(
      buildJoinEvent({
        memberUserId: 'bot-trusted-join-1',
        botId: 'bot-trusted-join-1',
        member: { user: { id: 'bot-trusted-join-1', bot: true } },
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
