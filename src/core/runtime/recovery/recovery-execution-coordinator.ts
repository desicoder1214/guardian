import {
  CoordinatedContainmentExecutionResult,
} from '../discord/coordinated-containment-execution';
import { RecoveryVerificationOutcome } from './recovery-engine';
import {
  freezeRecoveryRuntimeIntegrationRequest,
  InMemoryRecoveryRuntimeIntegration,
  RecoveryRuntimeDecision,
  RecoveryRuntimeIntegration,
  RecoveryRuntimeIntegrationRequest,
} from './recovery-runtime-integration';

export enum RecoveryExecutionCoordinationStage {
  CONTAINMENT_VERIFICATION = 'CONTAINMENT_VERIFICATION',
  RECOVERY_RUNTIME_EVALUATION = 'RECOVERY_RUNTIME_EVALUATION',
  RECOVERY_SCHEDULING = 'RECOVERY_SCHEDULING',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RecoveryExecutionCoordinatorRequest {
  readonly containmentResult: CoordinatedContainmentExecutionResult;
  readonly runtimeIntegrationRequest: RecoveryRuntimeIntegrationRequest;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryExecutionCoordinatorReport {
  readonly coordinationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly recoveryId: string;
  readonly pipelineId: string;
  readonly guildId: string;
  readonly containmentVerified: boolean;
  readonly recoveryEvaluationStarted: boolean;
  readonly recoveryScheduled: boolean;
  readonly runtimeDecision?: RecoveryRuntimeDecision;
  readonly stagesCompleted: readonly RecoveryExecutionCoordinationStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RecoveryExecutionCoordinator {
  coordinate(request: RecoveryExecutionCoordinatorRequest): RecoveryExecutionCoordinatorReport;
}

const FAILURE_CONTAINMENT_NOT_VERIFIED = 'CONTAINMENT_NOT_VERIFIED';
const FAILURE_CONTAINMENT_CORRELATION_MISMATCH = 'CONTAINMENT_CORRELATION_MISMATCH';
const FAILURE_RUNTIME_INTEGRATION_FAILED = 'RUNTIME_INTEGRATION_FAILED';
const FAILURE_RUNTIME_SCHEDULING_DECLINED = 'RUNTIME_SCHEDULING_DECLINED';
const FAILURE_VERIFICATION_FAILED = 'COORDINATION_VERIFICATION_FAILED';

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

function freezeContainmentResult(
  result: CoordinatedContainmentExecutionResult,
): CoordinatedContainmentExecutionResult {
  return deepFreeze({
    ...result,
    succeededActions: Object.freeze([...result.succeededActions]),
    failedActions: Object.freeze([...result.failedActions]),
    skippedDuplicateActions: Object.freeze([...result.skippedDuplicateActions]),
    unsupportedActions: Object.freeze([...result.unsupportedActions]),
    actionResults: Object.freeze(
      result.actionResults.map((entry) =>
        deepFreeze({
          ...entry,
          metadata: entry.metadata ? Object.freeze({ ...entry.metadata }) : undefined,
        }),
      ),
    ),
    metadata: Object.freeze({ ...result.metadata }),
  });
}

export function freezeRecoveryExecutionCoordinatorRequest(
  request: RecoveryExecutionCoordinatorRequest,
): RecoveryExecutionCoordinatorRequest {
  return deepFreeze({
    ...request,
    containmentResult: freezeContainmentResult(request.containmentResult),
    runtimeIntegrationRequest: freezeRecoveryRuntimeIntegrationRequest(
      request.runtimeIntegrationRequest,
    ),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryExecutionCoordinatorReport(
  report: RecoveryExecutionCoordinatorReport,
): RecoveryExecutionCoordinatorReport {
  return deepFreeze({
    ...report,
    runtimeDecision: report.runtimeDecision
      ? deepFreeze({
          ...report.runtimeDecision,
          stagesCompleted: Object.freeze([...report.runtimeDecision.stagesCompleted]),
        })
      : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function isContainmentVerified(result: CoordinatedContainmentExecutionResult): boolean {
  return (
    result.failedActions.length === 0 &&
    result.metadata.securityDecisionPreserved === true &&
    result.metadata.threatAssessmentPreserved === true
  );
}

function buildDeterministicCoordinationKey(
  request: RecoveryExecutionCoordinatorRequest,
): string {
  const pipeline = request.runtimeIntegrationRequest.pipelineReport;
  return [
    request.containmentResult.planId,
    request.containmentResult.executionPlanId,
    request.containmentResult.correlationId,
    pipeline.pipelineId,
    pipeline.recoveryId,
    pipeline.transactionId,
    pipeline.guildId,
  ].join('|');
}

function buildDeterministicCoordinationId(
  request: RecoveryExecutionCoordinatorRequest,
): string {
  return `recovery-execution-coordination:${buildDeterministicCoordinationKey(request)}`;
}

function resolveVerificationFailures(
  request: RecoveryExecutionCoordinatorRequest,
  runtimeDecision: RecoveryRuntimeDecision,
): readonly string[] {
  const failures: string[] = [];
  const pipelineReport = request.runtimeIntegrationRequest.pipelineReport;

  if (runtimeDecision.correlationId !== request.containmentResult.correlationId) {
    failures.push('RUNTIME_CONTAINMENT_CORRELATION_MISMATCH');
  }

  if (runtimeDecision.correlationId !== pipelineReport.correlationId) {
    failures.push('RUNTIME_PIPELINE_CORRELATION_MISMATCH');
  }

  if (runtimeDecision.transactionId !== pipelineReport.transactionId) {
    failures.push('RUNTIME_PIPELINE_TRANSACTION_MISMATCH');
  }

  if (runtimeDecision.recoveryId !== pipelineReport.recoveryId) {
    failures.push('RUNTIME_PIPELINE_RECOVERY_MISMATCH');
  }

  if (runtimeDecision.pipelineId !== pipelineReport.pipelineId) {
    failures.push('RUNTIME_PIPELINE_ID_MISMATCH');
  }

  if (runtimeDecision.guildId !== pipelineReport.guildId) {
    failures.push('RUNTIME_PIPELINE_GUILD_MISMATCH');
  }

  return Object.freeze(failures);
}

function buildFailureReport(
  request: RecoveryExecutionCoordinatorRequest,
  startedAtMs: number,
  stagesCompleted: readonly RecoveryExecutionCoordinationStage[],
  failureReason: string,
  runtimeDecision?: RecoveryRuntimeDecision,
): RecoveryExecutionCoordinatorReport {
  const pipeline = request.runtimeIntegrationRequest.pipelineReport;
  return freezeRecoveryExecutionCoordinatorReport({
    coordinationId: buildDeterministicCoordinationId(request),
    correlationId: request.containmentResult.correlationId,
    transactionId: pipeline.transactionId,
    recoveryId: pipeline.recoveryId,
    pipelineId: pipeline.pipelineId,
    guildId: pipeline.guildId,
    containmentVerified: isContainmentVerified(request.containmentResult),
    recoveryEvaluationStarted: runtimeDecision !== undefined,
    recoveryScheduled: false,
    runtimeDecision,
    stagesCompleted,
    verificationOutcome: RecoveryVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
  });
}

export class InMemoryRecoveryExecutionCoordinator
  implements RecoveryExecutionCoordinator
{
  private readonly completedCoordinations = new Map<
    string,
    RecoveryExecutionCoordinatorReport
  >();

  constructor(
    private readonly runtimeIntegration: RecoveryRuntimeIntegration =
      new InMemoryRecoveryRuntimeIntegration(),
  ) {}

  coordinate(
    request: RecoveryExecutionCoordinatorRequest,
  ): RecoveryExecutionCoordinatorReport {
    const frozenRequest = freezeRecoveryExecutionCoordinatorRequest(request);
    const startedAtMs = Date.now();
    const coordinationId = buildDeterministicCoordinationId(frozenRequest);

    const existing = this.completedCoordinations.get(coordinationId);
    if (existing) {
      return freezeRecoveryExecutionCoordinatorReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryExecutionCoordinationStage[] = [];
    stagesCompleted.push(RecoveryExecutionCoordinationStage.CONTAINMENT_VERIFICATION);

    if (
      frozenRequest.containmentResult.correlationId !==
      frozenRequest.runtimeIntegrationRequest.pipelineReport.correlationId
    ) {
      stagesCompleted.push(RecoveryExecutionCoordinationStage.REPORT_GENERATION);
      const report = buildFailureReport(
        frozenRequest,
        startedAtMs,
        Object.freeze(stagesCompleted),
        FAILURE_CONTAINMENT_CORRELATION_MISMATCH,
      );
      this.completedCoordinations.set(coordinationId, report);
      return report;
    }

    if (!isContainmentVerified(frozenRequest.containmentResult)) {
      stagesCompleted.push(RecoveryExecutionCoordinationStage.REPORT_GENERATION);
      const report = buildFailureReport(
        frozenRequest,
        startedAtMs,
        Object.freeze(stagesCompleted),
        FAILURE_CONTAINMENT_NOT_VERIFIED,
      );
      this.completedCoordinations.set(coordinationId, report);
      return report;
    }

    stagesCompleted.push(RecoveryExecutionCoordinationStage.RECOVERY_RUNTIME_EVALUATION);
    const runtimeDecision = this.runtimeIntegration.integrate(
      frozenRequest.runtimeIntegrationRequest,
    );

    stagesCompleted.push(RecoveryExecutionCoordinationStage.RECOVERY_SCHEDULING);
    if (!runtimeDecision.success) {
      stagesCompleted.push(RecoveryExecutionCoordinationStage.REPORT_GENERATION);
      const report = buildFailureReport(
        frozenRequest,
        startedAtMs,
        Object.freeze(stagesCompleted),
        `${FAILURE_RUNTIME_INTEGRATION_FAILED}:${runtimeDecision.failureReason ?? 'unknown'}`,
        runtimeDecision,
      );
      this.completedCoordinations.set(coordinationId, report);
      return report;
    }

    if (!runtimeDecision.shouldScheduleRecovery) {
      stagesCompleted.push(RecoveryExecutionCoordinationStage.REPORT_GENERATION);
      const report = buildFailureReport(
        frozenRequest,
        startedAtMs,
        Object.freeze(stagesCompleted),
        FAILURE_RUNTIME_SCHEDULING_DECLINED,
        runtimeDecision,
      );
      this.completedCoordinations.set(coordinationId, report);
      return report;
    }

    stagesCompleted.push(RecoveryExecutionCoordinationStage.VERIFICATION);
    const verificationFailures = resolveVerificationFailures(
      frozenRequest,
      runtimeDecision,
    );
    stagesCompleted.push(RecoveryExecutionCoordinationStage.REPORT_GENERATION);

    const success = verificationFailures.length === 0;
    const pipeline = frozenRequest.runtimeIntegrationRequest.pipelineReport;
    const report = freezeRecoveryExecutionCoordinatorReport({
      coordinationId,
      correlationId: frozenRequest.containmentResult.correlationId,
      transactionId: pipeline.transactionId,
      recoveryId: pipeline.recoveryId,
      pipelineId: pipeline.pipelineId,
      guildId: pipeline.guildId,
      containmentVerified: true,
      recoveryEvaluationStarted: true,
      recoveryScheduled: runtimeDecision.shouldScheduleRecovery,
      runtimeDecision,
      stagesCompleted: Object.freeze(stagesCompleted),
      verificationOutcome: success
        ? RecoveryVerificationOutcome.VERIFIED
        : RecoveryVerificationOutcome.FAILED,
      success,
      failureReason: success
        ? undefined
        : `${FAILURE_VERIFICATION_FAILED}:${verificationFailures.join(',')}`,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
    });

    this.completedCoordinations.set(coordinationId, report);
    return report;
  }
}
