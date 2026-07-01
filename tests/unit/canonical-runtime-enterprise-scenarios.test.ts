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
  { scenario: 'DANGEROUS_WEBHOOK_CREATION', eventName: 'WEBHOOK_CREATE', expectedActionType: 'WEBHOOK_DELETE' },
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
