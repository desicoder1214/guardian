import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
  SecurityReconciliationReport,
  SecurityReconciliationStage,
  SecurityReconciliationVerificationOutcome,
} from './security-reconciliation-engine';

export enum SecurityReconciliationOrchestrationStage {
  RECONCILIATION_VALIDATION = 'RECONCILIATION_VALIDATION',
  FINDING_PRIORITIZATION = 'FINDING_PRIORITIZATION',
  EXECUTION_SCHEDULING = 'EXECUTION_SCHEDULING',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityReconciliationSchedulingAction {
  UNAUTHORIZED_BOT_CONTAINMENT = 'UNAUTHORIZED_BOT_CONTAINMENT',
  WEBHOOK_EVALUATION = 'WEBHOOK_EVALUATION',
  INTEGRATION_EVALUATION = 'INTEGRATION_EVALUATION',
  PERMISSION_DRIFT_EVALUATION = 'PERMISSION_DRIFT_EVALUATION',
  DANGEROUS_ROLE_EVALUATION = 'DANGEROUS_ROLE_EVALUATION',
}

export enum SecurityReconciliationOrchestrationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityReconciliationOrchestrationRequest {
  readonly orchestrationId?: string;
  readonly reconciliationReport: SecurityReconciliationReport;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityReconciliationSchedulingDecision {
  readonly decisionId: string;
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly findingId: string;
  readonly findingType: SecurityReconciliationFindingType;
  readonly severity: SecurityReconciliationFindingSeverity;
  readonly action: SecurityReconciliationSchedulingAction;
  readonly priorityRank: number;
  readonly targetId: string;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityReconciliationOrchestrationReport {
  readonly orchestrationId: string;
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityReconciliationOrchestrationStage[];
  readonly prioritizedFindings: readonly SecurityReconciliationFinding[];
  readonly schedulingDecisions: readonly SecurityReconciliationSchedulingDecision[];
  readonly verificationOutcome: SecurityReconciliationOrchestrationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-reconciliation-orchestrator';
    readonly deterministicOrchestrationId: true;
    readonly reconciliationReportIntegrityValidated: boolean;
  };
}

export interface SecurityReconciliationOrchestrator {
  execute(
    request: SecurityReconciliationOrchestrationRequest,
  ): Promise<SecurityReconciliationOrchestrationReport>;
}

const FAILURE_ORCHESTRATION_ID_REQUIRED = 'ORCHESTRATION_ID_REQUIRED';
const FAILURE_RECONCILIATION_ID_REQUIRED = 'RECONCILIATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_RECONCILIATION_INCOMPLETE = 'RECONCILIATION_INCOMPLETE';
const FAILURE_RECONCILIATION_INVALID = 'RECONCILIATION_INVALID';
const FAILURE_FINDING_DUPLICATE = 'FINDING_DUPLICATE';
const FAILURE_FINDING_CONTEXT_MISMATCH = 'FINDING_CONTEXT_MISMATCH';
const FAILURE_VERIFICATION_FAILED = 'VERIFICATION_FAILED';

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

function freezeSchedulingDecision(
  decision: SecurityReconciliationSchedulingDecision,
): SecurityReconciliationSchedulingDecision {
  return deepFreeze({
    ...decision,
    metadata: decision.metadata ? Object.freeze({ ...decision.metadata }) : undefined,
  });
}

export function freezeSecurityReconciliationOrchestrationRequest(
  request: SecurityReconciliationOrchestrationRequest,
): SecurityReconciliationOrchestrationRequest {
  return deepFreeze({
    ...request,
    reconciliationReport: deepFreeze({
      ...request.reconciliationReport,
      stagesCompleted: Object.freeze([...request.reconciliationReport.stagesCompleted]),
      findings: Object.freeze(
        request.reconciliationReport.findings.map((finding) => freezeFinding(finding)),
      ),
      metadata: Object.freeze({ ...request.reconciliationReport.metadata }),
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityReconciliationOrchestrationReport,
): SecurityReconciliationOrchestrationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    prioritizedFindings: Object.freeze(report.prioritizedFindings.map((finding) => freezeFinding(finding))),
    schedulingDecisions: Object.freeze(
      report.schedulingDecisions.map((decision) => freezeSchedulingDecision(decision)),
    ),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicOrchestrationId(
  request: SecurityReconciliationOrchestrationRequest,
): string {
  const report = request.reconciliationReport;
  return [
    'security-reconciliation-orchestration',
    report.reconciliationId,
    report.runtimeId,
    report.guildId,
    report.transactionId,
    report.correlationId,
  ].join(':');
}

function severityRank(severity: SecurityReconciliationFindingSeverity): number {
  switch (severity) {
    case SecurityReconciliationFindingSeverity.CRITICAL:
      return 0;
    case SecurityReconciliationFindingSeverity.HIGH:
      return 1;
    case SecurityReconciliationFindingSeverity.MEDIUM:
      return 2;
    case SecurityReconciliationFindingSeverity.LOW:
      return 3;
    default:
      return 4;
  }
}

function findingTypeRank(type: SecurityReconciliationFindingType): number {
  switch (type) {
    case SecurityReconciliationFindingType.UNAUTHORIZED_BOT:
      return 0;
    case SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK:
      return 1;
    case SecurityReconciliationFindingType.WEBHOOK_ORPHANED:
      return 2;
    case SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS:
      return 3;
    case SecurityReconciliationFindingType.WEBHOOK_NEW:
      return 4;
    case SecurityReconciliationFindingType.WEBHOOK_MODIFIED:
      return 5;
    case SecurityReconciliationFindingType.WEBHOOK_DELETED:
      return 6;
    case SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT:
      return 7;
    case SecurityReconciliationFindingType.PERMISSION_DRIFT:
      return 8;
    case SecurityReconciliationFindingType.SNAPSHOT_MISMATCH:
      return 9;
    default:
      return 10;
  }
}

function prioritizeFindings(
  findings: readonly SecurityReconciliationFinding[],
): readonly SecurityReconciliationFinding[] {
  const ordered = [...findings].sort((left, right) => {
    const severity = severityRank(left.severity) - severityRank(right.severity);
    if (severity !== 0) {
      return severity;
    }

    const type = findingTypeRank(left.type) - findingTypeRank(right.type);
    if (type !== 0) {
      return type;
    }

    return left.findingId.localeCompare(right.findingId);
  });

  return Object.freeze(ordered.map((finding) => freezeFinding(finding)));
}

function toSchedulingActions(
  finding: SecurityReconciliationFinding,
): readonly SecurityReconciliationSchedulingAction[] {
  switch (finding.type) {
    case SecurityReconciliationFindingType.UNAUTHORIZED_BOT:
      return Object.freeze([SecurityReconciliationSchedulingAction.UNAUTHORIZED_BOT_CONTAINMENT]);
    case SecurityReconciliationFindingType.WEBHOOK_NEW:
    case SecurityReconciliationFindingType.WEBHOOK_MODIFIED:
    case SecurityReconciliationFindingType.WEBHOOK_DELETED:
    case SecurityReconciliationFindingType.WEBHOOK_ORPHANED:
    case SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS:
    case SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK:
      return Object.freeze([
        SecurityReconciliationSchedulingAction.WEBHOOK_EVALUATION,
        SecurityReconciliationSchedulingAction.INTEGRATION_EVALUATION,
      ]);
    case SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT:
      return Object.freeze([SecurityReconciliationSchedulingAction.DANGEROUS_ROLE_EVALUATION]);
    case SecurityReconciliationFindingType.PERMISSION_DRIFT:
      return Object.freeze([SecurityReconciliationSchedulingAction.PERMISSION_DRIFT_EVALUATION]);
    case SecurityReconciliationFindingType.SNAPSHOT_MISMATCH:
      return Object.freeze([SecurityReconciliationSchedulingAction.INTEGRATION_EVALUATION]);
    default:
      return Object.freeze([]);
  }
}

function toSchedulingDecisions(
  orchestrationId: string,
  prioritizedFindings: readonly SecurityReconciliationFinding[],
): readonly SecurityReconciliationSchedulingDecision[] {
  const decisions: SecurityReconciliationSchedulingDecision[] = [];

  for (let findingIndex = 0; findingIndex < prioritizedFindings.length; findingIndex += 1) {
    const finding = prioritizedFindings[findingIndex];
    const actions = toSchedulingActions(finding);
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
      const action = actions[actionIndex];
      const priorityRank = findingIndex * 10 + actionIndex;
      decisions.push(
        freezeSchedulingDecision({
          decisionId: `${orchestrationId}:decision:${finding.findingId}:${action}`,
          reconciliationId: finding.findingId.split(':finding:')[0] ?? '',
          correlationId: finding.correlationId,
          transactionId: '',
          guildId: finding.guildId,
          runtimeId: finding.runtimeId,
          findingId: finding.findingId,
          findingType: finding.type,
          severity: finding.severity,
          action,
          priorityRank,
          targetId: finding.targetId,
          reason: finding.summary,
          metadata: Object.freeze({ sourceFindingSeverity: finding.severity }),
        }),
      );
    }
  }

  return Object.freeze(decisions);
}

function validateReconciliationReport(
  orchestrationId: string,
  report: SecurityReconciliationReport,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(orchestrationId)) {
    failures.push(FAILURE_ORCHESTRATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.reconciliationId)) {
    failures.push(FAILURE_RECONCILIATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }
  if (!isNonEmptyString(report.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }

  const hasReportGeneration = report.stagesCompleted.includes(SecurityReconciliationStage.REPORT_GENERATION);
  if (!report.success || report.verificationOutcome !== SecurityReconciliationVerificationOutcome.VERIFIED) {
    failures.push(FAILURE_RECONCILIATION_INCOMPLETE);
  }
  if (!hasReportGeneration) {
    failures.push(FAILURE_RECONCILIATION_INVALID);
  }

  const seenFindingIds = new Set<string>();
  for (const finding of report.findings) {
    if (seenFindingIds.has(finding.findingId)) {
      failures.push(`${FAILURE_FINDING_DUPLICATE}:${finding.findingId}`);
      continue;
    }
    seenFindingIds.add(finding.findingId);

    if (
      finding.correlationId !== report.correlationId ||
      finding.guildId !== report.guildId ||
      finding.runtimeId !== report.runtimeId
    ) {
      failures.push(`${FAILURE_FINDING_CONTEXT_MISMATCH}:${finding.findingId}`);
    }
  }

  return Object.freeze(failures);
}

function buildFailureReport(
  report: SecurityReconciliationReport,
  orchestrationId: string,
  stagesCompleted: readonly SecurityReconciliationOrchestrationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityReconciliationOrchestrationReport {
  return freezeReport({
    orchestrationId,
    reconciliationId: report.reconciliationId,
    correlationId: report.correlationId,
    transactionId: report.transactionId,
    guildId: report.guildId,
    runtimeId: report.runtimeId,
    stagesCompleted,
    prioritizedFindings: Object.freeze([]),
    schedulingDecisions: Object.freeze([]),
    verificationOutcome: SecurityReconciliationOrchestrationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-reconciliation-orchestrator' as const,
      deterministicOrchestrationId: true as const,
      reconciliationReportIntegrityValidated: false,
    }),
  });
}

export class InMemorySecurityReconciliationOrchestrator
  implements SecurityReconciliationOrchestrator
{
  private readonly completedReports = new Map<string, SecurityReconciliationOrchestrationReport>();

  async execute(
    request: SecurityReconciliationOrchestrationRequest,
  ): Promise<SecurityReconciliationOrchestrationReport> {
    const frozenRequest = freezeSecurityReconciliationOrchestrationRequest(request);
    const orchestrationId =
      frozenRequest.orchestrationId ?? toDeterministicOrchestrationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(orchestrationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityReconciliationOrchestrationStage[] = [];
    stagesCompleted.push(SecurityReconciliationOrchestrationStage.RECONCILIATION_VALIDATION);
    const validationFailures = validateReconciliationReport(
      orchestrationId,
      frozenRequest.reconciliationReport,
    );
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityReconciliationOrchestrationStage.REPORT_GENERATION);
      const failureReport = buildFailureReport(
        frozenRequest.reconciliationReport,
        orchestrationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        validationFailures.join(','),
      );
      this.completedReports.set(orchestrationId, failureReport);
      return failureReport;
    }

    stagesCompleted.push(SecurityReconciliationOrchestrationStage.FINDING_PRIORITIZATION);
    const prioritizedFindings = prioritizeFindings(frozenRequest.reconciliationReport.findings);

    stagesCompleted.push(SecurityReconciliationOrchestrationStage.EXECUTION_SCHEDULING);
    const schedulingDecisionsWithPlaceholders = toSchedulingDecisions(
      orchestrationId,
      prioritizedFindings,
    );
    const schedulingDecisions = Object.freeze(
      schedulingDecisionsWithPlaceholders.map((decision) =>
        freezeSchedulingDecision({
          ...decision,
          reconciliationId: frozenRequest.reconciliationReport.reconciliationId,
          transactionId: frozenRequest.reconciliationReport.transactionId,
        }),
      ),
    );

    stagesCompleted.push(SecurityReconciliationOrchestrationStage.VERIFICATION);
    const verificationSucceeded = schedulingDecisions.every(
      (decision) =>
        decision.reconciliationId === frozenRequest.reconciliationReport.reconciliationId &&
        decision.correlationId === frozenRequest.reconciliationReport.correlationId &&
        decision.transactionId === frozenRequest.reconciliationReport.transactionId &&
        decision.guildId === frozenRequest.reconciliationReport.guildId &&
        decision.runtimeId === frozenRequest.reconciliationReport.runtimeId,
    );

    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityReconciliationOrchestrationStage.REPORT_GENERATION);
      const verificationFailure = buildFailureReport(
        frozenRequest.reconciliationReport,
        orchestrationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        FAILURE_VERIFICATION_FAILED,
      );
      this.completedReports.set(orchestrationId, verificationFailure);
      return verificationFailure;
    }

    stagesCompleted.push(SecurityReconciliationOrchestrationStage.REPORT_GENERATION);

    const report = freezeReport({
      orchestrationId,
      reconciliationId: frozenRequest.reconciliationReport.reconciliationId,
      correlationId: frozenRequest.reconciliationReport.correlationId,
      transactionId: frozenRequest.reconciliationReport.transactionId,
      guildId: frozenRequest.reconciliationReport.guildId,
      runtimeId: frozenRequest.reconciliationReport.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      prioritizedFindings,
      schedulingDecisions,
      verificationOutcome: SecurityReconciliationOrchestrationVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-reconciliation-orchestrator' as const,
        deterministicOrchestrationId: true as const,
        reconciliationReportIntegrityValidated: true,
      }),
    });

    this.completedReports.set(orchestrationId, report);
    return report;
  }
}
