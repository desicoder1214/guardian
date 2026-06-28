import fs from 'node:fs';
import path from 'node:path';
import { RecoveryOperationType } from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRecoverySnapshotRequest,
  InMemoryRecoverySnapshotCoordinator,
  RecoverySnapshotPlanningStage,
  RecoverySnapshotReference,
  RecoverySnapshotRequest,
} from '../../src/core/runtime/recovery/recovery-snapshot-coordinator';

function buildSnapshotReference(
  overrides: Partial<RecoverySnapshotReference> = {},
): RecoverySnapshotReference {
  return Object.freeze({
    snapshotId: 'snapshot-001',
    snapshotVersion: 1,
    guildId: 'guild-001',
    resourceId: 'bot-001',
    supportedOperations: Object.freeze([
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    ]),
    available: true,
    ...overrides,
  });
}

function buildRequest(overrides: Partial<RecoverySnapshotRequest> = {}): RecoverySnapshotRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    resourceId: 'bot-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    snapshotReference: buildSnapshotReference(),
    ...overrides,
  });
}

describe('RecoverySnapshotCoordinator', () => {
  test('immutable requests', () => {
    const frozen = freezeRecoverySnapshotRequest(
      buildRequest({ metadata: { source: 'unit-test' } }),
    );

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.snapshotReference)).toBe(true);
    expect(
      Object.isFrozen((frozen.snapshotReference as RecoverySnapshotReference).supportedOperations),
    ).toBe(true);

    expect(() => {
      (frozen as { recoveryId: string }).recoveryId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable snapshot references', () => {
    const frozen = freezeRecoverySnapshotRequest(buildRequest());
    const reference = frozen.snapshotReference as RecoverySnapshotReference;

    expect(Object.isFrozen(reference)).toBe(true);
    expect(Object.isFrozen(reference.supportedOperations)).toBe(true);

    expect(() => {
      (reference as { snapshotId: string }).snapshotId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable plans', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(buildRequest());

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.validation)).toBe(true);
    expect(Object.isFrozen(plan.validation.failures)).toBe(true);
    expect(Object.isFrozen(plan.stagesCompleted)).toBe(true);

    expect(() => {
      (plan as { recoveryId: string }).recoveryId = 'mutated';
    }).toThrow(TypeError);
  });

  test('deterministic plan IDs', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const request = buildRequest();

    const first = coordinator.coordinate(request);
    const second = coordinator.coordinate(request);

    expect(first.planId).toBe(second.planId);
    expect(first.metadata.idempotentPlanningKey).toBe(second.metadata.idempotentPlanningKey);
  });

  test('idempotent same-input planning', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const request = buildRequest();

    const first = coordinator.coordinate(request);
    const second = coordinator.coordinate(request);

    expect(second.planId).toBe(first.planId);
    expect(second.validation.valid).toBe(first.validation.valid);
    expect(second.snapshotId).toBe(first.snapshotId);
    expect(second.snapshotVersion).toBe(first.snapshotVersion);
  });

  test('stage ordering', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(buildRequest());

    expect(plan.stagesCompleted).toEqual([
      RecoverySnapshotPlanningStage.REQUEST_VALIDATION,
      RecoverySnapshotPlanningStage.SNAPSHOT_REFERENCE_RESOLUTION,
      RecoverySnapshotPlanningStage.SNAPSHOT_AVAILABILITY_CHECK,
      RecoverySnapshotPlanningStage.SNAPSHOT_COMPATIBILITY_CHECK,
      RecoverySnapshotPlanningStage.PLAN_GENERATION,
    ]);
  });

  test.each([
    ['missing recoveryId', { recoveryId: '' }, 'RECOVERY_ID_REQUIRED'],
    ['missing transactionId', { transactionId: '' }, 'TRANSACTION_ID_REQUIRED'],
    ['missing correlationId', { correlationId: '' }, 'CORRELATION_ID_REQUIRED'],
    ['missing guildId', { guildId: '' }, 'GUILD_ID_REQUIRED'],
    ['missing resourceId', { resourceId: '' }, 'RESOURCE_ID_REQUIRED'],
  ])('validation failure for %s', (_label, override, failureCode) => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(buildRequest(override));

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain(failureCode);
  });

  test('unsupported operation fails closed', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(
      buildRequest({ operationType: 'UNSUPPORTED' as RecoveryOperationType }),
    );

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain('UNSUPPORTED_OPERATION');
  });

  test('missing snapshot reference fails closed', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(
      buildRequest({ snapshotReference: undefined }),
    );

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain('SNAPSHOT_REFERENCE_MISSING');
  });

  test('guild mismatch fails closed', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(
      buildRequest({ snapshotReference: buildSnapshotReference({ guildId: 'other-guild' }) }),
    );

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain('SNAPSHOT_GUILD_MISMATCH');
  });

  test('resource mismatch fails closed', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(
      buildRequest({ snapshotReference: buildSnapshotReference({ resourceId: 'other-resource' }) }),
    );

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain('SNAPSHOT_RESOURCE_MISMATCH');
  });

  test('compatibility mismatch fails closed', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(
      buildRequest({
        snapshotReference: buildSnapshotReference({
          supportedOperations: Object.freeze([]),
        }),
      }),
    );

    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.failures).toContain(
      'SNAPSHOT_OPERATION_COMPATIBILITY_MISMATCH',
    );
  });

  test('successful plan generation', () => {
    const coordinator = new InMemoryRecoverySnapshotCoordinator();
    const plan = coordinator.coordinate(buildRequest());

    expect(plan.validation.valid).toBe(true);
    expect(plan.validation.failures).toEqual([]);
    expect(plan.planId).toContain('recovery-snapshot-plan:');
    expect(plan.recoveryId).toBe('recovery-001');
    expect(plan.transactionId).toBe('txn-001');
    expect(plan.correlationId).toBe('corr-001');
    expect(plan.guildId).toBe('guild-001');
    expect(plan.resourceId).toBe('bot-001');
    expect(plan.operationType).toBe(
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    );
    expect(plan.snapshotId).toBe('snapshot-001');
    expect(plan.snapshotVersion).toBe(1);
    expect(plan.metadata.source).toBe('in-memory-recovery-snapshot-coordinator');
    expect(plan.metadata.deterministicPlanId).toBe(true);
  });

  test('no Discord.js, no REST/fetch, no fs writes, no persistence, no restoration, no dashboard/commands, no moderation behavior', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-snapshot-coordinator.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['\"]discord\.js['\"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|rest\b/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql/i);
    expect(source).not.toMatch(/role restoration|channel restoration|permission overwrite restoration|bot re-add/i);
    expect(source).not.toMatch(/dashboard|command/i);
    expect(source).not.toMatch(/punish|moderat/i);
  });
});
