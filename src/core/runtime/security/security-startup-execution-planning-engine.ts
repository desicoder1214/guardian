import { AuditAttributionConfidence } from '../discord/audit-attribution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../discord/detection-engine';
import {
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../discord/security-decision-types';
import {
  ExecutionAuthorizationRequirement,
  SecurityExecutionPlan,
} from '../discord/security-execution-types';
import { SecurityActionType as SecurityPolicyActionType, SecurityDecision } from '../discord/security-policy-types';
import { ThreatAssessment } from '../discord/runtime-threat-interpretation-engine';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';
import {
  SecurityStartupReconciliationPipelineReport,
  SecurityStartupReconciliationPipelineVerificationOutcome,
} from './security-startup-reconciliation-pipeline';

export enum SecurityStartupExecutionPlanningStage {
  PLANNING_VALIDATION = 'PLANNING_VALIDATION',
  FINDING_TRANSLATION = 'FINDING_TRANSLATION',
  BATCH_GROUPING = 'BATCH_GROUPING',
  DEPENDENCY_ORDERING = 'DEPENDENCY_ORDERING',
  PLAN_VERIFICATION = 'PLAN_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityStartupExecutionPlanningVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum SecurityStartupExecutionBatchPolicy {
  UNAUTHORIZED_BOT_FIRST = 'UNAUTHORIZED_BOT_FIRST',
  WEBHOOK_AFTER_BOT = 'WEBHOOK_AFTER_BOT',
  ROLE_AFTER_WEBHOOK = 'ROLE_AFTER_WEBHOOK',
  PERMISSION_AFTER_ROLE = 'PERMISSION_AFTER_ROLE',
  AUDIT_LAST = 'AUDIT_LAST',
}

export interface SecurityStartupExecutionBatch {
  readonly batchId: string;
  readonly sequence: number;
  readonly actionType: SecurityActionType;
  readonly priority: SecurityActionPriority;
  readonly dependencyRank: number;
  readonly findingIds: readonly string[];
  readonly targetIds: readonly string[];
  readonly metadata: {
    readonly source: 'in-memory-security-startup-execution-planning-engine';
    readonly policy: SecurityStartupExecutionBatchPolicy;
  };
}

export interface SecurityStartupExecutionPlanningRequest {
  readonly planningId?: string;
  readonly startupPipelineReport: SecurityStartupReconciliationPipelineReport;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityStartupExecutionPlanningReport {
  readonly planningId: string;
  readonly pipelineId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly stagesCompleted: readonly SecurityStartupExecutionPlanningStage[];
  readonly executionPlan: SecurityExecutionPlan;
  readonly executionBatches: readonly SecurityStartupExecutionBatch[];
  readonly verificationOutcome: SecurityStartupExecutionPlanningVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-startup-execution-planning-engine';
    readonly deterministicPlanningId: true;
    readonly findingsOnly: true;
    readonly pipelineReportVerified: boolean;
    readonly pipelineReportId: string;
  };
}

export interface SecurityStartupExecutionPlanningEngine {
  execute(
    request: SecurityStartupExecutionPlanningRequest,
  ): Promise<SecurityStartupExecutionPlanningReport>;
}

const FAILURE_PLANNING_ID_REQUIRED = 'PLANNING_ID_REQUIRED';
const FAILURE_PIPELINE_ID_REQUIRED = 'PIPELINE_ID_REQUIRED';
const FAILURE_PIPELINE_INCOMPLETE = 'PIPELINE_INCOMPLETE';
const FAILURE_FINDING_DUPLICATE = 'FINDING_DUPLICATE';
const FAILURE_FINDING_CONTEXT_MISMATCH = 'FINDING_CONTEXT_MISMATCH';
const FAILURE_VERIFICATION_FAILED = 'VERIFICATION_FAILED';
const FAILURE_INCONSISTENT_STATE = 'INCONSISTENT_STATE';

interface PlannedStartupAction {
  readonly finding: SecurityReconciliationFinding;
  readonly actionType: SecurityActionType;
  readonly priority: SecurityActionPriority;
  readonly dependencyRank: number;
  readonly policy: SecurityStartupExecutionBatchPolicy;
}

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

function freezeBatch(batch: SecurityStartupExecutionBatch): SecurityStartupExecutionBatch {
  return deepFreeze({
    ...batch,
    findingIds: Object.freeze([...batch.findingIds]),
    targetIds: Object.freeze([...batch.targetIds]),
    metadata: Object.freeze({ ...batch.metadata }),
  });
}

function freezeAction(action: SecurityAction): SecurityAction {
  return deepFreeze({
    ...action,
    metadata: action.metadata && typeof action.metadata === 'object'
      ? Object.freeze({ ...(action.metadata as Record<string, unknown>) })
      : action.metadata,
  });
}

function freezeExecutionPlan(plan: SecurityExecutionPlan): SecurityExecutionPlan {
  return deepFreeze({
    ...plan,
    threatAssessment: plan.threatAssessment ? deepFreeze(plan.threatAssessment) : undefined,
    securityDecision: deepFreeze({
      ...plan.securityDecision,
      metadata:
        plan.securityDecision.metadata && typeof plan.securityDecision.metadata === 'object'
          ? Object.freeze({ ...(plan.securityDecision.metadata as Record<string, unknown>) })
          : plan.securityDecision.metadata,
    }),
    plannedActions: Object.freeze(plan.plannedActions.map((entry) => freezeAction(entry))),
    authorizationRequirements: Object.freeze(
      plan.authorizationRequirements.map((entry) => deepFreeze({ ...entry })),
    ),
    executionMetadata: Object.freeze({
      ...plan.executionMetadata,
      plannedActionTypes: Object.freeze([...plan.executionMetadata.plannedActionTypes]),
    }),
    auditMetadata: Object.freeze({ ...plan.auditMetadata }),
    rollbackMetadata: Object.freeze({ ...plan.rollbackMetadata }),
  });
}

export function freezeSecurityStartupExecutionPlanningRequest(
  request: SecurityStartupExecutionPlanningRequest,
): SecurityStartupExecutionPlanningRequest {
  return deepFreeze({
    ...request,
    startupPipelineReport: deepFreeze({
      ...request.startupPipelineReport,
      stagesCompleted: Object.freeze([...request.startupPipelineReport.stagesCompleted]),
      findings: Object.freeze(request.startupPipelineReport.findings.map((entry) => freezeFinding(entry))),
      componentStatuses: Object.freeze(
        request.startupPipelineReport.componentStatuses.map((entry) => deepFreeze({ ...entry })),
      ),
      metadata: Object.freeze({ ...request.startupPipelineReport.metadata }),
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityStartupExecutionPlanningReport,
): SecurityStartupExecutionPlanningReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    executionPlan: freezeExecutionPlan(report.executionPlan),
    executionBatches: Object.freeze(report.executionBatches.map((entry) => freezeBatch(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicPlanningId(request: SecurityStartupExecutionPlanningRequest): string {
  const pipeline = request.startupPipelineReport;
  return [
    'security-startup-execution-planning',
    pipeline.pipelineId,
    pipeline.runtimeId,
    pipeline.guildId,
    pipeline.transactionId,
    pipeline.correlationId,
    String(pipeline.findings.length),
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

function priorityFromSeverity(severity: SecurityReconciliationFindingSeverity): SecurityActionPriority {
  switch (severity) {
    case SecurityReconciliationFindingSeverity.CRITICAL:
      return SecurityActionPriority.CRITICAL;
    case SecurityReconciliationFindingSeverity.HIGH:
      return SecurityActionPriority.HIGH;
    case SecurityReconciliationFindingSeverity.MEDIUM:
      return SecurityActionPriority.NORMAL;
    case SecurityReconciliationFindingSeverity.LOW:
      return SecurityActionPriority.LOW;
    default:
      return SecurityActionPriority.LOW;
  }
}

function dependencyForFinding(
  finding: SecurityReconciliationFinding,
): Omit<PlannedStartupAction, 'finding' | 'priority'> {
  switch (finding.type) {
    case SecurityReconciliationFindingType.UNAUTHORIZED_BOT:
    case SecurityReconciliationFindingType.PRIVILEGE_ESCALATION:
      return Object.freeze({
        actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        dependencyRank: 0,
        policy: SecurityStartupExecutionBatchPolicy.UNAUTHORIZED_BOT_FIRST,
      });
    case SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK:
    case SecurityReconciliationFindingType.WEBHOOK_ORPHANED:
    case SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS:
    case SecurityReconciliationFindingType.WEBHOOK_NEW:
    case SecurityReconciliationFindingType.WEBHOOK_MODIFIED:
    case SecurityReconciliationFindingType.WEBHOOK_DELETED:
      return Object.freeze({
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        dependencyRank: 1,
        policy: SecurityStartupExecutionBatchPolicy.WEBHOOK_AFTER_BOT,
      });
    case SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT:
      return Object.freeze({
        actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
        dependencyRank: 2,
        policy: SecurityStartupExecutionBatchPolicy.ROLE_AFTER_WEBHOOK,
      });
    case SecurityReconciliationFindingType.PERMISSION_DRIFT:
    case SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY:
    case SecurityReconciliationFindingType.SNAPSHOT_MISMATCH:
    case SecurityReconciliationFindingType.REGISTRY_MISMATCH:
      return Object.freeze({
        actionType: SecurityActionType.LOCK_CHANNELS,
        dependencyRank: 3,
        policy: SecurityStartupExecutionBatchPolicy.PERMISSION_AFTER_ROLE,
      });
    default:
      return Object.freeze({
        actionType: SecurityActionType.CREATE_INCIDENT,
        dependencyRank: 4,
        policy: SecurityStartupExecutionBatchPolicy.AUDIT_LAST,
      });
  }
}

function toPlannedActions(findings: readonly SecurityReconciliationFinding[]): readonly PlannedStartupAction[] {
  const translated = findings.map((finding) => {
    const dependency = dependencyForFinding(finding);
    return deepFreeze({
      finding: freezeFinding(finding),
      actionType: dependency.actionType,
      priority: priorityFromSeverity(finding.severity),
      dependencyRank: dependency.dependencyRank,
      policy: dependency.policy,
    });
  });

  const ordered = [...translated].sort((left, right) => {
    const dependency = left.dependencyRank - right.dependencyRank;
    if (dependency !== 0) {
      return dependency;
    }

    const severity = severityRank(left.finding.severity) - severityRank(right.finding.severity);
    if (severity !== 0) {
      return severity;
    }

    const type = left.finding.type.localeCompare(right.finding.type);
    if (type !== 0) {
      return type;
    }

    return left.finding.findingId.localeCompare(right.finding.findingId);
  });

  return Object.freeze(ordered.map((entry) => deepFreeze(entry)));
}

function toThreatAssessment(
  findings: readonly SecurityReconciliationFinding[],
  correlationId: string,
): ThreatAssessment | undefined {
  if (findings.length === 0) {
    return undefined;
  }

  const highestSeverity = findings.reduce<SecurityReconciliationFindingSeverity>(
    (current, finding) => (severityRank(finding.severity) < severityRank(current) ? finding.severity : current),
    SecurityReconciliationFindingSeverity.LOW,
  );

  const severity =
    highestSeverity === SecurityReconciliationFindingSeverity.CRITICAL
      ? DetectionSeverity.CRITICAL
      : highestSeverity === SecurityReconciliationFindingSeverity.HIGH
        ? DetectionSeverity.HIGH
        : highestSeverity === SecurityReconciliationFindingSeverity.MEDIUM
          ? DetectionSeverity.MEDIUM
          : DetectionSeverity.LOW;

  const disposition =
    highestSeverity === SecurityReconciliationFindingSeverity.CRITICAL ||
    highestSeverity === SecurityReconciliationFindingSeverity.HIGH
      ? DetectionDisposition.MALICIOUS
      : DetectionDisposition.SUSPICIOUS;

  const confidence =
    highestSeverity === SecurityReconciliationFindingSeverity.CRITICAL
      ? DetectionConfidence.CERTAIN
      : highestSeverity === SecurityReconciliationFindingSeverity.HIGH
        ? DetectionConfidence.HIGH
        : DetectionConfidence.MEDIUM;

  return Object.freeze({
    severity,
    confidence,
    disposition,
    rationale: `Startup reconciliation produced ${findings.length} prioritized findings requiring execution planning.`,
    correlationIds: Object.freeze([correlationId]),
    overrides: Object.freeze([]),
  });
}

function buildDecisionModel(
  pipeline: SecurityStartupReconciliationPipelineReport,
  findings: readonly SecurityReconciliationFinding[],
  executionBatches: readonly SecurityStartupExecutionBatch[],
): SecurityDecisionModel {
  const decision = findings.length > 0 ? SecurityDecision.BLOCK : SecurityDecision.ALLOW;
  return Object.freeze({
    decision,
    reason:
      decision === SecurityDecision.BLOCK
        ? SecurityDecisionReason.POLICY_BLOCK
        : SecurityDecisionReason.POLICY_ALLOW,
    confidence: findings.length > 0 ? AuditAttributionConfidence.HIGH : AuditAttributionConfidence.LOW,
    actorId: 'startup-reconciliation-pipeline',
    guildId: pipeline.guildId,
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: pipeline.correlationId,
    auditLogCorrelationId: `${pipeline.pipelineId}:audit`,
    metadata: Object.freeze({
      source: 'startup-execution-planning-engine',
      pipelineId: pipeline.pipelineId,
      runtimeId: pipeline.runtimeId,
      transactionId: pipeline.transactionId,
      executionBatchCount: executionBatches.length,
      startupReconciliationMetadata: Object.freeze({ ...pipeline.metadata }),
    }),
  });
}

function buildAuthorizationRequirements(
  actions: readonly SecurityAction[],
  decision: SecurityDecision,
  correlationId: string,
): readonly ExecutionAuthorizationRequirement[] {
  return Object.freeze(
    actions.map((action) =>
      Object.freeze({
        actionType: action.type,
        sequence: action.sequence,
        requiresAuthorization: action.type !== SecurityActionType.NONE,
        decision,
        correlationId,
      }),
    ),
  );
}

function buildExecutionBatches(
  planningId: string,
  planned: readonly PlannedStartupAction[],
): readonly SecurityStartupExecutionBatch[] {
  const grouped = new Map<string, SecurityStartupExecutionBatch>();

  for (const action of planned) {
    const key = `${action.dependencyRank}:${action.priority}:${action.actionType}`;
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(
        key,
        freezeBatch({
          ...existing,
          findingIds: Object.freeze([...existing.findingIds, action.finding.findingId]),
          targetIds: Object.freeze([...existing.targetIds, action.finding.targetId]),
        }),
      );
      continue;
    }

    grouped.set(
      key,
      freezeBatch({
        batchId: `${planningId}:batch:${key}`,
        sequence: 0,
        actionType: action.actionType,
        priority: action.priority,
        dependencyRank: action.dependencyRank,
        findingIds: Object.freeze([action.finding.findingId]),
        targetIds: Object.freeze([action.finding.targetId]),
        metadata: Object.freeze({
          source: 'in-memory-security-startup-execution-planning-engine' as const,
          policy: action.policy,
        }),
      }),
    );
  }

  const ordered = [...grouped.values()].sort((left, right) => {
    const dependency = left.dependencyRank - right.dependencyRank;
    if (dependency !== 0) {
      return dependency;
    }
    const priority =
      (left.priority === SecurityActionPriority.CRITICAL ? 0 : left.priority === SecurityActionPriority.HIGH ? 1 : left.priority === SecurityActionPriority.NORMAL ? 2 : 3) -
      (right.priority === SecurityActionPriority.CRITICAL ? 0 : right.priority === SecurityActionPriority.HIGH ? 1 : right.priority === SecurityActionPriority.NORMAL ? 2 : 3);
    if (priority !== 0) {
      return priority;
    }
    const actionCompare = left.actionType.localeCompare(right.actionType);
    if (actionCompare !== 0) {
      return actionCompare;
    }
    return left.batchId.localeCompare(right.batchId);
  });

  return Object.freeze(
    ordered.map((entry, index) =>
      freezeBatch({
        ...entry,
        sequence: index + 1,
        findingIds: Object.freeze([...entry.findingIds].sort((left, right) => left.localeCompare(right))),
        targetIds: Object.freeze([...entry.targetIds].sort((left, right) => left.localeCompare(right))),
      }),
    ),
  );
}

function buildExecutionPlan(
  planningId: string,
  pipeline: SecurityStartupReconciliationPipelineReport,
  findings: readonly SecurityReconciliationFinding[],
): { readonly executionPlan: SecurityExecutionPlan; readonly executionBatches: readonly SecurityStartupExecutionBatch[] } {
  const translated = toPlannedActions(findings);
  const actionEntries: SecurityAction[] = translated.map((entry, index) =>
    freezeAction({
      type: entry.actionType,
      priority: entry.priority,
      sequence: index + 1,
      metadata: Object.freeze({
        source: 'startup-execution-planning-engine',
        findingId: entry.finding.findingId,
        findingType: entry.finding.type,
        targetId: entry.finding.targetId,
        dependencyRank: entry.dependencyRank,
        pipelineId: pipeline.pipelineId,
      }),
    }),
  );

  const needsAudit = findings.length > 0;
  if (needsAudit) {
    actionEntries.push(
      freezeAction({
        type: SecurityActionType.CREATE_INCIDENT,
        priority: SecurityActionPriority.NORMAL,
        sequence: actionEntries.length + 1,
        metadata: Object.freeze({
          source: 'startup-execution-planning-engine',
          policy: SecurityStartupExecutionBatchPolicy.AUDIT_LAST,
          pipelineId: pipeline.pipelineId,
        }),
      }),
    );
    actionEntries.push(
      freezeAction({
        type: SecurityActionType.NOTIFY_AUDIT,
        priority: SecurityActionPriority.NORMAL,
        sequence: actionEntries.length + 1,
        metadata: Object.freeze({
          source: 'startup-execution-planning-engine',
          policy: SecurityStartupExecutionBatchPolicy.AUDIT_LAST,
          pipelineId: pipeline.pipelineId,
        }),
      }),
    );
  }

  const executionBatches = buildExecutionBatches(planningId, translated);
  const decisionModel = buildDecisionModel(pipeline, findings, executionBatches);
  const threatAssessment = toThreatAssessment(findings, pipeline.correlationId);
  const authorizationRequirements = buildAuthorizationRequirements(
    Object.freeze(actionEntries),
    decisionModel.decision,
    pipeline.correlationId,
  );
  const plan = freezeExecutionPlan({
    planId: `${planningId}:execution-plan`,
    correlationId: pipeline.correlationId,
    threatAssessment,
    securityDecision: decisionModel,
    plannedActions: Object.freeze(actionEntries),
    authorizationRequirements,
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner' as const,
      planId: `${planningId}:execution-plan`,
      plannedActionCount: actionEntries.length,
      plannedActionTypes: Object.freeze(actionEntries.map((entry) => entry.type)),
    }),
    auditMetadata: Object.freeze({
      planId: `${planningId}:execution-plan`,
      correlationId: pipeline.correlationId,
      decision: decisionModel.decision,
      decisionReason: decisionModel.reason,
      threatDisposition: threatAssessment?.disposition ?? DetectionDisposition.CLEAN,
      threatSeverity: threatAssessment?.severity ?? DetectionSeverity.INFO,
      threatConfidence: threatAssessment?.confidence ?? DetectionConfidence.LOW,
    }),
    rollbackMetadata: Object.freeze({
      supported: false,
      strategy: 'none' as const,
      reason: `Rollback is not supported for startup execution planning (${planningId})`,
    }),
  });

  return Object.freeze({ executionPlan: plan, executionBatches });
}

function validatePipelineReport(
  pipeline: SecurityStartupReconciliationPipelineReport,
  planningId: string,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(planningId)) {
    failures.push(FAILURE_PLANNING_ID_REQUIRED);
  }
  if (!isNonEmptyString(pipeline.pipelineId)) {
    failures.push(FAILURE_PIPELINE_ID_REQUIRED);
  }
  if (
    !pipeline.success ||
    pipeline.verificationOutcome !== SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_PIPELINE_INCOMPLETE);
  }

  const seenFindingIds = new Set<string>();
  for (const finding of pipeline.findings) {
    if (seenFindingIds.has(finding.findingId)) {
      failures.push(`${FAILURE_FINDING_DUPLICATE}:${finding.findingId}`);
      continue;
    }
    seenFindingIds.add(finding.findingId);

    if (
      finding.correlationId !== pipeline.correlationId ||
      finding.guildId !== pipeline.guildId ||
      finding.runtimeId !== pipeline.runtimeId
    ) {
      failures.push(`${FAILURE_FINDING_CONTEXT_MISMATCH}:${finding.findingId}`);
    }
  }

  return Object.freeze(failures);
}

function verifyPlan(
  report: SecurityStartupExecutionPlanningReport,
): boolean {
  return (
    report.executionPlan.correlationId === report.correlationId &&
    report.executionPlan.securityDecision.correlationId === report.correlationId &&
    report.executionPlan.plannedActions.every((action, index) => action.sequence === index + 1) &&
    report.executionPlan.authorizationRequirements.length === report.executionPlan.plannedActions.length &&
    report.executionBatches.every((batch, index) => batch.sequence === index + 1)
  );
}

function buildFailureReport(
  request: SecurityStartupExecutionPlanningRequest,
  planningId: string,
  stagesCompleted: readonly SecurityStartupExecutionPlanningStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityStartupExecutionPlanningReport {
  const emptyDecision = Object.freeze({
    decision: SecurityDecision.ALLOW,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.LOW,
    actorId: 'startup-reconciliation-pipeline',
    guildId: request.startupPipelineReport.guildId,
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: request.startupPipelineReport.correlationId,
    metadata: Object.freeze({ source: 'startup-execution-planning-engine' }),
  });

  const emptyPlan = freezeExecutionPlan({
    planId: `${planningId}:execution-plan`,
    correlationId: request.startupPipelineReport.correlationId,
    securityDecision: emptyDecision,
    plannedActions: Object.freeze([]),
    authorizationRequirements: Object.freeze([]),
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner' as const,
      planId: `${planningId}:execution-plan`,
      plannedActionCount: 0,
      plannedActionTypes: Object.freeze([]),
    }),
    auditMetadata: Object.freeze({
      planId: `${planningId}:execution-plan`,
      correlationId: request.startupPipelineReport.correlationId,
      decision: SecurityDecision.ALLOW,
      decisionReason: SecurityDecisionReason.POLICY_ALLOW,
      threatDisposition: DetectionDisposition.CLEAN,
      threatSeverity: DetectionSeverity.INFO,
      threatConfidence: DetectionConfidence.LOW,
    }),
    rollbackMetadata: Object.freeze({
      supported: false,
      strategy: 'none' as const,
      reason: `Rollback is not supported for startup execution planning (${planningId})`,
    }),
  });

  return freezeReport({
    planningId,
    pipelineId: request.startupPipelineReport.pipelineId,
    correlationId: request.startupPipelineReport.correlationId,
    transactionId: request.startupPipelineReport.transactionId,
    runtimeId: request.startupPipelineReport.runtimeId,
    guildId: request.startupPipelineReport.guildId,
    stagesCompleted,
    executionPlan: emptyPlan,
    executionBatches: Object.freeze([]),
    verificationOutcome: SecurityStartupExecutionPlanningVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-startup-execution-planning-engine' as const,
      deterministicPlanningId: true as const,
      findingsOnly: true as const,
      pipelineReportVerified: false,
      pipelineReportId: request.startupPipelineReport.pipelineId,
    }),
  });
}

export class InMemorySecurityStartupExecutionPlanningEngine
  implements SecurityStartupExecutionPlanningEngine
{
  private readonly completedReports = new Map<string, SecurityStartupExecutionPlanningReport>();

  async execute(
    request: SecurityStartupExecutionPlanningRequest,
  ): Promise<SecurityStartupExecutionPlanningReport> {
    const frozenRequest = freezeSecurityStartupExecutionPlanningRequest(request);
    const planningId = frozenRequest.planningId ?? toDeterministicPlanningId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(planningId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityStartupExecutionPlanningStage[] = [];
    stagesCompleted.push(SecurityStartupExecutionPlanningStage.PLANNING_VALIDATION);
    const validationFailures = validatePipelineReport(frozenRequest.startupPipelineReport, planningId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityStartupExecutionPlanningStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        planningId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_INCONSISTENT_STATE}:${validationFailures.join(',')}`,
      );
      this.completedReports.set(planningId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupExecutionPlanningStage.FINDING_TRANSLATION);
    stagesCompleted.push(SecurityStartupExecutionPlanningStage.BATCH_GROUPING);
    stagesCompleted.push(SecurityStartupExecutionPlanningStage.DEPENDENCY_ORDERING);
    const { executionPlan, executionBatches } = buildExecutionPlan(
      planningId,
      frozenRequest.startupPipelineReport,
      frozenRequest.startupPipelineReport.findings,
    );

    stagesCompleted.push(SecurityStartupExecutionPlanningStage.PLAN_VERIFICATION);
    const report = freezeReport({
      planningId,
      pipelineId: frozenRequest.startupPipelineReport.pipelineId,
      correlationId: frozenRequest.startupPipelineReport.correlationId,
      transactionId: frozenRequest.startupPipelineReport.transactionId,
      runtimeId: frozenRequest.startupPipelineReport.runtimeId,
      guildId: frozenRequest.startupPipelineReport.guildId,
      stagesCompleted: Object.freeze([...stagesCompleted, SecurityStartupExecutionPlanningStage.REPORT_GENERATION]),
      executionPlan,
      executionBatches,
      verificationOutcome: SecurityStartupExecutionPlanningVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-startup-execution-planning-engine' as const,
        deterministicPlanningId: true as const,
        findingsOnly: true as const,
        pipelineReportVerified: true as const,
        pipelineReportId: frozenRequest.startupPipelineReport.pipelineId,
      }),
    });

    if (!verifyPlan(report)) {
      const failure = buildFailureReport(
        frozenRequest,
        planningId,
        Object.freeze([
          ...stagesCompleted,
          SecurityStartupExecutionPlanningStage.REPORT_GENERATION,
        ]),
        startedAtMs,
        FAILURE_VERIFICATION_FAILED,
      );
      this.completedReports.set(planningId, failure);
      return failure;
    }

    this.completedReports.set(planningId, report);
    return report;
  }
}
