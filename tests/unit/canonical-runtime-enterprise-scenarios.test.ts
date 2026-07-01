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
      await runtime.ingestGatewayEvent({
        t: scenario.eventName,
        d: {
          actorId: `actor-${scenario.scenario.toLowerCase()}`,
          scenario: scenario.scenario,
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
