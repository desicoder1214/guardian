import {
  CoordinatedContainmentExecutionResult,
} from '../discord/coordinated-containment-execution';
import {
  InMemoryRecoveryEngine,
  RecoveryEngine,
  RecoveryOperationType,
  RecoveryReport,
  RecoveryRequest,
  RecoveryVerificationOutcome,
} from './recovery-engine';

export enum RecoveryRuntimeBridgeStage {
  EXECUTION_REPORT_VALIDATION = 'EXECUTION_REPORT_VALIDATION',
  RECOVERY_REQUEST_GENERATION = 'RECOVERY_REQUEST_GENERATION',
  RECOVERY_ENGINE_INVOCATION = 'RECOVERY_ENGINE_INVOCATION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RuntimeExecutionVerificationReport {
  readonly executionId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly recoveryId: string;
  readonly guildId: string;
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryRuntimeBridgeRequest {
  readonly containmentExecutionReport: CoordinatedContainmentExecutionResult;
  readonly executionVerificationReport: RuntimeExecutionVerificationReport;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryRuntimeBridgeReport {
  readonly bridgeId: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly recoveryId: string;
  readonly guildId: string;
  readonly containmentPlanId: string;
  readonly containmentExecutionPlanId: string;
  readonly recoveryEvaluationRequest?: RecoveryRequest;
  readonly recoveryReport?: RecoveryReport;
  readonly recoveryEngineInvoked: boolean;
  readonly stagesCompleted: readonly RecoveryRuntimeBridgeStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RecoveryRuntimeBridge {
  evaluate(
    request: RecoveryRuntimeBridgeRequest,
  ): Promise<RecoveryRuntimeBridgeReport>;
}

const FAILURE_CONTAINMENT_PLAN_ID_REQUIRED = 'CONTAINMENT_PLAN_ID_REQUIRED';
const FAILURE_CONTAINMENT_EXECUTION_PLAN_ID_REQUIRED = 'CONTAINMENT_EXECUTION_PLAN_ID_REQUIRED';
const FAILURE_EXECUTION_ID_REQUIRED = 'EXECUTION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_CONTAINMENT_EXECUTION_CORRELATION_MISMATCH =
  'CONTAINMENT_EXECUTION_CORRELATION_MISMATCH';
const FAILURE_EXECUTION_VERIFICATION_GATE_CLOSED =
  'EXECUTION_VERIFICATION_GATE_CLOSED';
const FAILURE_RECOVERY_ENGINE_NOT_VERIFIED = 'RECOVERY_ENGINE_NOT_VERIFIED';
const FAILURE_RECOVERY_ENGINE_IDENTITY_MISMATCH =
  'RECOVERY_ENGINE_IDENTITY_MISMATCH';

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

function freezeContainmentExecutionReport(
  report: CoordinatedContainmentExecutionResult,
): CoordinatedContainmentExecutionResult {
  return deepFreeze({
    ...report,
    succeededActions: Object.freeze([...report.succeededActions]),
    failedActions: Object.freeze([...report.failedActions]),
    skippedDuplicateActions: Object.freeze([...report.skippedDuplicateActions]),
    unsupportedActions: Object.freeze([...report.unsupportedActions]),
    actionResults: Object.freeze(
      report.actionResults.map((entry) =>
        deepFreeze({
          ...entry,
          metadata: entry.metadata ? Object.freeze({ ...entry.metadata }) : undefined,
        }),
      ),
    ),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function freezeExecutionVerificationReport(
  report: RuntimeExecutionVerificationReport,
): RuntimeExecutionVerificationReport {
  return deepFreeze({
    ...report,
    metadata: report.metadata ? Object.freeze({ ...report.metadata }) : undefined,
  });
}

function freezeRecoveryReport(report: RecoveryReport): RecoveryReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function freezeRecoveryRequest(request: RecoveryRequest): RecoveryRequest {
  return deepFreeze({
    ...request,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

export function freezeRecoveryRuntimeBridgeRequest(
  request: RecoveryRuntimeBridgeRequest,
): RecoveryRuntimeBridgeRequest {
  return deepFreeze({
    ...request,
    containmentExecutionReport: freezeContainmentExecutionReport(
      request.containmentExecutionReport,
    ),
    executionVerificationReport: freezeExecutionVerificationReport(
      request.executionVerificationReport,
    ),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRecoveryRuntimeBridgeReport(
  report: RecoveryRuntimeBridgeReport,
): RecoveryRuntimeBridgeReport {
  return deepFreeze({
    ...report,
    recoveryEvaluationRequest: report.recoveryEvaluationRequest
      ? freezeRecoveryRequest(report.recoveryEvaluationRequest)
      : undefined,
    recoveryReport: report.recoveryReport
      ? freezeRecoveryReport(report.recoveryReport)
      : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicBridgeKey(
  request: RecoveryRuntimeBridgeRequest,
): string {
  const containment = request.containmentExecutionReport;
  const execution = request.executionVerificationReport;
  return [
    containment.planId,
    containment.executionPlanId,
    containment.correlationId,
    execution.executionId,
    execution.correlationId,
    execution.transactionId,
    execution.recoveryId,
    execution.guildId,
    String(execution.success),
    execution.verificationOutcome,
  ].join('|');
}

function buildDeterministicBridgeId(
  request: RecoveryRuntimeBridgeRequest,
): string {
  return `recovery-runtime-bridge:${buildDeterministicBridgeKey(request)}`;
}

function resolveValidationFailures(
  request: RecoveryRuntimeBridgeRequest,
): readonly string[] {
  const failures: string[] = [];
  const containment = request.containmentExecutionReport;
  const execution = request.executionVerificationReport;

  if (!isNonEmptyString(containment.planId)) {
    failures.push(FAILURE_CONTAINMENT_PLAN_ID_REQUIRED);
  }

  if (!isNonEmptyString(containment.executionPlanId)) {
    failures.push(FAILURE_CONTAINMENT_EXECUTION_PLAN_ID_REQUIRED);
  }

  if (!isNonEmptyString(execution.executionId)) {
    failures.push(FAILURE_EXECUTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(execution.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(execution.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(execution.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(execution.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (containment.correlationId !== execution.correlationId) {
    failures.push(FAILURE_CONTAINMENT_EXECUTION_CORRELATION_MISMATCH);
  }

  if (
    !execution.success ||
    execution.verificationOutcome !== RecoveryVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_EXECUTION_VERIFICATION_GATE_CLOSED);
  }

  return Object.freeze(failures);
}

function buildRecoveryEvaluationRequest(
  request: RecoveryRuntimeBridgeRequest,
  requestedAt: string,
): RecoveryRequest {
  const execution = request.executionVerificationReport;
  const initiatedByValue = request.metadata?.initiatedBy;
  const initiatedBy =
    typeof initiatedByValue === 'string' && initiatedByValue.trim().length > 0
      ? initiatedByValue
      : 'guardian-recovery-runtime-bridge';

  return freezeRecoveryRequest({
    recoveryId: execution.recoveryId,
    correlationId: execution.correlationId,
    transactionId: execution.transactionId,
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    guildId: execution.guildId,
    initiatedBy,
    requestedAt,
    metadata: Object.freeze({
      source: 'recovery-runtime-bridge',
      executionId: execution.executionId,
      containmentPlanId: request.containmentExecutionReport.planId,
      containmentExecutionPlanId: request.containmentExecutionReport.executionPlanId,
      idempotencyKey: buildDeterministicBridgeKey(request),
    }),
  });
}

function buildReport(
  request: RecoveryRuntimeBridgeRequest,
  stagesCompleted: readonly RecoveryRuntimeBridgeStage[],
  startedAtMs: number,
  success: boolean,
  recoveryEngineInvoked: boolean,
  failureReason?: string,
  recoveryEvaluationRequest?: RecoveryRequest,
  recoveryReport?: RecoveryReport,
  idempotentReplay = false,
): RecoveryRuntimeBridgeReport {
  const containment = request.containmentExecutionReport;
  const execution = request.executionVerificationReport;

  return freezeRecoveryRuntimeBridgeReport({
    bridgeId: buildDeterministicBridgeId(request),
    executionId: execution.executionId,
    correlationId: execution.correlationId,
    transactionId: execution.transactionId,
    recoveryId: execution.recoveryId,
    guildId: execution.guildId,
    containmentPlanId: containment.planId,
    containmentExecutionPlanId: containment.executionPlanId,
    recoveryEvaluationRequest,
    recoveryReport,
    recoveryEngineInvoked,
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

function recoveryIdentityMatches(
  expected: RecoveryRequest,
  report: RecoveryReport,
): boolean {
  return (
    report.correlationId === expected.correlationId &&
    report.transactionId === expected.transactionId &&
    report.recoveryId === expected.recoveryId
  );
}

export class InMemoryRecoveryRuntimeBridge implements RecoveryRuntimeBridge {
  private readonly completedEvaluations = new Map<string, RecoveryRuntimeBridgeReport>();

  constructor(
    private readonly recoveryEngine: RecoveryEngine = new InMemoryRecoveryEngine(),
  ) {}

  async evaluate(
    request: RecoveryRuntimeBridgeRequest,
  ): Promise<RecoveryRuntimeBridgeReport> {
    const frozenRequest = freezeRecoveryRuntimeBridgeRequest(request);
    const startedAtMs = Date.now();
    const bridgeId = buildDeterministicBridgeId(frozenRequest);

    const existing = this.completedEvaluations.get(bridgeId);
    if (existing) {
      return freezeRecoveryRuntimeBridgeReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryRuntimeBridgeStage[] = [];
    stagesCompleted.push(RecoveryRuntimeBridgeStage.EXECUTION_REPORT_VALIDATION);

    const validationFailures = resolveValidationFailures(frozenRequest);
    if (validationFailures.length > 0) {
      stagesCompleted.push(RecoveryRuntimeBridgeStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        false,
        validationFailures.join(','),
      );
      this.completedEvaluations.set(bridgeId, report);
      return report;
    }

    stagesCompleted.push(RecoveryRuntimeBridgeStage.RECOVERY_REQUEST_GENERATION);
    const recoveryEvaluationRequest = buildRecoveryEvaluationRequest(
      frozenRequest,
      new Date(startedAtMs).toISOString(),
    );

    stagesCompleted.push(RecoveryRuntimeBridgeStage.RECOVERY_ENGINE_INVOCATION);
    const recoveryReport = freezeRecoveryReport(
      await this.recoveryEngine.execute(recoveryEvaluationRequest),
    );

    stagesCompleted.push(RecoveryRuntimeBridgeStage.VERIFICATION);
    if (
      recoveryReport.verificationOutcome !== RecoveryVerificationOutcome.VERIFIED ||
      !recoveryReport.success
    ) {
      stagesCompleted.push(RecoveryRuntimeBridgeStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        true,
        FAILURE_RECOVERY_ENGINE_NOT_VERIFIED,
        recoveryEvaluationRequest,
        recoveryReport,
      );
      this.completedEvaluations.set(bridgeId, report);
      return report;
    }

    if (!recoveryIdentityMatches(recoveryEvaluationRequest, recoveryReport)) {
      stagesCompleted.push(RecoveryRuntimeBridgeStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        true,
        FAILURE_RECOVERY_ENGINE_IDENTITY_MISMATCH,
        recoveryEvaluationRequest,
        recoveryReport,
      );
      this.completedEvaluations.set(bridgeId, report);
      return report;
    }

    stagesCompleted.push(RecoveryRuntimeBridgeStage.REPORT_GENERATION);
    const report = buildReport(
      frozenRequest,
      Object.freeze(stagesCompleted),
      startedAtMs,
      true,
      true,
      undefined,
      recoveryEvaluationRequest,
      recoveryReport,
    );

    this.completedEvaluations.set(bridgeId, report);
    return report;
  }
}
