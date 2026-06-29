import fs from 'node:fs';
import path from 'node:path';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  CoordinatedContainmentActionStatus,
  CoordinatedContainmentExecutionResult,
} from '../../src/core/runtime/discord/coordinated-containment-execution';
import { RecoveryOperationType, RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  InMemoryRecoveryPipeline,
  RecoveryPipelineReport,
} from '../../src/core/runtime/recovery/recovery-pipeline';
import {
  freezeRecoveryExecutionCoordinatorRequest,
  InMemoryRecoveryExecutionCoordinator,
  RecoveryExecutionCoordinationStage,
  RecoveryExecutionCoordinatorRequest,
} from '../../src/core/runtime/recovery/recovery-execution-coordinator';
import {
  RecoveryRuntimeDecision,
  RecoveryRuntimeIntegration,
  RecoveryRuntimeIntegrationRequest,
  RecoveryRuntimeLifecycleState,
} from '../../src/core/runtime/recovery/recovery-runtime-integration';
import { RecoverySnapshotReference } from '../../src/core/runtime/recovery/recovery-snapshot-coordinator';

function buildSnapshotReference(
  overrides: Partial<RecoverySnapshotReference> = {},
): RecoverySnapshotReference {
  return Object.freeze({
    snapshotId: 'snapshot-001',
    snapshotVersion: 7,
    guildId: 'guild-001',
    resourceId: 'bot-001',
    supportedOperations: Object.freeze([
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    ]),
    available: true,
    metadata: Object.freeze({ source: 'recovery-execution-coordinator-test' }),
    ...overrides,
  });
}

async function buildPipelineReport(
  overrides: Partial<RecoveryPipelineReport> = {},
): Promise<RecoveryPipelineReport> {
  const report = await new InMemoryRecoveryPipeline().execute({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    resourceId: 'bot-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    initiatedBy: 'guardian-test',
    requestedAt: '2026-06-29T00:00:00.000Z',
    snapshotReference: buildSnapshotReference(),
    metadata: Object.freeze({ source: 'recovery-execution-coordinator-test' }),
  });

  return Object.freeze({ ...report, ...overrides });
}

function buildContainmentResult(
  overrides: Partial<CoordinatedContainmentExecutionResult> = {},
): CoordinatedContainmentExecutionResult {
  return Object.freeze({
    planId: 'containment-plan-001',
    executionPlanId: 'containment-execution-001',
    correlationId: 'corr-001',
    succeededActions: Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]),
    failedActions: Object.freeze([]),
    skippedDuplicateActions: Object.freeze([]),
    unsupportedActions: Object.freeze([]),
    actionResults: Object.freeze([
      Object.freeze({
        actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        sequence: 1,
        correlationId: 'corr-001',
        status: CoordinatedContainmentActionStatus.SUCCEEDED,
        executionTimeMs: 5,
        metadata: Object.freeze({ source: 'coordinator-test' }),
      }),
    ]),
    totalExecutionTimeMs: 5,
    metadata: Object.freeze({
      source: 'in-memory-security-execution-orchestrator' as const,
      idempotencyKey: 'containment-key-001',
      securityDecisionPreserved: true,
      threatAssessmentPreserved: true,
    }),
    ...overrides,
  });
}

function buildRuntimeRequest(
  pipelineReport: RecoveryPipelineReport,
  overrides: Partial<RecoveryRuntimeIntegrationRequest> = {},
): RecoveryRuntimeIntegrationRequest {
  return Object.freeze({
    pipelineReport,
    runtimeLifecycleState: RecoveryRuntimeLifecycleState.RUNNING,
    metadata: Object.freeze({ source: 'coordinator-test' }),
    ...overrides,
  });
}

function buildRequest(
  pipelineReport: RecoveryPipelineReport,
  overrides: Partial<RecoveryExecutionCoordinatorRequest> = {},
): RecoveryExecutionCoordinatorRequest {
  return Object.freeze({
    containmentResult: buildContainmentResult(),
    runtimeIntegrationRequest: buildRuntimeRequest(pipelineReport),
    metadata: Object.freeze({ source: 'coordinator-test' }),
    ...overrides,
  });
}

describe('RecoveryExecutionCoordinator', () => {
  test('immutable requests', async () => {
    const pipelineReport = await buildPipelineReport();
    const frozen = freezeRecoveryExecutionCoordinatorRequest(buildRequest(pipelineReport));

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.containmentResult)).toBe(true);
    expect(Object.isFrozen(frozen.runtimeIntegrationRequest)).toBe(true);

    expect(() => {
      (frozen as { metadata: Record<string, unknown> }).metadata = { mutated: true };
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic IDs', async () => {
    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const request = buildRequest(pipelineReport);

    const first = coordinator.coordinate(request);
    const second = coordinator.coordinate(request);

    expect(first.coordinationId).toBe(second.coordinationId);
  });

  test('idempotent execution', async () => {
    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const request = buildRequest(pipelineReport);

    const first = coordinator.coordinate(request);
    const second = coordinator.coordinate(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.coordinationId).toBe(first.coordinationId);
  });

  test('stage ordering', async () => {
    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(report.stagesCompleted).toEqual([
      RecoveryExecutionCoordinationStage.CONTAINMENT_VERIFICATION,
      RecoveryExecutionCoordinationStage.RECOVERY_RUNTIME_EVALUATION,
      RecoveryExecutionCoordinationStage.RECOVERY_SCHEDULING,
      RecoveryExecutionCoordinationStage.VERIFICATION,
      RecoveryExecutionCoordinationStage.REPORT_GENERATION,
    ]);
  });

  test('containment failure prevents recovery', async () => {
    let invokeCount = 0;
    const runtimeSpy: RecoveryRuntimeIntegration = {
      integrate(request: RecoveryRuntimeIntegrationRequest): RecoveryRuntimeDecision {
        invokeCount += 1;
        return Object.freeze({
          decisionId: 'runtime-decision',
          recoveryId: request.pipelineReport.recoveryId,
          transactionId: request.pipelineReport.transactionId,
          correlationId: request.pipelineReport.correlationId,
          pipelineId: request.pipelineReport.pipelineId,
          guildId: request.pipelineReport.guildId,
          runtimeLifecycleState: RecoveryRuntimeLifecycleState.RUNNING,
          runtimeEligible: true,
          shouldScheduleRecovery: true,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
          success: true,
          idempotentReplay: false,
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
          pipelineReport: request.pipelineReport,
        });
      },
    };

    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator(runtimeSpy);
    const report = coordinator.coordinate(
      buildRequest(pipelineReport, {
        containmentResult: buildContainmentResult({
          failedActions: Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('CONTAINMENT_NOT_VERIFIED');
    expect(report.recoveryEvaluationStarted).toBe(false);
    expect(invokeCount).toBe(0);
    expect(report.stagesCompleted).toEqual([
      RecoveryExecutionCoordinationStage.CONTAINMENT_VERIFICATION,
      RecoveryExecutionCoordinationStage.REPORT_GENERATION,
    ]);
  });

  test('verified containment invokes runtime integration', async () => {
    let invokeCount = 0;
    const runtimeSpy: RecoveryRuntimeIntegration = {
      integrate(request: RecoveryRuntimeIntegrationRequest): RecoveryRuntimeDecision {
        invokeCount += 1;
        return Object.freeze({
          decisionId: 'runtime-decision',
          recoveryId: request.pipelineReport.recoveryId,
          transactionId: request.pipelineReport.transactionId,
          correlationId: request.pipelineReport.correlationId,
          pipelineId: request.pipelineReport.pipelineId,
          guildId: request.pipelineReport.guildId,
          runtimeLifecycleState: RecoveryRuntimeLifecycleState.RUNNING,
          runtimeEligible: true,
          shouldScheduleRecovery: true,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
          success: true,
          idempotentReplay: false,
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
          pipelineReport: request.pipelineReport,
        });
      },
    };

    const pipelineReport = await buildPipelineReport();
    const coordinator = new InMemoryRecoveryExecutionCoordinator(runtimeSpy);
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(invokeCount).toBe(1);
    expect(report.success).toBe(true);
    expect(report.recoveryEvaluationStarted).toBe(true);
    expect(report.recoveryScheduled).toBe(true);
  });

  test('correlation preservation', async () => {
    const pipelineReport = await buildPipelineReport({ correlationId: 'corr-preserved' });
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(
      buildRequest(pipelineReport, {
        containmentResult: buildContainmentResult({ correlationId: 'corr-preserved' }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserved');
  });

  test('transaction preservation', async () => {
    const pipelineReport = await buildPipelineReport({ transactionId: 'txn-preserved' });
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(report.transactionId).toBe('txn-preserved');
  });

  test('recoveryId preservation', async () => {
    const pipelineReport = await buildPipelineReport({ recoveryId: 'recovery-preserved' });
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(report.recoveryId).toBe('recovery-preserved');
  });

  test('pipelineId preservation', async () => {
    const pipelineReport = await buildPipelineReport({ pipelineId: 'pipeline-preserved' });
    const coordinator = new InMemoryRecoveryExecutionCoordinator();
    const report = coordinator.coordinate(buildRequest(pipelineReport));

    expect(report.pipelineId).toBe('pipeline-preserved');
  });

  test('no Discord.js, REST/fetch, persistence, filesystem writes, restoration, commands, or dashboard in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-execution-coordinator.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|\brest\b/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/writeFile|appendFile|mkdir|rmSync|writeFileSync|appendFileSync/i);
    expect(source).not.toMatch(
      /role restoration|channel restoration|permission restoration|webhook restoration|restoreRoles|restoreChannels|restorePermissions|restoreWebhooks/i,
    );
    expect(source).not.toMatch(/command|dashboard/i);
  });
});
