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
  { scenario: 'UNAUTHORIZED_ROLE_CREATION', eventName: 'ROLE_CREATE', expectedActionType: 'ROLE_CREATE' },
  { scenario: 'DANGEROUS_ROLE_GRANT', eventName: 'GUILD_MEMBER_UPDATE', expectedActionType: 'ROLE_CREATE' },
  { scenario: 'UNAUTHORIZED_ROLE_DELETION', eventName: 'ROLE_DELETE', expectedActionType: 'ROLE_DELETE' },
  { scenario: 'PRIVILEGED_PERMISSION_ESCALATION', eventName: 'PRIVILEGED_PERMISSION_ESCALATION', expectedActionType: 'ROLE_CREATE' },
  { scenario: 'UNAUTHORIZED_CHANNEL_CREATION', eventName: 'CHANNEL_CREATE', expectedActionType: 'CHANNEL_CREATE' },
  { scenario: 'CHANNEL_PERMISSION_DRIFT', eventName: 'CHANNEL_PERMISSION_DRIFT', expectedActionType: 'CHANNEL_DELETE' },
  { scenario: 'UNAUTHORIZED_PERMISSION_OVERWRITE', eventName: 'PERMISSION_OVERWRITE_UPDATE', expectedActionType: 'PERMISSION_OVERWRITE_UPDATE' },
  { scenario: 'UNAUTHORIZED_MEMBER_BAN', eventName: 'GUILD_BAN_ADD', expectedActionType: 'MEMBER_BAN' },
  { scenario: 'UNAUTHORIZED_MEMBER_KICK', eventName: 'MEMBER_REMOVE', expectedActionType: 'MEMBER_KICK' },
  {
    scenario: 'UNAUTHORIZED_GUILD_CONFIGURATION_CONTAINMENT',
    eventName: 'GUILD_UPDATE',
    expectedActionType: 'GUILD_CONFIGURATION_UPDATE',
  },
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

  test.each([
    [403, false],
    [429, true],
    [500, true],
  ])(
    'failures (%i) fail closed and trigger recovery/report path',
    async (statusCode, shouldRetry) => {
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

    const recoveryRequest = recoverySpy.mock.calls[recoverySpy.mock.calls.length - 1]?.[0] as {
      correlationId: string;
      metadata?: {
        recoveryOrchestration?: {
          actorId?: string;
          incidentId: string;
          retryPlan: { shouldRetry: boolean };
        };
      };
    };
    expect(recoveryRequest.correlationId).toBeTruthy();
    expect(recoveryRequest.metadata?.recoveryOrchestration?.incidentId).toBe(
      recoveryRequest.correlationId,
    );
    expect(recoveryRequest.metadata?.recoveryOrchestration?.actorId).toBe(
      `inviter-fail-${statusCode}`,
    );
    expect(recoveryRequest.metadata?.recoveryOrchestration?.retryPlan.shouldRetry).toBe(
      shouldRetry,
    );
  },
  );
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

  function buildWebhookMutationEvent(eventName: 'WEBHOOK_UPDATE' | 'WEBHOOK_DELETE', overrides: Record<string, unknown> = {}) {
    return {
      t: eventName,
      d: {
        guildId: 'guild-webhook-slice-1',
        actorId: 'actor-webhook-slice-1',
        webhookId: 'webhook-dangerous-slice-1',
        ownerIntegrationId: 'integration-untrusted-slice-1',
        ...overrides,
      },
      ts: '2026-07-01T15:00:30.000Z',
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
      {
        ...buildWebhookCreateEvent({ actorId: 'actor-webhook-1', webhookId: 'webhook-dangerous-1' }),
        ts: '2026-07-01T15:01:00.000Z',
      },
    );
    await runtime.ingestGatewayEvent(
      {
        ...buildWebhookCreateEvent({ actorId: 'actor-webhook-2', webhookId: 'webhook-dangerous-2' }),
        ts: '2026-07-01T15:01:01.000Z',
      },
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/webhooks/webhook-dangerous-2'))).toBe(true);
  });

  test.each(['WEBHOOK_UPDATE', 'WEBHOOK_DELETE'] as const)(
    'unauthorized webhook %s executes removal and actor containment',
    async (eventName) => {
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
        `runtime-webhook-mutation-${eventName.toLowerCase()}`,
        'guild-webhook-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildWebhookMutationEvent(eventName, {
          webhookId: `webhook-dangerous-${eventName.toLowerCase()}`,
          actorId: `actor-webhook-${eventName.toLowerCase()}`,
        }),
      );
      await runtime.stop();

      const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
      expect(urls.some((url) => url.includes(`/api/v10/webhooks/webhook-dangerous-${eventName.toLowerCase()}`))).toBe(true);
      expect(urls.some((url) => url.includes(`/api/v10/guilds/guild-webhook-slice-1/members/actor-webhook-${eventName.toLowerCase()}`))).toBe(true);
    },
  );

  test.each(['WEBHOOK_UPDATE', 'WEBHOOK_DELETE'] as const)(
    'authorized webhook %s performs no containment',
    async (eventName) => {
      process.env.GUARDIAN_AUTHORIZED_WEBHOOK_IDS = `webhook-safe-${eventName.toLowerCase()}`;
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
        `runtime-webhook-mutation-authorized-${eventName.toLowerCase()}`,
        'guild-webhook-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildWebhookMutationEvent(eventName, {
          webhookId: `webhook-safe-${eventName.toLowerCase()}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  test('duplicate/replay webhook mutation events are suppressed', async () => {
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
      'runtime-webhook-mutation-replay-1',
      'guild-webhook-slice-1',
    );

    const replayEvent = buildWebhookMutationEvent('WEBHOOK_DELETE', {
      actorId: 'actor-webhook-mutation-replay-1',
      webhookId: 'webhook-dangerous-mutation-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const webhookCalls = fetchSpy.mock.calls.filter((call) =>
      String((call as unknown[])[0] ?? '').includes('/api/v10/webhooks/webhook-dangerous-mutation-replay-1'),
    );
    expect(webhookCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test.each([404, 403, 429, 500])('webhook mutation failure (%i) is classified correctly', async (statusCode) => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/webhooks/')) {
        return {
          ...createFetchResponse(statusCode),
          json: async () => Object.freeze({ code: statusCode === 404 ? 'UNKNOWN_WEBHOOK' : 'ERROR', message: 'mutation failure' }),
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
      `runtime-webhook-mutation-fail-${statusCode}`,
      'guild-webhook-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildWebhookMutationEvent('WEBHOOK_DELETE', {
        actorId: `actor-webhook-mutation-fail-${statusCode}`,
        webhookId: `webhook-dangerous-mutation-fail-${statusCode}`,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    if (statusCode === 404) {
      expect(recoverySpy).not.toHaveBeenCalled();
    } else {
      expect(recoverySpy).toHaveBeenCalled();
    }
  });
});

describe('IntegratedCanonicalGuardianRuntime integration/application management vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_INTEGRATION_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_APPLICATION_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildIntegrationCreateEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'INTEGRATION_CREATE',
      d: {
        guildId: 'guild-integration-slice-1',
        actorId: 'actor-integration-slice-1',
        integrationId: 'integration-dangerous-slice-1',
        applicationId: 'application-dangerous-slice-1',
        ...overrides,
      },
      ts: '2026-07-01T16:00:00.000Z',
    };
  }

  test('unauthorized integration management executes integration containment and actor punishment', async () => {
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
      'runtime-integration-slice-1',
      'guild-integration-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildIntegrationCreateEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-integration-slice-1/integrations/integration-dangerous-slice-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-integration-slice-1/members/actor-integration-slice-1'))).toBe(true);
  });

  test('authorized integration management performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_INTEGRATION_IDS = 'integration-dangerous-slice-1';
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
      'runtime-integration-slice-2',
      'guild-integration-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildIntegrationCreateEvent());
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('authorized application management performs no containment', async () => {
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
      'runtime-integration-slice-3',
      'guild-integration-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildIntegrationCreateEvent({
        authorizedApplicationIds: ['application-dangerous-slice-1'],
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted administrator exemption suppresses integration containment and punishment', async () => {
    process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS = 'trusted-admin-integration-1';
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
      'runtime-integration-slice-4',
      'guild-integration-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildIntegrationCreateEvent({
        actorId: 'trusted-admin-integration-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay integration management events are suppressed', async () => {
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
      'runtime-integration-slice-5',
      'guild-integration-slice-1',
    );

    const replayEvent = buildIntegrationCreateEvent({
      actorId: 'actor-integration-replay-1',
      integrationId: 'integration-dangerous-replay-1',
      applicationId: 'application-dangerous-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const integrationCalls = fetchSpy.mock.calls.filter((call) =>
      String((call as unknown[])[0] ?? '').includes('/api/v10/guilds/guild-integration-slice-1/integrations/integration-dangerous-replay-1'),
    );
    expect(integrationCalls).toHaveLength(1);

    const replaySuppressedLogs = transport.entries.filter(
      (entry) => entry.level === 'warn' && entry.message === 'Canonical Guardian replay suppressed',
    );
    expect(replaySuppressedLogs.length).toBeGreaterThanOrEqual(1);
  });

  test('application-only identity routes through integration containment endpoint', async () => {
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
      'runtime-integration-slice-6',
      'guild-integration-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      {
        t: 'APPLICATION_INSTALL',
        d: {
          guildId: 'guild-integration-slice-1',
          actorId: 'actor-integration-slice-1',
          applicationId: 'application-target-only-1',
        },
        ts: '2026-07-01T16:00:30.000Z',
      },
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-integration-slice-1/integrations/application-target-only-1'))).toBe(true);
  });
});

describe('IntegratedCanonicalGuardianRuntime guild configuration containment vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildGuildUpdateEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'GUILD_UPDATE',
      d: {
        guildId: 'guild-guild-config-slice-1',
        actorId: 'actor-guild-config-slice-1',
        changedKeys: ['name', 'icon', 'verification_level', 'afk_channel_id'],
        ...overrides,
      },
      ts: '2026-07-01T16:30:00.000Z',
    };
  }

  test('unauthorized guild configuration changes execute actor containment', async () => {
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
      'runtime-guild-config-slice-1',
      'guild-guild-config-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildGuildUpdateEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-guild-config-slice-1/members/actor-guild-config-slice-1'))).toBe(true);
  });

  test('authorized guild configuration actor performs no containment', async () => {
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
      'runtime-guild-config-slice-2',
      'guild-guild-config-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildGuildUpdateEvent({
        authorizedGuildConfigurationActorIds: ['actor-guild-config-slice-1'],
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('guild owner exemption suppresses containment', async () => {
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
      'runtime-guild-config-slice-3',
      'guild-guild-config-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildGuildUpdateEvent({
        actorId: 'owner-guild-config-1',
        ownerId: 'owner-guild-config-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay guild configuration events are suppressed', async () => {
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
      'runtime-guild-config-slice-4',
      'guild-guild-config-slice-1',
    );

    const replayEvent = buildGuildUpdateEvent({
      actorId: 'actor-guild-config-replay-1',
      changedKeys: ['name', 'locale'],
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const actorContainmentCalls = fetchSpy.mock.calls.filter((call) =>
      String((call as unknown[])[0] ?? '').includes('/api/v10/guilds/guild-guild-config-slice-1/members/actor-guild-config-replay-1'),
    );
    expect(actorContainmentCalls).toHaveLength(1);

    const replaySuppressedLogs = transport.entries.filter(
      (entry) => entry.level === 'warn' && entry.message === 'Canonical Guardian replay suppressed',
    );
    expect(replaySuppressedLogs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime channel deletion abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_CHANNEL_IDS;
    delete process.env.GUARDIAN_TRUSTED_CHANNEL_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildChannelDeleteEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'CHANNEL_DELETE',
      d: {
        guildId: 'guild-channel-slice-1',
        actorId: 'actor-channel-slice-1',
        channelId: 'channel-dangerous-slice-1',
        targetId: 'channel-dangerous-slice-1',
        overwriteId: 'overwrite-channel-slice-1',
        ...overrides,
      },
      ts: '2026-07-01T17:00:00.000Z',
    };
  }

  test('unauthorized channel deletion executes channel containment and actor punishment', async () => {
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
      'runtime-channel-slice-1',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildChannelDeleteEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-dangerous-slice-1'))).toBe(true);
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-channel-slice-1/members/actor-channel-slice-1') ||
          url.includes('/api/v10/guilds/guild-channel-slice-1/bans/actor-channel-slice-1'),
      ),
    ).toBe(true);
  });

  test('normal administrative deletion performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_CHANNEL_IDS = 'channel-safe-admin-1';
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
      'runtime-channel-slice-2',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        channelId: 'channel-safe-admin-1',
        targetId: 'channel-safe-admin-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted administrator policy is respected for channel deletion', async () => {
    process.env.GUARDIAN_TRUSTED_CHANNEL_ADMIN_IDS = 'trusted-channel-admin-1';
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
      'runtime-channel-slice-3',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: 'trusted-channel-admin-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay channel deletion events are suppressed', async () => {
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
      'runtime-channel-slice-4',
      'guild-channel-slice-1',
    );

    const replayEvent = buildChannelDeleteEvent({
      actorId: 'actor-channel-replay-1',
      channelId: 'channel-dangerous-replay-1',
      targetId: 'channel-dangerous-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const channelCalls = fetchSpy.mock.calls.filter((call) => {
      const url = String((call as unknown[])[0] ?? '');
      return url.includes('/api/v10/channels/channel-dangerous-replay-1') && !url.includes('/permissions/');
    });
    const punishmentCalls = fetchSpy.mock.calls.filter((call) => {
      const url = String((call as unknown[])[0] ?? '');
      return (
        url.includes('/api/v10/guilds/guild-channel-slice-1/members/actor-channel-replay-1') ||
        url.includes('/api/v10/guilds/guild-channel-slice-1/bans/actor-channel-replay-1')
      );
    });
    expect(channelCalls).toHaveLength(1);
    expect(punishmentCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('missing audit log still performs mandatory containment', async () => {
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
      'runtime-channel-slice-5',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: 'actor-no-audit-1',
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-dangerous-slice-1'))).toBe(true);
  });

  test('late audit attribution still allows actor punishment on later deletion', async () => {
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
      'runtime-channel-slice-6',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: 'unknown-actor',
        channelId: 'channel-late-audit-1',
        targetId: 'channel-late-audit-1',
      }),
    );
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: 'unknown-actor',
        channelId: 'channel-late-audit-2',
        targetId: 'channel-late-audit-2',
        auditLogEntry: {
          id: 'audit-channel-late-1',
          actionType: 'CHANNEL_DELETE',
          actorId: 'actor-late-audit-1',
          targetId: 'channel-late-audit-2',
          resourceId: 'channel-late-audit-2',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-channel-slice-1/members/actor-late-audit-1') ||
          url.includes('/api/v10/guilds/guild-channel-slice-1/bans/actor-late-audit-1'),
      ),
    ).toBe(true);
  });

  test.each([403, 429, 500])('channel containment failure (%i) triggers recovery scheduling', async (statusCode) => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/channels/')) {
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
      `runtime-channel-slice-fail-${statusCode}`,
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: `actor-channel-fail-${statusCode}`,
        channelId: `channel-dangerous-fail-${statusCode}`,
        targetId: `channel-dangerous-fail-${statusCode}`,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('channel containment 404 fails closed and triggers recovery scheduling', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/channels/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_CHANNEL', message: 'Unknown Channel' }),
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
      'runtime-channel-slice-404',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        actorId: 'actor-channel-404',
        channelId: 'channel-dangerous-404',
        targetId: 'channel-dangerous-404',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('partial recovery path is triggered when restore action fails after lock succeeds', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/permissions/')) {
        return createFetchResponse(500);
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
      'runtime-channel-slice-partial',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelDeleteEvent({
        channelId: 'channel-dangerous-partial-1',
        targetId: 'channel-dangerous-partial-1',
        overwriteId: 'overwrite-partial-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.some((call) => String((call as unknown[])[0] ?? '').includes('/api/v10/channels/channel-dangerous-partial-1'))).toBe(true);
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('multiple channel deletions in parallel are contained while actor punishment executes once', async () => {
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
      'runtime-channel-slice-7',
      'guild-channel-slice-1',
    );

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildChannelDeleteEvent({
          actorId: 'actor-channel-burst-1',
          channelId: 'channel-burst-1',
          targetId: 'channel-burst-1',
        }),
      ),
      runtime.ingestGatewayEvent(
        buildChannelDeleteEvent({
          actorId: 'actor-channel-burst-1',
          channelId: 'channel-burst-2',
          targetId: 'channel-burst-2',
        }),
      ),
    ]);
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-burst-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-burst-2'))).toBe(true);

    const punishmentCalls = urls.filter(
      (url) =>
        url.includes('/api/v10/guilds/guild-channel-slice-1/members/actor-channel-burst-1') ||
        url.includes('/api/v10/guilds/guild-channel-slice-1/bans/actor-channel-burst-1'),
    );
    expect(punishmentCalls).toHaveLength(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime channel creation abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_CHANNEL_IDS;
    delete process.env.GUARDIAN_TRUSTED_CHANNEL_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildChannelCreateEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'CHANNEL_CREATE',
      d: {
        guildId: 'guild-channel-create-slice-1',
        actorId: 'actor-channel-create-slice-1',
        channelId: 'channel-dangerous-create-1',
        targetId: 'channel-dangerous-create-1',
        ...overrides,
      },
      ts: '2026-07-01T17:15:00.000Z',
    };
  }

  test('unauthorized channel creation executes channel containment and actor punishment', async () => {
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
      'runtime-channel-create-slice-1',
      'guild-channel-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildChannelCreateEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-dangerous-create-1'))).toBe(true);
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-channel-create-slice-1/members/actor-channel-create-slice-1') ||
          url.includes('/api/v10/guilds/guild-channel-create-slice-1/bans/actor-channel-create-slice-1'),
      ),
    ).toBe(true);
  });

  test('trusted channel creation performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_CHANNEL_IDS = 'channel-safe-create-1';
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
      'runtime-channel-create-slice-2',
      'guild-channel-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildChannelCreateEvent({
        channelId: 'channel-safe-create-1',
        targetId: 'channel-safe-create-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('IntegratedCanonicalGuardianRuntime permission overwrite abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_OVERWRITE_IDS;
    delete process.env.GUARDIAN_TRUSTED_CHANNEL_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildPermissionOverwriteEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'PERMISSION_OVERWRITE_UPDATE',
      d: {
        guildId: 'guild-overwrite-slice-1',
        actorId: 'actor-overwrite-slice-1',
        channelId: 'channel-overwrite-slice-1',
        overwriteId: 'overwrite-dangerous-slice-1',
        targetId: 'overwrite-dangerous-slice-1',
        resourceId: 'overwrite-dangerous-slice-1',
        ...overrides,
      },
      ts: '2026-07-01T18:00:00.000Z',
    };
  }

  test('unauthorized permission overwrite executes overwrite restore/removal and actor punishment', async () => {
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
      'runtime-overwrite-slice-1',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildPermissionOverwriteEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-overwrite-slice-1/permissions/overwrite-dangerous-slice-1'))).toBe(true);
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-overwrite-slice-1/members/actor-overwrite-slice-1') ||
          url.includes('/api/v10/guilds/guild-overwrite-slice-1/bans/actor-overwrite-slice-1'),
      ),
    ).toBe(true);
  });

  test('authorized overwrite update performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_OVERWRITE_IDS = 'overwrite-safe-1';
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
      'runtime-overwrite-slice-2',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        overwriteId: 'overwrite-safe-1',
        targetId: 'overwrite-safe-1',
        resourceId: 'overwrite-safe-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted administrator overwrite update is policy-authorized and performs no containment', async () => {
    process.env.GUARDIAN_TRUSTED_CHANNEL_ADMIN_IDS = 'trusted-overwrite-admin-1';
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
      'runtime-overwrite-slice-3',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        actorId: 'trusted-overwrite-admin-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay overwrite events are suppressed', async () => {
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
      'runtime-overwrite-slice-4',
      'guild-overwrite-slice-1',
    );

    const replayEvent = buildPermissionOverwriteEvent({
      actorId: 'actor-overwrite-replay-1',
      overwriteId: 'overwrite-replay-1',
      targetId: 'overwrite-replay-1',
      resourceId: 'overwrite-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const overwriteCalls = fetchSpy.mock.calls.filter((call) =>
      String((call as unknown[])[0] ?? '').includes('/api/v10/channels/channel-overwrite-slice-1/permissions/overwrite-replay-1'),
    );
    expect(overwriteCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('missing audit log still performs mandatory overwrite containment', async () => {
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
      'runtime-overwrite-slice-5',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        actorId: 'unknown-actor',
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/channels/channel-overwrite-slice-1/permissions/overwrite-dangerous-slice-1'))).toBe(true);
  });

  test('delayed attribution uses later audit entry and can punish attributed actor', async () => {
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
      'runtime-overwrite-slice-6',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        actorId: 'unknown-actor',
        overwriteId: 'overwrite-late-audit-1',
        targetId: 'overwrite-late-audit-1',
        resourceId: 'overwrite-late-audit-1',
      }),
    );
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        actorId: 'unknown-actor',
        overwriteId: 'overwrite-late-audit-2',
        targetId: 'overwrite-late-audit-2',
        resourceId: 'overwrite-late-audit-2',
        auditLogEntry: {
          id: 'audit-overwrite-late-1',
          actionType: 'PERMISSION_OVERWRITE_UPDATE',
          actorId: 'actor-overwrite-late-1',
          targetId: 'overwrite-late-audit-2',
          resourceId: 'overwrite-late-audit-2',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-overwrite-slice-1/members/actor-overwrite-late-1') ||
          url.includes('/api/v10/guilds/guild-overwrite-slice-1/bans/actor-overwrite-late-1'),
      ),
    ).toBe(true);
  });

  test('overwrite 404 is treated as already restored and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/permissions/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_OVERWRITE', message: 'Unknown Overwrite' }),
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
      'runtime-overwrite-slice-404',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildPermissionOverwriteEvent());
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test.each([403, 429, 500])('overwrite containment failure (%i) triggers recovery scheduling', async (statusCode) => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/permissions/')) {
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
      `runtime-overwrite-slice-fail-${statusCode}`,
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        actorId: `actor-overwrite-fail-${statusCode}`,
        overwriteId: `overwrite-fail-${statusCode}`,
        targetId: `overwrite-fail-${statusCode}`,
        resourceId: `overwrite-fail-${statusCode}`,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('partial execution schedules recovery when overwrite restore fails after punishment succeeds', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/permissions/')) {
        return createFetchResponse(500);
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
      'runtime-overwrite-slice-partial',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildPermissionOverwriteEvent({
        overwriteId: 'overwrite-partial-1',
        targetId: 'overwrite-partial-1',
        resourceId: 'overwrite-partial-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.some((call) => String((call as unknown[])[0] ?? '').includes('/permissions/overwrite-partial-1'))).toBe(true);
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('simultaneous overwrite changes are contained and actor punishment executes once', async () => {
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
      'runtime-overwrite-slice-7',
      'guild-overwrite-slice-1',
    );

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildPermissionOverwriteEvent({
          actorId: 'actor-overwrite-burst-1',
          overwriteId: 'overwrite-burst-1',
          targetId: 'overwrite-burst-1',
          resourceId: 'overwrite-burst-1',
        }),
      ),
      runtime.ingestGatewayEvent(
        buildPermissionOverwriteEvent({
          actorId: 'actor-overwrite-burst-1',
          overwriteId: 'overwrite-burst-2',
          targetId: 'overwrite-burst-2',
          resourceId: 'overwrite-burst-2',
        }),
      ),
    ]);
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/permissions/overwrite-burst-1'))).toBe(true);
    expect(urls.some((url) => url.includes('/permissions/overwrite-burst-2'))).toBe(true);

    const punishmentCalls = urls.filter(
      (url) =>
        url.includes('/api/v10/guilds/guild-overwrite-slice-1/members/actor-overwrite-burst-1') ||
        url.includes('/api/v10/guilds/guild-overwrite-slice-1/bans/actor-overwrite-burst-1'),
    );
    expect(punishmentCalls).toHaveLength(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime unauthorized role creation vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_ROLE_IDS;
    delete process.env.GUARDIAN_TRUSTED_ROLE_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildRoleCreateEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'ROLE_CREATE',
      d: {
        guildId: 'guild-role-create-slice-1',
        actorId: 'actor-role-create-slice-1',
        roleId: 'role-created-dangerous-1',
        role: {
          id: 'role-created-dangerous-1',
          permissions: ['ADMINISTRATOR'],
        },
        ...overrides,
      },
      ts: '2026-07-01T17:00:00.000Z',
    };
  }

  test('unauthorized role creation deletes role and punishes actor', async () => {
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
      'runtime-role-create-slice-1',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildRoleCreateEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-role-create-slice-1/roles/role-created-dangerous-1'))).toBe(true);
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-role-create-slice-1/members/actor-role-create-slice-1') ||
          url.includes('/api/v10/guilds/guild-role-create-slice-1/bans/actor-role-create-slice-1'),
      ),
    ).toBe(true);
  });

  test('authorized role creation performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_ROLE_IDS = 'role-created-safe-1';
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
      'runtime-role-create-slice-2',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleCreateEvent({
        roleId: 'role-created-safe-1',
        role: {
          id: 'role-created-safe-1',
          permissions: ['VIEW_CHANNEL'],
        },
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted role administrator policy is respected', async () => {
    process.env.GUARDIAN_TRUSTED_ROLE_ADMIN_IDS = 'trusted-role-admin-create-1';
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
      'runtime-role-create-slice-3',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleCreateEvent({
        actorId: 'trusted-role-admin-create-1',
        roleId: 'role-created-trusted-safe-1',
        role: {
          id: 'role-created-trusted-safe-1',
          permissions: ['VIEW_CHANNEL'],
        },
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay role creation events are suppressed', async () => {
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
      'runtime-role-create-slice-4',
      'guild-role-create-slice-1',
    );

    const replayEvent = buildRoleCreateEvent({
      actorId: 'actor-role-create-replay-1',
      roleId: 'role-created-replay-1',
      role: {
        id: 'role-created-replay-1',
        permissions: ['ADMINISTRATOR'],
      },
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    const deleteCalls = urls.filter((url) =>
      url.includes('/api/v10/guilds/guild-role-create-slice-1/roles/role-created-replay-1'),
    );
    expect(deleteCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('late audit attribution still allows actor punishment on later role creation', async () => {
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
      'runtime-role-create-slice-5',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleCreateEvent({
        actorId: 'unknown-actor',
        roleId: 'role-created-late-audit-1',
        role: {
          id: 'role-created-late-audit-1',
          permissions: ['ADMINISTRATOR'],
        },
      }),
    );
    await runtime.ingestGatewayEvent(
      buildRoleCreateEvent({
        actorId: 'unknown-actor',
        roleId: 'role-created-late-audit-2',
        role: {
          id: 'role-created-late-audit-2',
          permissions: ['ADMINISTRATOR'],
        },
        auditLogEntry: {
          id: 'audit-role-create-late-1',
          actionType: 'ROLE_CREATE',
          actorId: 'actor-role-create-late-audit-1',
          targetId: 'role-created-late-audit-2',
          resourceId: 'role-created-late-audit-2',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-role-create-slice-1/members/actor-role-create-late-audit-1') ||
          url.includes('/api/v10/guilds/guild-role-create-slice-1/bans/actor-role-create-late-audit-1'),
      ),
    ).toBe(true);
  });

  test.each([403, 429, 500])(
    'role creation containment failure (%i) triggers recovery scheduling',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes('/api/v10/guilds/guild-role-create-slice-1/roles/role-created-fail-')) {
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
        `runtime-role-create-slice-fail-${statusCode}`,
        'guild-role-create-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildRoleCreateEvent({
          actorId: `actor-role-create-fail-${statusCode}`,
          roleId: `role-created-fail-${statusCode}`,
          role: {
            id: `role-created-fail-${statusCode}`,
            permissions: ['ADMINISTRATOR'],
          },
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('role create 404 is treated as verified containment and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-role-create-slice-1/roles/')) {
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
      'runtime-role-create-slice-404',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleCreateEvent({
        actorId: 'actor-role-create-404',
        roleId: 'role-created-404',
        role: {
          id: 'role-created-404',
          permissions: ['ADMINISTRATOR'],
        },
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test('simultaneous role creation floods are contained while actor punishment executes once', async () => {
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
      'runtime-role-create-slice-6',
      'guild-role-create-slice-1',
    );

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildRoleCreateEvent({
          actorId: 'actor-role-create-burst-1',
          roleId: 'role-created-burst-1',
          role: {
            id: 'role-created-burst-1',
            permissions: ['ADMINISTRATOR'],
          },
        }),
      ),
      runtime.ingestGatewayEvent(
        buildRoleCreateEvent({
          actorId: 'actor-role-create-burst-1',
          roleId: 'role-created-burst-2',
          role: {
            id: 'role-created-burst-2',
            permissions: ['ADMINISTRATOR'],
          },
        }),
      ),
    ]);
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    const roleDeleteCalls = urls.filter((url) =>
      url.includes('/api/v10/guilds/guild-role-create-slice-1/roles/role-created-burst-'),
    );
    const punishmentCalls = urls.filter(
      (url) =>
        url.includes('/api/v10/guilds/guild-role-create-slice-1/members/actor-role-create-burst-1') ||
        url.includes('/api/v10/guilds/guild-role-create-slice-1/bans/actor-role-create-burst-1'),
    );

    expect(roleDeleteCalls).toHaveLength(2);
    expect(punishmentCalls).toHaveLength(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime role deletion abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_ROLE_IDS;
    delete process.env.GUARDIAN_TRUSTED_ROLE_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildRoleDeleteEvent(overrides: Record<string, unknown> = {}) {
    return {
      t: 'ROLE_DELETE',
      d: {
        guildId: 'guild-role-delete-slice-1',
        actorId: 'actor-role-delete-slice-1',
        roleId: 'role-deleted-dangerous-1',
        targetId: 'role-deleted-dangerous-1',
        ...overrides,
      },
      ts: '2026-07-01T18:00:00.000Z',
    };
  }

  test('unauthorized role deletion executes mandatory actor punishment', async () => {
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
      'runtime-role-delete-slice-1',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(buildRoleDeleteEvent());
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-slice-1') ||
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/actor-role-delete-slice-1'),
      ),
    ).toBe(true);
  });

  test('authorized role deletion performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_ROLE_IDS = 'role-safe-admin-1';
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
      'runtime-role-delete-slice-2',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        roleId: 'role-safe-admin-1',
        targetId: 'role-safe-admin-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted role administrator policy is respected', async () => {
    process.env.GUARDIAN_TRUSTED_ROLE_ADMIN_IDS = 'trusted-role-admin-1';
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
      'runtime-role-delete-slice-3',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'trusted-role-admin-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate/replay role deletion events are suppressed', async () => {
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
      'runtime-role-delete-slice-4',
      'guild-role-delete-slice-1',
    );

    const replayEvent = buildRoleDeleteEvent({
      actorId: 'actor-role-delete-replay-1',
      roleId: 'role-deleted-replay-1',
      targetId: 'role-deleted-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    const punishmentCalls = fetchSpy.mock.calls.filter((call) => {
      const url = String((call as unknown[])[0] ?? '');
      return (
        url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-replay-1') ||
        url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/actor-role-delete-replay-1')
      );
    });
    expect(punishmentCalls).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('missing audit log still performs mandatory role deletion containment', async () => {
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
      'runtime-role-delete-slice-5',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'actor-role-delete-no-audit-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
  });

  test('late audit attribution still allows actor punishment on later deletion', async () => {
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
      'runtime-role-delete-slice-6',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'unknown-actor',
        roleId: 'role-deleted-late-audit-1',
        targetId: 'role-deleted-late-audit-1',
      }),
    );
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'unknown-actor',
        roleId: 'role-deleted-late-audit-2',
        targetId: 'role-deleted-late-audit-2',
        auditLogEntry: {
          id: 'audit-role-delete-late-1',
          actionType: 'ROLE_DELETE',
          actorId: 'actor-role-delete-late-audit-1',
          targetId: 'role-deleted-late-audit-2',
          resourceId: 'role-deleted-late-audit-2',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-late-audit-1') ||
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/actor-role-delete-late-audit-1'),
      ),
    ).toBe(true);
  });

  test.each([403, 429, 500])(
    'role deletion containment failure (%i) triggers recovery scheduling',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-fail-')) {
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
        `runtime-role-delete-slice-fail-${statusCode}`,
        'guild-role-delete-slice-1',
      );

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildRoleDeleteEvent({
          actorId: `actor-role-delete-fail-${statusCode}`,
          roleId: `role-deleted-fail-${statusCode}`,
          targetId: `role-deleted-fail-${statusCode}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('role deletion punishment 404 is treated as verified containment and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_MEMBER', message: 'Unknown Member' }),
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
      'runtime-role-delete-slice-404',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'actor-role-delete-404',
        roleId: 'role-deleted-404',
        targetId: 'role-deleted-404',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test('partial role recovery path is triggered when role cleanup fails after moderation succeeds', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/roles/role-deleted-partial-1')) {
        return createFetchResponse(500);
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
      'runtime-role-delete-slice-partial',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildRoleDeleteEvent({
        actorId: 'actor-role-delete-partial-1',
        memberUserId: 'member-role-delete-partial-1',
        roleId: 'role-deleted-partial-1',
        targetId: 'role-deleted-partial-1',
      }),
    );
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    expect(urls.some((url) => url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/member-role-delete-partial-1/roles/role-deleted-partial-1'))).toBe(true);
    expect(
      urls.some(
        (url) =>
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-partial-1') ||
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/actor-role-delete-partial-1') ||
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/member-role-delete-partial-1') ||
          url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/member-role-delete-partial-1'),
      ),
    ).toBe(true);
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('multiple role deletions in parallel are contained while actor punishment executes once', async () => {
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
      'runtime-role-delete-slice-7',
      'guild-role-delete-slice-1',
    );

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildRoleDeleteEvent({
          actorId: 'actor-role-delete-burst-1',
          roleId: 'role-deleted-burst-1',
          targetId: 'role-deleted-burst-1',
        }),
      ),
      runtime.ingestGatewayEvent(
        buildRoleDeleteEvent({
          actorId: 'actor-role-delete-burst-1',
          roleId: 'role-deleted-burst-2',
          targetId: 'role-deleted-burst-2',
        }),
      ),
    ]);
    await runtime.stop();

    const urls = fetchSpy.mock.calls.map((call) => String((call as unknown[])[0] ?? ''));
    const punishmentCalls = urls.filter(
      (url) =>
        url.includes('/api/v10/guilds/guild-role-delete-slice-1/members/actor-role-delete-burst-1') ||
        url.includes('/api/v10/guilds/guild-role-delete-slice-1/bans/actor-role-delete-burst-1'),
    );
    expect(punishmentCalls).toHaveLength(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime member ban/kick abuse vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_MEMBER_IDS;
    delete process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildMemberModerationEvent(overrides: Record<string, unknown> = {}) {
    const eventName = typeof overrides.eventName === 'string' ? overrides.eventName : 'GUILD_BAN_ADD';
    const payload = {
      guildId: 'guild-member-mod-slice-1',
      actorId: 'actor-member-mod-slice-1',
      memberUserId: 'member-target-slice-1',
      targetId: 'member-target-slice-1',
      resourceId: 'member-target-slice-1',
      ...(eventName === 'GUILD_MEMBER_REMOVE' || eventName === 'MEMBER_REMOVE'
        ? { kicked: true }
        : {}),
      ...overrides,
    };

    delete (payload as { eventName?: unknown }).eventName;

    return {
      t: eventName,
      d: payload,
      ts: '2026-07-02T10:00:00.000Z',
    };
  }

  function createRuntime(transport?: CapturingLogTransport) {
    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport ?? new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    return new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-member-mod-slice-1',
      'guild-member-mod-slice-1',
    );
  }

  function moderationPunishmentCalls(fetchSpy: jest.Mock, actorId: string): readonly string[] {
    return fetchSpy.mock.calls
      .map((call) => String((call as unknown[])[0] ?? ''))
      .filter(
        (url) =>
          url.includes(`/api/v10/guilds/guild-member-mod-slice-1/members/${actorId}`) ||
          url.includes(`/api/v10/guilds/guild-member-mod-slice-1/bans/${actorId}`),
      );
  }

  test('unauthorized member ban executes mandatory rogue actor punishment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'GUILD_BAN_ADD',
        actorId: 'actor-member-ban-1',
        memberUserId: 'member-banned-1',
        targetId: 'member-banned-1',
        resourceId: 'member-banned-1',
      }),
    );
    await runtime.stop();

    expect(moderationPunishmentCalls(fetchSpy, 'actor-member-ban-1').length).toBeGreaterThan(0);
  });

  test('authorized member ban performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_MEMBER_IDS = 'member-safe-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'GUILD_BAN_ADD',
        memberUserId: 'member-safe-1',
        targetId: 'member-safe-1',
        resourceId: 'member-safe-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted member admin policy is respected', async () => {
    process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS = 'trusted-member-admin-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'MEMBER_REMOVE',
        actorId: 'trusted-member-admin-1',
        memberUserId: 'member-kicked-safe-1',
        targetId: 'member-kicked-safe-1',
        resourceId: 'member-kicked-safe-1',
        kicked: true,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate and replay member moderation events are suppressed', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime(transport);
    const replayEvent = buildMemberModerationEvent({
      eventName: 'GUILD_BAN_ADD',
      actorId: 'actor-member-replay-1',
      memberUserId: 'member-replay-1',
      targetId: 'member-replay-1',
      resourceId: 'member-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(moderationPunishmentCalls(fetchSpy, 'actor-member-replay-1')).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('missing audit log follows existing policy when actor attribution is unavailable', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'GUILD_BAN_ADD',
        actorId: 'unknown-actor',
        memberUserId: 'member-no-audit-1',
        targetId: 'member-no-audit-1',
        resourceId: 'member-no-audit-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('delayed attribution can punish the later attributed actor', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'GUILD_BAN_ADD',
        actorId: 'unknown-actor',
        memberUserId: 'member-late-audit-1',
        targetId: 'member-late-audit-1',
        resourceId: 'member-late-audit-1',
      }),
    );
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'MEMBER_REMOVE',
        actorId: 'unknown-actor',
        memberUserId: 'member-late-audit-2',
        targetId: 'member-late-audit-2',
        resourceId: 'member-late-audit-2',
        kicked: true,
        auditLogEntry: {
          id: 'audit-member-late-1',
          actionType: 'MEMBER_KICK',
          actorId: 'actor-member-late-audit-1',
          targetId: 'member-late-audit-2',
          resourceId: 'member-late-audit-2',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    expect(moderationPunishmentCalls(fetchSpy, 'actor-member-late-audit-1').length).toBeGreaterThan(0);
  });

  test('member moderation 404 is treated as verified containment and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-member-mod-slice-1/members/actor-member-404-1')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_MEMBER', message: 'Unknown Member' }),
        };
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'GUILD_BAN_ADD',
        actorId: 'actor-member-404-1',
        memberUserId: 'member-404-1',
        targetId: 'member-404-1',
        resourceId: 'member-404-1',
      }),
    );
    await runtime.stop();

    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test.each([403, 429, 500])(
    'member moderation containment failure (%i) triggers recovery scheduling',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes(`/api/v10/guilds/guild-member-mod-slice-1/members/actor-member-fail-${statusCode}`)) {
          return createFetchResponse(statusCode);
        }

        return createFetchResponse(204);
      });
      (globalThis as { fetch?: unknown }).fetch = fetchSpy;

      const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
      const runtime = createRuntime();

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildMemberModerationEvent({
          eventName: 'GUILD_BAN_ADD',
          actorId: `actor-member-fail-${statusCode}`,
          memberUserId: `member-fail-${statusCode}`,
          targetId: `member-fail-${statusCode}`,
          resourceId: `member-fail-${statusCode}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('partial execution schedules recovery when actor moderation fails after incident actions', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-member-mod-slice-1/members/actor-member-partial-1')) {
        return createFetchResponse(500);
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildMemberModerationEvent({
        eventName: 'MEMBER_REMOVE',
        actorId: 'actor-member-partial-1',
        memberUserId: 'member-partial-1',
        targetId: 'member-partial-1',
        resourceId: 'member-partial-1',
        kicked: true,
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('simultaneous mass ban/kick burst is coordinated into one actor punishment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildMemberModerationEvent({
          eventName: 'GUILD_BAN_ADD',
          actorId: 'actor-member-burst-1',
          memberUserId: 'member-burst-ban-1',
          targetId: 'member-burst-ban-1',
          resourceId: 'member-burst-ban-1',
        }),
      ),
      runtime.ingestGatewayEvent(
        buildMemberModerationEvent({
          eventName: 'MEMBER_REMOVE',
          actorId: 'actor-member-burst-1',
          memberUserId: 'member-burst-kick-1',
          targetId: 'member-burst-kick-1',
          resourceId: 'member-burst-kick-1',
          kicked: true,
        }),
      ),
    ]);
    await runtime.stop();

    expect(moderationPunishmentCalls(fetchSpy, 'actor-member-burst-1')).toHaveLength(1);
  });
});

describe('IntegratedCanonicalGuardianRuntime unauthorized emoji/sticker deletion containment vertical slice', () => {
  const originalEnv = { ...process.env };
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_API_BASE_URL = 'https://discord.com';
    delete process.env.GUARDIAN_AUTHORIZED_EMOJI_IDS;
    delete process.env.GUARDIAN_AUTHORIZED_STICKER_IDS;
    delete process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildEmojiStickerDeletionEvent(overrides: Record<string, unknown> = {}) {
    const eventName = typeof overrides.eventName === 'string' ? overrides.eventName : 'GUILD_EMOJIS_UPDATE';
    const payload = {
      guildId: 'guild-emoji-sticker-slice-1',
      actorId: 'actor-emoji-sticker-slice-1',
      deletedEmojiIds: ['emoji-deleted-slice-1'],
      emojiId: 'emoji-deleted-slice-1',
      targetId: 'emoji-deleted-slice-1',
      resourceId: 'emoji-deleted-slice-1',
      ...overrides,
    };

    delete (payload as { eventName?: unknown }).eventName;

    return {
      t: eventName,
      d: payload,
      ts: '2026-07-03T10:00:00.000Z',
    };
  }

  function createRuntime(transport?: CapturingLogTransport) {
    const eventBus = new InMemoryEventBus();
    const health = new RuntimeHealthService();
    const loggerFactory = new LoggerFactory([transport ?? new CapturingLogTransport()]);
    const runtimeManager = new RuntimeManager(loggerFactory.createLogger(), health, eventBus);

    return new IntegratedCanonicalGuardianRuntime(
      GuardianRuntimeMode.PRODUCTION,
      runtimeManager,
      new StubDiscordRuntimeAdapter(),
      eventBus,
      health,
      loggerFactory,
      'runtime-emoji-sticker-slice-1',
      'guild-emoji-sticker-slice-1',
    );
  }

  function emojiStickerPunishmentCalls(fetchSpy: jest.Mock, actorId: string): readonly string[] {
    return fetchSpy.mock.calls
      .map((call) => String((call as unknown[])[0] ?? ''))
      .filter(
        (url) =>
          url.includes(`/api/v10/guilds/guild-emoji-sticker-slice-1/members/${actorId}`) ||
          url.includes(`/api/v10/guilds/guild-emoji-sticker-slice-1/bans/${actorId}`),
      );
  }

  test('unauthorized emoji deletion executes mandatory rogue actor punishment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'GUILD_EMOJIS_UPDATE',
        actorId: 'actor-emoji-delete-1',
        deletedEmojiIds: ['emoji-deleted-1'],
        emojiId: 'emoji-deleted-1',
        targetId: 'emoji-deleted-1',
        resourceId: 'emoji-deleted-1',
      }),
    );
    await runtime.stop();

    expect(emojiStickerPunishmentCalls(fetchSpy, 'actor-emoji-delete-1').length).toBeGreaterThan(0);
  });

  test('authorized emoji deletion performs no containment', async () => {
    process.env.GUARDIAN_AUTHORIZED_EMOJI_IDS = 'emoji-safe-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'GUILD_EMOJIS_UPDATE',
        deletedEmojiIds: ['emoji-safe-1'],
        emojiId: 'emoji-safe-1',
        targetId: 'emoji-safe-1',
        resourceId: 'emoji-safe-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('trusted member admin policy is respected for sticker deletion', async () => {
    process.env.GUARDIAN_TRUSTED_MEMBER_ADMIN_IDS = 'trusted-emoji-admin-1';
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'STICKER_DELETE',
        actorId: 'trusted-emoji-admin-1',
        deletedStickerIds: ['sticker-safe-1'],
        stickerId: 'sticker-safe-1',
        targetId: 'sticker-safe-1',
        resourceId: 'sticker-safe-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('duplicate and replay emoji/sticker deletion events are suppressed', async () => {
    const transport = new CapturingLogTransport();
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime(transport);
    const replayEvent = buildEmojiStickerDeletionEvent({
      eventName: 'GUILD_STICKERS_UPDATE',
      actorId: 'actor-emoji-replay-1',
      deletedStickerIds: ['sticker-replay-1'],
      stickerId: 'sticker-replay-1',
      targetId: 'sticker-replay-1',
      resourceId: 'sticker-replay-1',
    });

    await runtime.start();
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.ingestGatewayEvent(replayEvent);
    await runtime.stop();

    expect(emojiStickerPunishmentCalls(fetchSpy, 'actor-emoji-replay-1')).toHaveLength(1);
    expect(transport.entries.some((entry) => entry.message === 'Canonical Guardian replay suppressed')).toBe(true);
  });

  test('missing audit log follows existing policy when actor attribution is unavailable', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'STICKER_DELETE',
        actorId: 'unknown-actor',
        deletedStickerIds: ['sticker-no-audit-1'],
        stickerId: 'sticker-no-audit-1',
        targetId: 'sticker-no-audit-1',
        resourceId: 'sticker-no-audit-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('delayed attribution can punish the later attributed actor', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'GUILD_EMOJIS_UPDATE',
        actorId: 'unknown-actor',
        deletedEmojiIds: ['emoji-late-audit-1'],
        emojiId: 'emoji-late-audit-1',
        targetId: 'emoji-late-audit-1',
        resourceId: 'emoji-late-audit-1',
      }),
    );
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'STICKER_DELETE',
        actorId: 'unknown-actor',
        deletedStickerIds: ['sticker-late-audit-1'],
        stickerId: 'sticker-late-audit-1',
        targetId: 'sticker-late-audit-1',
        resourceId: 'sticker-late-audit-1',
        auditLogEntry: {
          id: 'audit-emoji-late-1',
          actionType: 'MEMBER_KICK',
          actorId: 'actor-emoji-late-audit-1',
          targetId: 'sticker-late-audit-1',
          resourceId: 'sticker-late-audit-1',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await runtime.stop();

    expect(emojiStickerPunishmentCalls(fetchSpy, 'actor-emoji-late-audit-1').length).toBeGreaterThan(0);
  });

  test('emoji/sticker containment 404 is treated as verified containment and does not trigger recovery', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-emoji-sticker-slice-1/members/actor-emoji-404-1')) {
        return {
          ...createFetchResponse(404),
          json: async () => Object.freeze({ code: 'UNKNOWN_MEMBER', message: 'Unknown Member' }),
        };
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'GUILD_EMOJIS_UPDATE',
        actorId: 'actor-emoji-404-1',
        deletedEmojiIds: ['emoji-404-1'],
        emojiId: 'emoji-404-1',
        targetId: 'emoji-404-1',
        resourceId: 'emoji-404-1',
      }),
    );
    await runtime.stop();

    expect(recoverySpy).not.toHaveBeenCalled();
  });

  test.each([403, 429, 500])(
    'emoji/sticker containment failure (%i) triggers recovery scheduling',
    async (statusCode) => {
      const fetchSpy = jest.fn(async (url: string) => {
        if (url.includes(`/api/v10/guilds/guild-emoji-sticker-slice-1/members/actor-emoji-fail-${statusCode}`)) {
          return createFetchResponse(statusCode);
        }

        return createFetchResponse(204);
      });
      (globalThis as { fetch?: unknown }).fetch = fetchSpy;

      const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
      const runtime = createRuntime();

      await runtime.start();
      await runtime.ingestGatewayEvent(
        buildEmojiStickerDeletionEvent({
          eventName: 'STICKER_DELETE',
          actorId: `actor-emoji-fail-${statusCode}`,
          deletedStickerIds: [`sticker-fail-${statusCode}`],
          stickerId: `sticker-fail-${statusCode}`,
          targetId: `sticker-fail-${statusCode}`,
          resourceId: `sticker-fail-${statusCode}`,
        }),
      );
      await runtime.stop();

      expect(fetchSpy).toHaveBeenCalled();
      expect(recoverySpy).toHaveBeenCalled();
    },
  );

  test('partial execution schedules recovery when actor moderation fails after incident actions', async () => {
    const fetchSpy = jest.fn(async (url: string) => {
      if (url.includes('/api/v10/guilds/guild-emoji-sticker-slice-1/members/actor-emoji-partial-1')) {
        return createFetchResponse(500);
      }

      return createFetchResponse(204);
    });
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const recoverySpy = jest.spyOn(InMemoryRecoveryEngine.prototype, 'execute');
    const runtime = createRuntime();

    await runtime.start();
    await runtime.ingestGatewayEvent(
      buildEmojiStickerDeletionEvent({
        eventName: 'STICKER_DELETE',
        actorId: 'actor-emoji-partial-1',
        deletedStickerIds: ['sticker-partial-1'],
        stickerId: 'sticker-partial-1',
        targetId: 'sticker-partial-1',
        resourceId: 'sticker-partial-1',
      }),
    );
    await runtime.stop();

    expect(fetchSpy).toHaveBeenCalled();
    expect(recoverySpy).toHaveBeenCalled();
  });

  test('simultaneous emoji/sticker deletion burst is coordinated into one actor punishment', async () => {
    const fetchSpy = jest.fn(async () => createFetchResponse(204));
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const runtime = createRuntime();

    await runtime.start();
    await Promise.all([
      runtime.ingestGatewayEvent(
        buildEmojiStickerDeletionEvent({
          eventName: 'GUILD_EMOJIS_UPDATE',
          actorId: 'actor-emoji-burst-1',
          deletedEmojiIds: ['emoji-burst-1'],
          emojiId: 'emoji-burst-1',
          targetId: 'emoji-burst-1',
          resourceId: 'emoji-burst-1',
        }),
      ),
      runtime.ingestGatewayEvent(
        buildEmojiStickerDeletionEvent({
          eventName: 'STICKER_DELETE',
          actorId: 'actor-emoji-burst-1',
          deletedStickerIds: ['sticker-burst-1'],
          stickerId: 'sticker-burst-1',
          targetId: 'sticker-burst-1',
          resourceId: 'sticker-burst-1',
        }),
      ),
    ]);
    await runtime.stop();

    expect(emojiStickerPunishmentCalls(fetchSpy, 'actor-emoji-burst-1')).toHaveLength(1);
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
