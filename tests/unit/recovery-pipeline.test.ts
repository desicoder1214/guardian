import fs from 'node:fs';
import path from 'node:path';
import {
  InMemoryRecoveryEngine,
  RecoveryEngine,
  RecoveryOperationType,
  RecoveryReport,
  RecoveryVerificationOutcome,
} from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRecoveryPipelineRequest,
  InMemoryRecoveryPipeline,
  RecoveryPipelineReport,
  RecoveryPipelineRequest,
  RecoveryPipelineStage,
} from '../../src/core/runtime/recovery/recovery-pipeline';
import {
  InMemoryRecoverySnapshotCoordinator,
  RecoverySnapshotCoordinator,
  RecoverySnapshotPlan,
  RecoverySnapshotReference,
} from '../../src/core/runtime/recovery/recovery-snapshot-coordinator';
import {
  RecoveryRestorationOperation,
  RecoveryRestorationReport,
  RecoveryRestorationRequest,
} from '../../src/core/runtime/recovery/recovery-restoration-operation';

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
    metadata: Object.freeze({ reason: 'unit-test' }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<RecoveryPipelineRequest> = {},
): RecoveryPipelineRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    resourceId: 'bot-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    initiatedBy: 'guardian-test',
    requestedAt: '2026-06-29T00:00:00.000Z',
    snapshotReference: buildSnapshotReference(),
    metadata: Object.freeze({ source: 'test' }),
    ...overrides,
  });
}

describe('RecoveryPipeline', () => {
  test('immutable requests', () => {
    const frozen = freezeRecoveryPipelineRequest(buildRequest());

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.snapshotReference)).toBe(true);

    expect(() => {
      (frozen as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic pipeline IDs', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const request = buildRequest();

    const first = await pipeline.execute(request);
    const second = await pipeline.execute(request);

    expect(first.pipelineId).toBe(second.pipelineId);
  });

  test('idempotent repeated execution', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const request = buildRequest();

    const first = await pipeline.execute(request);
    const second = await pipeline.execute(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.pipelineId).toBe(first.pipelineId);
  });

  test('stage ordering', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.SNAPSHOT_COORDINATION,
      RecoveryPipelineStage.RESTORATION_OPERATION,
      RecoveryPipelineStage.PIPELINE_VERIFICATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('recovery engine failure stops pipeline', async () => {
    const failingEngine: RecoveryEngine = {
      async execute(): Promise<RecoveryReport> {
        return Object.freeze({
          transactionId: 'txn-001',
          correlationId: 'corr-001',
          recoveryId: 'recovery-001',
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          success: false,
          failureReason: 'engine-failed',
          idempotentReplay: false,
        });
      },
    };

    const pipeline = new InMemoryRecoveryPipeline(failingEngine);
    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('ENGINE_COORDINATION_FAILED');
    expect(report.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('snapshot coordination failure stops pipeline', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest({ snapshotReference: undefined }));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('SNAPSHOT_COORDINATION_FAILED');
    expect(report.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.SNAPSHOT_COORDINATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('restoration operation failure stops pipeline', async () => {
    const failingRestoration: RecoveryRestorationOperation = {
      execute(_request: RecoveryRestorationRequest): RecoveryRestorationReport {
        return Object.freeze({
          operationId: 'op-1',
          recoveryId: 'recovery-001',
          transactionId: 'txn-001',
          correlationId: 'corr-001',
          planId: 'plan-1',
          snapshotId: 'snapshot-001',
          snapshotVersion: 7,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          success: false,
          failureReason: 'restoration-failed',
          idempotentReplay: false,
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
        });
      },
    };

    const pipeline = new InMemoryRecoveryPipeline(
      new InMemoryRecoveryEngine(),
      new InMemoryRecoverySnapshotCoordinator(),
      failingRestoration,
    );
    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('RESTORATION_OPERATION_FAILED');
    expect(report.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.SNAPSHOT_COORDINATION,
      RecoveryPipelineStage.RESTORATION_OPERATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('successful full pipeline report', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
    expect(report.planId).toBeTruthy();
    expect(report.snapshotId).toBe('snapshot-001');
    expect(report.snapshotVersion).toBe(7);
    expect(report.engineReport.success).toBe(true);
    expect(report.snapshotPlan?.validation.valid).toBe(true);
    expect(report.restorationReport?.success).toBe(true);
  });

  test('correlation preservation', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(
      buildRequest({
        correlationId: 'corr-special',
        snapshotReference: buildSnapshotReference(),
      }),
    );

    expect(report.correlationId).toBe('corr-special');
    expect(report.engineReport.correlationId).toBe('corr-special');
    expect(report.snapshotPlan?.correlationId).toBe('corr-special');
    expect(report.restorationReport?.correlationId).toBe('corr-special');
  });

  test('transaction preservation', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(
      buildRequest({
        transactionId: 'txn-special',
        snapshotReference: buildSnapshotReference(),
      }),
    );

    expect(report.transactionId).toBe('txn-special');
    expect(report.engineReport.transactionId).toBe('txn-special');
    expect(report.snapshotPlan?.transactionId).toBe('txn-special');
    expect(report.restorationReport?.transactionId).toBe('txn-special');
  });

  test('resource and operation preservation', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest());

    expect(report.guildId).toBe('guild-001');
    expect(report.resourceId).toBe('bot-001');
    expect(report.operationType).toBe(
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    );
    expect(report.snapshotPlan?.guildId).toBe('guild-001');
    expect(report.snapshotPlan?.resourceId).toBe('bot-001');
    expect(report.snapshotPlan?.operationType).toBe(
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    );
  });

  test('pipeline verification catches mismatched restoration metadata', async () => {
    const mismatchedRestoration: RecoveryRestorationOperation = {
      execute(_request: RecoveryRestorationRequest): RecoveryRestorationReport {
        return Object.freeze({
          operationId: 'op-mismatch',
          recoveryId: 'recovery-001',
          transactionId: 'txn-001',
          correlationId: 'corr-001',
          planId: 'wrong-plan-id',
          snapshotId: 'snapshot-001',
          snapshotVersion: 7,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
          success: true,
          idempotentReplay: false,
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
        });
      },
    };

    const pipeline = new InMemoryRecoveryPipeline(
      new InMemoryRecoveryEngine(),
      new InMemoryRecoverySnapshotCoordinator(),
      mismatchedRestoration,
    );
    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PIPELINE_VERIFICATION_FAILED');
    expect(report.failureReason).toContain('RESTORATION_PLAN_ID_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.SNAPSHOT_COORDINATION,
      RecoveryPipelineStage.RESTORATION_OPERATION,
      RecoveryPipelineStage.PIPELINE_VERIFICATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('request validation fails closed before orchestration', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report = await pipeline.execute(buildRequest({ recoveryId: '' }));

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('RECOVERY_ID_REQUIRED');
    expect(report.stagesCompleted).toEqual([RecoveryPipelineStage.REPORT_GENERATION]);
  });

  test('no prohibited implementation behavior in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-pipeline.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici/i);
    expect(source).not.toMatch(/writeFile|appendFile|mkdir|rmSync|writeFileSync|appendFileSync/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(
      /role restoration|channel restoration|permission overwrite restoration|webhook restoration/i,
    );
    expect(source).not.toMatch(/dashboard|command/i);
  });

  test('custom snapshot coordinator can fail closed without invoking restoration', async () => {
    let restorationCalled = false;

    const failingSnapshotCoordinator: RecoverySnapshotCoordinator = {
      coordinate(): RecoverySnapshotPlan {
        return Object.freeze({
          planId: 'plan-invalid',
          recoveryId: 'recovery-001',
          transactionId: 'txn-001',
          correlationId: 'corr-001',
          guildId: 'guild-001',
          resourceId: 'bot-001',
          operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
          snapshotId: 'missing-snapshot-id',
          snapshotVersion: -1,
          validation: Object.freeze({
            valid: false,
            failures: Object.freeze(['SNAPSHOT_REFERENCE_MISSING']),
          }),
          stagesCompleted: Object.freeze([]),
          createdAt: '2026-06-29T00:00:00.000Z',
          metadata: Object.freeze({
            source: 'in-memory-recovery-snapshot-coordinator' as const,
            deterministicPlanId: true as const,
            idempotentPlanningKey: 'test-key',
          }),
        });
      },
    };

    const restorationSpy: RecoveryRestorationOperation = {
      execute(_request: RecoveryRestorationRequest): RecoveryRestorationReport {
        restorationCalled = true;
        return Object.freeze({
          operationId: 'should-not-run',
          recoveryId: 'recovery-001',
          transactionId: 'txn-001',
          correlationId: 'corr-001',
          planId: 'plan-invalid',
          snapshotId: 'missing-snapshot-id',
          snapshotVersion: -1,
          stagesCompleted: Object.freeze([]),
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          success: false,
          failureReason: 'unexpected-call',
          idempotentReplay: false,
          startedAt: '2026-06-29T00:00:00.000Z',
          finishedAt: '2026-06-29T00:00:00.001Z',
          durationMs: 1,
        });
      },
    };

    const pipeline = new InMemoryRecoveryPipeline(
      new InMemoryRecoveryEngine(),
      failingSnapshotCoordinator,
      restorationSpy,
    );

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('SNAPSHOT_COORDINATION_FAILED');
    expect(restorationCalled).toBe(false);
  });

  test('idempotent replay preserves original success result', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const first = await pipeline.execute(buildRequest());
    const second = await pipeline.execute(buildRequest());

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.idempotentReplay).toBe(true);
    expect(second.verificationOutcome).toBe(first.verificationOutcome);
  });

  test('report shape preserves key IDs end-to-end', async () => {
    const pipeline = new InMemoryRecoveryPipeline();
    const report: RecoveryPipelineReport = await pipeline.execute(buildRequest());

    expect(report.recoveryId).toBe('recovery-001');
    expect(report.transactionId).toBe('txn-001');
    expect(report.correlationId).toBe('corr-001');
    expect(report.guildId).toBe('guild-001');
    expect(report.resourceId).toBe('bot-001');
    expect(report.operationType).toBe(
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    );
  });
});
