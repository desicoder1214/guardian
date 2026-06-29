import fs from 'node:fs';
import path from 'node:path';
import { RecoveryOperationType, RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  InMemoryRecoveryPipeline,
  RecoveryPipelineReport,
  RecoveryPipelineStage,
} from '../../src/core/runtime/recovery/recovery-pipeline';
import {
  freezeRecoveryRuntimeIntegrationRequest,
  InMemoryRecoveryRuntimeIntegration,
  RecoveryRuntimeIntegrationRequest,
  RecoveryRuntimeIntegrationStage,
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
    metadata: Object.freeze({ source: 'runtime-integration-test' }),
    ...overrides,
  });
}

function buildPipelineRequest(
  overrides: Partial<RecoveryPipelineReport> = {},
): Promise<RecoveryPipelineReport> {
  return new InMemoryRecoveryPipeline().execute({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    resourceId: 'bot-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    initiatedBy: 'guardian-test',
    requestedAt: '2026-06-29T00:00:00.000Z',
    snapshotReference: buildSnapshotReference(),
    metadata: Object.freeze({ source: 'runtime-integration-test' }),
  }).then((report) => Object.freeze({ ...report, ...overrides }));
}

function buildRequest(
  pipelineReport: RecoveryPipelineReport,
  overrides: Partial<RecoveryRuntimeIntegrationRequest> = {},
): RecoveryRuntimeIntegrationRequest {
  return Object.freeze({
    pipelineReport,
    runtimeLifecycleState: RecoveryRuntimeLifecycleState.RUNNING,
    metadata: Object.freeze({ source: 'runtime-integration-test' }),
    ...overrides,
  });
}

describe('RecoveryRuntimeIntegration', () => {
  test('immutable requests', async () => {
    const pipelineReport = await buildPipelineRequest();
    const frozen = freezeRecoveryRuntimeIntegrationRequest(buildRequest(pipelineReport));

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.pipelineReport)).toBe(true);

    expect(() => {
      (frozen as { runtimeLifecycleState: RecoveryRuntimeLifecycleState }).runtimeLifecycleState =
        RecoveryRuntimeLifecycleState.STOPPED;
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(decision.pipelineReport)).toBe(true);

    expect(() => {
      (decision as { shouldScheduleRecovery: boolean }).shouldScheduleRecovery = false;
    }).toThrow(TypeError);
  });

  test('deterministic IDs', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();

    const first = integration.integrate(buildRequest(pipelineReport));
    const second = integration.integrate(buildRequest(pipelineReport));

    expect(first.decisionId).toBe(second.decisionId);
  });

  test('idempotent execution', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();

    const first = integration.integrate(buildRequest(pipelineReport));
    const second = integration.integrate(buildRequest(pipelineReport));

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.decisionId).toBe(first.decisionId);
  });

  test('stage ordering', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(decision.stagesCompleted).toEqual([
      RecoveryRuntimeIntegrationStage.RECOVERY_PIPELINE_EVALUATION,
      RecoveryRuntimeIntegrationStage.RUNTIME_ELIGIBILITY_CHECK,
      RecoveryRuntimeIntegrationStage.RECOVERY_SCHEDULING_DECISION,
      RecoveryRuntimeIntegrationStage.VERIFICATION,
      RecoveryRuntimeIntegrationStage.REPORT_GENERATION,
    ]);
  });

  test('failed pipeline prevents scheduling', async () => {
    const pipelineReport = await buildPipelineRequest({
      success: false,
      verificationOutcome: RecoveryVerificationOutcome.FAILED,
      failureReason: 'pipeline-failed',
    });
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(decision.shouldScheduleRecovery).toBe(false);
    expect(decision.success).toBe(false);
    expect(decision.failureReason).toContain('PIPELINE_NOT_ELIGIBLE');
    expect(decision.stagesCompleted).toEqual([
      RecoveryRuntimeIntegrationStage.RECOVERY_PIPELINE_EVALUATION,
      RecoveryRuntimeIntegrationStage.RUNTIME_ELIGIBILITY_CHECK,
      RecoveryRuntimeIntegrationStage.REPORT_GENERATION,
    ]);
  });

  test('verified pipeline allows scheduling decision', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(decision.shouldScheduleRecovery).toBe(true);
    expect(decision.success).toBe(true);
    expect(decision.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
  });

  test('correlation preservation', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(
      buildRequest(pipelineReport, { pipelineReport: Object.freeze({ ...pipelineReport, correlationId: 'corr-special' }) }),
    );

    expect(decision.correlationId).toBe('corr-special');
    expect(decision.pipelineReport.correlationId).toBe('corr-special');
  });

  test('transaction preservation', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(
      buildRequest(pipelineReport, { pipelineReport: Object.freeze({ ...pipelineReport, transactionId: 'txn-special' }) }),
    );

    expect(decision.transactionId).toBe('txn-special');
    expect(decision.pipelineReport.transactionId).toBe('txn-special');
  });

  test('runtime decision immutability', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.pipelineReport)).toBe(true);

    expect(() => {
      (decision as { runtimeEligible: boolean }).runtimeEligible = false;
    }).toThrow(TypeError);
  });

  test('no Discord.js, REST, filesystem writes, persistence, restoration, dashboard, or commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-runtime-integration.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|\brest\b/i);
    expect(source).not.toMatch(/writeFile|appendFile|mkdir|rmSync|writeFileSync|appendFileSync/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(
      /role restoration|channel restoration|permission overwrite restoration|webhook restoration|restoreRoles|restoreChannels|restorePermissions|restoreWebhooks/i,
    );
    expect(source).not.toMatch(/dashboard|command/i);
  });

  test('idempotent replay preserves scheduling result', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const first = integration.integrate(buildRequest(pipelineReport));
    const second = integration.integrate(buildRequest(pipelineReport));

    expect(first.shouldScheduleRecovery).toBe(true);
    expect(second.shouldScheduleRecovery).toBe(true);
    expect(second.idempotentReplay).toBe(true);
  });

  test('pipeline lifecycle metadata remains preserved in report', async () => {
    const pipelineReport = await buildPipelineRequest();
    const integration = new InMemoryRecoveryRuntimeIntegration();
    const decision = integration.integrate(buildRequest(pipelineReport));

    expect(decision.pipelineId).toBe(pipelineReport.pipelineId);
    expect(decision.recoveryId).toBe(pipelineReport.recoveryId);
    expect(decision.guildId).toBe(pipelineReport.guildId);
    expect(decision.pipelineReport.stagesCompleted).toEqual([
      RecoveryPipelineStage.RECOVERY_ENGINE_COORDINATION,
      RecoveryPipelineStage.SNAPSHOT_COORDINATION,
      RecoveryPipelineStage.RESTORATION_OPERATION,
      RecoveryPipelineStage.PIPELINE_VERIFICATION,
      RecoveryPipelineStage.REPORT_GENERATION,
    ]);
  });
});
