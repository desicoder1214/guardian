import fs from 'node:fs';
import path from 'node:path';
import { InMemorySecurityExecutionOrchestrator } from '../../src/core/runtime/discord/security-execution-orchestrator';
import { SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  InMemorySecurityStartupExecutionDispatcher,
  SecurityStartupExecutionDispatchRequest,
  SecurityStartupExecutionDispatchStage,
  SecurityStartupExecutionDispatchVerificationOutcome,
  freezeSecurityStartupExecutionDispatchRequest,
} from '../../src/core/runtime/security/security-startup-execution-dispatcher';
import {
  InMemorySecurityStartupExecutionPlanningEngine,
  SecurityStartupExecutionPlanningReport,
  SecurityStartupExecutionPlanningVerificationOutcome,
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
    correlationId: 'corr-startup-dispatch-1',
    runtimeId: 'runtime-startup-dispatch-1',
    guildId: 'guild-startup-dispatch-1',
    targetId,
    summary: `Finding ${findingId}`,
    metadata: Object.freeze({ source: 'startup-dispatch-test' }),
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
  ]);

  return Object.freeze({
    pipelineId: 'startup-pipeline-dispatch-1',
    correlationId: 'corr-startup-dispatch-1',
    transactionId: 'txn-startup-dispatch-1',
    guildId: 'guild-startup-dispatch-1',
    runtimeId: 'runtime-startup-dispatch-1',
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
      orchestrationId: 'orch-dispatch-1',
      botReconciliationId: 'bot-1',
      webhookReconciliationId: 'webhook-1',
      integrationReconciliationId: 'integration-1',
      permissionRoleReconciliationId: 'permission-1',
    }),
    ...overrides,
  });
}

async function buildPlanningReport(
  overrides: Partial<SecurityStartupExecutionPlanningReport> = {},
): Promise<SecurityStartupExecutionPlanningReport> {
  const engine = new InMemorySecurityStartupExecutionPlanningEngine();
  const report = await engine.execute({
    startupPipelineReport: buildPipelineReport(),
    metadata: Object.freeze({ source: 'startup-dispatch-test' }),
  });

  return Object.freeze({
    ...report,
    metadata: Object.freeze({
      ...report.metadata,
      source: 'in-memory-security-startup-execution-planning-engine' as const,
    }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityStartupExecutionDispatchRequest> = {},
): Promise<SecurityStartupExecutionDispatchRequest> {
  return buildPlanningReport().then((planningReport) =>
    Object.freeze({
      startupExecutionPlanningReport: planningReport,
      metadata: Object.freeze({ source: 'startup-dispatch-test' }),
      ...overrides,
    }),
  );
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/security/security-startup-execution-dispatcher.ts'),
    'utf8',
  );
}

describe('SecurityStartupExecutionDispatcher', () => {
  test('immutable requests are deeply frozen', async () => {
    const request = freezeSecurityStartupExecutionDispatchRequest(await buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.startupExecutionPlanningReport)).toBe(true);
    expect(Object.isFrozen(request.startupExecutionPlanningReport.executionBatches)).toBe(true);

    expect(() => {
      (request as { dispatchId?: string }).dispatchId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const report = await dispatcher.dispatch(await buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.startupExecutionPlanningReport)).toBe(true);
    expect(Object.isFrozen(report.verifiedExecutionBatches)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic dispatch ids are stable', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const request = await buildRequest();
    const first = await dispatcher.dispatch(request);
    const second = await dispatcher.dispatch(request);

    expect(first.dispatchId).toBe(second.dispatchId);
  });

  test('idempotent replay returns cached report without re-dispatching', async () => {
    let calls = 0;
    const orchestrator = {
      orchestrate(context: Parameters<InMemorySecurityExecutionOrchestrator['orchestrate']>[0]) {
        calls += 1;
        return new InMemorySecurityExecutionOrchestrator().orchestrate(context);
      },
    };

    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(orchestrator);
    const request = await buildRequest();
    const first = await dispatcher.dispatch(request);
    const second = await dispatcher.dispatch(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(calls).toBe(1);
  });

  test('dispatch preserves correlation transaction runtime guild and planning metadata', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const report = await dispatcher.dispatch(await buildRequest());

    expect(report.correlationId).toBe('corr-startup-dispatch-1');
    expect(report.transactionId).toBe('txn-startup-dispatch-1');
    expect(report.runtimeId).toBe('runtime-startup-dispatch-1');
    expect(report.guildId).toBe('guild-startup-dispatch-1');
    expect(report.metadata.planningReportId).toBe(report.planningId);
    expect(report.metadata.executionPlanId).toBe(report.executionPlanId);
  });

  test('successful dispatch verifies batches and orchestrator completion', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const report = await dispatcher.dispatch(await buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED);
    expect(report.orchestratorInvoked).toBe(true);
    expect(report.stagesCompleted).toEqual([
      SecurityStartupExecutionDispatchStage.DISPATCH_VALIDATION,
      SecurityStartupExecutionDispatchStage.BATCH_VERIFICATION,
      SecurityStartupExecutionDispatchStage.ORCHESTRATOR_DISPATCH,
      SecurityStartupExecutionDispatchStage.DISPATCH_VERIFICATION,
      SecurityStartupExecutionDispatchStage.REPORT_GENERATION,
    ]);
    expect(report.verifiedExecutionBatches[0]?.actionType).toBe(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    expect(report.verifiedExecutionBatches[1]?.actionType).toBe(SecurityActionType.FREEZE_WEBHOOKS);
  });

  test('batch ordering is deterministic', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const report = await dispatcher.dispatch(await buildRequest());

    expect(report.verifiedExecutionBatches.map((batch) => batch.sequence)).toEqual([1, 2, 3]);
    expect(report.verifiedExecutionBatches.map((batch) => batch.priority)).toEqual([
      SecurityActionPriority.CRITICAL,
      SecurityActionPriority.CRITICAL,
      SecurityActionPriority.HIGH,
    ]);
  });

  test('fail closed on incomplete planning report', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const report = await dispatcher.dispatch(
      await buildRequest({
        startupExecutionPlanningReport: await buildPlanningReport({
          success: false,
          verificationOutcome: SecurityStartupExecutionPlanningVerificationOutcome.FAILED,
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PLANNING_REPORT_INCOMPLETE');
    expect(report.orchestratorInvoked).toBe(false);
  });

  test('fail closed on batch ordering mismatch', async () => {
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher(new InMemorySecurityExecutionOrchestrator());
    const planningReport = await buildPlanningReport();
    const reversedBatches = Object.freeze([...planningReport.executionBatches].reverse());
    const report = await dispatcher.dispatch(
      Object.freeze({
        startupExecutionPlanningReport: Object.freeze({
          ...planningReport,
          executionBatches: reversedBatches,
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('EXECUTION_BATCH_ORDER_INVALID');
  });

  test('fail closed on orchestration mismatch', async () => {
    const planningReport = await buildPlanningReport();
    const dispatcher = new InMemorySecurityStartupExecutionDispatcher({
      orchestrate() {
        const orchestrator = new InMemorySecurityExecutionOrchestrator();
        const valid = orchestrator.orchestrate({ executionPlan: planningReport.executionPlan });
        return Object.freeze({
          ...valid,
          correlationId: 'corr-mismatch',
        });
      },
    });

    const report = await dispatcher.dispatch({ startupExecutionPlanningReport: planningReport });

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('ORCHESTRATION_NOT_VERIFIED');
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