import fs from 'node:fs';
import path from 'node:path';
import { InMemorySecurityStartupExecutionPlanningEngine } from '../../src/core/runtime/security/security-startup-execution-planning-engine';
import {
  InMemorySecurityStartupReconciliationExecutionIntegration,
  SecurityStartupReconciliationExecutionIntegrationRequest,
  SecurityStartupReconciliationExecutionIntegrationStage,
  SecurityStartupReconciliationExecutionIntegrationVerificationOutcome,
  freezeSecurityStartupReconciliationExecutionIntegrationRequest,
} from '../../src/core/runtime/security/security-startup-reconciliation-execution-integration';
import {
  SecurityStartupReconciliationPipelineReport,
  SecurityStartupReconciliationPipelineStage,
  SecurityStartupReconciliationPipelineVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-reconciliation-pipeline';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from '../../src/core/runtime/security/security-reconciliation-engine';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityExecutorCapability, SecurityExecutorDomain } from '../../src/core/runtime/discord/security-execution-types';

function buildFinding(
  findingId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId,
    type,
    severity,
    correlationId: 'corr-startup-integration-1',
    runtimeId: 'runtime-startup-integration-1',
    guildId: 'guild-startup-integration-1',
    targetId,
    summary: `Finding ${findingId}`,
    metadata: Object.freeze({ source: 'startup-integration-test' }),
  });
}

function buildPipelineReport(
  overrides: Partial<SecurityStartupReconciliationPipelineReport> = {},
): SecurityStartupReconciliationPipelineReport {
  const findings = Object.freeze([
    buildFinding('finding:bot-unauthorized', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-unauthorized'),
    buildFinding('finding:bot-duplicate', SecurityReconciliationFindingType.DUPLICATE_BOT_IDENTITY, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-duplicate'),
    buildFinding('finding:bot-missing', SecurityReconciliationFindingType.MISSING_AUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-missing'),
    buildFinding('finding:bot-orphaned', SecurityReconciliationFindingType.ORPHANED_TRUSTED_BOT, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-orphaned'),
    buildFinding('finding:bot-privilege', SecurityReconciliationFindingType.PRIVILEGE_ESCALATION, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-privilege'),
    buildFinding('finding:registry', SecurityReconciliationFindingType.REGISTRY_MISMATCH, SecurityReconciliationFindingSeverity.CRITICAL, 'registry'),
    buildFinding('finding:snapshot-inconsistency', SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY, SecurityReconciliationFindingSeverity.CRITICAL, 'snapshot-inconsistency'),
    buildFinding('finding:snapshot-mismatch', SecurityReconciliationFindingType.SNAPSHOT_MISMATCH, SecurityReconciliationFindingSeverity.CRITICAL, 'snapshot-mismatch'),
    buildFinding('finding:webhook-high-risk', SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-high-risk'),
    buildFinding('finding:webhook-orphaned', SecurityReconciliationFindingType.WEBHOOK_ORPHANED, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-orphaned'),
    buildFinding('finding:webhook-suspicious', SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-suspicious'),
    buildFinding('finding:webhook-new', SecurityReconciliationFindingType.WEBHOOK_NEW, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-new'),
    buildFinding('finding:webhook-modified', SecurityReconciliationFindingType.WEBHOOK_MODIFIED, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-modified'),
    buildFinding('finding:webhook-deleted', SecurityReconciliationFindingType.WEBHOOK_DELETED, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-deleted'),
    buildFinding('finding:privileged-role', SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT, SecurityReconciliationFindingSeverity.CRITICAL, 'privileged-role'),
    buildFinding('finding:permission-drift', SecurityReconciliationFindingType.PERMISSION_DRIFT, SecurityReconciliationFindingSeverity.CRITICAL, 'permission-drift'),
  ]);

  return Object.freeze({
    pipelineId: 'startup-pipeline-integration-1',
    correlationId: 'corr-startup-integration-1',
    transactionId: 'txn-startup-integration-1',
    guildId: 'guild-startup-integration-1',
    runtimeId: 'runtime-startup-integration-1',
    stagesCompleted: Object.freeze([
      SecurityStartupReconciliationPipelineStage.PIPELINE_VALIDATION,
      SecurityStartupReconciliationPipelineStage.BOT_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.WEBHOOK_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.INTEGRATION_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.PERMISSION_ROLE_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.FINDING_AGGREGATION,
      SecurityStartupReconciliationPipelineStage.FINDING_DEDUPLICATION,
      SecurityStartupReconciliationPipelineStage.FINDING_PRIORITIZATION,
      SecurityStartupReconciliationPipelineStage.VERIFICATION,
      SecurityStartupReconciliationPipelineStage.REPORT_GENERATION,
    ]),
    findings,
    componentStatuses: Object.freeze([]),
    verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.100Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-startup-reconciliation-pipeline' as const,
      deterministicPipelineId: true as const,
      findingsOnly: true as const,
      orchestrationId: 'orch-integration-1',
      botReconciliationId: 'bot-reconcile-1',
      webhookReconciliationId: 'webhook-reconcile-1',
      integrationReconciliationId: 'integration-reconcile-1',
      permissionRoleReconciliationId: 'permission-reconcile-1',
    }),
    ...overrides,
  });
}

async function buildRequest(
  overrides: Partial<SecurityStartupReconciliationExecutionIntegrationRequest> = {},
): Promise<SecurityStartupReconciliationExecutionIntegrationRequest> {
  const pipelineReport = buildPipelineReport();
  const planningReport = await new InMemorySecurityStartupExecutionPlanningEngine().execute({
    startupPipelineReport: pipelineReport,
    metadata: Object.freeze({ source: 'startup-integration-test' }),
  });

  return Object.freeze({
    startupReconciliationReport: pipelineReport,
    startupExecutionPlanningReport: planningReport,
    metadata: Object.freeze({ source: 'startup-integration-test' }),
    ...overrides,
  });
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/security/security-startup-reconciliation-execution-integration.ts'),
    'utf8',
  );
}

const EXPECTED_ACTION_BY_FINDING_TYPE: Readonly<Record<SecurityReconciliationFindingType, SecurityActionType>> = {
  [SecurityReconciliationFindingType.UNAUTHORIZED_BOT]: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
  [SecurityReconciliationFindingType.PRIVILEGE_ESCALATION]: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
  [SecurityReconciliationFindingType.DUPLICATE_BOT_IDENTITY]: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
  [SecurityReconciliationFindingType.MISSING_AUTHORIZED_BOT]: SecurityActionType.CREATE_INCIDENT,
  [SecurityReconciliationFindingType.ORPHANED_TRUSTED_BOT]: SecurityActionType.CREATE_INCIDENT,
  [SecurityReconciliationFindingType.REGISTRY_MISMATCH]: SecurityActionType.LOCK_CHANNELS,
  [SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY]: SecurityActionType.LOCK_CHANNELS,
  [SecurityReconciliationFindingType.SNAPSHOT_MISMATCH]: SecurityActionType.LOCK_CHANNELS,
  [SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.WEBHOOK_ORPHANED]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.WEBHOOK_NEW]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.WEBHOOK_MODIFIED]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.WEBHOOK_DELETED]: SecurityActionType.FREEZE_WEBHOOKS,
  [SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT]: SecurityActionType.REMOVE_DANGEROUS_ROLE,
  [SecurityReconciliationFindingType.PERMISSION_DRIFT]: SecurityActionType.LOCK_CHANNELS,
};

const EXPECTED_DOMAIN_BY_ACTION: Readonly<Record<SecurityActionType, SecurityExecutorDomain>> = {
  [SecurityActionType.NONE]: SecurityExecutorDomain.GUILD,
  [SecurityActionType.INVESTIGATE]: SecurityExecutorDomain.GUILD,
  [SecurityActionType.QUARANTINE_ACTOR]: SecurityExecutorDomain.MEMBER,
  [SecurityActionType.REMOVE_UNAUTHORIZED_BOT]: SecurityExecutorDomain.BOT,
  [SecurityActionType.FREEZE_WEBHOOKS]: SecurityExecutorDomain.WEBHOOK,
  [SecurityActionType.REMOVE_DANGEROUS_ROLE]: SecurityExecutorDomain.ROLE,
  [SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER]: SecurityExecutorDomain.MEMBER,
  [SecurityActionType.REVOKE_ESCALATION_SOURCE]: SecurityExecutorDomain.INTEGRATION,
  [SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR]: SecurityExecutorDomain.MEMBER,
  [SecurityActionType.LOCK_CHANNELS]: SecurityExecutorDomain.CHANNEL,
  [SecurityActionType.RESTORE_RESOURCE]: SecurityExecutorDomain.GUILD,
  [SecurityActionType.CREATE_INCIDENT]: SecurityExecutorDomain.GUILD,
  [SecurityActionType.NOTIFY_AUDIT]: SecurityExecutorDomain.GUILD,
  [SecurityActionType.ESCALATE]: SecurityExecutorDomain.GUILD,
};

const EXPECTED_CAPABILITY_BY_ACTION: Readonly<Record<SecurityActionType, SecurityExecutorCapability>> = {
  [SecurityActionType.NONE]: SecurityExecutorCapability.CREATE_INCIDENT,
  [SecurityActionType.INVESTIGATE]: SecurityExecutorCapability.INVESTIGATE,
  [SecurityActionType.QUARANTINE_ACTOR]: SecurityExecutorCapability.QUARANTINE_ACTOR,
  [SecurityActionType.REMOVE_UNAUTHORIZED_BOT]: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  [SecurityActionType.FREEZE_WEBHOOKS]: SecurityExecutorCapability.FREEZE_WEBHOOKS,
  [SecurityActionType.REMOVE_DANGEROUS_ROLE]: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
  [SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER]: SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
  [SecurityActionType.REVOKE_ESCALATION_SOURCE]: SecurityExecutorCapability.REVOKE_ESCALATION_SOURCE,
  [SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR]: SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR,
  [SecurityActionType.LOCK_CHANNELS]: SecurityExecutorCapability.LOCK_CHANNELS,
  [SecurityActionType.RESTORE_RESOURCE]: SecurityExecutorCapability.RESTORE_RESOURCE,
  [SecurityActionType.CREATE_INCIDENT]: SecurityExecutorCapability.CREATE_INCIDENT,
  [SecurityActionType.NOTIFY_AUDIT]: SecurityExecutorCapability.NOTIFY_AUDIT,
  [SecurityActionType.ESCALATE]: SecurityExecutorCapability.ESCALATE,
};

describe('SecurityStartupReconciliationExecutionIntegration', () => {
  test('immutable requests are deeply frozen', async () => {
    const request = freezeSecurityStartupReconciliationExecutionIntegrationRequest(await buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.startupReconciliationReport)).toBe(true);
    expect(Object.isFrozen(request.startupExecutionPlanningReport)).toBe(true);

    expect(() => {
      (request as { integrationId?: string }).integrationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('every supported finding type produces the expected execution request path', async () => {
    const integration = new InMemorySecurityStartupReconciliationExecutionIntegration();
    const report = await integration.execute(await buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(SecurityStartupReconciliationExecutionIntegrationVerificationOutcome.VERIFIED);
    expect(report.stagesCompleted).toEqual([
      SecurityStartupReconciliationExecutionIntegrationStage.INTEGRATION_VALIDATION,
      SecurityStartupReconciliationExecutionIntegrationStage.DISPATCH_DELEGATION,
      SecurityStartupReconciliationExecutionIntegrationStage.DISPATCH_VERIFICATION,
      SecurityStartupReconciliationExecutionIntegrationStage.REPORT_GENERATION,
    ]);

    for (const finding of report.startupReconciliationReport.findings) {
      const expectedActionType = EXPECTED_ACTION_BY_FINDING_TYPE[finding.type];
      const batch = report.startupExecutionPlanningReport.executionBatches.find((entry) =>
        entry.findingIds.includes(finding.findingId),
      );

      expect(batch?.actionType).toBe(expectedActionType);
    }

    const dispatchReport = report.startupExecutionDispatchReport;
    expect(dispatchReport).toBeDefined();
    expect(dispatchReport?.success).toBe(true);
    expect(dispatchReport?.orchestrationResult?.dispatchResult.intents.length).toBeGreaterThan(0);

    for (const batch of report.startupExecutionPlanningReport.executionBatches) {
      const intent = dispatchReport?.orchestrationResult?.dispatchResult.intents.find(
        (entry) => entry.route.actionType === batch.actionType,
      );

      expect(intent?.executionRequest?.planId).toBe(report.startupExecutionDispatchReport?.orchestrationResult?.planId);
      expect(intent?.executionRequest?.executionPlanId).toBe(report.startupExecutionPlanningReport.executionPlan.planId);
      expect(intent?.targetedDomain).toBe(EXPECTED_DOMAIN_BY_ACTION[batch.actionType]);
      expect(intent?.targetedCapability).toBe(EXPECTED_CAPABILITY_BY_ACTION[batch.actionType]);
    }
  });

  test('deterministic integration ids are stable and replayable', async () => {
    const integration = new InMemorySecurityStartupReconciliationExecutionIntegration();
    const request = await buildRequest();
    const first = await integration.execute(request);
    const second = await integration.execute(request);

    expect(first.integrationId).toBe(second.integrationId);
    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.startupExecutionDispatchReport?.idempotentReplay).toBe(true);
  });

  test('preserves correlation transaction runtime guild and planning identities', async () => {
    const integration = new InMemorySecurityStartupReconciliationExecutionIntegration();
    const report = await integration.execute(await buildRequest());

    expect(report.correlationId).toBe('corr-startup-integration-1');
    expect(report.transactionId).toBe('txn-startup-integration-1');
    expect(report.runtimeId).toBe('runtime-startup-integration-1');
    expect(report.guildId).toBe('guild-startup-integration-1');
    expect(report.pipelineId).toBe('startup-pipeline-integration-1');
    expect(report.planningId).toBe(report.startupExecutionPlanningReport.planningId);
    expect(report.startupExecutionDispatchReport?.correlationId).toBe(report.correlationId);
    expect(report.startupExecutionDispatchReport?.transactionId).toBe(report.transactionId);
    expect(report.startupExecutionDispatchReport?.runtimeId).toBe(report.runtimeId);
    expect(report.startupExecutionDispatchReport?.guildId).toBe(report.guildId);
  });

  test('fail closed on unsupported finding types', async () => {
    const integration = new InMemorySecurityStartupReconciliationExecutionIntegration();
    const request = await buildRequest({
      startupReconciliationReport: buildPipelineReport({
        findings: Object.freeze([
          buildFinding(
            'finding:unsupported-1',
            'UNSUPPORTED_FINDING' as SecurityReconciliationFindingType,
            SecurityReconciliationFindingSeverity.HIGH,
            'unsupported-1',
          ),
        ]),
      }),
    });

    const report = await integration.execute(request);

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('UNSUPPORTED_FINDING_TYPE');
    expect(report.startupExecutionDispatchReport).toBeUndefined();
  });

  test('source has no prohibited integration surfaces or side effects', () => {
    const source = readSource();

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});