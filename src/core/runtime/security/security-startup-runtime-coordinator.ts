import {
  InMemorySecurityStartupExecutionDispatcher,
  SecurityStartupExecutionDispatcher,
  SecurityStartupExecutionDispatchReport,
  SecurityStartupExecutionDispatchVerificationOutcome,
} from './security-startup-execution-dispatcher';
import {
  InMemorySecurityStartupExecutionPlanningEngine,
  SecurityStartupExecutionPlanningEngine,
  SecurityStartupExecutionPlanningReport,
  SecurityStartupExecutionPlanningVerificationOutcome,
} from './security-startup-execution-planning-engine';
import {
  SecurityStartupReconciliationPipeline,
  SecurityStartupReconciliationPipelineRequest,
  SecurityStartupReconciliationPipelineReport,
  SecurityStartupReconciliationPipelineVerificationOutcome,
} from './security-startup-reconciliation-pipeline';
import {
  StartupReentrySecurityCoordinator,
  StartupReentrySecurityReport,
  StartupReentrySecurityRequest,
  StartupReentryVerificationOutcome,
} from './startup-reentry-security-coordinator';

export enum SecurityStartupRuntimeCoordinationStage {
  COORDINATION_VALIDATION = 'COORDINATION_VALIDATION',
  STARTUP_REENTRY_SECURITY_COORDINATION = 'STARTUP_REENTRY_SECURITY_COORDINATION',
  STARTUP_RECONCILIATION_PIPELINE = 'STARTUP_RECONCILIATION_PIPELINE',
  STARTUP_EXECUTION_PLANNING = 'STARTUP_EXECUTION_PLANNING',
  STARTUP_EXECUTION_DISPATCH = 'STARTUP_EXECUTION_DISPATCH',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityStartupRuntimeCoordinationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityStartupRuntimeCoordinationRequest {
  readonly coordinatorId?: string;
  readonly planningId?: string;
  readonly dispatchId?: string;
  readonly startupReentrySecurityRequest: StartupReentrySecurityRequest;
  readonly startupReconciliationPipelineRequest: SecurityStartupReconciliationPipelineRequest;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityStartupRuntimeCoordinationReport {
  readonly coordinatorId: string;
  readonly startupSecurityReportId: string;
  readonly pipelineId: string;
  readonly planningId: string;
  readonly dispatchId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly startupReentrySecurityReport?: StartupReentrySecurityReport;
  readonly startupReconciliationPipelineReport?: SecurityStartupReconciliationPipelineReport;
  readonly startupExecutionPlanningReport?: SecurityStartupExecutionPlanningReport;
  readonly startupExecutionDispatchReport?: SecurityStartupExecutionDispatchReport;
  readonly stagesCompleted: readonly SecurityStartupRuntimeCoordinationStage[];
  readonly verificationOutcome: SecurityStartupRuntimeCoordinationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-startup-runtime-coordinator';
    readonly deterministicCoordinatorId: true;
    readonly startupWorkflowOrderEnforced: true;
    readonly stageVerificationEnforced: true;
    readonly startupSecurityReportIdPreserved: boolean;
    readonly pipelineIdPreserved: boolean;
    readonly planningIdPreserved: boolean;
    readonly dispatchIdPreserved: boolean;
  };
}

export interface SecurityStartupRuntimeCoordinator {
  coordinate(
    request: SecurityStartupRuntimeCoordinationRequest,
  ): Promise<SecurityStartupRuntimeCoordinationReport>;
}

const FAILURE_COORDINATOR_ID_REQUIRED = 'COORDINATOR_ID_REQUIRED';
const FAILURE_PLANNING_ID_REQUIRED = 'PLANNING_ID_REQUIRED';
const FAILURE_DISPATCH_ID_REQUIRED = 'DISPATCH_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_REQUEST_CONTEXT_MISMATCH = 'REQUEST_CONTEXT_MISMATCH';
const FAILURE_STARTUP_REENTRY_NOT_VERIFIED = 'STARTUP_REENTRY_NOT_VERIFIED';
const FAILURE_STARTUP_PIPELINE_NOT_VERIFIED = 'STARTUP_PIPELINE_NOT_VERIFIED';
const FAILURE_STARTUP_PLANNING_NOT_VERIFIED = 'STARTUP_PLANNING_NOT_VERIFIED';
const FAILURE_STARTUP_DISPATCH_NOT_VERIFIED = 'STARTUP_DISPATCH_NOT_VERIFIED';
const FAILURE_CROSS_STAGE_VERIFICATION_FAILED = 'CROSS_STAGE_VERIFICATION_FAILED';

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

export function freezeSecurityStartupRuntimeCoordinationRequest(
  request: SecurityStartupRuntimeCoordinationRequest,
): SecurityStartupRuntimeCoordinationRequest {
  return deepFreeze({
    ...request,
    startupReentrySecurityRequest: deepFreeze({
      ...request.startupReentrySecurityRequest,
      snapshots: deepFreeze({ ...request.startupReentrySecurityRequest.snapshots }),
      botInventoryRequest: deepFreeze({ ...request.startupReentrySecurityRequest.botInventoryRequest }),
      webhookReconciliationRequest: deepFreeze({
        ...request.startupReentrySecurityRequest.webhookReconciliationRequest,
      }),
      integrationReconciliationRequest: deepFreeze({
        ...request.startupReentrySecurityRequest.integrationReconciliationRequest,
      }),
      permissionReconciliationRequest: deepFreeze({
        ...request.startupReentrySecurityRequest.permissionReconciliationRequest,
      }),
      recoverySnapshotValidationRequest: deepFreeze({
        ...request.startupReentrySecurityRequest.recoverySnapshotValidationRequest,
      }),
      metadata: request.startupReentrySecurityRequest.metadata
        ? Object.freeze({ ...request.startupReentrySecurityRequest.metadata })
        : undefined,
    }),
    startupReconciliationPipelineRequest: deepFreeze({
      ...request.startupReconciliationPipelineRequest,
      botInventoryRequest: deepFreeze({ ...request.startupReconciliationPipelineRequest.botInventoryRequest }),
      webhookInventoryRequest: deepFreeze({
        ...request.startupReconciliationPipelineRequest.webhookInventoryRequest,
      }),
      integrationInventoryRequest: deepFreeze({
        ...request.startupReconciliationPipelineRequest.integrationInventoryRequest,
      }),
      permissionRoleStateRequest: deepFreeze({
        ...request.startupReconciliationPipelineRequest.permissionRoleStateRequest,
      }),
      metadata: request.startupReconciliationPipelineRequest.metadata
        ? Object.freeze({ ...request.startupReconciliationPipelineRequest.metadata })
        : undefined,
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityStartupRuntimeCoordinationReport,
): SecurityStartupRuntimeCoordinationReport {
  return deepFreeze({
    ...report,
    startupReentrySecurityReport: report.startupReentrySecurityReport
      ? deepFreeze(report.startupReentrySecurityReport)
      : undefined,
    startupReconciliationPipelineReport: report.startupReconciliationPipelineReport
      ? deepFreeze(report.startupReconciliationPipelineReport)
      : undefined,
    startupExecutionPlanningReport: report.startupExecutionPlanningReport
      ? deepFreeze(report.startupExecutionPlanningReport)
      : undefined,
    startupExecutionDispatchReport: report.startupExecutionDispatchReport
      ? deepFreeze(report.startupExecutionDispatchReport)
      : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicCoordinatorId(
  request: SecurityStartupRuntimeCoordinationRequest,
): string {
  const reentry = request.startupReentrySecurityRequest;
  const pipeline = request.startupReconciliationPipelineRequest;
  return [
    'security-startup-runtime-coordinator',
    reentry.runtimeId,
    reentry.guildId,
    reentry.transactionId,
    reentry.correlationId,
    reentry.mode,
    reentry.snapshots.runtimeSnapshotId,
    reentry.snapshots.recoverySnapshotId,
    reentry.snapshots.startupSnapshotId,
    pipeline.botInventoryRequest.runtimeSnapshot.snapshotId,
    pipeline.webhookInventoryRequest.runtimeSnapshot.snapshotId,
    pipeline.integrationInventoryRequest.runtimeSnapshot.snapshotId,
    pipeline.permissionRoleStateRequest.runtimeSnapshot.snapshotId,
    pipeline.pipelineId ?? 'auto-pipeline-id',
    request.planningId ?? 'auto-planning-id',
    request.dispatchId ?? 'auto-dispatch-id',
  ].join(':');
}

function validateRequest(
  request: SecurityStartupRuntimeCoordinationRequest,
  coordinatorId: string,
): readonly string[] {
  const failures: string[] = [];
  const startup = request.startupReentrySecurityRequest;
  const pipeline = request.startupReconciliationPipelineRequest;

  if (!isNonEmptyString(coordinatorId)) {
    failures.push(FAILURE_COORDINATOR_ID_REQUIRED);
  }
  if (request.planningId !== undefined && !isNonEmptyString(request.planningId)) {
    failures.push(FAILURE_PLANNING_ID_REQUIRED);
  }
  if (request.dispatchId !== undefined && !isNonEmptyString(request.dispatchId)) {
    failures.push(FAILURE_DISPATCH_ID_REQUIRED);
  }
  if (!isNonEmptyString(startup.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(startup.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }
  if (!isNonEmptyString(startup.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }
  if (!isNonEmptyString(startup.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (
    startup.correlationId !== pipeline.correlationId ||
    startup.transactionId !== pipeline.transactionId ||
    startup.runtimeId !== pipeline.runtimeId ||
    startup.guildId !== pipeline.guildId
  ) {
    failures.push(FAILURE_REQUEST_CONTEXT_MISMATCH);
  }

  return Object.freeze(failures);
}

function verifyCrossStageIdentities(
  request: SecurityStartupRuntimeCoordinationRequest,
  startupReport: StartupReentrySecurityReport,
  pipelineReport: SecurityStartupReconciliationPipelineReport,
  planningReport: SecurityStartupExecutionPlanningReport,
  dispatchReport: SecurityStartupExecutionDispatchReport,
): readonly string[] {
  const failures: string[] = [];

  if (
    startupReport.correlationId !== request.startupReentrySecurityRequest.correlationId ||
    startupReport.transactionId !== request.startupReentrySecurityRequest.transactionId ||
    startupReport.runtimeId !== request.startupReentrySecurityRequest.runtimeId ||
    startupReport.guildId !== request.startupReentrySecurityRequest.guildId
  ) {
    failures.push('STARTUP_IDENTITY_MISMATCH');
  }

  if (
    pipelineReport.correlationId !== request.startupReconciliationPipelineRequest.correlationId ||
    pipelineReport.transactionId !== request.startupReconciliationPipelineRequest.transactionId ||
    pipelineReport.runtimeId !== request.startupReconciliationPipelineRequest.runtimeId ||
    pipelineReport.guildId !== request.startupReconciliationPipelineRequest.guildId ||
    pipelineReport.pipelineId !==
      (request.startupReconciliationPipelineRequest.pipelineId ?? pipelineReport.pipelineId)
  ) {
    failures.push('PIPELINE_IDENTITY_MISMATCH');
  }

  if (planningReport.pipelineId !== pipelineReport.pipelineId) {
    failures.push('PLANNING_PIPELINE_MISMATCH');
  }

  if (
    planningReport.correlationId !== pipelineReport.correlationId ||
    planningReport.transactionId !== pipelineReport.transactionId ||
    planningReport.runtimeId !== pipelineReport.runtimeId ||
    planningReport.guildId !== pipelineReport.guildId
  ) {
    failures.push('PLANNING_CONTEXT_MISMATCH');
  }

  if (
    dispatchReport.pipelineId !== pipelineReport.pipelineId ||
    dispatchReport.planningId !== planningReport.planningId ||
    dispatchReport.executionPlanId !== planningReport.executionPlan.planId
  ) {
    failures.push('DISPATCH_IDENTITY_MISMATCH');
  }

  if (
    dispatchReport.correlationId !== planningReport.correlationId ||
    dispatchReport.transactionId !== planningReport.transactionId ||
    dispatchReport.runtimeId !== planningReport.runtimeId ||
    dispatchReport.guildId !== planningReport.guildId
  ) {
    failures.push('DISPATCH_CONTEXT_MISMATCH');
  }

  return Object.freeze(failures);
}

function buildReport(
  request: SecurityStartupRuntimeCoordinationRequest,
  coordinatorId: string,
  stagesCompleted: readonly SecurityStartupRuntimeCoordinationStage[],
  startedAtMs: number,
  success: boolean,
  startupReentrySecurityReport?: StartupReentrySecurityReport,
  startupReconciliationPipelineReport?: SecurityStartupReconciliationPipelineReport,
  startupExecutionPlanningReport?: SecurityStartupExecutionPlanningReport,
  startupExecutionDispatchReport?: SecurityStartupExecutionDispatchReport,
  failureReason?: string,
  idempotentReplay = false,
): SecurityStartupRuntimeCoordinationReport {
  const startup = request.startupReentrySecurityRequest;

  return freezeReport({
    coordinatorId,
    startupSecurityReportId:
      startupReentrySecurityReport?.startupSecurityReportId ??
      startup.startupSecurityReportId ??
      'unresolved-startup-security-report-id',
    pipelineId:
      startupReconciliationPipelineReport?.pipelineId ??
      request.startupReconciliationPipelineRequest.pipelineId ??
      'unresolved-pipeline-id',
    planningId:
      startupExecutionPlanningReport?.planningId ??
      request.planningId ??
      'unresolved-planning-id',
    dispatchId:
      startupExecutionDispatchReport?.dispatchId ??
      request.dispatchId ??
      'unresolved-dispatch-id',
    correlationId: startup.correlationId,
    transactionId: startup.transactionId,
    runtimeId: startup.runtimeId,
    guildId: startup.guildId,
    startupReentrySecurityReport,
    startupReconciliationPipelineReport,
    startupExecutionPlanningReport,
    startupExecutionDispatchReport,
    stagesCompleted,
    verificationOutcome: success
      ? SecurityStartupRuntimeCoordinationVerificationOutcome.VERIFIED
      : SecurityStartupRuntimeCoordinationVerificationOutcome.FAILED,
    success,
    failureReason,
    idempotentReplay,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-runtime-coordinator' as const,
      deterministicCoordinatorId: true as const,
      startupWorkflowOrderEnforced: true as const,
      stageVerificationEnforced: true as const,
      startupSecurityReportIdPreserved: startupReentrySecurityReport !== undefined,
      pipelineIdPreserved: startupReconciliationPipelineReport !== undefined,
      planningIdPreserved: startupExecutionPlanningReport !== undefined,
      dispatchIdPreserved: startupExecutionDispatchReport !== undefined,
    }),
  });
}

export class InMemorySecurityStartupRuntimeCoordinator
  implements SecurityStartupRuntimeCoordinator
{
  private readonly completedReports = new Map<string, SecurityStartupRuntimeCoordinationReport>();

  constructor(
    private readonly startupReentrySecurityCoordinator: StartupReentrySecurityCoordinator,
    private readonly startupReconciliationPipeline: SecurityStartupReconciliationPipeline,
    private readonly startupExecutionPlanningEngine: SecurityStartupExecutionPlanningEngine =
      new InMemorySecurityStartupExecutionPlanningEngine(),
    private readonly startupExecutionDispatcher: SecurityStartupExecutionDispatcher =
      new InMemorySecurityStartupExecutionDispatcher(),
  ) {}

  async coordinate(
    request: SecurityStartupRuntimeCoordinationRequest,
  ): Promise<SecurityStartupRuntimeCoordinationReport> {
    const frozenRequest = freezeSecurityStartupRuntimeCoordinationRequest(request);
    const coordinatorId = frozenRequest.coordinatorId ?? toDeterministicCoordinatorId(frozenRequest);
    const startedAtMs = Date.now();

    const existing = this.completedReports.get(coordinatorId);
    if (existing) {
      return freezeReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityStartupRuntimeCoordinationStage[] = [];
    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.COORDINATION_VALIDATION);

    const validationFailures = validateRequest(frozenRequest, coordinatorId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        validationFailures.join(','),
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.STARTUP_REENTRY_SECURITY_COORDINATION);
    const startupReentrySecurityReport = deepFreeze(
      await this.startupReentrySecurityCoordinator.execute(
        frozenRequest.startupReentrySecurityRequest,
      ),
    );
    if (
      !startupReentrySecurityReport.success ||
      startupReentrySecurityReport.verificationOutcome !== StartupReentryVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        startupReentrySecurityReport,
        undefined,
        undefined,
        undefined,
        `${FAILURE_STARTUP_REENTRY_NOT_VERIFIED}:${startupReentrySecurityReport.failureReason ?? 'unknown'}`,
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.STARTUP_RECONCILIATION_PIPELINE);
    const startupReconciliationPipelineReport = deepFreeze(
      await this.startupReconciliationPipeline.execute(
        frozenRequest.startupReconciliationPipelineRequest,
      ),
    );
    if (
      !startupReconciliationPipelineReport.success ||
      startupReconciliationPipelineReport.verificationOutcome !==
        SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        startupReentrySecurityReport,
        startupReconciliationPipelineReport,
        undefined,
        undefined,
        `${FAILURE_STARTUP_PIPELINE_NOT_VERIFIED}:${startupReconciliationPipelineReport.failureReason ?? 'unknown'}`,
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.STARTUP_EXECUTION_PLANNING);
    const startupExecutionPlanningReport = deepFreeze(
      await this.startupExecutionPlanningEngine.execute(
        deepFreeze({
          planningId: frozenRequest.planningId,
          startupPipelineReport: startupReconciliationPipelineReport,
          metadata: Object.freeze({
            source: 'security-startup-runtime-coordinator',
            coordinatorId,
          }),
        }),
      ),
    );
    if (
      !startupExecutionPlanningReport.success ||
      startupExecutionPlanningReport.verificationOutcome !==
        SecurityStartupExecutionPlanningVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        startupReentrySecurityReport,
        startupReconciliationPipelineReport,
        startupExecutionPlanningReport,
        undefined,
        `${FAILURE_STARTUP_PLANNING_NOT_VERIFIED}:${startupExecutionPlanningReport.failureReason ?? 'unknown'}`,
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.STARTUP_EXECUTION_DISPATCH);
    const startupExecutionDispatchReport = deepFreeze(
      await this.startupExecutionDispatcher.dispatch(
        deepFreeze({
          dispatchId: frozenRequest.dispatchId,
          startupExecutionPlanningReport,
          metadata: Object.freeze({
            source: 'security-startup-runtime-coordinator',
            coordinatorId,
          }),
        }),
      ),
    );
    if (
      !startupExecutionDispatchReport.success ||
      startupExecutionDispatchReport.verificationOutcome !==
        SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        startupReentrySecurityReport,
        startupReconciliationPipelineReport,
        startupExecutionPlanningReport,
        startupExecutionDispatchReport,
        `${FAILURE_STARTUP_DISPATCH_NOT_VERIFIED}:${startupExecutionDispatchReport.failureReason ?? 'unknown'}`,
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.VERIFICATION);
    const verificationFailures = verifyCrossStageIdentities(
      frozenRequest,
      startupReentrySecurityReport,
      startupReconciliationPipelineReport,
      startupExecutionPlanningReport,
      startupExecutionDispatchReport,
    );

    stagesCompleted.push(SecurityStartupRuntimeCoordinationStage.REPORT_GENERATION);
    if (verificationFailures.length > 0) {
      const failure = buildReport(
        frozenRequest,
        coordinatorId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        startupReentrySecurityReport,
        startupReconciliationPipelineReport,
        startupExecutionPlanningReport,
        startupExecutionDispatchReport,
        `${FAILURE_CROSS_STAGE_VERIFICATION_FAILED}:${verificationFailures.join(',')}`,
      );
      this.completedReports.set(coordinatorId, failure);
      return failure;
    }

    const success = buildReport(
      frozenRequest,
      coordinatorId,
      Object.freeze(stagesCompleted),
      startedAtMs,
      true,
      startupReentrySecurityReport,
      startupReconciliationPipelineReport,
      startupExecutionPlanningReport,
      startupExecutionDispatchReport,
    );
    this.completedReports.set(coordinatorId, success);
    return success;
  }
}