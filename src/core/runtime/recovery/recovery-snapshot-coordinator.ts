import { RecoveryOperationType } from './recovery-engine';

export enum RecoverySnapshotPlanningStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  SNAPSHOT_REFERENCE_RESOLUTION = 'SNAPSHOT_REFERENCE_RESOLUTION',
  SNAPSHOT_AVAILABILITY_CHECK = 'SNAPSHOT_AVAILABILITY_CHECK',
  SNAPSHOT_COMPATIBILITY_CHECK = 'SNAPSHOT_COMPATIBILITY_CHECK',
  PLAN_GENERATION = 'PLAN_GENERATION',
}

export interface RecoverySnapshotRequest {
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly resourceId: string;
  readonly operationType: RecoveryOperationType;
  readonly snapshotReference?: RecoverySnapshotReference;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoverySnapshotReference {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly resourceId: string;
  readonly supportedOperations: readonly RecoveryOperationType[];
  readonly available: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoverySnapshotValidationResult {
  readonly valid: boolean;
  readonly failures: readonly string[];
}

export interface RecoverySnapshotPlan {
  readonly planId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly resourceId: string;
  readonly operationType: RecoveryOperationType;
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly validation: RecoverySnapshotValidationResult;
  readonly stagesCompleted: readonly RecoverySnapshotPlanningStage[];
  readonly createdAt: string;
  readonly metadata: {
    readonly source: 'in-memory-recovery-snapshot-coordinator';
    readonly deterministicPlanId: true;
    readonly idempotentPlanningKey: string;
  };
}

export interface RecoverySnapshotCoordinator {
  coordinate(request: RecoverySnapshotRequest): RecoverySnapshotPlan;
}

const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RESOURCE_ID_REQUIRED = 'RESOURCE_ID_REQUIRED';
const FAILURE_UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';
const FAILURE_SNAPSHOT_REFERENCE_MISSING = 'SNAPSHOT_REFERENCE_MISSING';
const FAILURE_SNAPSHOT_NOT_AVAILABLE = 'SNAPSHOT_NOT_AVAILABLE';
const FAILURE_GUILD_MISMATCH = 'SNAPSHOT_GUILD_MISMATCH';
const FAILURE_RESOURCE_MISMATCH = 'SNAPSHOT_RESOURCE_MISMATCH';
const FAILURE_COMPATIBILITY_MISMATCH = 'SNAPSHOT_OPERATION_COMPATIBILITY_MISMATCH';

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value) as T;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function freezeSnapshotReference(reference: RecoverySnapshotReference): RecoverySnapshotReference {
  return deepFreeze({
    ...reference,
    supportedOperations: Object.freeze([...reference.supportedOperations]),
    metadata: reference.metadata ? Object.freeze({ ...reference.metadata }) : undefined,
  });
}

export function freezeRecoverySnapshotRequest(request: RecoverySnapshotRequest): RecoverySnapshotRequest {
  return deepFreeze({
    ...request,
    snapshotReference: request.snapshotReference ? freezeSnapshotReference(request.snapshotReference) : undefined,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeValidationResult(result: RecoverySnapshotValidationResult): RecoverySnapshotValidationResult {
  return deepFreeze({
    valid: result.valid,
    failures: Object.freeze([...result.failures]),
  });
}

function buildDeterministicPlanningKey(
  request: RecoverySnapshotRequest,
  snapshotReference: RecoverySnapshotReference | undefined,
): string {
  const snapshotId = snapshotReference?.snapshotId ?? 'missing-snapshot-id';
  const snapshotVersion = snapshotReference?.snapshotVersion ?? -1;
  return [
    request.recoveryId,
    request.transactionId,
    request.correlationId,
    request.guildId,
    request.resourceId,
    request.operationType,
    snapshotId,
    String(snapshotVersion),
  ].join('|');
}

function createDeterministicPlanId(planningKey: string): string {
  return `recovery-snapshot-plan:${planningKey}`;
}

function freezePlan(plan: RecoverySnapshotPlan): RecoverySnapshotPlan {
  return deepFreeze({
    ...plan,
    stagesCompleted: Object.freeze([...plan.stagesCompleted]),
    validation: freezeValidationResult(plan.validation),
    metadata: Object.freeze({ ...plan.metadata }),
  });
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isSupportedRecoveryOperation(operationType: RecoveryOperationType): boolean {
  return operationType === RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY;
}

export class InMemoryRecoverySnapshotCoordinator implements RecoverySnapshotCoordinator {
  coordinate(request: RecoverySnapshotRequest): RecoverySnapshotPlan {
    const frozenRequest = freezeRecoverySnapshotRequest(request);
    const stagesCompleted: RecoverySnapshotPlanningStage[] = [];
    const failures: string[] = [];

    stagesCompleted.push(RecoverySnapshotPlanningStage.REQUEST_VALIDATION);

    if (!isNonEmptyString(frozenRequest.recoveryId)) {
      failures.push(FAILURE_RECOVERY_ID_REQUIRED);
    }

    if (!isNonEmptyString(frozenRequest.transactionId)) {
      failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
    }

    if (!isNonEmptyString(frozenRequest.correlationId)) {
      failures.push(FAILURE_CORRELATION_ID_REQUIRED);
    }

    if (!isNonEmptyString(frozenRequest.guildId)) {
      failures.push(FAILURE_GUILD_ID_REQUIRED);
    }

    if (!isNonEmptyString(frozenRequest.resourceId)) {
      failures.push(FAILURE_RESOURCE_ID_REQUIRED);
    }

    if (!isSupportedRecoveryOperation(frozenRequest.operationType)) {
      failures.push(FAILURE_UNSUPPORTED_OPERATION);
    }

    stagesCompleted.push(RecoverySnapshotPlanningStage.SNAPSHOT_REFERENCE_RESOLUTION);
    const snapshotReference = frozenRequest.snapshotReference;

    if (!snapshotReference) {
      failures.push(FAILURE_SNAPSHOT_REFERENCE_MISSING);
    }

    stagesCompleted.push(RecoverySnapshotPlanningStage.SNAPSHOT_AVAILABILITY_CHECK);
    if (snapshotReference && !snapshotReference.available) {
      failures.push(FAILURE_SNAPSHOT_NOT_AVAILABLE);
    }

    stagesCompleted.push(RecoverySnapshotPlanningStage.SNAPSHOT_COMPATIBILITY_CHECK);
    if (snapshotReference) {
      if (snapshotReference.guildId !== frozenRequest.guildId) {
        failures.push(FAILURE_GUILD_MISMATCH);
      }

      if (snapshotReference.resourceId !== frozenRequest.resourceId) {
        failures.push(FAILURE_RESOURCE_MISMATCH);
      }

      if (!snapshotReference.supportedOperations.includes(frozenRequest.operationType)) {
        failures.push(FAILURE_COMPATIBILITY_MISMATCH);
      }
    }

    stagesCompleted.push(RecoverySnapshotPlanningStage.PLAN_GENERATION);

    const planningKey = buildDeterministicPlanningKey(frozenRequest, snapshotReference);
    const snapshotId = snapshotReference?.snapshotId ?? 'missing-snapshot-id';
    const snapshotVersion = snapshotReference?.snapshotVersion ?? -1;

    return freezePlan({
      planId: createDeterministicPlanId(planningKey),
      recoveryId: frozenRequest.recoveryId,
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      guildId: frozenRequest.guildId,
      resourceId: frozenRequest.resourceId,
      operationType: frozenRequest.operationType,
      snapshotId,
      snapshotVersion,
      validation: freezeValidationResult({
        valid: failures.length === 0,
        failures: Object.freeze([...failures]),
      }),
      stagesCompleted: Object.freeze(stagesCompleted),
      createdAt: new Date().toISOString(),
      metadata: Object.freeze({
        source: 'in-memory-recovery-snapshot-coordinator' as const,
        deterministicPlanId: true as const,
        idempotentPlanningKey: planningKey,
      }),
    });
  }
}
