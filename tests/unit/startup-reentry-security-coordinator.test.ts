import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  InMemorySecurityBotInventoryReconciler,
  SecurityBotIdentity,
  SecurityBotInventoryReconciliationRequest,
} from '../../src/core/runtime/security/security-bot-inventory-reconciliation';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from '../../src/core/runtime/security/security-reconciliation-engine';
import {
  InMemoryStartupReentrySecurityCoordinator,
  StartupContractReconciliationComponent,
  StartupContractReconciliationReport,
  StartupContractReconciliationRequest,
  StartupContractReconciler,
  StartupRecoverySnapshotValidationReport,
  StartupRecoverySnapshotValidationRequest,
  StartupRecoverySnapshotVerifier,
  StartupReentryMode,
  StartupReentrySecurityRequest,
  StartupReentrySecurityStage,
  StartupReentryVerificationOutcome,
} from '../../src/core/runtime/security/startup-reentry-security-coordinator';

class RecordingContractReconciler implements StartupContractReconciler {
  readonly calls: StartupContractReconciliationRequest[] = [];

  constructor(private readonly reportFactory: (request: StartupContractReconciliationRequest) => StartupContractReconciliationReport) {}

  async execute(request: StartupContractReconciliationRequest): Promise<StartupContractReconciliationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class RecordingRecoverySnapshotVerifier implements StartupRecoverySnapshotVerifier {
  readonly calls: StartupRecoverySnapshotValidationRequest[] = [];

  constructor(private readonly reportFactory: (request: StartupRecoverySnapshotValidationRequest) => StartupRecoverySnapshotValidationReport) {}

  async validate(request: StartupRecoverySnapshotValidationRequest): Promise<StartupRecoverySnapshotValidationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class DelayedBotReconciler extends InMemorySecurityBotInventoryReconciler {
  constructor(private readonly gate: Promise<void>) {
    super();
  }

  override async execute(request: SecurityBotInventoryReconciliationRequest) {
    await this.gate;
    return super.execute(request);
  }
}

function buildBot(botUserId: string, overrides: Partial<SecurityBotIdentity> = {}): SecurityBotIdentity {
  return Object.freeze({
    botUserId,
    displayName: `Bot ${botUserId}`,
    trusted: true,
    privileged: false,
    permissions: Object.freeze(['SEND_MESSAGES']),
    ...overrides,
  });
}

function buildFinding(
  idSuffix: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  context?: {
    readonly correlationId?: string;
    readonly guildId?: string;
    readonly runtimeId?: string;
  },
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId: `contract-finding:${idSuffix}`,
    type,
    severity,
    guildId: context?.guildId ?? 'guild-startup-1',
    runtimeId: context?.runtimeId ?? 'runtime-startup-1',
    correlationId: context?.correlationId ?? 'corr-startup-1',
    targetId: idSuffix,
    summary: `Finding ${idSuffix}`,
    metadata: Object.freeze({ source: 'contract-test' }),
  });
}

function buildBotRequest(overrides: Partial<SecurityBotInventoryReconciliationRequest> = {}): SecurityBotInventoryReconciliationRequest {
  const currentInventory = Object.freeze([
    buildBot('bot-safe-1'),
    buildBot('bot-rogue-1', {
      trusted: false,
      privileged: true,
      permissions: Object.freeze(['ADMINISTRATOR']),
    }),
  ]);

  return Object.freeze({
    correlationId: 'corr-startup-1',
    transactionId: 'txn-startup-1',
    guildId: 'guild-startup-1',
    runtimeId: 'runtime-startup-1',
    authorizedBotRegistry: Object.freeze({
      registryId: 'registry-startup-1',
      registryVersion: 1,
      records: Object.freeze([
        Object.freeze({
          botUserId: 'bot-safe-1',
          trusted: true,
          privileged: false,
          permissions: Object.freeze(['SEND_MESSAGES']),
        }),
      ]),
    }),
    currentGuildBotInventory: currentInventory,
    runtimeSnapshot: Object.freeze({
      snapshotId: 'snapshot-runtime-1',
      snapshotVersion: 1,
      guildId: 'guild-startup-1',
      runtimeId: 'runtime-startup-1',
      botInventory: Object.freeze([buildBot('bot-safe-1')]),
    }),
    recoverySnapshot: Object.freeze({
      snapshotId: 'snapshot-recovery-1',
      snapshotVersion: 1,
      guildId: 'guild-startup-1',
      runtimeId: 'runtime-startup-1',
      botInventory: Object.freeze([buildBot('bot-safe-1')]),
    }),
    startupInventory: Object.freeze({
      snapshotId: 'snapshot-startup-1',
      snapshotVersion: 1,
      guildId: 'guild-startup-1',
      runtimeId: 'runtime-startup-1',
      botInventory: Object.freeze([buildBot('bot-safe-1')]),
    }),
    metadata: Object.freeze({ source: 'startup-test' }),
    ...overrides,
  });
}

function buildContractRequest(component: string): StartupContractReconciliationRequest {
  return Object.freeze({
    reconciliationId: `reconcile-${component}-1`,
    correlationId: 'corr-startup-1',
    transactionId: 'txn-startup-1',
    guildId: 'guild-startup-1',
    runtimeId: 'runtime-startup-1',
    metadata: Object.freeze({ component }),
  });
}

function buildRecoveryRequest(): StartupRecoverySnapshotValidationRequest {
  return Object.freeze({
    correlationId: 'corr-startup-1',
    transactionId: 'txn-startup-1',
    guildId: 'guild-startup-1',
    runtimeId: 'runtime-startup-1',
    runtimeSnapshotId: 'snapshot-runtime-1',
    recoverySnapshotId: 'snapshot-recovery-1',
    startupSnapshotId: 'snapshot-startup-1',
    metadata: Object.freeze({ source: 'startup-test' }),
  });
}

function buildStartupRequest(overrides: Partial<StartupReentrySecurityRequest> = {}): StartupReentrySecurityRequest {
  return Object.freeze({
    correlationId: 'corr-startup-1',
    transactionId: 'txn-startup-1',
    guildId: 'guild-startup-1',
    runtimeId: 'runtime-startup-1',
    mode: StartupReentryMode.STARTUP,
    runtimeReady: true,
    snapshots: Object.freeze({
      runtimeSnapshotId: 'snapshot-runtime-1',
      recoverySnapshotId: 'snapshot-recovery-1',
      startupSnapshotId: 'snapshot-startup-1',
    }),
    botInventoryRequest: buildBotRequest(),
    webhookReconciliationRequest: buildContractRequest('webhook'),
    integrationReconciliationRequest: buildContractRequest('integration'),
    permissionReconciliationRequest: buildContractRequest('permission'),
    recoverySnapshotValidationRequest: buildRecoveryRequest(),
    metadata: Object.freeze({ source: 'startup-request' }),
    ...overrides,
  });
}

function createCoordinator(options?: {
  webhookReport?: Partial<StartupContractReconciliationReport>;
  integrationReport?: Partial<StartupContractReconciliationReport>;
  permissionReport?: Partial<StartupContractReconciliationReport>;
  recoveryReport?: Partial<StartupRecoverySnapshotValidationReport>;
  now?: () => number;
  botReconciler?: InMemorySecurityBotInventoryReconciler;
}) {
  const webhookReconciler = new RecordingContractReconciler((request) =>
    Object.freeze({
      reconciliationId: request.reconciliationId ?? 'reconcile-webhook-1',
      component: StartupContractReconciliationComponent.WEBHOOK,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      findings: Object.freeze([
        buildFinding(
          'webhook-1',
          SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
          SecurityReconciliationFindingSeverity.CRITICAL,
          {
            correlationId: request.correlationId,
            guildId: request.guildId,
            runtimeId: request.runtimeId,
          },
        ),
      ]),
      verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      ...options?.webhookReport,
    }),
  );

  const integrationReconciler = new RecordingContractReconciler((request) =>
    Object.freeze({
      reconciliationId: request.reconciliationId ?? 'reconcile-integration-1',
      component: StartupContractReconciliationComponent.INTEGRATION,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      findings: Object.freeze([
        buildFinding(
          'integration-1',
          SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
          SecurityReconciliationFindingSeverity.HIGH,
          {
            correlationId: request.correlationId,
            guildId: request.guildId,
            runtimeId: request.runtimeId,
          },
        ),
      ]),
      verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      ...options?.integrationReport,
    }),
  );

  const permissionReconciler = new RecordingContractReconciler((request) =>
    Object.freeze({
      reconciliationId: request.reconciliationId ?? 'reconcile-permission-1',
      component: StartupContractReconciliationComponent.PERMISSION,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      findings: Object.freeze([
        buildFinding(
          'permission-1',
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.HIGH,
          {
            correlationId: request.correlationId,
            guildId: request.guildId,
            runtimeId: request.runtimeId,
          },
        ),
      ]),
      verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      ...options?.permissionReport,
    }),
  );

  const recoveryVerifier = new RecordingRecoverySnapshotVerifier((request) =>
    Object.freeze({
      validationId: `recovery-validation:${request.runtimeSnapshotId}`,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      ...options?.recoveryReport,
    }),
  );

  const botReconciler = options?.botReconciler ?? new InMemorySecurityBotInventoryReconciler();

  return {
    coordinator: new InMemoryStartupReentrySecurityCoordinator(
      botReconciler,
      webhookReconciler,
      integrationReconciler,
      permissionReconciler,
      recoveryVerifier,
      { now: options?.now },
    ),
    webhookReconciler,
    integrationReconciler,
    permissionReconciler,
    recoveryVerifier,
  };
}

describe('StartupReentrySecurityCoordinator', () => {
  test('startup success uses deterministic stage ordering', async () => {
    const nowValues = [
      Date.parse('2026-06-30T00:00:00.000Z'),
      Date.parse('2026-06-30T00:00:00.010Z'),
      Date.parse('2026-06-30T00:00:00.015Z'),
    ];
    let nowIndex = 0;
    const { coordinator } = createCoordinator({ now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)] });

    const report = await coordinator.execute(buildStartupRequest());

    expect(report.success).toBe(true);
    expect(report.startupBlocked).toBe(false);
    expect(report.stagesCompleted).toEqual([
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
    ]);
    expect(report.verificationOutcome).toBe(StartupReentryVerificationOutcome.VERIFIED);
  });

  test('fail closed validation blocks startup when runtime is not ready', async () => {
    const { coordinator } = createCoordinator();
    const report = await coordinator.execute(buildStartupRequest({ runtimeReady: false }));

    expect(report.success).toBe(false);
    expect(report.startupBlocked).toBe(true);
    expect(report.failureReason).toContain('RUNTIME_NOT_READY');
    expect(report.stagesCompleted).toEqual([
      StartupReentrySecurityStage.RUNTIME_READY,
      StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT,
    ]);
  });

  test('deterministic reports are equal for equivalent startup requests', async () => {
    const { coordinator: firstCoordinator } = createCoordinator();
    const { coordinator: secondCoordinator } = createCoordinator();

    const first = await firstCoordinator.execute(buildStartupRequest());
    const second = await secondCoordinator.execute(buildStartupRequest());

    expect(first.startupSecurityReportId).toBe(second.startupSecurityReportId);
    expect(first.findings.map((finding) => finding.findingId)).toEqual(second.findings.map((finding) => finding.findingId));
  });

  test('replay behavior returns idempotent replay without re-executing contracts', async () => {
    const { coordinator, webhookReconciler, integrationReconciler, permissionReconciler, recoveryVerifier } = createCoordinator();

    const first = await coordinator.execute(buildStartupRequest());
    const second = await coordinator.execute(buildStartupRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.startupSecurityReportId).toBe(first.startupSecurityReportId);
    expect(webhookReconciler.calls).toHaveLength(1);
    expect(integrationReconciler.calls).toHaveLength(1);
    expect(permissionReconciler.calls).toHaveLength(1);
    expect(recoveryVerifier.calls).toHaveLength(1);
  });

  test('immutable startup reports are deeply frozen', async () => {
    const { coordinator } = createCoordinator();
    const report = await coordinator.execute(buildStartupRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.componentStatuses)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('reconciliation aggregation includes bot webhook integration and permission findings', async () => {
    const { coordinator } = createCoordinator();
    const report = await coordinator.execute(buildStartupRequest());

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.UNAUTHORIZED_BOT)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.PERMISSION_DRIFT)).toBe(true);
  });

  test('verification failures fail closed when webhook contract fails verification gate', async () => {
    const { coordinator } = createCoordinator({
      webhookReport: {
        success: false,
        verificationOutcome: StartupReentryVerificationOutcome.FAILED,
        failureReason: 'WEBHOOK_GATE_FAILED',
      },
    });

    const report = await coordinator.execute(buildStartupRequest());

    expect(report.success).toBe(false);
    expect(report.startupBlocked).toBe(true);
    expect(report.failureReason).toContain('WEBHOOK_RECONCILIATION_FAILED');
    expect(report.stagesCompleted).toContain(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
  });

  test('startup failure occurs when recovery snapshot validation fails', async () => {
    const { coordinator } = createCoordinator({
      recoveryReport: {
        success: false,
        verificationOutcome: StartupReentryVerificationOutcome.FAILED,
        failureReason: 'RECOVERY_SNAPSHOT_VERIFICATION_FAILED',
      },
    });

    const report = await coordinator.execute(buildStartupRequest());

    expect(report.success).toBe(false);
    expect(report.startupBlocked).toBe(true);
    expect(report.failureReason).toContain('RECOVERY_SNAPSHOT_VALIDATION_FAILED');
    expect(report.stagesCompleted).toContain(StartupReentrySecurityStage.AGGREGATE_FINDINGS);
    expect(report.stagesCompleted).toContain(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
    expect(report.stagesCompleted).toContain(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
  });

  test('duplicate execution in flight is blocked by replay protection', async () => {
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    const delayedBotReconciler = new DelayedBotReconciler(gate);
    const { coordinator } = createCoordinator({ botReconciler: delayedBotReconciler });

    const firstPromise = coordinator.execute(buildStartupRequest());
    const second = await coordinator.execute(buildStartupRequest());
    releaseGate();
    await firstPromise;

    expect(second.success).toBe(false);
    expect(second.failureReason).toContain('DUPLICATE_EXECUTION_BLOCKED');
    expect(second.startupBlocked).toBe(true);
  });

  test('correlation and transaction identifiers are preserved across all findings and component statuses', async () => {
    const { coordinator } = createCoordinator();
    const report = await coordinator.execute(
      buildStartupRequest({
        correlationId: 'corr-preserve-1',
        transactionId: 'txn-preserve-1',
        botInventoryRequest: buildBotRequest({
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
        }),
        webhookReconciliationRequest: Object.freeze({
          ...buildContractRequest('webhook'),
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
        }),
        integrationReconciliationRequest: Object.freeze({
          ...buildContractRequest('integration'),
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
        }),
        permissionReconciliationRequest: Object.freeze({
          ...buildContractRequest('permission'),
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
        }),
        recoverySnapshotValidationRequest: Object.freeze({
          ...buildRecoveryRequest(),
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-1');
    expect(report.transactionId).toBe('txn-preserve-1');
    expect(report.findings.every((finding) => finding.correlationId === 'corr-preserve-1')).toBe(true);
    expect(report.componentStatuses.length).toBeGreaterThan(0);
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/startup-reentry-security-coordinator.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(|axios|httpClient|discord\.com\/api|REST/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/executionEngine|dispatchExecution|executeContainment|punish|deleteWebhook|removeUnauthorizedBot/i);
  });
});
