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
  InMemoryRecoveryExecutionCoordinator,
  RecoveryExecutionCoordinatorReport,
} from '../../src/core/runtime/recovery/recovery-execution-coordinator';
import {
  freezeRecoveryExecutionVerifierRequest,
  InMemoryRecoveryExecutionVerifier,
  RecoveryExecutionVerificationStage,
  RecoveryExecutionVerifierRequest,
} from '../../src/core/runtime/recovery/recovery-execution-verifier';
import {
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
    metadata: Object.freeze({ source: 'recovery-execution-verifier-test' }),
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
    metadata: Object.freeze({ source: 'recovery-execution-verifier-test' }),
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
        metadata: Object.freeze({ source: 'verifier-test' }),
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
    metadata: Object.freeze({ source: 'verifier-test' }),
    ...overrides,
  });
}

async function buildCoordinatorReport(
  overrides: Partial<RecoveryExecutionCoordinatorReport> = {},
): Promise<RecoveryExecutionCoordinatorReport> {
  const pipelineReport = await buildPipelineReport();
  const coordinator = new InMemoryRecoveryExecutionCoordinator();
  const report = coordinator.coordinate(
    Object.freeze({
      containmentResult: buildContainmentResult(),
      runtimeIntegrationRequest: buildRuntimeRequest(pipelineReport),
      metadata: Object.freeze({ source: 'verifier-test' }),
    }),
  );

  return Object.freeze({ ...report, ...overrides });
}

function buildRequest(
  coordinationReport: RecoveryExecutionCoordinatorReport,
  overrides: Partial<RecoveryExecutionVerifierRequest> = {},
): RecoveryExecutionVerifierRequest {
  return Object.freeze({
    coordinationReport,
    metadata: Object.freeze({ source: 'verifier-test' }),
    ...overrides,
  });
}

describe('RecoveryExecutionVerifier', () => {
  test('immutable requests', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const frozen = freezeRecoveryExecutionVerifierRequest(
      buildRequest(coordinationReport),
    );

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.coordinationReport)).toBe(true);

    expect(() => {
      (frozen as { metadata: Record<string, unknown> }).metadata = { mutated: true };
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic verification IDs', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const verifier = new InMemoryRecoveryExecutionVerifier();

    const first = verifier.verify(buildRequest(coordinationReport));
    const second = verifier.verify(buildRequest(coordinationReport));

    expect(first.verificationId).toBe(second.verificationId);
  });

  test('idempotent verification', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const verifier = new InMemoryRecoveryExecutionVerifier();

    const first = verifier.verify(buildRequest(coordinationReport));
    const second = verifier.verify(buildRequest(coordinationReport));

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
  });

  test('successful verification', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
    expect(report.coordinationReportValid).toBe(true);
    expect(report.identityIntegrityValid).toBe(true);
    expect(report.runtimeDecisionIntegrityValid).toBe(true);
    expect(report.schedulingIntegrityValid).toBe(true);
  });

  test('failed coordinator report fails closed', async () => {
    const coordinationReport = await buildCoordinatorReport({
      success: false,
      verificationOutcome: RecoveryVerificationOutcome.FAILED,
      failureReason: 'coordinator-failed',
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('COORDINATION_REPORT_FAILED');
  });

  test('missing runtime decision fails closed', async () => {
    const coordinationReport = await buildCoordinatorReport({
      runtimeDecision: undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('RUNTIME_DECISION_REQUIRED');
  });

  test('correlation mismatch fails closed', async () => {
    const base = await buildCoordinatorReport();
    const coordinationReport = Object.freeze({
      ...base,
      runtimeDecision: base.runtimeDecision
        ? Object.freeze({ ...base.runtimeDecision, correlationId: 'corr-mismatch' })
        : undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('CORRELATION_MISMATCH');
  });

  test('transaction mismatch fails closed', async () => {
    const base = await buildCoordinatorReport();
    const coordinationReport = Object.freeze({
      ...base,
      runtimeDecision: base.runtimeDecision
        ? Object.freeze({ ...base.runtimeDecision, transactionId: 'txn-mismatch' })
        : undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('TRANSACTION_MISMATCH');
  });

  test('recoveryId mismatch fails closed', async () => {
    const base = await buildCoordinatorReport();
    const coordinationReport = Object.freeze({
      ...base,
      runtimeDecision: base.runtimeDecision
        ? Object.freeze({ ...base.runtimeDecision, recoveryId: 'recovery-mismatch' })
        : undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('RECOVERY_ID_MISMATCH');
  });

  test('pipelineId mismatch fails closed', async () => {
    const base = await buildCoordinatorReport();
    const coordinationReport = Object.freeze({
      ...base,
      runtimeDecision: base.runtimeDecision
        ? Object.freeze({ ...base.runtimeDecision, pipelineId: 'pipeline-mismatch' })
        : undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PIPELINE_ID_MISMATCH');
  });

  test('guildId mismatch fails closed', async () => {
    const base = await buildCoordinatorReport();
    const coordinationReport = Object.freeze({
      ...base,
      runtimeDecision: base.runtimeDecision
        ? Object.freeze({ ...base.runtimeDecision, guildId: 'guild-mismatch' })
        : undefined,
    });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('GUILD_ID_MISMATCH');
  });

  test('scheduling mismatch fails closed', async () => {
    const base = await buildCoordinatorReport({ recoveryScheduled: false });
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(base));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('SCHEDULING_MISMATCH');
  });

  test('stage ordering', async () => {
    const coordinationReport = await buildCoordinatorReport();
    const verifier = new InMemoryRecoveryExecutionVerifier();
    const report = verifier.verify(buildRequest(coordinationReport));

    expect(report.stagesCompleted).toEqual([
      RecoveryExecutionVerificationStage.COORDINATION_REPORT_VALIDATION,
      RecoveryExecutionVerificationStage.IDENTITY_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.RUNTIME_DECISION_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.SCHEDULING_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION,
    ]);
  });

  test('no Discord.js, REST/fetch, persistence, filesystem writes, restoration, commands, or dashboard in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-execution-verifier.ts'),
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
