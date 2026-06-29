import {
  RecoveryExecutionCoordinatorReport,
} from './recovery-execution-coordinator';
import { RecoveryVerificationOutcome } from './recovery-engine';

export enum RecoveryExecutionVerificationStage {
  COORDINATION_REPORT_VALIDATION = 'COORDINATION_REPORT_VALIDATION',
  IDENTITY_INTEGRITY_CHECK = 'IDENTITY_INTEGRITY_CHECK',
  RUNTIME_DECISION_INTEGRITY_CHECK = 'RUNTIME_DECISION_INTEGRITY_CHECK',
  SCHEDULING_INTEGRITY_CHECK = 'SCHEDULING_INTEGRITY_CHECK',
  VERIFICATION_RESULT_GENERATION = 'VERIFICATION_RESULT_GENERATION',
}

export interface RecoveryExecutionVerifierRequest {
  readonly coordinationReport: RecoveryExecutionCoordinatorReport;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryExecutionVerificationReport {
  readonly verificationId: string;
  readonly coordinationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly recoveryId: string;
  readonly pipelineId: string;
  readonly guildId: string;
  readonly containmentVerified: boolean;
  readonly recoveryEvaluationStarted: boolean;
  readonly recoveryScheduled: boolean;
  readonly coordinationReportValid: boolean;
  readonly identityIntegrityValid: boolean;
  readonly runtimeDecisionIntegrityValid: boolean;
  readonly schedulingIntegrityValid: boolean;
  readonly stagesCompleted: readonly RecoveryExecutionVerificationStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RecoveryExecutionVerifier {
  verify(
    request: RecoveryExecutionVerifierRequest,
  ): RecoveryExecutionVerificationReport;
}

const FAILURE_COORDINATION_REPORT_FAILED = 'COORDINATION_REPORT_FAILED';
const FAILURE_COORDINATION_ID_REQUIRED = 'COORDINATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_PIPELINE_ID_REQUIRED = 'PIPELINE_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_CONTAINMENT_NOT_VERIFIED = 'CONTAINMENT_NOT_VERIFIED';
const FAILURE_RECOVERY_EVALUATION_NOT_STARTED = 'RECOVERY_EVALUATION_NOT_STARTED';
const FAILURE_RUNTIME_DECISION_REQUIRED = 'RUNTIME_DECISION_REQUIRED';
const FAILURE_CORRELATION_MISMATCH = 'CORRELATION_MISMATCH';
const FAILURE_TRANSACTION_MISMATCH = 'TRANSACTION_MISMATCH';
const FAILURE_RECOVERY_ID_MISMATCH = 'RECOVERY_ID_MISMATCH';
const FAILURE_PIPELINE_ID_MISMATCH = 'PIPELINE_ID_MISMATCH';
const FAILURE_GUILD_ID_MISMATCH = 'GUILD_ID_MISMATCH';
const FAILURE_SCHEDULING_MISMATCH = 'SCHEDULING_MISMATCH';

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

function freezeCoordinationReport(
  report: RecoveryExecutionCoordinatorReport,
): RecoveryExecutionCoordinatorReport {
  return deepFreeze({
    ...report,
    runtimeDecision: report.runtimeDecision
      ? deepFreeze({
          ...report.runtimeDecision,
          stagesCompleted: Object.freeze([...report.runtimeDecision.stagesCompleted]),
          pipelineReport: deepFreeze({
            ...report.runtimeDecision.pipelineReport,
            stagesCompleted: Object.freeze([
              ...report.runtimeDecision.pipelineReport.stagesCompleted,
            ]),
            engineReport: deepFreeze({
              ...report.runtimeDecision.pipelineReport.engineReport,
              stagesCompleted: Object.freeze([
                ...report.runtimeDecision.pipelineReport.engineReport.stagesCompleted,
              ]),
            }),
            snapshotPlan: report.runtimeDecision.pipelineReport.snapshotPlan
              ? deepFreeze({
                  ...report.runtimeDecision.pipelineReport.snapshotPlan,
                  stagesCompleted: Object.freeze([
                    ...report.runtimeDecision.pipelineReport.snapshotPlan.stagesCompleted,
                  ]),
                  validation: deepFreeze({
                    ...report.runtimeDecision.pipelineReport.snapshotPlan.validation,
                    failures: Object.freeze([
                      ...report.runtimeDecision.pipelineReport.snapshotPlan.validation.failures,
                    ]),
                  }),
                  metadata: Object.freeze({
                    ...report.runtimeDecision.pipelineReport.snapshotPlan.metadata,
                  }),
                })
              : undefined,
            restorationReport: report.runtimeDecision.pipelineReport.restorationReport
              ? deepFreeze({
                  ...report.runtimeDecision.pipelineReport.restorationReport,
                  stagesCompleted: Object.freeze([
                    ...report.runtimeDecision.pipelineReport.restorationReport.stagesCompleted,
                  ]),
                })
              : undefined,
          }),
        })
      : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

export function freezeRecoveryExecutionVerifierRequest(
  request: RecoveryExecutionVerifierRequest,
): RecoveryExecutionVerifierRequest {
  return deepFreeze({
    ...request,
    coordinationReport: freezeCoordinationReport(request.coordinationReport),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryExecutionVerificationReport(
  report: RecoveryExecutionVerificationReport,
): RecoveryExecutionVerificationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicVerificationKey(
  request: RecoveryExecutionVerifierRequest,
): string {
  const report = request.coordinationReport;
  return [
    report.coordinationId,
    report.correlationId,
    report.transactionId,
    report.recoveryId,
    report.pipelineId,
    report.guildId,
  ].join('|');
}

function buildDeterministicVerificationId(
  request: RecoveryExecutionVerifierRequest,
): string {
  return `recovery-execution-verification:${buildDeterministicVerificationKey(request)}`;
}

function resolveCoordinationReportValidationFailures(
  report: RecoveryExecutionCoordinatorReport,
): readonly string[] {
  const failures: string[] = [];

  if (!report.success) {
    failures.push(FAILURE_COORDINATION_REPORT_FAILED);
  }

  if (!isNonEmptyString(report.coordinationId)) {
    failures.push(FAILURE_COORDINATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(report.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(report.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(report.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(report.pipelineId)) {
    failures.push(FAILURE_PIPELINE_ID_REQUIRED);
  }

  if (!isNonEmptyString(report.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!report.containmentVerified) {
    failures.push(FAILURE_CONTAINMENT_NOT_VERIFIED);
  }

  if (!report.recoveryEvaluationStarted) {
    failures.push(FAILURE_RECOVERY_EVALUATION_NOT_STARTED);
  }

  return Object.freeze(failures);
}

function resolveIdentityFailures(
  report: RecoveryExecutionCoordinatorReport,
): readonly string[] {
  if (!report.runtimeDecision) {
    return Object.freeze([FAILURE_RUNTIME_DECISION_REQUIRED]);
  }

  const failures: string[] = [];

  if (report.runtimeDecision.correlationId !== report.correlationId) {
    failures.push(FAILURE_CORRELATION_MISMATCH);
  }

  if (report.runtimeDecision.transactionId !== report.transactionId) {
    failures.push(FAILURE_TRANSACTION_MISMATCH);
  }

  if (report.runtimeDecision.recoveryId !== report.recoveryId) {
    failures.push(FAILURE_RECOVERY_ID_MISMATCH);
  }

  if (report.runtimeDecision.pipelineId !== report.pipelineId) {
    failures.push(FAILURE_PIPELINE_ID_MISMATCH);
  }

  if (report.runtimeDecision.guildId !== report.guildId) {
    failures.push(FAILURE_GUILD_ID_MISMATCH);
  }

  return Object.freeze(failures);
}

function resolveRuntimeDecisionIntegrityFailures(
  report: RecoveryExecutionCoordinatorReport,
): readonly string[] {
  if (!report.runtimeDecision) {
    return Object.freeze([FAILURE_RUNTIME_DECISION_REQUIRED]);
  }

  const failures: string[] = [];
  const pipelineReport = report.runtimeDecision.pipelineReport;

  if (pipelineReport.correlationId !== report.correlationId) {
    failures.push(FAILURE_CORRELATION_MISMATCH);
  }

  if (pipelineReport.transactionId !== report.transactionId) {
    failures.push(FAILURE_TRANSACTION_MISMATCH);
  }

  if (pipelineReport.recoveryId !== report.recoveryId) {
    failures.push(FAILURE_RECOVERY_ID_MISMATCH);
  }

  if (pipelineReport.pipelineId !== report.pipelineId) {
    failures.push(FAILURE_PIPELINE_ID_MISMATCH);
  }

  if (pipelineReport.guildId !== report.guildId) {
    failures.push(FAILURE_GUILD_ID_MISMATCH);
  }

  return Object.freeze(failures);
}

function resolveSchedulingIntegrityFailures(
  report: RecoveryExecutionCoordinatorReport,
): readonly string[] {
  if (!report.runtimeDecision) {
    return Object.freeze([FAILURE_RUNTIME_DECISION_REQUIRED]);
  }

  const failures: string[] = [];

  if (!report.recoveryScheduled || !report.runtimeDecision.shouldScheduleRecovery) {
    failures.push(FAILURE_SCHEDULING_MISMATCH);
  }

  return Object.freeze(failures);
}

function buildReport(
  request: RecoveryExecutionVerifierRequest,
  stagesCompleted: readonly RecoveryExecutionVerificationStage[],
  startedAtMs: number,
  success: boolean,
  failureReason?: string,
  idempotentReplay = false,
  coordinationReportValid = false,
  identityIntegrityValid = false,
  runtimeDecisionIntegrityValid = false,
  schedulingIntegrityValid = false,
): RecoveryExecutionVerificationReport {
  const report = request.coordinationReport;
  return freezeRecoveryExecutionVerificationReport({
    verificationId: buildDeterministicVerificationId(request),
    coordinationId: report.coordinationId,
    correlationId: report.correlationId,
    transactionId: report.transactionId,
    recoveryId: report.recoveryId,
    pipelineId: report.pipelineId,
    guildId: report.guildId,
    containmentVerified: report.containmentVerified,
    recoveryEvaluationStarted: report.recoveryEvaluationStarted,
    recoveryScheduled: report.recoveryScheduled,
    coordinationReportValid,
    identityIntegrityValid,
    runtimeDecisionIntegrityValid,
    schedulingIntegrityValid,
    stagesCompleted,
    verificationOutcome: success
      ? RecoveryVerificationOutcome.VERIFIED
      : RecoveryVerificationOutcome.FAILED,
    success,
    failureReason,
    idempotentReplay,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
  });
}

export class InMemoryRecoveryExecutionVerifier
  implements RecoveryExecutionVerifier
{
  private readonly completedVerifications = new Map<
    string,
    RecoveryExecutionVerificationReport
  >();

  verify(
    request: RecoveryExecutionVerifierRequest,
  ): RecoveryExecutionVerificationReport {
    const frozenRequest = freezeRecoveryExecutionVerifierRequest(request);
    const startedAtMs = Date.now();
    const verificationId = buildDeterministicVerificationId(frozenRequest);

    const existing = this.completedVerifications.get(verificationId);
    if (existing) {
      return freezeRecoveryExecutionVerificationReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryExecutionVerificationStage[] = [];
    const report = frozenRequest.coordinationReport;

    stagesCompleted.push(RecoveryExecutionVerificationStage.COORDINATION_REPORT_VALIDATION);
    const coordinationFailures = resolveCoordinationReportValidationFailures(report);
    if (coordinationFailures.length > 0) {
      stagesCompleted.push(RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION);
      const failureReport = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        coordinationFailures.join(','),
        false,
        false,
        false,
        false,
        false,
      );
      this.completedVerifications.set(verificationId, failureReport);
      return failureReport;
    }

    stagesCompleted.push(RecoveryExecutionVerificationStage.IDENTITY_INTEGRITY_CHECK);
    const identityFailures = resolveIdentityFailures(report);
    if (identityFailures.length > 0) {
      stagesCompleted.push(RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION);
      const failureReport = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        identityFailures.join(','),
        false,
        true,
        false,
        false,
        false,
      );
      this.completedVerifications.set(verificationId, failureReport);
      return failureReport;
    }

    stagesCompleted.push(
      RecoveryExecutionVerificationStage.RUNTIME_DECISION_INTEGRITY_CHECK,
    );
    const runtimeDecisionFailures = resolveRuntimeDecisionIntegrityFailures(report);
    if (runtimeDecisionFailures.length > 0) {
      stagesCompleted.push(RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION);
      const failureReport = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        runtimeDecisionFailures.join(','),
        false,
        true,
        true,
        false,
        false,
      );
      this.completedVerifications.set(verificationId, failureReport);
      return failureReport;
    }

    stagesCompleted.push(RecoveryExecutionVerificationStage.SCHEDULING_INTEGRITY_CHECK);
    const schedulingFailures = resolveSchedulingIntegrityFailures(report);
    stagesCompleted.push(RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION);

    const success = schedulingFailures.length === 0;
    const verificationReport = buildReport(
      frozenRequest,
      Object.freeze(stagesCompleted),
      startedAtMs,
      success,
      success ? undefined : schedulingFailures.join(','),
      false,
      true,
      true,
      true,
      success,
    );

    this.completedVerifications.set(verificationId, verificationReport);
    return verificationReport;
  }
}
