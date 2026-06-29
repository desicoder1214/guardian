import { RecoveryPipelineReport } from './recovery-pipeline';
import { RecoveryVerificationOutcome } from './recovery-engine';

export enum RecoveryRuntimeIntegrationStage {
  RECOVERY_PIPELINE_EVALUATION = 'RECOVERY_PIPELINE_EVALUATION',
  RUNTIME_ELIGIBILITY_CHECK = 'RUNTIME_ELIGIBILITY_CHECK',
  RECOVERY_SCHEDULING_DECISION = 'RECOVERY_SCHEDULING_DECISION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum RecoveryRuntimeLifecycleState {
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
}

export interface RecoveryRuntimeIntegrationRequest {
  readonly pipelineReport: RecoveryPipelineReport;
  readonly runtimeLifecycleState?: RecoveryRuntimeLifecycleState;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryRuntimeDecision {
  readonly decisionId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly pipelineId: string;
  readonly guildId: string;
  readonly runtimeLifecycleState: RecoveryRuntimeLifecycleState;
  readonly runtimeEligible: boolean;
  readonly shouldScheduleRecovery: boolean;
  readonly stagesCompleted: readonly RecoveryRuntimeIntegrationStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly pipelineReport: RecoveryPipelineReport;
}

export interface RecoveryRuntimeIntegration {
  integrate(request: RecoveryRuntimeIntegrationRequest): RecoveryRuntimeDecision;
}

const FAILURE_PIPELINE_NOT_ELIGIBLE = 'PIPELINE_NOT_ELIGIBLE';
const FAILURE_RUNTIME_NOT_ELIGIBLE = 'RUNTIME_NOT_ELIGIBLE';
const FAILURE_DECISION_INTEGRITY_FAILED = 'DECISION_INTEGRITY_FAILED';

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

function freezePipelineReport(report: RecoveryPipelineReport): RecoveryPipelineReport {
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

export function freezeRecoveryRuntimeIntegrationRequest(
  request: RecoveryRuntimeIntegrationRequest,
): RecoveryRuntimeIntegrationRequest {
  return deepFreeze({
    ...request,
    pipelineReport: freezePipelineReport(request.pipelineReport),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryRuntimeDecision(decision: RecoveryRuntimeDecision): RecoveryRuntimeDecision {
  return deepFreeze({
    ...decision,
    stagesCompleted: Object.freeze([...decision.stagesCompleted]),
    pipelineReport: freezePipelineReport(decision.pipelineReport),
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isRuntimeEligible(state: RecoveryRuntimeLifecycleState): boolean {
  return state !== RecoveryRuntimeLifecycleState.STOPPING && state !== RecoveryRuntimeLifecycleState.STOPPED;
}

function buildDeterministicDecisionKey(request: RecoveryRuntimeIntegrationRequest): string {
  return [
    request.pipelineReport.pipelineId,
    request.pipelineReport.recoveryId,
    request.pipelineReport.transactionId,
    request.pipelineReport.correlationId,
    request.pipelineReport.guildId,
    request.runtimeLifecycleState ?? RecoveryRuntimeLifecycleState.RUNNING,
    String(request.pipelineReport.success),
    request.pipelineReport.verificationOutcome,
  ].join('|');
}

function buildDeterministicDecisionId(request: RecoveryRuntimeIntegrationRequest): string {
  return `recovery-runtime-decision:${buildDeterministicDecisionKey(request)}`;
}

function resolveEligibilityFailures(
  request: RecoveryRuntimeIntegrationRequest,
): readonly string[] {
  const failures: string[] = [];

  if (
    !request.pipelineReport.success ||
    request.pipelineReport.verificationOutcome !== RecoveryVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_PIPELINE_NOT_ELIGIBLE);
  }

  if (!isRuntimeEligible(request.runtimeLifecycleState ?? RecoveryRuntimeLifecycleState.RUNNING)) {
    failures.push(FAILURE_RUNTIME_NOT_ELIGIBLE);
  }

  if (!isNonEmptyString(request.pipelineReport.recoveryId)) {
    failures.push('RECOVERY_ID_REQUIRED');
  }

  if (!isNonEmptyString(request.pipelineReport.transactionId)) {
    failures.push('TRANSACTION_ID_REQUIRED');
  }

  if (!isNonEmptyString(request.pipelineReport.correlationId)) {
    failures.push('CORRELATION_ID_REQUIRED');
  }

  if (!isNonEmptyString(request.pipelineReport.pipelineId)) {
    failures.push('PIPELINE_ID_REQUIRED');
  }

  if (!isNonEmptyString(request.pipelineReport.guildId)) {
    failures.push('GUILD_ID_REQUIRED');
  }

  return Object.freeze(failures);
}

function buildRuntimeDecision(
  request: RecoveryRuntimeIntegrationRequest,
  shouldScheduleRecovery: boolean,
  verificationOutcome: RecoveryVerificationOutcome,
  stagesCompleted: readonly RecoveryRuntimeIntegrationStage[],
  startedAtMs: number,
  failureReason?: string,
  idempotentReplay = false,
): RecoveryRuntimeDecision {
  const pipelineReport = freezePipelineReport(request.pipelineReport);
  return freezeRecoveryRuntimeDecision({
    decisionId: buildDeterministicDecisionId(request),
    recoveryId: pipelineReport.recoveryId,
    transactionId: pipelineReport.transactionId,
    correlationId: pipelineReport.correlationId,
    pipelineId: pipelineReport.pipelineId,
    guildId: pipelineReport.guildId,
    runtimeLifecycleState: request.runtimeLifecycleState ?? RecoveryRuntimeLifecycleState.RUNNING,
    runtimeEligible: shouldScheduleRecovery,
    shouldScheduleRecovery,
    stagesCompleted,
    verificationOutcome,
    success: shouldScheduleRecovery,
    failureReason,
    idempotentReplay,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    pipelineReport,
  });
}

export class InMemoryRecoveryRuntimeIntegration implements RecoveryRuntimeIntegration {
  private readonly completedDecisions = new Map<string, RecoveryRuntimeDecision>();

  integrate(request: RecoveryRuntimeIntegrationRequest): RecoveryRuntimeDecision {
    const frozenRequest = freezeRecoveryRuntimeIntegrationRequest(request);
    const startedAtMs = Date.now();
    const decisionId = buildDeterministicDecisionId(frozenRequest);

    const existing = this.completedDecisions.get(decisionId);
    if (existing) {
      return freezeRecoveryRuntimeDecision({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryRuntimeIntegrationStage[] = [];
    stagesCompleted.push(RecoveryRuntimeIntegrationStage.RECOVERY_PIPELINE_EVALUATION);

    const eligibilityFailures = resolveEligibilityFailures(frozenRequest);
    stagesCompleted.push(RecoveryRuntimeIntegrationStage.RUNTIME_ELIGIBILITY_CHECK);

    if (eligibilityFailures.length > 0) {
      stagesCompleted.push(RecoveryRuntimeIntegrationStage.REPORT_GENERATION);
      const report = buildRuntimeDecision(
        frozenRequest,
        false,
        RecoveryVerificationOutcome.FAILED,
        Object.freeze(stagesCompleted),
        startedAtMs,
        eligibilityFailures.join(','),
      );
      this.completedDecisions.set(decisionId, report);
      return report;
    }

    stagesCompleted.push(RecoveryRuntimeIntegrationStage.RECOVERY_SCHEDULING_DECISION);
    const shouldScheduleRecovery = true;
    stagesCompleted.push(RecoveryRuntimeIntegrationStage.VERIFICATION);
    stagesCompleted.push(RecoveryRuntimeIntegrationStage.REPORT_GENERATION);

    const report = buildRuntimeDecision(
      frozenRequest,
      shouldScheduleRecovery,
      RecoveryVerificationOutcome.VERIFIED,
      Object.freeze(stagesCompleted),
      startedAtMs,
    );
    this.completedDecisions.set(decisionId, report);
    return report;
  }
}
