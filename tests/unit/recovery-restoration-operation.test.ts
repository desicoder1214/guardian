import fs from 'node:fs';
import path from 'node:path';
import { RecoveryOperationType, RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRecoveryRestorationRequest,
  InMemoryRecoveryRestorationOperation,
  PassThroughRecoveryRestorationVerifier,
  RecoveryRestorationRequest,
  RecoveryRestorationStage,
  RecoveryRestorationVerifier,
} from '../../src/core/runtime/recovery/recovery-restoration-operation';
import { RecoverySnapshotPlan } from '../../src/core/runtime/recovery/recovery-snapshot-coordinator';

function buildPlan(overrides: Partial<RecoverySnapshotPlan> = {}): RecoverySnapshotPlan {
  return Object.freeze({
    planId: 'recovery-snapshot-plan:base',
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    resourceId: 'bot-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    snapshotId: 'snapshot-001',
    snapshotVersion: 1,
    validation: Object.freeze({ valid: true, failures: Object.freeze([]) }),
    stagesCompleted: Object.freeze([]),
    createdAt: '2026-06-28T00:00:00.000Z',
    metadata: Object.freeze({
      source: 'in-memory-recovery-snapshot-coordinator' as const,
      deterministicPlanId: true as const,
      idempotentPlanningKey: 'base-key',
    }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<RecoveryRestorationRequest> = {},
): RecoveryRestorationRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    plan: buildPlan(),
    ...overrides,
  });
}

describe('RecoveryRestorationOperation', () => {
  test('immutable requests', () => {
    const frozen = freezeRecoveryRestorationRequest(
      buildRequest({ metadata: { source: 'unit-test' } }),
    );

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.plan)).toBe(true);

    expect(() => {
      (frozen as { recoveryId: string }).recoveryId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic operation IDs', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const request = buildRequest();

    const first = operation.execute(request);
    const second = operation.execute(request);

    expect(first.operationId).toBe(second.operationId);
  });

  test('idempotent execution', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const request = buildRequest();

    const first = operation.execute(request);
    const second = operation.execute(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.operationId).toBe(first.operationId);
  });

  test('stage ordering', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      RecoveryRestorationStage.REQUEST_VALIDATION,
      RecoveryRestorationStage.PLAN_VALIDATION,
      RecoveryRestorationStage.PRECONDITION_CHECK,
      RecoveryRestorationStage.RESTORATION_COORDINATION,
      RecoveryRestorationStage.VERIFICATION,
      RecoveryRestorationStage.REPORT_GENERATION,
    ]);
  });

  test('invalid plans fail closed', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        plan: buildPlan({
          validation: Object.freeze({ valid: false, failures: Object.freeze(['bad']) }),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INVALID_PLAN');
  });

  test('missing snapshot fails closed', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        plan: buildPlan({ snapshotId: '', snapshotVersion: -1 }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('MISSING_SNAPSHOT');
  });

  test('verification propagation', () => {
    const failingVerifier: RecoveryRestorationVerifier = {
      verify(): RecoveryVerificationOutcome {
        return RecoveryVerificationOutcome.UNVERIFIABLE;
      },
    };

    const operation = new InMemoryRecoveryRestorationOperation(failingVerifier);
    const report = operation.execute(buildRequest());

    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.UNVERIFIABLE);
    expect(report.success).toBe(false);
    expect(report.failureReason).toBe('verification-failed');
  });

  test('correlation preservation', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        correlationId: 'corr-special',
        plan: buildPlan({ correlationId: 'corr-special' }),
      }),
    );

    expect(report.correlationId).toBe('corr-special');
  });

  test('transaction preservation', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        transactionId: 'txn-special',
        plan: buildPlan({ transactionId: 'txn-special' }),
      }),
    );

    expect(report.transactionId).toBe('txn-special');
  });

  test('mismatch between request and plan fails closed', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        recoveryId: 'recovery-A',
        plan: buildPlan({ recoveryId: 'recovery-B' }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PLAN_RECOVERY_ID_MISMATCH');
  });

  test('unsupported operation fails closed', () => {
    const operation = new InMemoryRecoveryRestorationOperation();
    const report = operation.execute(
      buildRequest({
        plan: buildPlan({ operationType: 'UNSUPPORTED' as RecoveryOperationType }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('UNSUPPORTED_OPERATION');
  });

  test('default verifier is pass-through verified', () => {
    const verifier = new PassThroughRecoveryRestorationVerifier();
    const outcome = verifier.verify(buildRequest());

    expect(outcome).toBe(RecoveryVerificationOutcome.VERIFIED);
  });

  test('no Discord API, persistence, snapshot storage, or forbidden behavior in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-restoration-operation.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['\"]discord\.js['\"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|rest\b/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/role restoration|channel restoration|permission overwrite restoration|webhook restoration|bot re-add/i);
    expect(source).not.toMatch(/dashboard|command/i);
  });
});
