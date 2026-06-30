import {
  InMemorySecurityExecutionOrchestrator,
  SecurityExecutionOrchestrationContext,
  SecurityExecutionOrchestrationResult,
  SecurityExecutionOrchestrator,
} from '../discord/security-execution-orchestrator';
import { SecurityActionPriority } from '../discord/security-action-planner';
import { SecurityExecutionPlan } from '../discord/security-execution-types';
import {
  SecurityStartupExecutionBatch,
  SecurityStartupExecutionPlanningReport,
  SecurityStartupExecutionPlanningVerificationOutcome,
} from './security-startup-execution-planning-engine';

export enum SecurityStartupExecutionDispatchStage {
  DISPATCH_VALIDATION = 'DISPATCH_VALIDATION',
  BATCH_VERIFICATION = 'BATCH_VERIFICATION',
  ORCHESTRATOR_DISPATCH = 'ORCHESTRATOR_DISPATCH',
  DISPATCH_VERIFICATION = 'DISPATCH_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityStartupExecutionDispatchVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityStartupExecutionDispatchRequest {
  readonly dispatchId?: string;
  readonly startupExecutionPlanningReport: SecurityStartupExecutionPlanningReport;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityStartupExecutionDispatchReport {
  readonly dispatchId: string;
  readonly planningId: string;
  readonly pipelineId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly executionPlanId: string;
  readonly startupExecutionPlanningReport: SecurityStartupExecutionPlanningReport;
  readonly orchestrationResult?: SecurityExecutionOrchestrationResult;
  readonly verifiedExecutionBatches: readonly SecurityStartupExecutionBatch[];
  readonly orchestratorInvoked: boolean;
  readonly stagesCompleted: readonly SecurityStartupExecutionDispatchStage[];
  readonly verificationOutcome: SecurityStartupExecutionDispatchVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-startup-execution-dispatcher';
    readonly deterministicDispatchId: true;
    readonly planningReportVerified: boolean;
    readonly planningReportId: string;
    readonly executionPlanId: string;
    readonly executionBatchCount: number;
    readonly orchestrationResultVerified: boolean;
  };
}

export interface SecurityStartupExecutionDispatcher {
  dispatch(request: SecurityStartupExecutionDispatchRequest): Promise<SecurityStartupExecutionDispatchReport>;
}

const FAILURE_DISPATCH_ID_REQUIRED = 'DISPATCH_ID_REQUIRED';
const FAILURE_PLANNING_REPORT_ID_REQUIRED = 'PLANNING_REPORT_ID_REQUIRED';
const FAILURE_PIPELINE_ID_REQUIRED = 'PIPELINE_ID_REQUIRED';
const FAILURE_EXECUTION_PLAN_ID_REQUIRED = 'EXECUTION_PLAN_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_PLANNING_REPORT_INCOMPLETE = 'PLANNING_REPORT_INCOMPLETE';
const FAILURE_PLANNING_REPORT_INTEGRITY_FAILED = 'PLANNING_REPORT_INTEGRITY_FAILED';
const FAILURE_BATCH_DUPLICATE = 'EXECUTION_BATCH_DUPLICATE';
const FAILURE_BATCH_ORDER_INVALID = 'EXECUTION_BATCH_ORDER_INVALID';
const FAILURE_BATCH_INTEGRITY_FAILED = 'EXECUTION_BATCH_INTEGRITY_FAILED';
const FAILURE_ORCHESTRATION_NOT_VERIFIED = 'ORCHESTRATION_NOT_VERIFIED';
const FAILURE_ORCHESTRATION_IDENTITY_MISMATCH = 'ORCHESTRATION_IDENTITY_MISMATCH';
const FAILURE_ORCHESTRATION_COMPLETION_VERIFICATION_FAILED = 'ORCHESTRATION_COMPLETION_VERIFICATION_FAILED';

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

function freezeDispatchRequest(
  request: SecurityStartupExecutionDispatchRequest,
): SecurityStartupExecutionDispatchRequest {
  return deepFreeze({
    ...request,
    startupExecutionPlanningReport: deepFreeze({
      ...request.startupExecutionPlanningReport,
      stagesCompleted: Object.freeze([...request.startupExecutionPlanningReport.stagesCompleted]),
      executionPlan: deepFreeze({
        ...request.startupExecutionPlanningReport.executionPlan,
        plannedActions: Object.freeze([
          ...request.startupExecutionPlanningReport.executionPlan.plannedActions,
        ]),
        authorizationRequirements: Object.freeze([
          ...request.startupExecutionPlanningReport.executionPlan.authorizationRequirements,
        ]),
        executionMetadata: Object.freeze({
          ...request.startupExecutionPlanningReport.executionPlan.executionMetadata,
          plannedActionTypes: Object.freeze([
            ...request.startupExecutionPlanningReport.executionPlan.executionMetadata.plannedActionTypes,
          ]),
        }),
        auditMetadata: Object.freeze({
          ...request.startupExecutionPlanningReport.executionPlan.auditMetadata,
        }),
        rollbackMetadata: Object.freeze({
          ...request.startupExecutionPlanningReport.executionPlan.rollbackMetadata,
        }),
        securityDecision: deepFreeze({
          ...request.startupExecutionPlanningReport.executionPlan.securityDecision,
        }),
        threatAssessment: request.startupExecutionPlanningReport.executionPlan.threatAssessment
          ? deepFreeze({ ...request.startupExecutionPlanningReport.executionPlan.threatAssessment })
          : undefined,
      }),
      executionBatches: Object.freeze(
        request.startupExecutionPlanningReport.executionBatches.map((batch) =>
          deepFreeze({
            ...batch,
            findingIds: Object.freeze([...batch.findingIds]),
            targetIds: Object.freeze([...batch.targetIds]),
            metadata: Object.freeze({ ...batch.metadata }),
          }),
        ),
      ),
      metadata: Object.freeze({ ...request.startupExecutionPlanningReport.metadata }),
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeExecutionResult(
  result: SecurityExecutionOrchestrationResult,
): SecurityExecutionOrchestrationResult {
  return deepFreeze({
    ...result,
    hotPathPlan: deepFreeze({
      ...result.hotPathPlan,
      actions: Object.freeze([...result.hotPathPlan.actions]),
      authorizationRequirements: Object.freeze([...result.hotPathPlan.authorizationRequirements]),
      containmentPlan: deepFreeze({
        ...result.hotPathPlan.containmentPlan,
        actions: Object.freeze([...result.hotPathPlan.containmentPlan.actions]),
        metadata: Object.freeze({ ...result.hotPathPlan.containmentPlan.metadata }),
      }),
      metadata: Object.freeze({ ...result.hotPathPlan.metadata }),
    }),
    authorizationResult: deepFreeze({
      ...result.authorizationResult,
      authorizationRequirements: Object.freeze([
        ...result.authorizationResult.authorizationRequirements,
      ]),
      metadata: result.authorizationResult.metadata
        ? Object.freeze({ ...result.authorizationResult.metadata })
        : undefined,
    }),
    executorRegistryResult: deepFreeze({
      ...result.executorRegistryResult,
      metadata: Object.freeze({ ...result.executorRegistryResult.metadata }),
    }),
    routingResult: deepFreeze({
      ...result.routingResult,
      routes: Object.freeze([...result.routingResult.routes]),
      metadata: Object.freeze({ ...result.routingResult.metadata }),
    }),
    dispatchResult: deepFreeze({
      ...result.dispatchResult,
      intents: Object.freeze([...result.dispatchResult.intents]),
      metadata: Object.freeze({ ...result.dispatchResult.metadata }),
    }),
    metadata: Object.freeze({ ...result.metadata }),
  });
}

function freezeDispatchReport(
  report: SecurityStartupExecutionDispatchReport,
): SecurityStartupExecutionDispatchReport {
  return deepFreeze({
    ...report,
    startupExecutionPlanningReport: deepFreeze(report.startupExecutionPlanningReport),
    orchestrationResult: report.orchestrationResult ? freezeExecutionResult(report.orchestrationResult) : undefined,
    verifiedExecutionBatches: Object.freeze([...report.verifiedExecutionBatches]),
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicDispatchId(request: SecurityStartupExecutionDispatchRequest): string {
  const planningReport = request.startupExecutionPlanningReport;
  const batchSignature = planningReport.executionBatches
    .map((batch) => [
      batch.sequence,
      batch.actionType,
      batch.priority,
      batch.dependencyRank,
      batch.findingIds.join(','),
      batch.targetIds.join(','),
      batch.metadata.policy,
    ].join(':'))
    .join('|');

  return [
    'security-startup-execution-dispatch',
    planningReport.planningId,
    planningReport.pipelineId,
    planningReport.executionPlan.planId,
    planningReport.correlationId,
    planningReport.transactionId,
    planningReport.runtimeId,
    planningReport.guildId,
    String(planningReport.executionBatches.length),
    batchSignature,
  ].join(':');
}

function comparePriority(left: SecurityActionPriority, right: SecurityActionPriority): number {
  const priorityRank = (priority: SecurityActionPriority): number => {
    switch (priority) {
      case SecurityActionPriority.CRITICAL:
        return 0;
      case SecurityActionPriority.HIGH:
        return 1;
      case SecurityActionPriority.NORMAL:
        return 2;
      default:
        return 3;
    }
  };

  return priorityRank(left) - priorityRank(right);
}

function compareBatches(left: SecurityStartupExecutionBatch, right: SecurityStartupExecutionBatch): number {
  const dependency = left.dependencyRank - right.dependencyRank;
  if (dependency !== 0) {
    return dependency;
  }

  const priority = comparePriority(left.priority, right.priority);
  if (priority !== 0) {
    return priority;
  }

  const actionType = left.actionType.localeCompare(right.actionType);
  if (actionType !== 0) {
    return actionType;
  }

  return left.batchId.localeCompare(right.batchId);
}

function validatePlanningReport(
  report: SecurityStartupExecutionPlanningReport,
  dispatchId: string,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(dispatchId)) {
    failures.push(FAILURE_DISPATCH_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.planningId)) {
    failures.push(FAILURE_PLANNING_REPORT_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.pipelineId)) {
    failures.push(FAILURE_PIPELINE_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.executionPlan?.planId ?? '')) {
    failures.push(FAILURE_EXECUTION_PLAN_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }
  if (
    !report.success ||
    report.verificationOutcome !== SecurityStartupExecutionPlanningVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_PLANNING_REPORT_INCOMPLETE);
  }

  if (
    report.executionPlan.correlationId !== report.correlationId ||
    report.executionPlan.securityDecision.correlationId !== report.correlationId ||
    report.executionPlan.executionMetadata.planId !== report.executionPlan.planId ||
    report.executionPlan.executionMetadata.plannedActionCount !== report.executionPlan.plannedActions.length ||
    report.executionPlan.authorizationRequirements.length !== report.executionPlan.plannedActions.length
  ) {
    failures.push(FAILURE_PLANNING_REPORT_INTEGRITY_FAILED);
  }

  const seenBatchIds = new Set<string>();
  const batchesInReport = [...report.executionBatches];
  const orderedBatches = [...batchesInReport].sort(compareBatches);
  for (let index = 0; index < batchesInReport.length; index += 1) {
    const batch = batchesInReport[index];
    if (seenBatchIds.has(batch.batchId)) {
      failures.push(`${FAILURE_BATCH_DUPLICATE}:${batch.batchId}`);
      continue;
    }

    seenBatchIds.add(batch.batchId);

    if (
      batch.sequence !== index + 1 ||
      batch.batchId.indexOf(`${report.planningId}:batch:`) !== 0 ||
      batch.findingIds.length === 0 ||
      batch.targetIds.length === 0 ||
      !report.executionPlan.plannedActions.some((action) => action.type === batch.actionType) ||
      batch.priority !== report.executionPlan.plannedActions.find((action) => action.type === batch.actionType)?.priority ||
      compareBatches(batch, orderedBatches[index] ?? batch) !== 0
    ) {
      failures.push(`${FAILURE_BATCH_ORDER_INVALID}:${batch.batchId}`);
    }
  }

  if (orderedBatches.length !== batchesInReport.length) {
    failures.push(FAILURE_BATCH_INTEGRITY_FAILED);
  }

  return Object.freeze(failures);
}

function validateOrchestrationResult(
  planningReport: SecurityStartupExecutionPlanningReport,
  orchestrationResult: SecurityExecutionOrchestrationResult,
): readonly string[] {
  const failures: string[] = [];

  if (orchestrationResult.executionPlanId !== planningReport.executionPlan.planId) {
    failures.push(FAILURE_ORCHESTRATION_IDENTITY_MISMATCH);
  }

  if (orchestrationResult.correlationId !== planningReport.correlationId) {
    failures.push(FAILURE_ORCHESTRATION_IDENTITY_MISMATCH);
  }

  if (
    orchestrationResult.securityDecisionPreserved !== true ||
    orchestrationResult.threatAssessmentPreserved !== true ||
    orchestrationResult.dispatchResult.planId !== orchestrationResult.hotPathPlan.planId ||
    orchestrationResult.hotPathPlan.executionPlanId !== planningReport.executionPlan.planId ||
    orchestrationResult.dispatchResult.correlationId !== planningReport.correlationId ||
    orchestrationResult.dispatchResult.intents.length !== planningReport.executionPlan.plannedActions.length ||
    orchestrationResult.metadata.idempotencyKey !== `${planningReport.executionPlan.planId}:${planningReport.correlationId}`
  ) {
    failures.push(FAILURE_ORCHESTRATION_COMPLETION_VERIFICATION_FAILED);
  }

  if (!orchestrationResult.metadata.idempotencyKey) {
    failures.push(FAILURE_ORCHESTRATION_NOT_VERIFIED);
  }

  return Object.freeze(failures);
}

function buildFailureReport(
  request: SecurityStartupExecutionDispatchRequest,
  dispatchId: string,
  stagesCompleted: readonly SecurityStartupExecutionDispatchStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityStartupExecutionDispatchReport {
  const planningReport = request.startupExecutionPlanningReport;

  return freezeDispatchReport({
    dispatchId,
    planningId: planningReport.planningId,
    pipelineId: planningReport.pipelineId,
    correlationId: planningReport.correlationId,
    transactionId: planningReport.transactionId,
    runtimeId: planningReport.runtimeId,
    guildId: planningReport.guildId,
    executionPlanId: planningReport.executionPlan.planId,
    startupExecutionPlanningReport: planningReport,
    orchestrationResult: undefined,
    verifiedExecutionBatches: planningReport.executionBatches,
    orchestratorInvoked: false,
    stagesCompleted,
    verificationOutcome: SecurityStartupExecutionDispatchVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-execution-dispatcher' as const,
      deterministicDispatchId: true as const,
      planningReportVerified: false,
      planningReportId: planningReport.planningId,
      executionPlanId: planningReport.executionPlan.planId,
      executionBatchCount: planningReport.executionBatches.length,
      orchestrationResultVerified: false,
    }),
  });
}

function buildSuccessReport(
  request: SecurityStartupExecutionDispatchRequest,
  dispatchId: string,
  stagesCompleted: readonly SecurityStartupExecutionDispatchStage[],
  startedAtMs: number,
  orchestrationResult: SecurityExecutionOrchestrationResult,
): SecurityStartupExecutionDispatchReport {
  const planningReport = request.startupExecutionPlanningReport;

  return freezeDispatchReport({
    dispatchId,
    planningId: planningReport.planningId,
    pipelineId: planningReport.pipelineId,
    correlationId: planningReport.correlationId,
    transactionId: planningReport.transactionId,
    runtimeId: planningReport.runtimeId,
    guildId: planningReport.guildId,
    executionPlanId: planningReport.executionPlan.planId,
    startupExecutionPlanningReport: planningReport,
    orchestrationResult,
    verifiedExecutionBatches: planningReport.executionBatches,
    orchestratorInvoked: true,
    stagesCompleted,
    verificationOutcome: SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-execution-dispatcher' as const,
      deterministicDispatchId: true as const,
      planningReportVerified: true,
      planningReportId: planningReport.planningId,
      executionPlanId: planningReport.executionPlan.planId,
      executionBatchCount: planningReport.executionBatches.length,
      orchestrationResultVerified: true,
    }),
  });
}

export function freezeSecurityStartupExecutionDispatchRequest(
  request: SecurityStartupExecutionDispatchRequest,
): SecurityStartupExecutionDispatchRequest {
  return freezeDispatchRequest(request);
}

export class InMemorySecurityStartupExecutionDispatcher
  implements SecurityStartupExecutionDispatcher
{
  private readonly completedReports = new Map<string, SecurityStartupExecutionDispatchReport>();

  constructor(
    private readonly orchestrator: SecurityExecutionOrchestrator = new InMemorySecurityExecutionOrchestrator(),
  ) {}

  async dispatch(
    request: SecurityStartupExecutionDispatchRequest,
  ): Promise<SecurityStartupExecutionDispatchReport> {
    const frozenRequest = freezeDispatchRequest(request);
    const dispatchId = frozenRequest.dispatchId ?? toDeterministicDispatchId(frozenRequest);
    const startedAtMs = Date.now();

    const existing = this.completedReports.get(dispatchId);
    if (existing) {
      return freezeDispatchReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityStartupExecutionDispatchStage[] = [];
    stagesCompleted.push(SecurityStartupExecutionDispatchStage.DISPATCH_VALIDATION);

    const validationFailures = validatePlanningReport(frozenRequest.startupExecutionPlanningReport, dispatchId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityStartupExecutionDispatchStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        dispatchId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_ORCHESTRATION_NOT_VERIFIED}:${validationFailures.join(',')}`,
      );
      this.completedReports.set(dispatchId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupExecutionDispatchStage.BATCH_VERIFICATION);

    const orchestrationContext: SecurityExecutionOrchestrationContext = Object.freeze({
      executionPlan: frozenRequest.startupExecutionPlanningReport.executionPlan as SecurityExecutionPlan,
      metadata: Object.freeze({
        source: 'in-memory-security-startup-execution-dispatcher',
        dispatchId,
        planningId: frozenRequest.startupExecutionPlanningReport.planningId,
        pipelineId: frozenRequest.startupExecutionPlanningReport.pipelineId,
        correlationId: frozenRequest.startupExecutionPlanningReport.correlationId,
        transactionId: frozenRequest.startupExecutionPlanningReport.transactionId,
        runtimeId: frozenRequest.startupExecutionPlanningReport.runtimeId,
        guildId: frozenRequest.startupExecutionPlanningReport.guildId,
        executionBatchCount: frozenRequest.startupExecutionPlanningReport.executionBatches.length,
        verifiedExecutionBatches: frozenRequest.startupExecutionPlanningReport.executionBatches,
        planningReportMetadata: frozenRequest.startupExecutionPlanningReport.metadata,
      }),
    });

    stagesCompleted.push(SecurityStartupExecutionDispatchStage.ORCHESTRATOR_DISPATCH);
    const orchestrationResult = freezeExecutionResult(this.orchestrator.orchestrate(orchestrationContext));

    stagesCompleted.push(SecurityStartupExecutionDispatchStage.DISPATCH_VERIFICATION);
    const orchestrationFailures = validateOrchestrationResult(
      frozenRequest.startupExecutionPlanningReport,
      orchestrationResult,
    );

    stagesCompleted.push(SecurityStartupExecutionDispatchStage.REPORT_GENERATION);
    if (orchestrationFailures.length > 0) {
      const failure = buildFailureReport(
        frozenRequest,
        dispatchId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_ORCHESTRATION_NOT_VERIFIED}:${orchestrationFailures.join(',')}`,
      );
      this.completedReports.set(dispatchId, failure);
      return failure;
    }

    const success = buildSuccessReport(
      frozenRequest,
      dispatchId,
      Object.freeze(stagesCompleted),
      startedAtMs,
      orchestrationResult,
    );

    this.completedReports.set(dispatchId, success);
    return success;
  }
}