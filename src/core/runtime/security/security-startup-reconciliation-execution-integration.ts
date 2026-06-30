import {
  InMemorySecurityStartupExecutionDispatcher,
  SecurityStartupExecutionDispatchReport,
  SecurityStartupExecutionDispatchRequest,
  SecurityStartupExecutionDispatchVerificationOutcome,
  freezeSecurityStartupExecutionDispatchRequest,
} from './security-startup-execution-dispatcher';
import { SecurityStartupExecutionPlanningReport, SecurityStartupExecutionPlanningVerificationOutcome } from './security-startup-execution-planning-engine';
import { SecurityReconciliationFinding, SecurityReconciliationFindingType } from './security-reconciliation-engine';
import { SecurityStartupReconciliationPipelineReport, SecurityStartupReconciliationPipelineVerificationOutcome } from './security-startup-reconciliation-pipeline';

export enum SecurityStartupReconciliationExecutionIntegrationStage {
  INTEGRATION_VALIDATION = 'INTEGRATION_VALIDATION',
  DISPATCH_DELEGATION = 'DISPATCH_DELEGATION',
  DISPATCH_VERIFICATION = 'DISPATCH_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityStartupReconciliationExecutionIntegrationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityStartupReconciliationExecutionIntegrationRequest {
  readonly integrationId?: string;
  readonly startupReconciliationReport: SecurityStartupReconciliationPipelineReport;
  readonly startupExecutionPlanningReport: SecurityStartupExecutionPlanningReport;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityStartupReconciliationExecutionIntegrationReport {
  readonly integrationId: string;
  readonly pipelineId: string;
  readonly planningId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly startupReconciliationReport: SecurityStartupReconciliationPipelineReport;
  readonly startupExecutionPlanningReport: SecurityStartupExecutionPlanningReport;
  readonly startupExecutionDispatchReport?: SecurityStartupExecutionDispatchReport;
  readonly verifiedFindingTypes: readonly SecurityReconciliationFindingType[];
  readonly stagesCompleted: readonly SecurityStartupReconciliationExecutionIntegrationStage[];
  readonly verificationOutcome: SecurityStartupReconciliationExecutionIntegrationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-startup-reconciliation-execution-integration';
    readonly deterministicIntegrationId: true;
    readonly reconciliationReportVerified: boolean;
    readonly planningReportVerified: boolean;
    readonly dispatchReportVerified: boolean;
    readonly reconciliationReportId: string;
    readonly planningReportId: string;
    readonly dispatchReportId?: string;
    readonly findingCount: number;
    readonly executionBatchCount: number;
  };
}

export interface SecurityStartupReconciliationExecutionIntegration {
  execute(
    request: SecurityStartupReconciliationExecutionIntegrationRequest,
  ): Promise<SecurityStartupReconciliationExecutionIntegrationReport>;
}

const FAILURE_INTEGRATION_ID_REQUIRED = 'INTEGRATION_ID_REQUIRED';
const FAILURE_RECONCILIATION_REPORT_REQUIRED = 'RECONCILIATION_REPORT_REQUIRED';
const FAILURE_PLANNING_REPORT_REQUIRED = 'PLANNING_REPORT_REQUIRED';
const FAILURE_RECONCILIATION_REPORT_INCOMPLETE = 'RECONCILIATION_REPORT_INCOMPLETE';
const FAILURE_PLANNING_REPORT_INCOMPLETE = 'PLANNING_REPORT_INCOMPLETE';
const FAILURE_IDENTITY_MISMATCH = 'IDENTITY_MISMATCH';
const FAILURE_UNSUPPORTED_FINDING_TYPE = 'UNSUPPORTED_FINDING_TYPE';
const FAILURE_FINDING_COVERAGE_FAILED = 'FINDING_COVERAGE_FAILED';
const FAILURE_DISPATCH_FAILED = 'DISPATCH_FAILED';

const SUPPORTED_FINDING_TYPES: readonly SecurityReconciliationFindingType[] = Object.freeze([
  SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
  SecurityReconciliationFindingType.PRIVILEGE_ESCALATION,
  SecurityReconciliationFindingType.DUPLICATE_BOT_IDENTITY,
  SecurityReconciliationFindingType.MISSING_AUTHORIZED_BOT,
  SecurityReconciliationFindingType.ORPHANED_TRUSTED_BOT,
  SecurityReconciliationFindingType.REGISTRY_MISMATCH,
  SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
  SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
  SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
  SecurityReconciliationFindingType.WEBHOOK_ORPHANED,
  SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS,
  SecurityReconciliationFindingType.WEBHOOK_NEW,
  SecurityReconciliationFindingType.WEBHOOK_MODIFIED,
  SecurityReconciliationFindingType.WEBHOOK_DELETED,
  SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
  SecurityReconciliationFindingType.PERMISSION_DRIFT,
]);

const SUPPORTED_FINDING_TYPE_SET = new Set<SecurityReconciliationFindingType>(SUPPORTED_FINDING_TYPES);

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

function freezeRequest(
  request: SecurityStartupReconciliationExecutionIntegrationRequest,
): SecurityStartupReconciliationExecutionIntegrationRequest {
  return deepFreeze({
    ...request,
    startupReconciliationReport: deepFreeze({
      ...request.startupReconciliationReport,
      stagesCompleted: Object.freeze([...request.startupReconciliationReport.stagesCompleted]),
      findings: Object.freeze(
        request.startupReconciliationReport.findings.map((finding) =>
          deepFreeze({
            ...finding,
            metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
          }),
        ),
      ),
      componentStatuses: Object.freeze([
        ...request.startupReconciliationReport.componentStatuses,
      ]),
      metadata: Object.freeze({ ...request.startupReconciliationReport.metadata }),
    }),
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
      executionBatches: Object.freeze([
        ...request.startupExecutionPlanningReport.executionBatches,
      ]),
      metadata: Object.freeze({ ...request.startupExecutionPlanningReport.metadata }),
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityStartupReconciliationExecutionIntegrationReport,
): SecurityStartupReconciliationExecutionIntegrationReport {
  return deepFreeze({
    ...report,
    startupReconciliationReport: deepFreeze(report.startupReconciliationReport),
    startupExecutionPlanningReport: deepFreeze(report.startupExecutionPlanningReport),
    startupExecutionDispatchReport: report.startupExecutionDispatchReport
      ? deepFreeze(report.startupExecutionDispatchReport)
      : undefined,
    verifiedFindingTypes: Object.freeze([...report.verifiedFindingTypes]),
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicIntegrationId(
  request: SecurityStartupReconciliationExecutionIntegrationRequest,
): string {
  const reconciliationReport = request.startupReconciliationReport;
  const planningReport = request.startupExecutionPlanningReport;
  const findingSignature = reconciliationReport.findings
    .map((finding) => `${finding.type}:${finding.findingId}`)
    .join('|');

  return [
    'startup-reconciliation-execution-integration',
    reconciliationReport.pipelineId,
    planningReport.planningId,
    planningReport.executionPlan.planId,
    reconciliationReport.pipelineId,
    reconciliationReport.correlationId,
    reconciliationReport.transactionId,
    reconciliationReport.runtimeId,
    reconciliationReport.guildId,
    String(reconciliationReport.findings.length),
    String(planningReport.executionBatches.length),
    findingSignature,
  ].join(':');
}

function validateFindingTypes(findings: readonly SecurityReconciliationFinding[]): readonly string[] {
  const failures: string[] = [];

  for (const finding of findings) {
    if (!SUPPORTED_FINDING_TYPE_SET.has(finding.type)) {
      failures.push(`${FAILURE_UNSUPPORTED_FINDING_TYPE}:${finding.type}`);
    }
  }

  return Object.freeze(failures);
}

function validateCoverage(
  reconciliationReport: SecurityStartupReconciliationPipelineReport,
  planningReport: SecurityStartupExecutionPlanningReport,
): readonly string[] {
  const failures: string[] = [];
  const findingIds = new Set(reconciliationReport.findings.map((finding) => finding.findingId));
  const plannedFindingIds = new Set<string>();

  for (const batch of planningReport.executionBatches) {
    for (const findingId of batch.findingIds) {
      plannedFindingIds.add(findingId);
      if (!findingIds.has(findingId)) {
        failures.push(`${FAILURE_FINDING_COVERAGE_FAILED}:${findingId}`);
      }
    }
  }

  for (const finding of reconciliationReport.findings) {
    if (!plannedFindingIds.has(finding.findingId)) {
      failures.push(`${FAILURE_FINDING_COVERAGE_FAILED}:${finding.findingId}`);
    }
  }

  return Object.freeze(failures);
}

function collectVerifiedFindingTypes(
  findings: readonly SecurityReconciliationFinding[],
): readonly SecurityReconciliationFindingType[] {
  const ordered: SecurityReconciliationFindingType[] = [];
  const seen = new Set<SecurityReconciliationFindingType>();

  for (const supportedType of SUPPORTED_FINDING_TYPES) {
    if (findings.some((finding) => finding.type === supportedType) && !seen.has(supportedType)) {
      seen.add(supportedType);
      ordered.push(supportedType);
    }
  }

  return Object.freeze(ordered);
}

function buildFailureReport(
  request: SecurityStartupReconciliationExecutionIntegrationRequest,
  integrationId: string,
  stagesCompleted: readonly SecurityStartupReconciliationExecutionIntegrationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityStartupReconciliationExecutionIntegrationReport {
  const reconciliationReport = request.startupReconciliationReport;
  const planningReport = request.startupExecutionPlanningReport;

  return freezeReport({
    integrationId,
    pipelineId: reconciliationReport.pipelineId,
    planningId: planningReport.planningId,
    correlationId: reconciliationReport.correlationId,
    transactionId: reconciliationReport.transactionId,
    runtimeId: reconciliationReport.runtimeId,
    guildId: reconciliationReport.guildId,
    startupReconciliationReport: reconciliationReport,
    startupExecutionPlanningReport: planningReport,
    startupExecutionDispatchReport: undefined,
    verifiedFindingTypes: collectVerifiedFindingTypes(reconciliationReport.findings),
    stagesCompleted,
    verificationOutcome: SecurityStartupReconciliationExecutionIntegrationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-reconciliation-execution-integration' as const,
      deterministicIntegrationId: true as const,
      reconciliationReportVerified: false,
      planningReportVerified: false,
      dispatchReportVerified: false,
      reconciliationReportId: reconciliationReport.pipelineId,
      planningReportId: planningReport.planningId,
      dispatchReportId: undefined,
      findingCount: reconciliationReport.findings.length,
      executionBatchCount: planningReport.executionBatches.length,
    }),
  });
}

function buildSuccessReport(
  request: SecurityStartupReconciliationExecutionIntegrationRequest,
  integrationId: string,
  stagesCompleted: readonly SecurityStartupReconciliationExecutionIntegrationStage[],
  startedAtMs: number,
  dispatchReport: SecurityStartupExecutionDispatchReport,
): SecurityStartupReconciliationExecutionIntegrationReport {
  const reconciliationReport = request.startupReconciliationReport;
  const planningReport = request.startupExecutionPlanningReport;

  return freezeReport({
    integrationId,
    pipelineId: reconciliationReport.pipelineId,
    planningId: planningReport.planningId,
    correlationId: reconciliationReport.correlationId,
    transactionId: reconciliationReport.transactionId,
    runtimeId: reconciliationReport.runtimeId,
    guildId: reconciliationReport.guildId,
    startupReconciliationReport: reconciliationReport,
    startupExecutionPlanningReport: planningReport,
    startupExecutionDispatchReport: dispatchReport,
    verifiedFindingTypes: collectVerifiedFindingTypes(reconciliationReport.findings),
    stagesCompleted,
    verificationOutcome: SecurityStartupReconciliationExecutionIntegrationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-reconciliation-execution-integration' as const,
      deterministicIntegrationId: true as const,
      reconciliationReportVerified: true,
      planningReportVerified: true,
      dispatchReportVerified: true,
      reconciliationReportId: reconciliationReport.pipelineId,
      planningReportId: planningReport.planningId,
      dispatchReportId: dispatchReport.dispatchId,
      findingCount: reconciliationReport.findings.length,
      executionBatchCount: planningReport.executionBatches.length,
    }),
  });
}

export function freezeSecurityStartupReconciliationExecutionIntegrationRequest(
  request: SecurityStartupReconciliationExecutionIntegrationRequest,
): SecurityStartupReconciliationExecutionIntegrationRequest {
  return freezeRequest(request);
}

export class InMemorySecurityStartupReconciliationExecutionIntegration
  implements SecurityStartupReconciliationExecutionIntegration
{
  private readonly completedReports = new Map<string, SecurityStartupReconciliationExecutionIntegrationReport>();

  constructor(
    private readonly startupExecutionDispatcher: InMemorySecurityStartupExecutionDispatcher = new InMemorySecurityStartupExecutionDispatcher(),
  ) {}

  async execute(
    request: SecurityStartupReconciliationExecutionIntegrationRequest,
  ): Promise<SecurityStartupReconciliationExecutionIntegrationReport> {
    const frozenRequest = freezeRequest(request);
    const integrationId = frozenRequest.integrationId ?? toDeterministicIntegrationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(integrationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
        startupExecutionDispatchReport: cached.startupExecutionDispatchReport
          ? {
              ...cached.startupExecutionDispatchReport,
              idempotentReplay: true,
            }
          : undefined,
      });
    }

    const stagesCompleted: SecurityStartupReconciliationExecutionIntegrationStage[] = [];
    stagesCompleted.push(SecurityStartupReconciliationExecutionIntegrationStage.INTEGRATION_VALIDATION);

    const reconciliationReport = frozenRequest.startupReconciliationReport;
    const planningReport = frozenRequest.startupExecutionPlanningReport;

    const validationFailures: string[] = [];
    if (!isNonEmptyString(integrationId)) {
      validationFailures.push(FAILURE_INTEGRATION_ID_REQUIRED);
    }
    if (!isNonEmptyString(reconciliationReport.pipelineId)) {
      validationFailures.push(FAILURE_RECONCILIATION_REPORT_REQUIRED);
    }
    if (!isNonEmptyString(planningReport.planningId)) {
      validationFailures.push(FAILURE_PLANNING_REPORT_REQUIRED);
    }
    if (
      !reconciliationReport.success ||
      reconciliationReport.verificationOutcome !== SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED
    ) {
      validationFailures.push(FAILURE_RECONCILIATION_REPORT_INCOMPLETE);
    }
    if (
      !planningReport.success ||
      planningReport.verificationOutcome !== SecurityStartupExecutionPlanningVerificationOutcome.VERIFIED
    ) {
      validationFailures.push(FAILURE_PLANNING_REPORT_INCOMPLETE);
    }
    if (
      reconciliationReport.correlationId !== planningReport.correlationId ||
      reconciliationReport.transactionId !== planningReport.transactionId ||
      reconciliationReport.runtimeId !== planningReport.runtimeId ||
      reconciliationReport.guildId !== planningReport.guildId ||
      reconciliationReport.pipelineId !== planningReport.pipelineId ||
      planningReport.metadata.pipelineReportId !== reconciliationReport.pipelineId
    ) {
      validationFailures.push(FAILURE_IDENTITY_MISMATCH);
    }

    validationFailures.push(...validateFindingTypes(reconciliationReport.findings));
    validationFailures.push(...validateCoverage(reconciliationReport, planningReport));

    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityStartupReconciliationExecutionIntegrationStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        integrationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        validationFailures.join(','),
      );
      this.completedReports.set(integrationId, failure);
      return failure;
    }

    const dispatchRequest: SecurityStartupExecutionDispatchRequest = freezeSecurityStartupExecutionDispatchRequest({
      dispatchId: integrationId,
      startupExecutionPlanningReport: planningReport,
      metadata: Object.freeze({
        source: 'in-memory-security-startup-reconciliation-execution-integration',
        reconciliationReportId: reconciliationReport.pipelineId,
        planningReportId: planningReport.planningId,
        pipelineId: reconciliationReport.pipelineId,
        findingCount: reconciliationReport.findings.length,
        findingTypes: collectVerifiedFindingTypes(reconciliationReport.findings),
      }),
    });

    stagesCompleted.push(SecurityStartupReconciliationExecutionIntegrationStage.DISPATCH_DELEGATION);
    const dispatchReport = await this.startupExecutionDispatcher.dispatch(dispatchRequest);

    stagesCompleted.push(SecurityStartupReconciliationExecutionIntegrationStage.DISPATCH_VERIFICATION);
    const dispatchFailures: string[] = [];
    if (
      !dispatchReport.success ||
      dispatchReport.verificationOutcome !== SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED ||
      dispatchReport.planningId !== planningReport.planningId ||
      dispatchReport.pipelineId !== reconciliationReport.pipelineId ||
      dispatchReport.correlationId !== reconciliationReport.correlationId ||
      dispatchReport.transactionId !== reconciliationReport.transactionId ||
      dispatchReport.runtimeId !== reconciliationReport.runtimeId ||
      dispatchReport.guildId !== reconciliationReport.guildId
    ) {
      dispatchFailures.push(`${FAILURE_DISPATCH_FAILED}:${dispatchReport.failureReason ?? 'UNKNOWN'}`);
    }

    stagesCompleted.push(SecurityStartupReconciliationExecutionIntegrationStage.REPORT_GENERATION);
    if (dispatchFailures.length > 0) {
      const failure = buildFailureReport(
        frozenRequest,
        integrationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        dispatchFailures.join(','),
      );
      this.completedReports.set(integrationId, failure);
      return failure;
    }

    const success = buildSuccessReport(
      frozenRequest,
      integrationId,
      Object.freeze(stagesCompleted),
      startedAtMs,
      dispatchReport,
    );

    this.completedReports.set(integrationId, success);
    return success;
  }
}