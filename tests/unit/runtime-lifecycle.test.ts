import { LoggerFactory, ConsoleTransport } from '../../src/core/runtime/logger';
import { RuntimeHealthService } from '../../src/core/runtime/health';
import {
  RuntimeManager,
  RuntimeStartupCoordinationRequestFactory,
  RuntimeStartupMode,
} from '../../src/core/runtime/lifecycle';
import { InMemoryEventBus } from '../../src/core/event/bus';
import {
  SecurityStartupRuntimeCoordinationReport,
  SecurityStartupRuntimeCoordinationRequest,
  SecurityStartupRuntimeCoordinator,
  SecurityStartupRuntimeCoordinationVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-runtime-coordinator';
import { InMemoryDiscordEventPipeline } from '../../src/core/runtime/discord/pipeline';

const logger = new LoggerFactory([new ConsoleTransport()]).createLogger();

class RecordingStartupRuntimeCoordinator
  implements SecurityStartupRuntimeCoordinator
{
  readonly calls: SecurityStartupRuntimeCoordinationRequest[] = [];

  constructor(
    private readonly reportFactory: (
      request: SecurityStartupRuntimeCoordinationRequest,
    ) => SecurityStartupRuntimeCoordinationReport,
  ) {}

  async coordinate(
    request: SecurityStartupRuntimeCoordinationRequest,
  ): Promise<SecurityStartupRuntimeCoordinationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class RecordingStartupRequestFactory
  implements RuntimeStartupCoordinationRequestFactory
{
  readonly modes: RuntimeStartupMode[] = [];

  create(mode: RuntimeStartupMode): SecurityStartupRuntimeCoordinationRequest {
    this.modes.push(mode);
    return {
      startupReentrySecurityRequest: {} as unknown as SecurityStartupRuntimeCoordinationRequest['startupReentrySecurityRequest'],
      startupReconciliationPipelineRequest:
        {} as unknown as SecurityStartupRuntimeCoordinationRequest['startupReconciliationPipelineRequest'],
    };
  }
}

function buildCoordinationReport(
  overrides: Partial<SecurityStartupRuntimeCoordinationReport> = {},
): SecurityStartupRuntimeCoordinationReport {
  return Object.freeze({
    coordinatorId: 'startup-runtime-coordinator-1',
    startupSecurityReportId: 'startup-security-report-1',
    pipelineId: 'startup-pipeline-1',
    planningId: 'startup-planning-1',
    dispatchId: 'startup-dispatch-1',
    correlationId: 'corr-startup-1',
    transactionId: 'txn-startup-1',
    runtimeId: 'runtime-startup-1',
    guildId: 'guild-startup-1',
    stagesCompleted: Object.freeze([]),
    verificationOutcome:
      SecurityStartupRuntimeCoordinationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.100Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-startup-runtime-coordinator' as const,
      deterministicCoordinatorId: true as const,
      startupWorkflowOrderEnforced: true as const,
      stageVerificationEnforced: true as const,
      startupSecurityReportIdPreserved: true,
      pipelineIdPreserved: true,
      planningIdPreserved: true,
      dispatchIdPreserved: true,
    }),
    ...overrides,
  });
}

test('RuntimeManager starts and stops without error', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const runtime = new RuntimeManager(logger, healthService, eventBus);

  await runtime.start();
  expect(healthService.getReadiness().healthy).toBe(true);

  await runtime.stop();
  expect(healthService.getLiveness().healthy).toBe(false);
});

test('RuntimeManager publishes runtime events', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const received: string[] = [];
  eventBus.subscribe({
    handle: async (event) => {
      received.push(event.type);
    },
  });

  const runtime = new RuntimeManager(logger, healthService, eventBus);

  await runtime.start();
  await runtime.stop();

  expect(received).toEqual([
    'ApplicationStarting',
    'ApplicationStarted',
    'ApplicationStopping',
    'ApplicationStopped',
  ]);
});

test('cold startup invokes startup coordinator and gates ready state', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport(),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await runtime.start();

  expect(healthService.getReadiness().healthy).toBe(true);
  expect(runtime.isGatewayEventProcessingEnabled()).toBe(true);
  expect(requestFactory.modes).toEqual([RuntimeStartupMode.COLD_START]);
  expect(coordinator.calls).toHaveLength(1);
  expect(runtime.getLatestStartupCoordinationReport()?.success).toBe(true);
});

test('reconnect startup invokes startup coordination gate', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport(),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await runtime.reconnect();

  expect(healthService.getReadiness().healthy).toBe(true);
  expect(requestFactory.modes).toEqual([RuntimeStartupMode.RECONNECT_START]);
});

test('recovery startup invokes startup coordination gate', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport(),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await runtime.startRecovery();

  expect(healthService.getReadiness().healthy).toBe(true);
  expect(requestFactory.modes).toEqual([RuntimeStartupMode.RECOVERY_START]);
});

test('startup verification failure blocks READY and captures deterministic failure report', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport({
      success: false,
      verificationOutcome:
        SecurityStartupRuntimeCoordinationVerificationOutcome.FAILED,
      failureReason: 'STARTUP_VERIFICATION_FAILED',
    }),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await expect(runtime.start()).rejects.toThrow('STARTUP_COORDINATION_FAILED');
  expect(healthService.getReadiness().healthy).toBe(false);
  expect(runtime.isGatewayEventProcessingEnabled()).toBe(false);
  expect(runtime.getStartupFailureReport()?.success).toBe(false);
  expect(runtime.getStartupFailureReport()?.failureReason).toBe(
    'STARTUP_VERIFICATION_FAILED',
  );
});

test('gateway events are blocked before READY', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport({
      success: false,
      verificationOutcome:
        SecurityStartupRuntimeCoordinationVerificationOutcome.FAILED,
      failureReason: 'STARTUP_VERIFICATION_FAILED',
    }),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  const pipeline = new InMemoryDiscordEventPipeline(
    eventBus,
    healthService,
    logger,
    runtime,
  );
  await pipeline.start();

  await expect(runtime.start()).rejects.toThrow('STARTUP_COORDINATION_FAILED');
  await expect(pipeline.ingest({ t: 'READY' })).rejects.toThrow(
    'runtime not ready for gateway event processing',
  );
});

test('idempotent startup replay does not re-run coordinator after successful cold start', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport(),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await runtime.start();
  await runtime.start();

  expect(coordinator.calls).toHaveLength(1);
  expect(requestFactory.modes).toEqual([RuntimeStartupMode.COLD_START]);
});

test('lifecycle ordering keeps READY transition after startup verification', async () => {
  const healthService = new RuntimeHealthService();
  const eventBus = new InMemoryEventBus();
  const events: string[] = [];
  eventBus.subscribe({
    handle: async (event) => {
      events.push(event.type);
    },
  });
  const coordinator = new RecordingStartupRuntimeCoordinator(() =>
    buildCoordinationReport(),
  );
  const requestFactory = new RecordingStartupRequestFactory();
  const runtime = new RuntimeManager(
    logger,
    healthService,
    eventBus,
    coordinator,
    requestFactory,
  );

  await runtime.start();

  expect(events).toEqual(['ApplicationStarting', 'ApplicationStarted']);
  expect(runtime.isGatewayEventProcessingEnabled()).toBe(true);
});
