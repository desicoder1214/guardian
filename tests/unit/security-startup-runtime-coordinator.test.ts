import fs from 'node:fs';
import path from 'node:path';
import {
  InMemorySecurityStartupExecutionDispatcher,
  SecurityStartupExecutionDispatchReport,
} from '../../src/core/runtime/security/security-startup-execution-dispatcher';
import {
  InMemorySecurityStartupExecutionPlanningEngine,
  SecurityStartupExecutionPlanningReport,
} from '../../src/core/runtime/security/security-startup-execution-planning-engine';
import {
  SecurityStartupReconciliationPipeline,
  SecurityStartupReconciliationPipelineReport,
  SecurityStartupReconciliationPipelineRequest,
  SecurityStartupReconciliationPipelineStage,
  SecurityStartupReconciliationPipelineVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-reconciliation-pipeline';
import {
  InMemorySecurityStartupRuntimeCoordinator,
  SecurityStartupRuntimeCoordinationRequest,
  SecurityStartupRuntimeCoordinationStage,
  SecurityStartupRuntimeCoordinationVerificationOutcome,
  freezeSecurityStartupRuntimeCoordinationRequest,
} from '../../src/core/runtime/security/security-startup-runtime-coordinator';
import {
  StartupReentryMode,
  StartupReentrySecurityCoordinator,
  StartupReentrySecurityReport,
  StartupReentrySecurityRequest,
  StartupReentrySecurityStage,
  StartupReentryVerificationOutcome,
} from '../../src/core/runtime/security/startup-reentry-security-coordinator';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from '../../src/core/runtime/security/security-reconciliation-engine';

class RecordingStartupReentrySecurityCoordinator implements StartupReentrySecurityCoordinator {
  readonly calls: StartupReentrySecurityRequest[] = [];

  constructor(
    private readonly reportFactory: (
      request: StartupReentrySecurityRequest,
    ) => Promise<StartupReentrySecurityReport> | StartupReentrySecurityReport,
    private readonly order?: string[],
  ) {}

  async execute(request: StartupReentrySecurityRequest): Promise<StartupReentrySecurityReport> {
    this.calls.push(request);
    this.order?.push('startup-reentry');
    return this.reportFactory(request);
  }
}

class RecordingStartupReconciliationPipeline implements SecurityStartupReconciliationPipeline {
  readonly calls: SecurityStartupReconciliationPipelineRequest[] = [];

  constructor(
    private readonly reportFactory: (
      request: SecurityStartupReconciliationPipelineRequest,
    ) => Promise<SecurityStartupReconciliationPipelineReport> | SecurityStartupReconciliationPipelineReport,
    private readonly order?: string[],
  ) {}

  async execute(
    request: SecurityStartupReconciliationPipelineRequest,
  ): Promise<SecurityStartupReconciliationPipelineReport> {
    this.calls.push(request);
    this.order?.push('startup-pipeline');
    return this.reportFactory(request);
  }
}

class RecordingStartupExecutionPlanningEngine extends InMemorySecurityStartupExecutionPlanningEngine {
  readonly calls: Array<Parameters<InMemorySecurityStartupExecutionPlanningEngine['execute']>[0]> = [];

  constructor(private readonly order?: string[]) {
    super();
  }

  override async execute(
    request: Parameters<InMemorySecurityStartupExecutionPlanningEngine['execute']>[0],
  ): Promise<SecurityStartupExecutionPlanningReport> {
    this.calls.push(request);
    this.order?.push('startup-planning');
    return super.execute(request);
  }
}

class RecordingStartupExecutionDispatcher extends InMemorySecurityStartupExecutionDispatcher {
  readonly calls: Array<Parameters<InMemorySecurityStartupExecutionDispatcher['dispatch']>[0]> = [];

  constructor(private readonly order?: string[]) {
    super();
  }

  override async dispatch(
    request: Parameters<InMemorySecurityStartupExecutionDispatcher['dispatch']>[0],
  ): Promise<SecurityStartupExecutionDispatchReport> {
    this.calls.push(request);
    this.order?.push('startup-dispatch');
    return super.dispatch(request);
  }
}

function buildFinding(
  findingId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
  overrides: Partial<SecurityReconciliationFinding> = {},
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId,
    type,
    severity,
    correlationId: 'corr-startup-runtime-1',
    runtimeId: 'runtime-startup-runtime-1',
    guildId: 'guild-startup-runtime-1',
    targetId,
    summary: `Finding ${findingId}`,
    metadata: Object.freeze({ source: 'startup-runtime-test' }),
    ...overrides,
  });
}

function buildStartupReentryRequest(
  overrides: Partial<StartupReentrySecurityRequest> = {},
): StartupReentrySecurityRequest {
  return Object.freeze({
    startupSecurityReportId: 'startup-security-report-1',
    correlationId: 'corr-startup-runtime-1',
    transactionId: 'txn-startup-runtime-1',
    guildId: 'guild-startup-runtime-1',
    runtimeId: 'runtime-startup-runtime-1',
    mode: StartupReentryMode.STARTUP,
    runtimeReady: true,
    snapshots: Object.freeze({
      runtimeSnapshotId: 'snapshot-runtime-1',
      recoverySnapshotId: 'snapshot-recovery-1',
      startupSnapshotId: 'snapshot-startup-1',
    }),
    botInventoryRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      authorizedBotRegistry: Object.freeze({
        registryId: 'registry-bot-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      currentGuildBotInventory: Object.freeze([]),
      runtimeSnapshot: Object.freeze({
        snapshotId: 'snapshot-runtime-bot-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      recoverySnapshot: Object.freeze({
        snapshotId: 'snapshot-recovery-bot-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      startupInventory: Object.freeze({
        snapshotId: 'snapshot-startup-bot-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    webhookReconciliationRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    integrationReconciliationRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    permissionReconciliationRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    recoverySnapshotValidationRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      runtimeSnapshotId: 'snapshot-runtime-1',
      recoverySnapshotId: 'snapshot-recovery-1',
      startupSnapshotId: 'snapshot-startup-1',
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    metadata: Object.freeze({ source: 'startup-runtime-test' }),
    ...overrides,
  });
}

function buildStartupReconciliationPipelineRequest(
  overrides: Partial<SecurityStartupReconciliationPipelineRequest> = {},
): SecurityStartupReconciliationPipelineRequest {
  return Object.freeze({
    pipelineId: 'startup-pipeline-runtime-1',
    correlationId: 'corr-startup-runtime-1',
    transactionId: 'txn-startup-runtime-1',
    guildId: 'guild-startup-runtime-1',
    runtimeId: 'runtime-startup-runtime-1',
    botInventoryRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      authorizedBotRegistry: Object.freeze({
        registryId: 'bot-registry-runtime-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      currentGuildBotInventory: Object.freeze([]),
      runtimeSnapshot: Object.freeze({
        snapshotId: 'snapshot-runtime-bot-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      recoverySnapshot: Object.freeze({
        snapshotId: 'snapshot-recovery-bot-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      startupInventory: Object.freeze({
        snapshotId: 'snapshot-startup-bot-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        botInventory: Object.freeze([]),
      }),
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    webhookInventoryRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      authorizedWebhookRegistry: Object.freeze({
        registryId: 'webhook-registry-runtime-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      currentGuildWebhookInventory: Object.freeze([]),
      runtimeSnapshot: Object.freeze({
        snapshotId: 'snapshot-runtime-webhook-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        webhookInventory: Object.freeze([]),
      }),
      recoverySnapshot: Object.freeze({
        snapshotId: 'snapshot-recovery-webhook-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        webhookInventory: Object.freeze([]),
      }),
      startupInventory: Object.freeze({
        snapshotId: 'snapshot-startup-webhook-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        webhookInventory: Object.freeze([]),
      }),
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    integrationInventoryRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      authorizedIntegrationRegistry: Object.freeze({
        registryId: 'integration-registry-runtime-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      currentGuildIntegrationInventory: Object.freeze([]),
      runtimeSnapshot: Object.freeze({
        snapshotId: 'snapshot-runtime-integration-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        integrationInventory: Object.freeze([]),
      }),
      recoverySnapshot: Object.freeze({
        snapshotId: 'snapshot-recovery-integration-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        integrationInventory: Object.freeze([]),
      }),
      startupInventory: Object.freeze({
        snapshotId: 'snapshot-startup-integration-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        integrationInventory: Object.freeze([]),
      }),
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    permissionRoleStateRequest: Object.freeze({
      correlationId: 'corr-startup-runtime-1',
      transactionId: 'txn-startup-runtime-1',
      guildId: 'guild-startup-runtime-1',
      runtimeId: 'runtime-startup-runtime-1',
      authorizedRoleRegistry: Object.freeze({
        registryId: 'role-registry-runtime-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      protectedRoleRegistry: Object.freeze({
        registryId: 'protected-role-registry-runtime-1',
        registryVersion: 1,
        records: Object.freeze([]),
      }),
      dangerousPermissionPolicy: Object.freeze({
        dangerousPermissions: Object.freeze(['ADMINISTRATOR']),
      }),
      currentGuildRoleInventory: Object.freeze([]),
      currentChannelPermissionOverwriteInventory: Object.freeze([]),
      runtimeSnapshot: Object.freeze({
        snapshotId: 'snapshot-runtime-permission-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        roleInventory: Object.freeze([]),
        channelPermissionOverwriteInventory: Object.freeze([]),
      }),
      recoverySnapshot: Object.freeze({
        snapshotId: 'snapshot-recovery-permission-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        roleInventory: Object.freeze([]),
        channelPermissionOverwriteInventory: Object.freeze([]),
      }),
      startupInventory: Object.freeze({
        snapshotId: 'snapshot-startup-permission-runtime-1',
        snapshotVersion: 1,
        guildId: 'guild-startup-runtime-1',
        runtimeId: 'runtime-startup-runtime-1',
        roleInventory: Object.freeze([]),
        channelPermissionOverwriteInventory: Object.freeze([]),
      }),
      metadata: Object.freeze({ source: 'startup-runtime-test' }),
    }),
    metadata: Object.freeze({ source: 'startup-runtime-test' }),
    ...overrides,
  });
}

function buildStartupReentrySecurityReport(
  request: StartupReentrySecurityRequest,
  overrides: Partial<StartupReentrySecurityReport> = {},
): StartupReentrySecurityReport {
  return Object.freeze({
    startupSecurityReportId: request.startupSecurityReportId ?? 'startup-security-report-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    mode: request.mode,
    stagesCompleted: Object.freeze([
      StartupReentrySecurityStage.RUNTIME_READY,
      StartupReentrySecurityStage.ENTER_REENTRY_SHIELD,
      StartupReentrySecurityStage.SNAPSHOT_VALIDATION,
      StartupReentrySecurityStage.BOT_INVENTORY_RECONCILIATION,
      StartupReentrySecurityStage.WEBHOOK_INVENTORY_RECONCILIATION,
      StartupReentrySecurityStage.INTEGRATION_RECONCILIATION,
      StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION,
      StartupReentrySecurityStage.RECOVERY_SNAPSHOT_VALIDATION,
      StartupReentrySecurityStage.AGGREGATE_FINDINGS,
      StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT,
      StartupReentrySecurityStage.EXIT_REENTRY_SHIELD,
    ]),
    findings: Object.freeze([]),
    componentStatuses: Object.freeze([]),
    verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
    success: true,
    startupBlocked: false,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.050Z',
    durationMs: 50,
    metadata: Object.freeze({
      source: 'in-memory-startup-reentry-security-coordinator' as const,
      deterministicStartupSecurityReportId: true as const,
      replayProtectionEnabled: true as const,
      reentryShieldMode: 'STARTUP_RECONNECT_ONLY' as const,
      runtimeSnapshotId: request.snapshots.runtimeSnapshotId,
      recoverySnapshotId: request.snapshots.recoverySnapshotId,
      startupSnapshotId: request.snapshots.startupSnapshotId,
    }),
    ...overrides,
  });
}

function buildStartupReconciliationPipelineReport(
  request: SecurityStartupReconciliationPipelineRequest,
  overrides: Partial<SecurityStartupReconciliationPipelineReport> = {},
): SecurityStartupReconciliationPipelineReport {
  return Object.freeze({
    pipelineId: request.pipelineId ?? 'startup-pipeline-runtime-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted: Object.freeze([
      SecurityStartupReconciliationPipelineStage.PIPELINE_VALIDATION,
      SecurityStartupReconciliationPipelineStage.BOT_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.WEBHOOK_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.INTEGRATION_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.PERMISSION_ROLE_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.FINDING_AGGREGATION,
      SecurityStartupReconciliationPipelineStage.FINDING_DEDUPLICATION,
      SecurityStartupReconciliationPipelineStage.FINDING_PRIORITIZATION,
      SecurityStartupReconciliationPipelineStage.VERIFICATION,
      SecurityStartupReconciliationPipelineStage.REPORT_GENERATION,
    ]),
    findings: Object.freeze([
      buildFinding(
        'finding:bot-1',
        SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
        SecurityReconciliationFindingSeverity.CRITICAL,
        'bot-1',
      ),
      buildFinding(
        'finding:webhook-1',
        SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
        SecurityReconciliationFindingSeverity.CRITICAL,
        'webhook-1',
      ),
      buildFinding(
        'finding:role-1',
        SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
        SecurityReconciliationFindingSeverity.HIGH,
        'role-1',
      ),
    ]),
    componentStatuses: Object.freeze([]),
    verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.050Z',
    finishedAt: '2026-06-30T00:00:00.150Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-startup-reconciliation-pipeline' as const,
      deterministicPipelineId: true as const,
      findingsOnly: true as const,
      orchestrationId: 'orchestration-runtime-1',
      botReconciliationId: 'bot-runtime-1',
      webhookReconciliationId: 'webhook-runtime-1',
      integrationReconciliationId: 'integration-runtime-1',
      permissionRoleReconciliationId: 'permission-runtime-1',
    }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityStartupRuntimeCoordinationRequest> = {},
): SecurityStartupRuntimeCoordinationRequest {
  return Object.freeze({
    startupReentrySecurityRequest: buildStartupReentryRequest(),
    startupReconciliationPipelineRequest: buildStartupReconciliationPipelineRequest(),
    planningId: 'startup-planning-runtime-1',
    dispatchId: 'startup-dispatch-runtime-1',
    metadata: Object.freeze({ source: 'startup-runtime-test' }),
    ...overrides,
  });
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/security/security-startup-runtime-coordinator.ts'),
    'utf8',
  );
}

describe('SecurityStartupRuntimeCoordinator', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityStartupRuntimeCoordinationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.startupReentrySecurityRequest)).toBe(true);
    expect(Object.isFrozen(request.startupReconciliationPipelineRequest)).toBe(true);

    expect(() => {
      (request as { coordinatorId?: string }).coordinatorId = 'mutated';
    }).toThrow(TypeError);
  });

  test('coordinator executes startup workflow in deterministic stage order', async () => {
    const order: string[] = [];
    const reentryCoordinator = new RecordingStartupReentrySecurityCoordinator(
      (request) => buildStartupReentrySecurityReport(request),
      order,
    );
    const pipeline = new RecordingStartupReconciliationPipeline(
      (request) => buildStartupReconciliationPipelineReport(request),
      order,
    );
    const planning = new RecordingStartupExecutionPlanningEngine(order);
    const dispatch = new RecordingStartupExecutionDispatcher(order);

    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      reentryCoordinator,
      pipeline,
      planning,
      dispatch,
    );

    const report = await coordinator.coordinate(buildRequest());

    expect(order).toEqual([
      'startup-reentry',
      'startup-pipeline',
      'startup-planning',
      'startup-dispatch',
    ]);
    expect(report.stagesCompleted).toEqual([
      SecurityStartupRuntimeCoordinationStage.COORDINATION_VALIDATION,
      SecurityStartupRuntimeCoordinationStage.STARTUP_REENTRY_SECURITY_COORDINATION,
      SecurityStartupRuntimeCoordinationStage.STARTUP_RECONCILIATION_PIPELINE,
      SecurityStartupRuntimeCoordinationStage.STARTUP_EXECUTION_PLANNING,
      SecurityStartupRuntimeCoordinationStage.STARTUP_EXECUTION_DISPATCH,
      SecurityStartupRuntimeCoordinationStage.VERIFICATION,
      SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION,
    ]);
  });

  test('immutable reports are deeply frozen', async () => {
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request)),
    );

    const report = await coordinator.coordinate(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic coordinator ids are stable', async () => {
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request)),
    );

    const first = await coordinator.coordinate(buildRequest());
    const second = await coordinator.coordinate(buildRequest());

    expect(first.coordinatorId).toBe(second.coordinatorId);
  });

  test('idempotent replay returns cached report and prevents duplicate dispatch pipeline execution', async () => {
    const reentry = new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request));
    const pipeline = new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request));
    const planning = new RecordingStartupExecutionPlanningEngine();
    const dispatch = new RecordingStartupExecutionDispatcher();
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(reentry, pipeline, planning, dispatch);

    const request = buildRequest();
    const first = await coordinator.coordinate(request);
    const second = await coordinator.coordinate(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(reentry.calls).toHaveLength(1);
    expect(pipeline.calls).toHaveLength(1);
    expect(planning.calls).toHaveLength(1);
    expect(dispatch.calls).toHaveLength(1);
  });

  test('successful coordination preserves correlation runtime transaction guild and all stage IDs', async () => {
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request)),
    );

    const report = await coordinator.coordinate(buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(SecurityStartupRuntimeCoordinationVerificationOutcome.VERIFIED);
    expect(report.correlationId).toBe('corr-startup-runtime-1');
    expect(report.transactionId).toBe('txn-startup-runtime-1');
    expect(report.runtimeId).toBe('runtime-startup-runtime-1');
    expect(report.guildId).toBe('guild-startup-runtime-1');
    expect(report.startupSecurityReportId).toBe('startup-security-report-1');
    expect(report.pipelineId).toBe('startup-pipeline-runtime-1');
    expect(report.planningId).toBe('startup-planning-runtime-1');
    expect(report.dispatchId).toBe('startup-dispatch-runtime-1');
  });

  test('fail closed on startup request context mismatch', async () => {
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request)),
    );

    const report = await coordinator.coordinate(
      buildRequest({
        startupReconciliationPipelineRequest: buildStartupReconciliationPipelineRequest({
          correlationId: 'corr-mismatch',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('REQUEST_CONTEXT_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      SecurityStartupRuntimeCoordinationStage.COORDINATION_VALIDATION,
      SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION,
    ]);
  });

  test('fail closed when startup reentry verification gate fails', async () => {
    const pipeline = new RecordingStartupReconciliationPipeline((request) => buildStartupReconciliationPipelineReport(request));
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) =>
        buildStartupReentrySecurityReport(request, {
          success: false,
          verificationOutcome: StartupReentryVerificationOutcome.FAILED,
          failureReason: 'STARTUP_GATE_FAILED',
        }),
      ),
      pipeline,
    );

    const report = await coordinator.coordinate(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('STARTUP_REENTRY_NOT_VERIFIED');
    expect(pipeline.calls).toHaveLength(0);
  });

  test('fail closed when pipeline verification gate fails', async () => {
    const planning = new RecordingStartupExecutionPlanningEngine();
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) =>
        buildStartupReconciliationPipelineReport(request, {
          success: false,
          verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.FAILED,
          failureReason: 'PIPELINE_GATE_FAILED',
        }),
      ),
      planning,
    );

    const report = await coordinator.coordinate(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('STARTUP_PIPELINE_NOT_VERIFIED');
    expect(planning.calls).toHaveLength(0);
  });

  test('fail closed on cross-stage identity mismatch', async () => {
    const planning = new RecordingStartupExecutionPlanningEngine();
    const dispatch = new RecordingStartupExecutionDispatcher();
    const coordinator = new InMemorySecurityStartupRuntimeCoordinator(
      new RecordingStartupReentrySecurityCoordinator((request) => buildStartupReentrySecurityReport(request)),
      new RecordingStartupReconciliationPipeline((request) =>
        buildStartupReconciliationPipelineReport(request, {
          pipelineId: 'startup-pipeline-runtime-other',
        }),
      ),
      planning,
      dispatch,
    );

    const report = await coordinator.coordinate(
      buildRequest({
        startupReconciliationPipelineRequest: buildStartupReconciliationPipelineRequest({
          pipelineId: 'startup-pipeline-runtime-1',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('CROSS_STAGE_VERIFICATION_FAILED');
  });

  test('source has no prohibited integration surfaces or side effects', () => {
    const source = readSource();

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
    expect(source).not.toMatch(/\bpunish\b|\bcontainment\b|\bdiscord\s*client\b/i);
  });
});