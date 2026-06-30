import fs from 'node:fs';
import path from 'node:path';
import { InMemorySecurityExecutionOrchestrator } from '../../src/core/runtime/discord/security-execution-orchestrator';
import { SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import {
  InMemorySecurityStartupExecutionPlanningEngine,
  SecurityStartupExecutionPlanningRequest,
  SecurityStartupExecutionPlanningStage,
  SecurityStartupExecutionPlanningVerificationOutcome,
  freezeSecurityStartupExecutionPlanningRequest,
} from '../../src/core/runtime/security/security-startup-execution-planning-engine';
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

function buildFinding(
  findingId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
  overrides: Partial<SecurityReconciliationFinding> = {},
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId,
    type,
    severity,
    correlationId: 'corr-startup-plan-1',
    runtimeId: 'runtime-startup-plan-1',
    guildId: 'guild-startup-plan-1',
    targetId,
    summary: `Finding ${findingId}`,
    metadata: Object.freeze({ source: 'startup-plan-test' }),
    ...overrides,
  });
}

function buildPipelineReport(
  overrides: Partial<SecurityStartupReconciliationPipelineReport> = {},
): SecurityStartupReconciliationPipelineReport {
  const findings = Object.freeze([
    buildFinding(
      'finding:bot-1',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'bot-1',
    ),
    buildFinding(
      'finding:webhook-1',
      SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'webhook-1',
    ),
    buildFinding(
      'finding:role-1',
      SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
      SecurityReconciliationFindingSeverity.HIGH,
      'role-1',
    ),
    buildFinding(
      'finding:permission-1',
      SecurityReconciliationFindingType.PERMISSION_DRIFT,
      SecurityReconciliationFindingSeverity.HIGH,
      'perm-1',
    ),
  ]);

  return Object.freeze({
    pipelineId: 'startup-pipeline-1',
    correlationId: 'corr-startup-plan-1',
    transactionId: 'txn-startup-plan-1',
    guildId: 'guild-startup-plan-1',
    runtimeId: 'runtime-startup-plan-1',
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
      orchestrationId: 'orch-1',
      botReconciliationId: 'bot-1',
      webhookReconciliationId: 'webhook-1',
      integrationReconciliationId: 'integration-1',
      permissionRoleReconciliationId: 'permission-1',
    }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityStartupExecutionPlanningRequest> = {},
): SecurityStartupExecutionPlanningRequest {
  return Object.freeze({
    startupPipelineReport: buildPipelineReport(),
    metadata: Object.freeze({ source: 'startup-plan-test' }),
    ...overrides,
  });
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/security/security-startup-execution-planning-engine.ts'),
    'utf8',
  );
}

describe('SecurityStartupExecutionPlanningEngine', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityStartupExecutionPlanningRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.startupPipelineReport)).toBe(true);
    expect(Object.isFrozen(request.startupPipelineReport.findings)).toBe(true);

    expect(() => {
      (request as { planningId?: string }).planningId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.executionPlan)).toBe(true);
    expect(Object.isFrozen(report.executionPlan.plannedActions)).toBe(true);
    expect(Object.isFrozen(report.executionPlan.authorizationRequirements)).toBe(true);
    expect(Object.isFrozen(report.executionBatches)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic planning ids are stable', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const first = await engine.execute(buildRequest());
    const second = await engine.execute(buildRequest());

    expect(first.planningId).toBe(second.planningId);
  });

  test('idempotent replay returns cached report', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const first = await engine.execute(buildRequest());
    const second = await engine.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
  });

  test('stage ordering is deterministic', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityStartupExecutionPlanningStage.PLANNING_VALIDATION,
      SecurityStartupExecutionPlanningStage.FINDING_TRANSLATION,
      SecurityStartupExecutionPlanningStage.BATCH_GROUPING,
      SecurityStartupExecutionPlanningStage.DEPENDENCY_ORDERING,
      SecurityStartupExecutionPlanningStage.PLAN_VERIFICATION,
      SecurityStartupExecutionPlanningStage.REPORT_GENERATION,
    ]);
  });

  test('successful planning produces verified execution plan ready for orchestrator consumption', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());
    const orchestrator = new InMemorySecurityExecutionOrchestrator();
    const orchestration = orchestrator.orchestrate({ executionPlan: report.executionPlan });

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(SecurityStartupExecutionPlanningVerificationOutcome.VERIFIED);
    expect(report.executionPlan.securityDecision.decision).toBe(SecurityDecision.BLOCK);
    expect(orchestration.executionPlanId).toBe(report.executionPlan.planId);
    expect(orchestration.correlationId).toBe(report.correlationId);
  });

  test('policy ordering keeps unauthorized bot removal before webhook cleanup', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());

    expect(report.executionPlan.plannedActions[0]?.type).toBe(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    expect(report.executionPlan.plannedActions[1]?.type).toBe(SecurityActionType.FREEZE_WEBHOOKS);
  });

  test('grouping creates deterministic execution batches', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(
      buildRequest({
        startupPipelineReport: buildPipelineReport({
          findings: Object.freeze([
            buildFinding('finding:bot-a', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-a'),
            buildFinding('finding:bot-b', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL, 'bot-b'),
            buildFinding('finding:webhook-a', SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK, SecurityReconciliationFindingSeverity.CRITICAL, 'webhook-a'),
          ]),
        }),
      }),
    );

    expect(report.executionBatches).toHaveLength(2);
    expect(report.executionBatches[0]?.actionType).toBe(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    expect(report.executionBatches[0]?.findingIds).toEqual(['finding:bot-a', 'finding:bot-b']);
    expect(report.executionBatches[1]?.actionType).toBe(SecurityActionType.FREEZE_WEBHOOKS);
  });

  test('planning preserves severity-driven priorities', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());

    expect(report.executionPlan.plannedActions[0]?.priority).toBe(SecurityActionPriority.CRITICAL);
    expect(report.executionPlan.plannedActions[2]?.priority).toBe(SecurityActionPriority.HIGH);
  });

  test('fail closed on incomplete pipeline input', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(
      buildRequest({
        startupPipelineReport: buildPipelineReport({
          success: false,
          verificationOutcome: SecurityStartupReconciliationPipelineVerificationOutcome.FAILED,
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PIPELINE_INCOMPLETE');
    expect(report.verificationOutcome).toBe(SecurityStartupExecutionPlanningVerificationOutcome.FAILED);
  });

  test('fail closed on inconsistent finding context', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(
      buildRequest({
        startupPipelineReport: buildPipelineReport({
          findings: Object.freeze([
            buildFinding(
              'finding:mismatch-1',
              SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
              SecurityReconciliationFindingSeverity.CRITICAL,
              'bot-x',
              { correlationId: 'corr-other' },
            ),
          ]),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('FINDING_CONTEXT_MISMATCH');
  });

  test('fail closed on duplicate finding ids', async () => {
    const duplicate = buildFinding(
      'finding:dup-1',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'dup',
    );
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(
      buildRequest({
        startupPipelineReport: buildPipelineReport({
          findings: Object.freeze([duplicate, duplicate]),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('FINDING_DUPLICATE');
  });

  test('planning preserves correlation transaction runtime guild and pipeline metadata', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(buildRequest());

    expect(report.correlationId).toBe('corr-startup-plan-1');
    expect(report.transactionId).toBe('txn-startup-plan-1');
    expect(report.runtimeId).toBe('runtime-startup-plan-1');
    expect(report.guildId).toBe('guild-startup-plan-1');
    expect(report.executionPlan.correlationId).toBe('corr-startup-plan-1');
    expect(report.executionPlan.securityDecision.correlationId).toBe('corr-startup-plan-1');
    expect(report.metadata.pipelineReportId).toBe('startup-pipeline-1');
  });

  test('planning can produce an empty verified plan for empty findings', async () => {
    const engine = new InMemorySecurityStartupExecutionPlanningEngine();
    const report = await engine.execute(
      buildRequest({
        startupPipelineReport: buildPipelineReport({
          findings: Object.freeze([]),
        }),
      }),
    );

    expect(report.success).toBe(true);
    expect(report.executionPlan.securityDecision.decision).toBe(SecurityDecision.ALLOW);
    expect(report.executionPlan.plannedActions).toEqual([]);
  });

  test('source has no prohibited integration surfaces or side effects', () => {
    const source = readSource();

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
    expect(source).not.toMatch(/\bpunish\b|\bexecuteContainment\b|\bdispatchExecution\b/i);
  });
});
