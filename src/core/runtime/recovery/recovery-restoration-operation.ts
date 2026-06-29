import { RecoveryOperationType, RecoveryVerificationOutcome } from './recovery-engine';
import { RecoverySnapshotPlan } from './recovery-snapshot-coordinator';

export enum RecoveryRestorationStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  PLAN_VALIDATION = 'PLAN_VALIDATION',
  PRECONDITION_CHECK = 'PRECONDITION_CHECK',
  RESTORATION_COORDINATION = 'RESTORATION_COORDINATION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RecoveryRestorationRequest {
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly plan: RecoverySnapshotPlan;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryRestorationReport {
  readonly operationId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly planId: string;
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly stagesCompleted: readonly RecoveryRestorationStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RecoveryRestorationVerifier {
  verify(request: RecoveryRestorationRequest): RecoveryVerificationOutcome;
}

export interface RecoveryRestorationOperation {
  execute(request: RecoveryRestorationRequest): RecoveryRestorationReport;
}

const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_INVALID_PLAN = 'INVALID_PLAN';
const FAILURE_MISSING_SNAPSHOT = 'MISSING_SNAPSHOT';
const FAILURE_PLAN_RECOVERY_ID_MISMATCH = 'PLAN_RECOVERY_ID_MISMATCH';
const FAILURE_PLAN_TRANSACTION_ID_MISMATCH = 'PLAN_TRANSACTION_ID_MISMATCH';
const FAILURE_PLAN_CORRELATION_ID_MISMATCH = 'PLAN_CORRELATION_ID_MISMATCH';
const FAILURE_UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';

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

export function freezeRecoveryRestorationRequest(
  request: RecoveryRestorationRequest,
): RecoveryRestorationRequest {
  return deepFreeze({
    ...request,
    plan: deepFreeze({ ...request.plan }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryRestorationReport(
  report: RecoveryRestorationReport,
): RecoveryRestorationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicOperationKey(
  request: RecoveryRestorationRequest,
): string {
  return [
    request.recoveryId,
    request.transactionId,
    request.correlationId,
    request.plan.planId,
    request.plan.snapshotId,
    String(request.plan.snapshotVersion),
  ].join('|');
}

function buildDeterministicOperationId(
  request: RecoveryRestorationRequest,
): string {
  return `recovery-restoration-operation:${buildDeterministicOperationKey(request)}`;
}

function resolveValidationFailures(
  request: RecoveryRestorationRequest,
): readonly string[] {
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

  if (request.plan.validation.valid !== true) {
    failures.push(FAILURE_INVALID_PLAN);
  }

  if (!isNonEmptyString(request.plan.snapshotId) || request.plan.snapshotVersion < 0) {
    failures.push(FAILURE_MISSING_SNAPSHOT);
  }

  if (request.plan.recoveryId !== request.recoveryId) {
    failures.push(FAILURE_PLAN_RECOVERY_ID_MISMATCH);
  }

  if (request.plan.transactionId !== request.transactionId) {
    failures.push(FAILURE_PLAN_TRANSACTION_ID_MISMATCH);
  }

  if (request.plan.correlationId !== request.correlationId) {
    failures.push(FAILURE_PLAN_CORRELATION_ID_MISMATCH);
  }

  if (request.plan.operationType !== RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY) {
    failures.push(FAILURE_UNSUPPORTED_OPERATION);
  }

  return Object.freeze(failures);
}

export class PassThroughRecoveryRestorationVerifier
  implements RecoveryRestorationVerifier
{
  verify(_request: RecoveryRestorationRequest): RecoveryVerificationOutcome {
    return RecoveryVerificationOutcome.VERIFIED;
  }
}

export class InMemoryRecoveryRestorationOperation
  implements RecoveryRestorationOperation
{
  private readonly completedOperations = new Map<string, RecoveryRestorationReport>();

  constructor(
    private readonly verifier: RecoveryRestorationVerifier =
      new PassThroughRecoveryRestorationVerifier(),
  ) {}

  execute(request: RecoveryRestorationRequest): RecoveryRestorationReport {
    const frozenRequest = freezeRecoveryRestorationRequest(request);
    const startedAtMs = Date.now();
    const operationId = buildDeterministicOperationId(frozenRequest);

    const existing = this.completedOperations.get(operationId);
    if (existing) {
      return freezeRecoveryRestorationReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryRestorationStage[] = [];

    stagesCompleted.push(RecoveryRestorationStage.REQUEST_VALIDATION);
    stagesCompleted.push(RecoveryRestorationStage.PLAN_VALIDATION);
    stagesCompleted.push(RecoveryRestorationStage.PRECONDITION_CHECK);

    const failures = resolveValidationFailures(frozenRequest);

    if (failures.length > 0) {
      stagesCompleted.push(RecoveryRestorationStage.REPORT_GENERATION);
      const report = freezeRecoveryRestorationReport({
        operationId,
        recoveryId: frozenRequest.recoveryId,
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        planId: frozenRequest.plan.planId,
        snapshotId: frozenRequest.plan.snapshotId,
        snapshotVersion: frozenRequest.plan.snapshotVersion,
        stagesCompleted: Object.freeze(stagesCompleted),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason: failures.join(','),
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
      });
      this.completedOperations.set(operationId, report);
      return report;
    }

    stagesCompleted.push(RecoveryRestorationStage.RESTORATION_COORDINATION);
    const verificationOutcome = this.verifier.verify(frozenRequest);
    stagesCompleted.push(RecoveryRestorationStage.VERIFICATION);
    stagesCompleted.push(RecoveryRestorationStage.REPORT_GENERATION);

    const success = verificationOutcome === RecoveryVerificationOutcome.VERIFIED;
    const report = freezeRecoveryRestorationReport({
      operationId,
      recoveryId: frozenRequest.recoveryId,
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      planId: frozenRequest.plan.planId,
      snapshotId: frozenRequest.plan.snapshotId,
      snapshotVersion: frozenRequest.plan.snapshotVersion,
      stagesCompleted: Object.freeze(stagesCompleted),
      verificationOutcome,
      success,
      failureReason: success ? undefined : 'verification-failed',
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
    });

    this.completedOperations.set(operationId, report);
    return report;
  }
}
