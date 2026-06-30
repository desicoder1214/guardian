import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  InMemorySecurityReconciliationOrchestrator,
  SecurityReconciliationOrchestrationRequest,
  SecurityReconciliationOrchestrationStage,
  SecurityReconciliationOrchestrationVerificationOutcome,
  SecurityReconciliationSchedulingAction,
  freezeSecurityReconciliationOrchestrationRequest,
} from '../../src/core/runtime/security/security-reconciliation-orchestrator';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
  SecurityReconciliationReport,
  SecurityReconciliationStage,
  SecurityReconciliationTrigger,
  SecurityReconciliationVerificationOutcome,
} from '../../src/core/runtime/security/security-reconciliation-engine';

function buildFinding(
  findingId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
  summary: string,
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId,
    type,
    severity,
    guildId: 'guild-orch-001',
    runtimeId: 'runtime-orch-001',
    correlationId: 'corr-orch-001',
    targetId,
    summary,
    metadata: Object.freeze({ source: 'unit-test' }),
  });
}

function buildReconciliationReport(
  overrides: Partial<SecurityReconciliationReport> = {},
): SecurityReconciliationReport {
  const findings = Object.freeze([
    buildFinding(
      'reconcile-001:finding:PERMISSION_DRIFT:perm-1',
      SecurityReconciliationFindingType.PERMISSION_DRIFT,
      SecurityReconciliationFindingSeverity.HIGH,
      'perm-1',
      'Permission drift detected.',
    ),
    buildFinding(
      'reconcile-001:finding:UNAUTHORIZED_BOT:bot-rogue-1',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'bot-rogue-1',
      'Unauthorized bot detected.',
    ),
    buildFinding(
      'reconcile-001:finding:WEBHOOK_HIGH_RISK:webhook-rogue-1',
      SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'webhook-rogue-1',
      'High risk webhook detected.',
    ),
    buildFinding(
      'reconcile-001:finding:PRIVILEGED_ROLE_DRIFT:role-admin-1',
      SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
      SecurityReconciliationFindingSeverity.HIGH,
      'role-admin-1',
      'Privileged role drift detected.',
    ),
  ]);

  return Object.freeze({
    reconciliationId: 'reconcile-001',
    correlationId: 'corr-orch-001',
    transactionId: 'txn-orch-001',
    guildId: 'guild-orch-001',
    runtimeId: 'runtime-orch-001',
    trigger: SecurityReconciliationTrigger.STARTUP,
    stagesCompleted: Object.freeze([
      SecurityReconciliationStage.SECURITY_INITIALIZATION,
      SecurityReconciliationStage.INVENTORY_EVALUATION,
      SecurityReconciliationStage.DRIFT_EVALUATION,
      SecurityReconciliationStage.RECONCILIATION_DECISION,
      SecurityReconciliationStage.VERIFICATION,
      SecurityReconciliationStage.REPORT_GENERATION,
    ]),
    inventoryEvaluation: Object.freeze({
      botInventoryCount: 2,
      webhookInventoryCount: 1,
      roleInventoryCount: 2,
      permissionInventoryCount: 2,
      snapshotBotInventoryCount: 1,
      snapshotWebhookInventoryCount: 1,
      snapshotRoleInventoryCount: 2,
      snapshotPermissionInventoryCount: 1,
    }),
    findings,
    reconciliationRequired: true,
    verificationOutcome: SecurityReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-29T00:00:00.000Z',
    finishedAt: '2026-06-29T00:00:00.100Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-reconciliation-engine' as const,
      deterministicReconciliationId: true as const,
      triggerRouting: 'FULL' as const,
      snapshotId: 'snapshot-orch-001',
      snapshotVersion: 1,
    }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityReconciliationOrchestrationRequest> = {},
): SecurityReconciliationOrchestrationRequest {
  return Object.freeze({
    reconciliationReport: buildReconciliationReport(),
    metadata: Object.freeze({ source: 'unit-test-request' }),
    ...overrides,
  });
}

describe('SecurityReconciliationOrchestrator', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityReconciliationOrchestrationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.reconciliationReport)).toBe(true);
    expect(Object.isFrozen(request.reconciliationReport.findings)).toBe(true);

    expect(() => {
      (request as { orchestrationId?: string }).orchestrationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.prioritizedFindings)).toBe(true);
    expect(Object.isFrozen(report.schedulingDecisions)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic orchestration IDs are stable for identical requests', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const first = await orchestrator.execute(buildRequest());
    const second = await orchestrator.execute(buildRequest());

    expect(first.orchestrationId).toBe(second.orchestrationId);
  });

  test('idempotent orchestration returns replay report for repeated execution', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const first = await orchestrator.execute(buildRequest());
    const second = await orchestrator.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.orchestrationId).toBe(first.orchestrationId);
  });

  test('stage ordering is deterministic for successful orchestration', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityReconciliationOrchestrationStage.RECONCILIATION_VALIDATION,
      SecurityReconciliationOrchestrationStage.FINDING_PRIORITIZATION,
      SecurityReconciliationOrchestrationStage.EXECUTION_SCHEDULING,
      SecurityReconciliationOrchestrationStage.VERIFICATION,
      SecurityReconciliationOrchestrationStage.REPORT_GENERATION,
    ]);
  });

  test('fails closed when reconciliation report is incomplete', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(
      buildRequest({
        reconciliationReport: buildReconciliationReport({
          success: false,
          verificationOutcome: SecurityReconciliationVerificationOutcome.FAILED,
          stagesCompleted: Object.freeze([
            SecurityReconciliationStage.SECURITY_INITIALIZATION,
            SecurityReconciliationStage.REPORT_GENERATION,
          ]),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(
      SecurityReconciliationOrchestrationVerificationOutcome.FAILED,
    );
    expect(report.failureReason).toContain('RECONCILIATION_INCOMPLETE');
    expect(report.stagesCompleted).toEqual([
      SecurityReconciliationOrchestrationStage.RECONCILIATION_VALIDATION,
      SecurityReconciliationOrchestrationStage.REPORT_GENERATION,
    ]);
  });

  test('prioritizes critical unauthorized bot findings first', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(buildRequest());

    expect(report.prioritizedFindings[0]?.type).toBe(SecurityReconciliationFindingType.UNAUTHORIZED_BOT);
    expect(report.prioritizedFindings[0]?.severity).toBe(SecurityReconciliationFindingSeverity.CRITICAL);
  });

  test('generates scheduling decisions without executing containment', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(buildRequest());

    expect(report.schedulingDecisions.length).toBeGreaterThan(0);
    expect(
      report.schedulingDecisions.some(
        (decision) => decision.action === SecurityReconciliationSchedulingAction.UNAUTHORIZED_BOT_CONTAINMENT,
      ),
    ).toBe(true);
    expect(
      report.schedulingDecisions.some(
        (decision) => decision.action === SecurityReconciliationSchedulingAction.WEBHOOK_EVALUATION,
      ),
    ).toBe(true);
    expect(
      report.schedulingDecisions.some(
        (decision) => decision.action === SecurityReconciliationSchedulingAction.INTEGRATION_EVALUATION,
      ),
    ).toBe(true);
    expect(
      report.schedulingDecisions.some(
        (decision) =>
          decision.action === SecurityReconciliationSchedulingAction.PERMISSION_DRIFT_EVALUATION,
      ),
    ).toBe(true);
    expect(
      report.schedulingDecisions.some(
        (decision) => decision.action === SecurityReconciliationSchedulingAction.DANGEROUS_ROLE_EVALUATION,
      ),
    ).toBe(true);
  });

  test('propagates verification and preserves correlation, transaction, runtime, guild, and reconciliation ids', async () => {
    const orchestrator = new InMemorySecurityReconciliationOrchestrator();
    const report = await orchestrator.execute(
      buildRequest({
        reconciliationReport: buildReconciliationReport({
          reconciliationId: 'reconcile-preserve-1',
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
          runtimeId: 'runtime-preserve-1',
          guildId: 'guild-preserve-1',
          findings: Object.freeze([
            Object.freeze({
              ...buildFinding(
                'reconcile-preserve-1:finding:UNAUTHORIZED_BOT:bot-1',
                SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
                SecurityReconciliationFindingSeverity.CRITICAL,
                'bot-1',
                'Unauthorized bot detected.',
              ),
              correlationId: 'corr-preserve-1',
              runtimeId: 'runtime-preserve-1',
              guildId: 'guild-preserve-1',
            }),
          ]),
        }),
      }),
    );

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(
      SecurityReconciliationOrchestrationVerificationOutcome.VERIFIED,
    );
    expect(report.reconciliationId).toBe('reconcile-preserve-1');
    expect(report.correlationId).toBe('corr-preserve-1');
    expect(report.transactionId).toBe('txn-preserve-1');
    expect(report.runtimeId).toBe('runtime-preserve-1');
    expect(report.guildId).toBe('guild-preserve-1');
    expect(report.schedulingDecisions.every((decision) => decision.reconciliationId === 'reconcile-preserve-1')).toBe(true);
    expect(report.schedulingDecisions.every((decision) => decision.correlationId === 'corr-preserve-1')).toBe(true);
    expect(report.schedulingDecisions.every((decision) => decision.transactionId === 'txn-preserve-1')).toBe(true);
    expect(report.schedulingDecisions.every((decision) => decision.runtimeId === 'runtime-preserve-1')).toBe(true);
    expect(report.schedulingDecisions.every((decision) => decision.guildId === 'guild-preserve-1')).toBe(true);
  });

  test('source has no prohibited integration surfaces', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-reconciliation-orchestrator.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|httpClient|discord\.com\/api|X-Audit-Log-Reason/i);
    expect(source).not.toMatch(/removeUnauthorizedBot|deleteWebhook|removeDangerousWebhook|restoreRole|restoreChannel/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
