import {
  InMemoryRecoveryEngine,
  RecoveryEngine,
  RecoveryOperationType,
  RecoveryReport,
  RecoveryRequest,
  RecoveryVerificationOutcome,
} from './recovery-engine';
import {
  InMemoryRecoverySnapshotCoordinator,
  RecoverySnapshotCoordinator,
  RecoverySnapshotPlan,
  RecoverySnapshotReference,
  RecoverySnapshotRequest,
} from './recovery-snapshot-coordinator';
import {
  InMemoryRecoveryRestorationOperation,
  RecoveryRestorationOperation,
  RecoveryRestorationReport,
  RecoveryRestorationRequest,
} from './recovery-restoration-operation';

export enum RecoveryPipelineStage {
  RECOVERY_ENGINE_COORDINATION = 'RECOVERY_ENGINE_COORDINATION',
  SNAPSHOT_COORDINATION = 'SNAPSHOT_COORDINATION',
  RESTORATION_OPERATION = 'RESTORATION_OPERATION',
  PIPELINE_VERIFICATION = 'PIPELINE_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RecoveryPipelineRequest {
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly resourceId: string;
  readonly operationType: RecoveryOperationType;
  readonly initiatedBy?: string;
  readonly requestedAt?: string;
  readonly snapshotReference?: RecoverySnapshotReference;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryPipelineReport {
  readonly pipelineId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly resourceId: string;
  readonly operationType: RecoveryOperationType;
  readonly planId?: string;
  readonly snapshotId?: string;
  readonly snapshotVersion?: number;
  readonly engineReport: RecoveryReport;
  readonly snapshotPlan?: RecoverySnapshotPlan;
  readonly restorationReport?: RecoveryRestorationReport;
  readonly stagesCompleted: readonly RecoveryPipelineStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RecoveryPipeline {
  execute(request: RecoveryPipelineRequest): Promise<RecoveryPipelineReport>;
}

const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RESOURCE_ID_REQUIRED = 'RESOURCE_ID_REQUIRED';
const FAILURE_UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';
const FAILURE_ENGINE_COORDINATION_FAILED = 'ENGINE_COORDINATION_FAILED';
const FAILURE_SNAPSHOT_COORDINATION_FAILED = 'SNAPSHOT_COORDINATION_FAILED';
const FAILURE_RESTORATION_OPERATION_FAILED = 'RESTORATION_OPERATION_FAILED';
const FAILURE_PIPELINE_VERIFICATION_FAILED = 'PIPELINE_VERIFICATION_FAILED';

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

function freezeSnapshotReference(reference: RecoverySnapshotReference): RecoverySnapshotReference {
  return deepFreeze({
    ...reference,
    supportedOperations: Object.freeze([...reference.supportedOperations]),
    metadata: reference.metadata ? Object.freeze({ ...reference.metadata }) : undefined,
  });
}

export function freezeRecoveryPipelineRequest(request: RecoveryPipelineRequest): RecoveryPipelineRequest {
  return deepFreeze({
    ...request,
    snapshotReference: request.snapshotReference
      ? freezeSnapshotReference(request.snapshotReference)
      : undefined,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryPipelineReport(report: RecoveryPipelineReport): RecoveryPipelineReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    engineReport: deepFreeze({
      ...report.engineReport,
      stagesCompleted: Object.freeze([...report.engineReport.stagesCompleted]),
    }),
    snapshotPlan: report.snapshotPlan
      ? deepFreeze({
          ...report.snapshotPlan,
          stagesCompleted: Object.freeze([...report.snapshotPlan.stagesCompleted]),
          validation: deepFreeze({
            ...report.snapshotPlan.validation,
            failures: Object.freeze([...report.snapshotPlan.validation.failures]),
          }),
          metadata: Object.freeze({ ...report.snapshotPlan.metadata }),
        })
      : undefined,
    restorationReport: report.restorationReport
      ? deepFreeze({
          ...report.restorationReport,
          stagesCompleted: Object.freeze([...report.restorationReport.stagesCompleted]),
        })
      : undefined,
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicPipelineKey(request: RecoveryPipelineRequest): string {
  return [
    request.recoveryId,
    request.transactionId,
    request.correlationId,
    request.guildId,
    request.resourceId,
    request.operationType,
    request.snapshotReference?.snapshotId ?? 'missing-snapshot-id',
    String(request.snapshotReference?.snapshotVersion ?? -1),
  ].join('|');
}

function buildDeterministicPipelineId(request: RecoveryPipelineRequest): string {
  return `recovery-pipeline:${buildDeterministicPipelineKey(request)}`;
}

function resolveRequestValidationFailures(request: RecoveryPipelineRequest): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(request.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.resourceId)) {
    failures.push(FAILURE_RESOURCE_ID_REQUIRED);
  }

  if (request.operationType !== RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY) {
    failures.push(FAILURE_UNSUPPORTED_OPERATION);
  }

  return Object.freeze(failures);
}

function buildRecoveryEngineRequest(request: RecoveryPipelineRequest): RecoveryRequest {
  return Object.freeze({
    recoveryId: request.recoveryId,
    transactionId: request.transactionId,
    correlationId: request.correlationId,
    guildId: request.guildId,
    operationType: request.operationType,
    initiatedBy: request.initiatedBy ?? 'guardian-recovery-pipeline',
    requestedAt: request.requestedAt ?? '1970-01-01T00:00:00.000Z',
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function buildSnapshotRequest(request: RecoveryPipelineRequest): RecoverySnapshotRequest {
  return Object.freeze({
    recoveryId: request.recoveryId,
    transactionId: request.transactionId,
    correlationId: request.correlationId,
    guildId: request.guildId,
    resourceId: request.resourceId,
    operationType: request.operationType,
    snapshotReference: request.snapshotReference
      ? freezeSnapshotReference(request.snapshotReference)
      : undefined,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function buildRestorationRequest(
  request: RecoveryPipelineRequest,
  plan: RecoverySnapshotPlan,
): RecoveryRestorationRequest {
  return Object.freeze({
    recoveryId: request.recoveryId,
    transactionId: request.transactionId,
    correlationId: request.correlationId,
    plan,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function resolveVerificationFailures(
  request: RecoveryPipelineRequest,
  engineReport: RecoveryReport,
  snapshotPlan: RecoverySnapshotPlan,
  restorationReport: RecoveryRestorationReport,
): readonly string[] {
  const failures: string[] = [];

  if (!engineReport.success) {
    failures.push(FAILURE_ENGINE_COORDINATION_FAILED);
  }

  if (snapshotPlan.validation.valid !== true) {
    failures.push(FAILURE_SNAPSHOT_COORDINATION_FAILED);
  }

  if (!restorationReport.success) {
    failures.push(FAILURE_RESTORATION_OPERATION_FAILED);
  }

  if (engineReport.recoveryId !== request.recoveryId) {
    failures.push('ENGINE_RECOVERY_ID_MISMATCH');
  }

  if (engineReport.transactionId !== request.transactionId) {
    failures.push('ENGINE_TRANSACTION_ID_MISMATCH');
  }

  if (engineReport.correlationId !== request.correlationId) {
    failures.push('ENGINE_CORRELATION_ID_MISMATCH');
  }

  if (snapshotPlan.recoveryId !== request.recoveryId) {
    failures.push('PLAN_RECOVERY_ID_MISMATCH');
  }

  if (snapshotPlan.transactionId !== request.transactionId) {
    failures.push('PLAN_TRANSACTION_ID_MISMATCH');
  }

  if (snapshotPlan.correlationId !== request.correlationId) {
    failures.push('PLAN_CORRELATION_ID_MISMATCH');
  }

  if (snapshotPlan.guildId !== request.guildId) {
    failures.push('PLAN_GUILD_ID_MISMATCH');
  }

  if (snapshotPlan.resourceId !== request.resourceId) {
    failures.push('PLAN_RESOURCE_ID_MISMATCH');
  }

  if (snapshotPlan.operationType !== request.operationType) {
    failures.push('PLAN_OPERATION_TYPE_MISMATCH');
  }

  if (restorationReport.recoveryId !== request.recoveryId) {
    failures.push('RESTORATION_RECOVERY_ID_MISMATCH');
  }

  if (restorationReport.transactionId !== request.transactionId) {
    failures.push('RESTORATION_TRANSACTION_ID_MISMATCH');
  }

  if (restorationReport.correlationId !== request.correlationId) {
    failures.push('RESTORATION_CORRELATION_ID_MISMATCH');
  }

  if (restorationReport.planId !== snapshotPlan.planId) {
    failures.push('RESTORATION_PLAN_ID_MISMATCH');
  }

  if (restorationReport.snapshotId !== snapshotPlan.snapshotId) {
    failures.push('RESTORATION_SNAPSHOT_ID_MISMATCH');
  }

  if (restorationReport.snapshotVersion !== snapshotPlan.snapshotVersion) {
    failures.push('RESTORATION_SNAPSHOT_VERSION_MISMATCH');
  }

  return Object.freeze(failures);
}

export class InMemoryRecoveryPipeline implements RecoveryPipeline {
  private readonly completedPipelines = new Map<string, RecoveryPipelineReport>();

  constructor(
    private readonly recoveryEngine: RecoveryEngine = new InMemoryRecoveryEngine(),
    private readonly snapshotCoordinator: RecoverySnapshotCoordinator =
      new InMemoryRecoverySnapshotCoordinator(),
    private readonly restorationOperation: RecoveryRestorationOperation =
      new InMemoryRecoveryRestorationOperation(),
  ) {}

  async execute(request: RecoveryPipelineRequest): Promise<RecoveryPipelineReport> {
    const frozenRequest = freezeRecoveryPipelineRequest(request);
    const startedAtMs = Date.now();
    const pipelineId = buildDeterministicPipelineId(frozenRequest);

    const existing = this.completedPipelines.get(pipelineId);
    if (existing) {
      return freezeRecoveryPipelineReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryPipelineStage[] = [];
    const requestFailures = resolveRequestValidationFailures(frozenRequest);

    if (requestFailures.length > 0) {
      stagesCompleted.push(RecoveryPipelineStage.REPORT_GENERATION);
      const report = freezeRecoveryPipelineReport({
        pipelineId,
        recoveryId: frozenRequest.recoveryId,
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        guildId: frozenRequest.guildId,
        resourceId: frozenRequest.resourceId,
        operationType: frozenRequest.operationType,
        engineReport: deepFreeze({
          transactionId: frozenRequest.transactionId,
          correlationId: frozenRequest.correlationId,
          recoveryId: frozenRequest.recoveryId,
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date(Date.now()).toISOString(),
          durationMs: Math.max(0, Date.now() - startedAtMs),
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          success: false,
          failureReason: requestFailures.join(','),
          idempotentReplay: false,
        }),
        stagesCompleted: Object.freeze(stagesCompleted),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason: requestFailures.join(','),
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
      });
      this.completedPipelines.set(pipelineId, report);
      return report;
    }

    stagesCompleted.push(RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION);
    const engineReport = await this.recoveryEngine.execute(
      buildRecoveryEngineRequest(frozenRequest),
    );

    if (!engineReport.success) {
      stagesCompleted.push(RecoveryPipelineStage.REPORT_GENERATION);
      const report = freezeRecoveryPipelineReport({
        pipelineId,
        recoveryId: frozenRequest.recoveryId,
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        guildId: frozenRequest.guildId,
        resourceId: frozenRequest.resourceId,
        operationType: frozenRequest.operationType,
        engineReport,
        stagesCompleted: Object.freeze(stagesCompleted),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason:
          `${FAILURE_ENGINE_COORDINATION_FAILED}:${engineReport.failureReason ?? 'unknown'}`,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
      });
      this.completedPipelines.set(pipelineId, report);
      return report;
    }

    stagesCompleted.push(RecoveryPipelineStage.SNAPSHOT_COORDINATION);
    const snapshotPlan = this.snapshotCoordinator.coordinate(buildSnapshotRequest(frozenRequest));

    if (snapshotPlan.validation.valid !== true) {
      stagesCompleted.push(RecoveryPipelineStage.REPORT_GENERATION);
      const report = freezeRecoveryPipelineReport({
        pipelineId,
        recoveryId: frozenRequest.recoveryId,
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        guildId: frozenRequest.guildId,
        resourceId: frozenRequest.resourceId,
        operationType: frozenRequest.operationType,
        planId: snapshotPlan.planId,
        snapshotId: snapshotPlan.snapshotId,
        snapshotVersion: snapshotPlan.snapshotVersion,
        engineReport,
        snapshotPlan,
        stagesCompleted: Object.freeze(stagesCompleted),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason:
          `${FAILURE_SNAPSHOT_COORDINATION_FAILED}:${snapshotPlan.validation.failures.join(',')}`,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
      });
      this.completedPipelines.set(pipelineId, report);
      return report;
    }

    stagesCompleted.push(RecoveryPipelineStage.RESTORATION_OPERATION);
    const restorationReport = this.restorationOperation.execute(
      buildRestorationRequest(frozenRequest, snapshotPlan),
    );

    if (!restorationReport.success) {
      stagesCompleted.push(RecoveryPipelineStage.REPORT_GENERATION);
      const report = freezeRecoveryPipelineReport({
        pipelineId,
        recoveryId: frozenRequest.recoveryId,
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        guildId: frozenRequest.guildId,
        resourceId: frozenRequest.resourceId,
        operationType: frozenRequest.operationType,
        planId: snapshotPlan.planId,
        snapshotId: snapshotPlan.snapshotId,
        snapshotVersion: snapshotPlan.snapshotVersion,
        engineReport,
        snapshotPlan,
        restorationReport,
        stagesCompleted: Object.freeze(stagesCompleted),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason:
          `${FAILURE_RESTORATION_OPERATION_FAILED}:${restorationReport.failureReason ?? 'unknown'}`,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
      });
      this.completedPipelines.set(pipelineId, report);
      return report;
    }

    stagesCompleted.push(RecoveryPipelineStage.PIPELINE_VERIFICATION);
    const verificationFailures = resolveVerificationFailures(
      frozenRequest,
      engineReport,
      snapshotPlan,
      restorationReport,
    );

    stagesCompleted.push(RecoveryPipelineStage.REPORT_GENERATION);
    const success = verificationFailures.length === 0;
    const report = freezeRecoveryPipelineReport({
      pipelineId,
      recoveryId: frozenRequest.recoveryId,
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      guildId: frozenRequest.guildId,
      resourceId: frozenRequest.resourceId,
      operationType: frozenRequest.operationType,
      planId: snapshotPlan.planId,
      snapshotId: snapshotPlan.snapshotId,
      snapshotVersion: snapshotPlan.snapshotVersion,
      engineReport,
      snapshotPlan,
      restorationReport,
      stagesCompleted: Object.freeze(stagesCompleted),
      verificationOutcome: success
        ? RecoveryVerificationOutcome.VERIFIED
        : RecoveryVerificationOutcome.FAILED,
      success,
      failureReason: success
        ? undefined
        : `${FAILURE_PIPELINE_VERIFICATION_FAILED}:${verificationFailures.join(',')}`,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
    });

    this.completedPipelines.set(pipelineId, report);
    return report;
  }
}
