import { RecoveryVerificationOutcome } from './recovery-engine';

export enum RuntimeSnapshotCaptureStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  RUNTIME_STATE_COLLECTION = 'RUNTIME_STATE_COLLECTION',
  SNAPSHOT_GENERATION = 'SNAPSHOT_GENERATION',
  SNAPSHOT_VERIFICATION = 'SNAPSHOT_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RuntimeSnapshotCaptureRequest {
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly runtimeState: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeRecoverySnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly runtimeState: Record<string, unknown>;
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly capturedAt: string;
  readonly metadata: {
    readonly source: 'in-memory-runtime-snapshot-capture';
    readonly deterministicSnapshotId: true;
    readonly idempotentCaptureKey: string;
  };
}

export interface RuntimeSnapshotCaptureReport {
  readonly captureId: string;
  readonly snapshotId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly snapshot: RuntimeRecoverySnapshot;
  readonly stagesCompleted: readonly RuntimeSnapshotCaptureStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RuntimeSnapshotCaptureVerifier {
  verify(snapshot: RuntimeRecoverySnapshot): RecoveryVerificationOutcome;
}

export interface RuntimeSnapshotCapture {
  capture(request: RuntimeSnapshotCaptureRequest): RuntimeSnapshotCaptureReport;
}

const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_STATE_REQUIRED = 'RUNTIME_STATE_REQUIRED';

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

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const serialized = sortedKeys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
    return `{${serialized.join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicCaptureKey(request: RuntimeSnapshotCaptureRequest): string {
  return [
    request.recoveryId,
    request.transactionId,
    request.correlationId,
    request.guildId,
    stableSerialize(request.runtimeState),
  ].join('|');
}

function buildDeterministicSnapshotId(request: RuntimeSnapshotCaptureRequest): string {
  return `runtime-recovery-snapshot:${buildDeterministicCaptureKey(request)}`;
}

function buildDeterministicCaptureId(request: RuntimeSnapshotCaptureRequest): string {
  return `runtime-snapshot-capture:${buildDeterministicCaptureKey(request)}`;
}

function resolveValidationFailures(
  request: RuntimeSnapshotCaptureRequest,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(request.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!request.runtimeState || typeof request.runtimeState !== 'object') {
    failures.push(FAILURE_RUNTIME_STATE_REQUIRED);
  }

  return Object.freeze(failures);
}

function freezeSnapshot(snapshot: RuntimeRecoverySnapshot): RuntimeRecoverySnapshot {
  return deepFreeze({
    ...snapshot,
    runtimeState: deepFreeze({ ...snapshot.runtimeState }),
    metadata: Object.freeze({ ...snapshot.metadata }),
  });
}

export function freezeRuntimeSnapshotCaptureRequest(
  request: RuntimeSnapshotCaptureRequest,
): RuntimeSnapshotCaptureRequest {
  return deepFreeze({
    ...request,
    runtimeState: deepFreeze({ ...request.runtimeState }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRuntimeSnapshotCaptureReport(
  report: RuntimeSnapshotCaptureReport,
): RuntimeSnapshotCaptureReport {
  return deepFreeze({
    ...report,
    snapshot: freezeSnapshot(report.snapshot),
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

export class PassThroughRuntimeSnapshotCaptureVerifier
  implements RuntimeSnapshotCaptureVerifier
{
  verify(_snapshot: RuntimeRecoverySnapshot): RecoveryVerificationOutcome {
    return RecoveryVerificationOutcome.VERIFIED;
  }
}

export class InMemoryRuntimeSnapshotCapture implements RuntimeSnapshotCapture {
  private readonly completedCaptures = new Map<string, RuntimeSnapshotCaptureReport>();

  constructor(
    private readonly verifier: RuntimeSnapshotCaptureVerifier =
      new PassThroughRuntimeSnapshotCaptureVerifier(),
  ) {}

  capture(request: RuntimeSnapshotCaptureRequest): RuntimeSnapshotCaptureReport {
    const frozenRequest = freezeRuntimeSnapshotCaptureRequest(request);
    const startedAtMs = Date.now();
    const captureId = buildDeterministicCaptureId(frozenRequest);
    const snapshotId = buildDeterministicSnapshotId(frozenRequest);

    const existing = this.completedCaptures.get(captureId);
    if (existing) {
      return freezeRuntimeSnapshotCaptureReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RuntimeSnapshotCaptureStage[] = [];
    stagesCompleted.push(RuntimeSnapshotCaptureStage.REQUEST_VALIDATION);

    const failures = resolveValidationFailures(frozenRequest);

    stagesCompleted.push(RuntimeSnapshotCaptureStage.RUNTIME_STATE_COLLECTION);
    stagesCompleted.push(RuntimeSnapshotCaptureStage.SNAPSHOT_GENERATION);

    const provisionalSnapshot = freezeSnapshot({
      snapshotId,
      snapshotVersion: 1,
      recoveryId: frozenRequest.recoveryId,
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      guildId: frozenRequest.guildId,
      runtimeState: deepFreeze({ ...frozenRequest.runtimeState }),
      verificationOutcome: RecoveryVerificationOutcome.FAILED,
      capturedAt: new Date().toISOString(),
      metadata: Object.freeze({
        source: 'in-memory-runtime-snapshot-capture' as const,
        deterministicSnapshotId: true as const,
        idempotentCaptureKey: buildDeterministicCaptureKey(frozenRequest),
      }),
    });

    stagesCompleted.push(RuntimeSnapshotCaptureStage.SNAPSHOT_VERIFICATION);
    const verificationOutcome =
      failures.length > 0 ? RecoveryVerificationOutcome.FAILED : this.verifier.verify(provisionalSnapshot);

    const verifiedSnapshot = freezeSnapshot({
      ...provisionalSnapshot,
      verificationOutcome,
    });

    stagesCompleted.push(RuntimeSnapshotCaptureStage.REPORT_GENERATION);

    const success = verificationOutcome === RecoveryVerificationOutcome.VERIFIED;
    const report = freezeRuntimeSnapshotCaptureReport({
      captureId,
      snapshotId,
      recoveryId: frozenRequest.recoveryId,
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      guildId: frozenRequest.guildId,
      snapshot: verifiedSnapshot,
      stagesCompleted: Object.freeze(stagesCompleted),
      verificationOutcome,
      success,
      failureReason: success
        ? undefined
        : failures.length > 0
          ? failures.join(',')
          : 'snapshot-verification-failed',
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
    });

    this.completedCaptures.set(captureId, report);
    return report;
  }
}
