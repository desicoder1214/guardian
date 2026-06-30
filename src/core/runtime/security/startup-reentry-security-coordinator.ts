import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';
import {
  SecurityBotInventoryReconciliationRequest,
  SecurityBotInventoryReconciliationReport,
  SecurityBotInventoryReconciler,
  SecurityBotInventoryReconciliationVerificationOutcome,
} from './security-bot-inventory-reconciliation';

export enum StartupReentryMode {
  STARTUP = 'STARTUP',
  RECONNECT = 'RECONNECT',
}

export enum StartupReentrySecurityStage {
  RUNTIME_READY = 'RUNTIME_READY',
  ENTER_REENTRY_SHIELD = 'ENTER_REENTRY_SHIELD',
  SNAPSHOT_VALIDATION = 'SNAPSHOT_VALIDATION',
  BOT_INVENTORY_RECONCILIATION = 'BOT_INVENTORY_RECONCILIATION',
  WEBHOOK_INVENTORY_RECONCILIATION = 'WEBHOOK_INVENTORY_RECONCILIATION',
  INTEGRATION_RECONCILIATION = 'INTEGRATION_RECONCILIATION',
  PERMISSION_DRIFT_RECONCILIATION = 'PERMISSION_DRIFT_RECONCILIATION',
  RECOVERY_SNAPSHOT_VALIDATION = 'RECOVERY_SNAPSHOT_VALIDATION',
  AGGREGATE_FINDINGS = 'AGGREGATE_FINDINGS',
  PRODUCE_STARTUP_SECURITY_REPORT = 'PRODUCE_STARTUP_SECURITY_REPORT',
  EXIT_REENTRY_SHIELD = 'EXIT_REENTRY_SHIELD',
}

export enum StartupReentryVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum StartupContractReconciliationComponent {
  WEBHOOK = 'WEBHOOK',
  INTEGRATION = 'INTEGRATION',
  PERMISSION = 'PERMISSION',
}

export interface StartupContractReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface StartupContractReconciliationReport {
  readonly reconciliationId: string;
  readonly component: StartupContractReconciliationComponent;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly verificationOutcome: StartupReentryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
}

export interface StartupContractReconciler {
  execute(
    request: StartupContractReconciliationRequest,
  ): Promise<StartupContractReconciliationReport>;
}

export interface StartupRecoverySnapshotValidationRequest {
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly runtimeSnapshotId: string;
  readonly recoverySnapshotId: string;
  readonly startupSnapshotId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface StartupRecoverySnapshotValidationReport {
  readonly validationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly verificationOutcome: StartupReentryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
}

export interface StartupRecoverySnapshotVerifier {
  validate(
    request: StartupRecoverySnapshotValidationRequest,
  ): Promise<StartupRecoverySnapshotValidationReport>;
}

export interface StartupReentrySnapshotReferences {
  readonly runtimeSnapshotId: string;
  readonly recoverySnapshotId: string;
  readonly startupSnapshotId: string;
}

export interface StartupReentrySecurityRequest {
  readonly startupSecurityReportId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly mode: StartupReentryMode;
  readonly runtimeReady: boolean;
  readonly snapshots: StartupReentrySnapshotReferences;
  readonly botInventoryRequest: SecurityBotInventoryReconciliationRequest;
  readonly webhookReconciliationRequest: StartupContractReconciliationRequest;
  readonly integrationReconciliationRequest: StartupContractReconciliationRequest;
  readonly permissionReconciliationRequest: StartupContractReconciliationRequest;
  readonly recoverySnapshotValidationRequest: StartupRecoverySnapshotValidationRequest;
  readonly metadata?: Record<string, unknown>;
}

export interface StartupReentryComponentStatus {
  readonly componentId: string;
  readonly success: boolean;
  readonly verificationOutcome: StartupReentryVerificationOutcome;
  readonly failureReason?: string;
}

export interface StartupReentrySecurityReport {
  readonly startupSecurityReportId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly mode: StartupReentryMode;
  readonly stagesCompleted: readonly StartupReentrySecurityStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly componentStatuses: readonly StartupReentryComponentStatus[];
  readonly verificationOutcome: StartupReentryVerificationOutcome;
  readonly success: boolean;
  readonly startupBlocked: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-startup-reentry-security-coordinator';
    readonly deterministicStartupSecurityReportId: true;
    readonly replayProtectionEnabled: true;
    readonly reentryShieldMode: 'STARTUP_RECONNECT_ONLY';
    readonly runtimeSnapshotId: string;
    readonly recoverySnapshotId: string;
    readonly startupSnapshotId: string;
  };
}

export interface StartupReentrySecurityCoordinator {
  execute(request: StartupReentrySecurityRequest): Promise<StartupReentrySecurityReport>;
}

const FAILURE_STARTUP_SECURITY_REPORT_ID_REQUIRED = 'STARTUP_SECURITY_REPORT_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_RUNTIME_NOT_READY = 'RUNTIME_NOT_READY';
const FAILURE_RUNTIME_SNAPSHOT_ID_REQUIRED = 'RUNTIME_SNAPSHOT_ID_REQUIRED';
const FAILURE_RECOVERY_SNAPSHOT_ID_REQUIRED = 'RECOVERY_SNAPSHOT_ID_REQUIRED';
const FAILURE_STARTUP_SNAPSHOT_ID_REQUIRED = 'STARTUP_SNAPSHOT_ID_REQUIRED';
const FAILURE_REQUEST_CONTEXT_MISMATCH = 'REQUEST_CONTEXT_MISMATCH';
const FAILURE_DUPLICATE_EXECUTION_BLOCKED = 'DUPLICATE_EXECUTION_BLOCKED';
const FAILURE_BOT_RECONCILIATION_FAILED = 'BOT_RECONCILIATION_FAILED';
const FAILURE_WEBHOOK_RECONCILIATION_FAILED = 'WEBHOOK_RECONCILIATION_FAILED';
const FAILURE_INTEGRATION_RECONCILIATION_FAILED = 'INTEGRATION_RECONCILIATION_FAILED';
const FAILURE_PERMISSION_RECONCILIATION_FAILED = 'PERMISSION_RECONCILIATION_FAILED';
const FAILURE_RECOVERY_SNAPSHOT_VALIDATION_FAILED = 'RECOVERY_SNAPSHOT_VALIDATION_FAILED';
const FAILURE_SECURITY_VERIFICATION_GATE_FAILED = 'SECURITY_VERIFICATION_GATE_FAILED';

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value) as T;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function freezeFinding(finding: SecurityReconciliationFinding): SecurityReconciliationFinding {
  return deepFreeze({
    ...finding,
    metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
  });
}

function freezeComponentStatus(status: StartupReentryComponentStatus): StartupReentryComponentStatus {
  return deepFreeze({ ...status });
}

function freezeStartupReentrySecurityRequest(
  request: StartupReentrySecurityRequest,
): StartupReentrySecurityRequest {
  return deepFreeze({
    ...request,
    snapshots: deepFreeze({ ...request.snapshots }),
    botInventoryRequest: deepFreeze({ ...request.botInventoryRequest }),
    webhookReconciliationRequest: deepFreeze({ ...request.webhookReconciliationRequest }),
    integrationReconciliationRequest: deepFreeze({ ...request.integrationReconciliationRequest }),
    permissionReconciliationRequest: deepFreeze({ ...request.permissionReconciliationRequest }),
    recoverySnapshotValidationRequest: deepFreeze({ ...request.recoverySnapshotValidationRequest }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(report: StartupReentrySecurityReport): StartupReentrySecurityReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    componentStatuses: Object.freeze(report.componentStatuses.map((entry) => freezeComponentStatus(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicStartupSecurityReportId(request: StartupReentrySecurityRequest): string {
  return [
    'startup-reentry-security',
    request.mode,
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.snapshots.runtimeSnapshotId,
    request.snapshots.recoverySnapshotId,
    request.snapshots.startupSnapshotId,
  ].join(':');
}

function validateRequest(
  request: StartupReentrySecurityRequest,
  startupSecurityReportId: string,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(startupSecurityReportId)) {
    failures.push(FAILURE_STARTUP_SECURITY_REPORT_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }
  if (!request.runtimeReady) {
    failures.push(FAILURE_RUNTIME_NOT_READY);
  }
  if (!isNonEmptyString(request.snapshots.runtimeSnapshotId)) {
    failures.push(FAILURE_RUNTIME_SNAPSHOT_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.snapshots.recoverySnapshotId)) {
    failures.push(FAILURE_RECOVERY_SNAPSHOT_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.snapshots.startupSnapshotId)) {
    failures.push(FAILURE_STARTUP_SNAPSHOT_ID_REQUIRED);
  }

  const contextChecks: Array<readonly [string, string, string]> = [
    [request.botInventoryRequest.correlationId, request.correlationId, 'BOT_CORRELATION_ID'],
    [request.botInventoryRequest.transactionId, request.transactionId, 'BOT_TRANSACTION_ID'],
    [request.botInventoryRequest.guildId, request.guildId, 'BOT_GUILD_ID'],
    [request.botInventoryRequest.runtimeId, request.runtimeId, 'BOT_RUNTIME_ID'],
    [request.webhookReconciliationRequest.correlationId, request.correlationId, 'WEBHOOK_CORRELATION_ID'],
    [request.integrationReconciliationRequest.correlationId, request.correlationId, 'INTEGRATION_CORRELATION_ID'],
    [request.permissionReconciliationRequest.correlationId, request.correlationId, 'PERMISSION_CORRELATION_ID'],
    [request.recoverySnapshotValidationRequest.correlationId, request.correlationId, 'RECOVERY_CORRELATION_ID'],
    [request.webhookReconciliationRequest.transactionId, request.transactionId, 'WEBHOOK_TRANSACTION_ID'],
    [request.integrationReconciliationRequest.transactionId, request.transactionId, 'INTEGRATION_TRANSACTION_ID'],
    [request.permissionReconciliationRequest.transactionId, request.transactionId, 'PERMISSION_TRANSACTION_ID'],
    [request.recoverySnapshotValidationRequest.transactionId, request.transactionId, 'RECOVERY_TRANSACTION_ID'],
    [request.webhookReconciliationRequest.guildId, request.guildId, 'WEBHOOK_GUILD_ID'],
    [request.integrationReconciliationRequest.guildId, request.guildId, 'INTEGRATION_GUILD_ID'],
    [request.permissionReconciliationRequest.guildId, request.guildId, 'PERMISSION_GUILD_ID'],
    [request.recoverySnapshotValidationRequest.guildId, request.guildId, 'RECOVERY_GUILD_ID'],
    [request.webhookReconciliationRequest.runtimeId, request.runtimeId, 'WEBHOOK_RUNTIME_ID'],
    [request.integrationReconciliationRequest.runtimeId, request.runtimeId, 'INTEGRATION_RUNTIME_ID'],
    [request.permissionReconciliationRequest.runtimeId, request.runtimeId, 'PERMISSION_RUNTIME_ID'],
    [request.recoverySnapshotValidationRequest.runtimeId, request.runtimeId, 'RECOVERY_RUNTIME_ID'],
    [request.recoverySnapshotValidationRequest.runtimeSnapshotId, request.snapshots.runtimeSnapshotId, 'RUNTIME_SNAPSHOT_ID'],
    [request.recoverySnapshotValidationRequest.recoverySnapshotId, request.snapshots.recoverySnapshotId, 'RECOVERY_SNAPSHOT_ID'],
    [request.recoverySnapshotValidationRequest.startupSnapshotId, request.snapshots.startupSnapshotId, 'STARTUP_SNAPSHOT_ID'],
  ];

  for (const [value, expected, key] of contextChecks) {
    if (value !== expected) {
      failures.push(`${FAILURE_REQUEST_CONTEXT_MISMATCH}:${key}`);
    }
  }

  return Object.freeze(failures);
}

function createFailureFinding(
  request: StartupReentrySecurityRequest,
  startupSecurityReportId: string,
  failureReason: string,
): SecurityReconciliationFinding {
  return freezeFinding({
    findingId: `${startupSecurityReportId}:finding:${SecurityReconciliationFindingType.SNAPSHOT_MISMATCH}:startup-failure`,
    type: SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
    severity: SecurityReconciliationFindingSeverity.CRITICAL,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    correlationId: request.correlationId,
    targetId: 'startup-reentry-security-coordinator',
    summary: `Startup re-entry shield failed closed: ${failureReason}`,
    metadata: Object.freeze({ source: 'startup-validation-gate' }),
  });
}

function buildFailureReport(
  request: StartupReentrySecurityRequest,
  startupSecurityReportId: string,
  stagesCompleted: readonly StartupReentrySecurityStage[],
  componentStatuses: readonly StartupReentryComponentStatus[],
  findings: readonly SecurityReconciliationFinding[],
  failureReason: string,
  startedAtMs: number,
): StartupReentrySecurityReport {
  return freezeReport({
    startupSecurityReportId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    mode: request.mode,
    stagesCompleted,
    findings,
    componentStatuses,
    verificationOutcome: StartupReentryVerificationOutcome.FAILED,
    success: false,
    startupBlocked: true,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-startup-reentry-security-coordinator' as const,
      deterministicStartupSecurityReportId: true as const,
      replayProtectionEnabled: true as const,
      reentryShieldMode: 'STARTUP_RECONNECT_ONLY' as const,
      runtimeSnapshotId: request.snapshots.runtimeSnapshotId,
      recoverySnapshotId: request.snapshots.recoverySnapshotId,
      startupSnapshotId: request.snapshots.startupSnapshotId,
    }),
  });
}

function isBotVerificationSuccess(report: SecurityBotInventoryReconciliationReport): boolean {
  return (
    report.success &&
    report.verificationOutcome === SecurityBotInventoryReconciliationVerificationOutcome.VERIFIED
  );
}

function isContractVerificationSuccess(report: StartupContractReconciliationReport): boolean {
  return report.success && report.verificationOutcome === StartupReentryVerificationOutcome.VERIFIED;
}

function isRecoveryVerificationSuccess(report: StartupRecoverySnapshotValidationReport): boolean {
  return report.success && report.verificationOutcome === StartupReentryVerificationOutcome.VERIFIED;
}

export class InMemoryStartupReentrySecurityCoordinator
  implements StartupReentrySecurityCoordinator
{
  private readonly completedReports = new Map<string, StartupReentrySecurityReport>();
  private readonly activeExecutions = new Set<string>();
  private readonly now: () => number;

  constructor(
    private readonly botInventoryReconciler: SecurityBotInventoryReconciler,
    private readonly webhookInventoryReconciler: StartupContractReconciler,
    private readonly integrationReconciler: StartupContractReconciler,
    private readonly permissionReconciler: StartupContractReconciler,
    private readonly recoverySnapshotVerifier: StartupRecoverySnapshotVerifier,
    options?: {
      readonly now?: () => number;
    },
  ) {
    this.now = options?.now ?? (() => Date.now());
  }

  async execute(request: StartupReentrySecurityRequest): Promise<StartupReentrySecurityReport> {
    const frozenRequest = freezeStartupReentrySecurityRequest(request);
    const startupSecurityReportId =
      frozenRequest.startupSecurityReportId ?? toDeterministicStartupSecurityReportId(frozenRequest);
    const startedAtMs = this.now();

    const cached = this.completedReports.get(startupSecurityReportId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    if (this.activeExecutions.has(startupSecurityReportId)) {
      const duplicateBlocked = buildFailureReport(
        frozenRequest,
        startupSecurityReportId,
        Object.freeze([
          StartupReentrySecurityStage.RUNTIME_READY,
          StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT,
        ]),
        Object.freeze([]),
        Object.freeze([
          createFailureFinding(
            frozenRequest,
            startupSecurityReportId,
            FAILURE_DUPLICATE_EXECUTION_BLOCKED,
          ),
        ]),
        FAILURE_DUPLICATE_EXECUTION_BLOCKED,
        startedAtMs,
      );
      return duplicateBlocked;
    }

    this.activeExecutions.add(startupSecurityReportId);
    try {
      const stagesCompleted: StartupReentrySecurityStage[] = [];
      const findings: SecurityReconciliationFinding[] = [];
      const componentStatuses: StartupReentryComponentStatus[] = [];

      stagesCompleted.push(StartupReentrySecurityStage.RUNTIME_READY);
      const validationFailures = validateRequest(frozenRequest, startupSecurityReportId);
      if (validationFailures.length > 0) {
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        const failureReason = validationFailures.join(',');
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.ENTER_REENTRY_SHIELD);

      stagesCompleted.push(StartupReentrySecurityStage.SNAPSHOT_VALIDATION);

      stagesCompleted.push(StartupReentrySecurityStage.BOT_INVENTORY_RECONCILIATION);
      const botReport = await this.botInventoryReconciler.execute(frozenRequest.botInventoryRequest);
      componentStatuses.push(
        freezeComponentStatus({
          componentId: botReport.reconciliationId,
          success: botReport.success,
          verificationOutcome: botReport.success
            ? StartupReentryVerificationOutcome.VERIFIED
            : StartupReentryVerificationOutcome.FAILED,
          failureReason: botReport.failureReason,
        }),
      );
      findings.push(...botReport.findings.map((entry) => freezeFinding(entry)));
      if (!isBotVerificationSuccess(botReport)) {
        const failureReason = `${FAILURE_BOT_RECONCILIATION_FAILED}:${botReport.failureReason ?? FAILURE_SECURITY_VERIFICATION_GATE_FAILED}`;
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.WEBHOOK_INVENTORY_RECONCILIATION);
      const webhookReport = await this.webhookInventoryReconciler.execute(
        frozenRequest.webhookReconciliationRequest,
      );
      componentStatuses.push(
        freezeComponentStatus({
          componentId: webhookReport.reconciliationId,
          success: webhookReport.success,
          verificationOutcome: webhookReport.verificationOutcome,
          failureReason: webhookReport.failureReason,
        }),
      );
      findings.push(...webhookReport.findings.map((entry) => freezeFinding(entry)));
      if (!isContractVerificationSuccess(webhookReport)) {
        const failureReason = `${FAILURE_WEBHOOK_RECONCILIATION_FAILED}:${webhookReport.failureReason ?? FAILURE_SECURITY_VERIFICATION_GATE_FAILED}`;
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.INTEGRATION_RECONCILIATION);
      const integrationReport = await this.integrationReconciler.execute(
        frozenRequest.integrationReconciliationRequest,
      );
      componentStatuses.push(
        freezeComponentStatus({
          componentId: integrationReport.reconciliationId,
          success: integrationReport.success,
          verificationOutcome: integrationReport.verificationOutcome,
          failureReason: integrationReport.failureReason,
        }),
      );
      findings.push(...integrationReport.findings.map((entry) => freezeFinding(entry)));
      if (!isContractVerificationSuccess(integrationReport)) {
        const failureReason = `${FAILURE_INTEGRATION_RECONCILIATION_FAILED}:${integrationReport.failureReason ?? FAILURE_SECURITY_VERIFICATION_GATE_FAILED}`;
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION);
      const permissionReport = await this.permissionReconciler.execute(
        frozenRequest.permissionReconciliationRequest,
      );
      componentStatuses.push(
        freezeComponentStatus({
          componentId: permissionReport.reconciliationId,
          success: permissionReport.success,
          verificationOutcome: permissionReport.verificationOutcome,
          failureReason: permissionReport.failureReason,
        }),
      );
      findings.push(...permissionReport.findings.map((entry) => freezeFinding(entry)));
      if (!isContractVerificationSuccess(permissionReport)) {
        const failureReason = `${FAILURE_PERMISSION_RECONCILIATION_FAILED}:${permissionReport.failureReason ?? FAILURE_SECURITY_VERIFICATION_GATE_FAILED}`;
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.RECOVERY_SNAPSHOT_VALIDATION);
      const recoveryValidationReport = await this.recoverySnapshotVerifier.validate(
        frozenRequest.recoverySnapshotValidationRequest,
      );
      componentStatuses.push(
        freezeComponentStatus({
          componentId: recoveryValidationReport.validationId,
          success: recoveryValidationReport.success,
          verificationOutcome: recoveryValidationReport.verificationOutcome,
          failureReason: recoveryValidationReport.failureReason,
        }),
      );
      if (!isRecoveryVerificationSuccess(recoveryValidationReport)) {
        const failureReason = `${FAILURE_RECOVERY_SNAPSHOT_VALIDATION_FAILED}:${recoveryValidationReport.failureReason ?? FAILURE_SECURITY_VERIFICATION_GATE_FAILED}`;
        findings.push(createFailureFinding(frozenRequest, startupSecurityReportId, failureReason));
        stagesCompleted.push(StartupReentrySecurityStage.AGGREGATE_FINDINGS);
        stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
        stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);
        const failed = buildFailureReport(
          frozenRequest,
          startupSecurityReportId,
          Object.freeze(stagesCompleted),
          Object.freeze(componentStatuses),
          Object.freeze(findings),
          failureReason,
          startedAtMs,
        );
        this.completedReports.set(startupSecurityReportId, failed);
        return failed;
      }

      stagesCompleted.push(StartupReentrySecurityStage.AGGREGATE_FINDINGS);
      const orderedFindings = Object.freeze(
        [...findings].sort((left, right) => left.findingId.localeCompare(right.findingId)).map((entry) => freezeFinding(entry)),
      );

      stagesCompleted.push(StartupReentrySecurityStage.PRODUCE_STARTUP_SECURITY_REPORT);
      stagesCompleted.push(StartupReentrySecurityStage.EXIT_REENTRY_SHIELD);

      const report = freezeReport({
        startupSecurityReportId,
        correlationId: frozenRequest.correlationId,
        transactionId: frozenRequest.transactionId,
        guildId: frozenRequest.guildId,
        runtimeId: frozenRequest.runtimeId,
        mode: frozenRequest.mode,
        stagesCompleted: Object.freeze(stagesCompleted),
        findings: orderedFindings,
        componentStatuses: Object.freeze(componentStatuses),
        verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
        success: true,
        startupBlocked: false,
        failureReason: undefined,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(this.now()).toISOString(),
        durationMs: Math.max(0, this.now() - startedAtMs),
        metadata: Object.freeze({
          source: 'in-memory-startup-reentry-security-coordinator' as const,
          deterministicStartupSecurityReportId: true as const,
          replayProtectionEnabled: true as const,
          reentryShieldMode: 'STARTUP_RECONNECT_ONLY' as const,
          runtimeSnapshotId: frozenRequest.snapshots.runtimeSnapshotId,
          recoverySnapshotId: frozenRequest.snapshots.recoverySnapshotId,
          startupSnapshotId: frozenRequest.snapshots.startupSnapshotId,
        }),
      });

      this.completedReports.set(startupSecurityReportId, report);
      return report;
    } finally {
      this.activeExecutions.delete(startupSecurityReportId);
    }
  }
}
