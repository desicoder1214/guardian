import {
  InMemorySecurityBotInventoryReconciler,
  SecurityBotInventoryReconciliationReport,
  SecurityBotInventoryReconciliationRequest,
  SecurityBotInventoryReconciliationVerificationOutcome,
  SecurityBotInventoryReconciler,
} from './security-bot-inventory-reconciliation';
import {
  InMemorySecurityWebhookInventoryReconciler,
  SecurityWebhookInventoryReconciliationReport,
  SecurityWebhookInventoryReconciliationRequest,
  SecurityWebhookInventoryReconciliationVerificationOutcome,
  SecurityWebhookInventoryReconciler,
} from './security-webhook-inventory-reconciliation';
import {
  InMemorySecurityIntegrationInventoryReconciler,
  SecurityIntegrationInventoryReconciliationReport,
  SecurityIntegrationInventoryReconciliationRequest,
  SecurityIntegrationInventoryReconciliationVerificationOutcome,
  SecurityIntegrationInventoryReconciler,
} from './security-integration-inventory-reconciliation';
import {
  InMemorySecurityPermissionRoleStateReconciler,
  SecurityPermissionRoleStateReconciliationReport,
  SecurityPermissionRoleStateReconciliationRequest,
  SecurityPermissionRoleStateReconciliationVerificationOutcome,
  SecurityPermissionRoleStateReconciler,
} from './security-permission-role-state-reconciliation';
import {
  InMemorySecurityReconciliationOrchestrator,
  SecurityReconciliationOrchestrator,
  SecurityReconciliationOrchestrationVerificationOutcome,
} from './security-reconciliation-orchestrator';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationReport,
  SecurityReconciliationStage,
  SecurityReconciliationTrigger,
  SecurityReconciliationVerificationOutcome,
} from './security-reconciliation-engine';

export enum SecurityStartupReconciliationPipelineStage {
  PIPELINE_VALIDATION = 'PIPELINE_VALIDATION',
  BOT_INVENTORY_RECONCILIATION = 'BOT_INVENTORY_RECONCILIATION',
  WEBHOOK_INVENTORY_RECONCILIATION = 'WEBHOOK_INVENTORY_RECONCILIATION',
  INTEGRATION_INVENTORY_RECONCILIATION = 'INTEGRATION_INVENTORY_RECONCILIATION',
  PERMISSION_ROLE_RECONCILIATION = 'PERMISSION_ROLE_RECONCILIATION',
  FINDING_AGGREGATION = 'FINDING_AGGREGATION',
  FINDING_DEDUPLICATION = 'FINDING_DEDUPLICATION',
  FINDING_PRIORITIZATION = 'FINDING_PRIORITIZATION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityStartupReconciliationPipelineVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum SecurityStartupReconciliationPipelineComponent {
  BOT = 'BOT',
  WEBHOOK = 'WEBHOOK',
  INTEGRATION = 'INTEGRATION',
  PERMISSION_ROLE = 'PERMISSION_ROLE',
}

export interface SecurityStartupReconciliationPipelineRequest {
  readonly pipelineId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly botInventoryRequest: SecurityBotInventoryReconciliationRequest;
  readonly webhookInventoryRequest: SecurityWebhookInventoryReconciliationRequest;
  readonly integrationInventoryRequest: SecurityIntegrationInventoryReconciliationRequest;
  readonly permissionRoleStateRequest: SecurityPermissionRoleStateReconciliationRequest;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityStartupReconciliationPipelineComponentStatus {
  readonly component: SecurityStartupReconciliationPipelineComponent;
  readonly reconciliationId: string;
  readonly success: boolean;
  readonly verificationOutcome: string;
  readonly findingCount: number;
  readonly failureReason?: string;
}

export interface SecurityStartupReconciliationPipelineReport {
  readonly pipelineId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityStartupReconciliationPipelineStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly componentStatuses: readonly SecurityStartupReconciliationPipelineComponentStatus[];
  readonly verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-startup-reconciliation-pipeline';
    readonly deterministicPipelineId: true;
    readonly findingsOnly: true;
    readonly orchestrationId?: string;
    readonly botReconciliationId?: string;
    readonly webhookReconciliationId?: string;
    readonly integrationReconciliationId?: string;
    readonly permissionRoleReconciliationId?: string;
  };
}

export interface SecurityStartupReconciliationPipeline {
  execute(
    request: SecurityStartupReconciliationPipelineRequest,
  ): Promise<SecurityStartupReconciliationPipelineReport>;
}

const FAILURE_PIPELINE_ID_REQUIRED = 'PIPELINE_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_REQUEST_CONTEXT_MISMATCH = 'REQUEST_CONTEXT_MISMATCH';
const FAILURE_BOT_RECONCILIATION_FAILED = 'BOT_RECONCILIATION_FAILED';
const FAILURE_WEBHOOK_RECONCILIATION_FAILED = 'WEBHOOK_RECONCILIATION_FAILED';
const FAILURE_INTEGRATION_RECONCILIATION_FAILED = 'INTEGRATION_RECONCILIATION_FAILED';
const FAILURE_PERMISSION_ROLE_RECONCILIATION_FAILED = 'PERMISSION_ROLE_RECONCILIATION_FAILED';
const FAILURE_ORCHESTRATION_FAILED = 'ORCHESTRATION_FAILED';
const FAILURE_PIPELINE_VERIFICATION_FAILED = 'PIPELINE_VERIFICATION_FAILED';
const FAILURE_INCONSISTENT_STATE = 'INCONSISTENT_STATE';

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

function freezeComponentStatus(
  status: SecurityStartupReconciliationPipelineComponentStatus,
): SecurityStartupReconciliationPipelineComponentStatus {
  return deepFreeze({ ...status });
}

export function freezeSecurityStartupReconciliationPipelineRequest(
  request: SecurityStartupReconciliationPipelineRequest,
): SecurityStartupReconciliationPipelineRequest {
  return deepFreeze({
    ...request,
    botInventoryRequest: deepFreeze({ ...request.botInventoryRequest }),
    webhookInventoryRequest: deepFreeze({ ...request.webhookInventoryRequest }),
    integrationInventoryRequest: deepFreeze({ ...request.integrationInventoryRequest }),
    permissionRoleStateRequest: deepFreeze({ ...request.permissionRoleStateRequest }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityStartupReconciliationPipelineReport,
): SecurityStartupReconciliationPipelineReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    componentStatuses: Object.freeze(report.componentStatuses.map((entry) => freezeComponentStatus(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicPipelineId(
  request: SecurityStartupReconciliationPipelineRequest,
): string {
  return [
    'security-startup-reconciliation-pipeline',
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.botInventoryRequest.runtimeSnapshot.snapshotId,
    request.webhookInventoryRequest.runtimeSnapshot.snapshotId,
    request.integrationInventoryRequest.runtimeSnapshot.snapshotId,
    request.permissionRoleStateRequest.runtimeSnapshot.snapshotId,
  ].join(':');
}

function validateContext(
  request: SecurityStartupReconciliationPipelineRequest,
  pipelineId: string,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(pipelineId)) {
    failures.push(FAILURE_PIPELINE_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }

  const subrequests = [
    request.botInventoryRequest,
    request.webhookInventoryRequest,
    request.integrationInventoryRequest,
    request.permissionRoleStateRequest,
  ];

  for (const subrequest of subrequests) {
    if (
      subrequest.correlationId !== request.correlationId ||
      subrequest.transactionId !== request.transactionId ||
      subrequest.guildId !== request.guildId ||
      subrequest.runtimeId !== request.runtimeId
    ) {
      failures.push(FAILURE_REQUEST_CONTEXT_MISMATCH);
      break;
    }
  }

  return Object.freeze(failures);
}

function deduplicateFindings(
  findings: readonly SecurityReconciliationFinding[],
): readonly SecurityReconciliationFinding[] {
  const ordered = [...findings].sort((left, right) => {
    const findingCompare = left.findingId.localeCompare(right.findingId);
    if (findingCompare !== 0) {
      return findingCompare;
    }

    const typeCompare = left.type.localeCompare(right.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }

    return left.targetId.localeCompare(right.targetId);
  });

  const deduplicated: SecurityReconciliationFinding[] = [];
  const seen = new Set<string>();
  for (const finding of ordered) {
    if (seen.has(finding.findingId)) {
      continue;
    }
    seen.add(finding.findingId);
    deduplicated.push(freezeFinding(finding));
  }

  return Object.freeze(deduplicated);
}

function toComponentStatus(
  component: SecurityStartupReconciliationPipelineComponent,
  report:
    | SecurityBotInventoryReconciliationReport
    | SecurityWebhookInventoryReconciliationReport
    | SecurityIntegrationInventoryReconciliationReport
    | SecurityPermissionRoleStateReconciliationReport,
): SecurityStartupReconciliationPipelineComponentStatus {
  return freezeComponentStatus({
    component,
    reconciliationId: report.reconciliationId,
    success: report.success,
    verificationOutcome: report.verificationOutcome,
    findingCount: report.findings.length,
    failureReason: report.failureReason,
  });
}

function buildUnifiedReconciliationReport(
  request: SecurityStartupReconciliationPipelineRequest,
  pipelineId: string,
  findings: readonly SecurityReconciliationFinding[],
): SecurityReconciliationReport {
  return deepFreeze({
    reconciliationId: `${pipelineId}:aggregate`,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    trigger: SecurityReconciliationTrigger.STARTUP,
    stagesCompleted: Object.freeze([
      SecurityReconciliationStage.SECURITY_INITIALIZATION,
      SecurityReconciliationStage.INVENTORY_EVALUATION,
      SecurityReconciliationStage.DRIFT_EVALUATION,
      SecurityReconciliationStage.RECONCILIATION_DECISION,
      SecurityReconciliationStage.VERIFICATION,
      SecurityReconciliationStage.REPORT_GENERATION,
    ]),
    findings: Object.freeze(findings.map((entry) => freezeFinding(entry))),
    reconciliationRequired: findings.length > 0,
    verificationOutcome: SecurityReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(0).toISOString(),
    durationMs: 0,
    metadata: Object.freeze({
      source: 'in-memory-security-reconciliation-engine' as const,
      deterministicReconciliationId: true as const,
      triggerRouting: 'FULL' as const,
      snapshotId: request.botInventoryRequest.runtimeSnapshot.snapshotId,
      snapshotVersion: request.botInventoryRequest.runtimeSnapshot.snapshotVersion,
    }),
  });
}

function buildFailureReport(
  request: SecurityStartupReconciliationPipelineRequest,
  pipelineId: string,
  stagesCompleted: readonly SecurityStartupReconciliationPipelineStage[],
  startedAtMs: number,
  failureReason: string,
  componentStatuses: readonly SecurityStartupReconciliationPipelineComponentStatus[] = Object.freeze([]),
  metadata: SecurityStartupReconciliationPipelineReport['metadata'] = Object.freeze({
    source: 'in-memory-security-startup-reconciliation-pipeline' as const,
    deterministicPipelineId: true as const,
    findingsOnly: true as const,
  }),
): SecurityStartupReconciliationPipelineReport {
  return freezeReport({
    pipelineId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted,
    findings: Object.freeze([]),
    componentStatuses,
    verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata,
  });
}

export class InMemorySecurityStartupReconciliationPipeline
  implements SecurityStartupReconciliationPipeline
{
  private readonly completedReports = new Map<string, SecurityStartupReconciliationPipelineReport>();

  constructor(
    private readonly botReconciler: SecurityBotInventoryReconciler = new InMemorySecurityBotInventoryReconciler(),
    private readonly webhookReconciler: SecurityWebhookInventoryReconciler = new InMemorySecurityWebhookInventoryReconciler(),
    private readonly integrationReconciler: SecurityIntegrationInventoryReconciler = new InMemorySecurityIntegrationInventoryReconciler(),
    private readonly permissionRoleReconciler: SecurityPermissionRoleStateReconciler = new InMemorySecurityPermissionRoleStateReconciler(),
    private readonly orchestrator: SecurityReconciliationOrchestrator = new InMemorySecurityReconciliationOrchestrator(),
  ) {}

  async execute(
    request: SecurityStartupReconciliationPipelineRequest,
  ): Promise<SecurityStartupReconciliationPipelineReport> {
    const frozenRequest = freezeSecurityStartupReconciliationPipelineRequest(request);
    const pipelineId = frozenRequest.pipelineId ?? toDeterministicPipelineId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(pipelineId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityStartupReconciliationPipelineStage[] = [];
    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.PIPELINE_VALIDATION);

    const validationFailures = validateContext(frozenRequest, pipelineId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_INCONSISTENT_STATE}:${validationFailures.join(',')}`,
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    const componentStatuses: SecurityStartupReconciliationPipelineComponentStatus[] = [];

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.BOT_INVENTORY_RECONCILIATION);
    const botReport = await this.botReconciler.execute(frozenRequest.botInventoryRequest);
    componentStatuses.push(toComponentStatus(SecurityStartupReconciliationPipelineComponent.BOT, botReport));
    if (
      !botReport.success ||
      botReport.verificationOutcome !== SecurityBotInventoryReconciliationVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_BOT_RECONCILIATION_FAILED}:${botReport.failureReason ?? 'UNKNOWN'}`,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          botReconciliationId: botReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.WEBHOOK_INVENTORY_RECONCILIATION);
    const webhookReport = await this.webhookReconciler.execute(frozenRequest.webhookInventoryRequest);
    componentStatuses.push(
      toComponentStatus(SecurityStartupReconciliationPipelineComponent.WEBHOOK, webhookReport),
    );
    if (
      !webhookReport.success ||
      webhookReport.verificationOutcome !== SecurityWebhookInventoryReconciliationVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_WEBHOOK_RECONCILIATION_FAILED}:${webhookReport.failureReason ?? 'UNKNOWN'}`,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          botReconciliationId: botReport.reconciliationId,
          webhookReconciliationId: webhookReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.INTEGRATION_INVENTORY_RECONCILIATION);
    const integrationReport = await this.integrationReconciler.execute(
      frozenRequest.integrationInventoryRequest,
    );
    componentStatuses.push(
      toComponentStatus(SecurityStartupReconciliationPipelineComponent.INTEGRATION, integrationReport),
    );
    if (
      !integrationReport.success ||
      integrationReport.verificationOutcome !== SecurityIntegrationInventoryReconciliationVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_INTEGRATION_RECONCILIATION_FAILED}:${integrationReport.failureReason ?? 'UNKNOWN'}`,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          botReconciliationId: botReport.reconciliationId,
          webhookReconciliationId: webhookReport.reconciliationId,
          integrationReconciliationId: integrationReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.PERMISSION_ROLE_RECONCILIATION);
    const permissionRoleReport = await this.permissionRoleReconciler.execute(
      frozenRequest.permissionRoleStateRequest,
    );
    componentStatuses.push(
      toComponentStatus(
        SecurityStartupReconciliationPipelineComponent.PERMISSION_ROLE,
        permissionRoleReport,
      ),
    );
    if (
      !permissionRoleReport.success ||
      permissionRoleReport.verificationOutcome !==
        SecurityPermissionRoleStateReconciliationVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_PERMISSION_ROLE_RECONCILIATION_FAILED}:${permissionRoleReport.failureReason ?? 'UNKNOWN'}`,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          botReconciliationId: botReport.reconciliationId,
          webhookReconciliationId: webhookReport.reconciliationId,
          integrationReconciliationId: integrationReport.reconciliationId,
          permissionRoleReconciliationId: permissionRoleReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.FINDING_AGGREGATION);
    const aggregatedFindings = Object.freeze([
      ...botReport.findings,
      ...webhookReport.findings,
      ...integrationReport.findings,
      ...permissionRoleReport.findings,
    ].map((entry) => freezeFinding(entry)));

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.FINDING_DEDUPLICATION);
    const deduplicatedFindings = deduplicateFindings(aggregatedFindings);

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.FINDING_PRIORITIZATION);
    const orchestrationRequest = deepFreeze({
      reconciliationReport: buildUnifiedReconciliationReport(frozenRequest, pipelineId, deduplicatedFindings),
      metadata: Object.freeze({ source: 'startup-reconciliation-pipeline' }),
    });
    const orchestrationReport = await this.orchestrator.execute(orchestrationRequest);
    if (
      !orchestrationReport.success ||
      orchestrationReport.verificationOutcome !==
        SecurityReconciliationOrchestrationVerificationOutcome.VERIFIED
    ) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_ORCHESTRATION_FAILED}:${orchestrationReport.failureReason ?? 'UNKNOWN'}`,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          orchestrationId: orchestrationReport.orchestrationId,
          botReconciliationId: botReport.reconciliationId,
          webhookReconciliationId: webhookReport.reconciliationId,
          integrationReconciliationId: integrationReport.reconciliationId,
          permissionRoleReconciliationId: permissionRoleReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.VERIFICATION);
    const verificationSucceeded = orchestrationReport.prioritizedFindings.every(
      (finding) =>
        finding.correlationId === frozenRequest.correlationId &&
        finding.guildId === frozenRequest.guildId &&
        finding.runtimeId === frozenRequest.runtimeId,
    );
    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        pipelineId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        FAILURE_PIPELINE_VERIFICATION_FAILED,
        Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
        Object.freeze({
          source: 'in-memory-security-startup-reconciliation-pipeline' as const,
          deterministicPipelineId: true as const,
          findingsOnly: true as const,
          orchestrationId: orchestrationReport.orchestrationId,
          botReconciliationId: botReport.reconciliationId,
          webhookReconciliationId: webhookReport.reconciliationId,
          integrationReconciliationId: integrationReport.reconciliationId,
          permissionRoleReconciliationId: permissionRoleReport.reconciliationId,
        }),
      );
      this.completedReports.set(pipelineId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityStartupReconciliationPipelineStage.REPORT_GENERATION);
    const report = freezeReport({
      pipelineId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      findings: Object.freeze(
        orchestrationReport.prioritizedFindings.map((entry) => freezeFinding(entry)),
      ),
      componentStatuses: Object.freeze(componentStatuses.map((entry) => freezeComponentStatus(entry))),
      verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-startup-reconciliation-pipeline' as const,
        deterministicPipelineId: true as const,
        findingsOnly: true as const,
        orchestrationId: orchestrationReport.orchestrationId,
        botReconciliationId: botReport.reconciliationId,
        webhookReconciliationId: webhookReport.reconciliationId,
        integrationReconciliationId: integrationReport.reconciliationId,
        permissionRoleReconciliationId: permissionRoleReport.reconciliationId,
      }),
    });

    this.completedReports.set(pipelineId, report);
    return report;
  }
}
