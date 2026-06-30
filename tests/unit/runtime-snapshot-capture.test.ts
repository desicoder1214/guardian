import fs from 'node:fs';
import path from 'node:path';
import { RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRuntimeSnapshotCaptureRequest,
  InMemoryRuntimeSnapshotCapture,
  RuntimeSnapshotCaptureRequest,
  RuntimeSnapshotCaptureStage,
  RuntimeSnapshotCaptureVerifier,
} from '../../src/core/runtime/recovery/runtime-snapshot-capture';

function buildRequest(
  overrides: Partial<RuntimeSnapshotCaptureRequest> = {},
): RuntimeSnapshotCaptureRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    transactionId: 'txn-001',
    correlationId: 'corr-001',
    guildId: 'guild-001',
    runtimeState: Object.freeze({
      runtimeStatus: 'RUNNING',
      activeDetectors: Object.freeze(['unauthorized-bot-add-detector']),
      queuedActions: 2,
      nested: Object.freeze({ key: 'value' }),
    }),
    metadata: Object.freeze({ source: 'runtime-snapshot-capture-test' }),
    ...overrides,
  });
}

describe('RuntimeSnapshotCapture', () => {
  test('immutable requests', () => {
    const frozen = freezeRuntimeSnapshotCaptureRequest(buildRequest());

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.runtimeState)).toBe(true);

    expect(() => {
      (frozen as { recoveryId: string }).recoveryId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable snapshots', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest());

    expect(Object.isFrozen(report.snapshot)).toBe(true);
    expect(Object.isFrozen(report.snapshot.runtimeState)).toBe(true);

    expect(() => {
      (report.snapshot as { guildId: string }).guildId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic snapshot IDs', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const request = buildRequest();

    const first = capture.capture(request);
    const second = capture.capture(request);

    expect(first.snapshotId).toBe(second.snapshotId);
    expect(first.snapshot.snapshotId).toBe(second.snapshot.snapshotId);
  });

  test('idempotent repeated capture', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const request = buildRequest();

    const first = capture.capture(request);
    const second = capture.capture(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.captureId).toBe(first.captureId);
  });

  test('stage ordering', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest());

    expect(report.stagesCompleted).toEqual([
      RuntimeSnapshotCaptureStage.REQUEST_VALIDATION,
      RuntimeSnapshotCaptureStage.RUNTIME_STATE_COLLECTION,
      RuntimeSnapshotCaptureStage.SNAPSHOT_GENERATION,
      RuntimeSnapshotCaptureStage.SNAPSHOT_VERIFICATION,
      RuntimeSnapshotCaptureStage.REPORT_GENERATION,
    ]);
  });

  test('correlation preservation', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest({ correlationId: 'corr-preserved' }));

    expect(report.correlationId).toBe('corr-preserved');
    expect(report.snapshot.correlationId).toBe('corr-preserved');
  });

  test('transaction preservation', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest({ transactionId: 'txn-preserved' }));

    expect(report.transactionId).toBe('txn-preserved');
    expect(report.snapshot.transactionId).toBe('txn-preserved');
  });

  test('recoveryId preservation', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest({ recoveryId: 'recovery-preserved' }));

    expect(report.recoveryId).toBe('recovery-preserved');
    expect(report.snapshot.recoveryId).toBe('recovery-preserved');
  });

  test('verification propagation', () => {
    const verifier: RuntimeSnapshotCaptureVerifier = {
      verify(): RecoveryVerificationOutcome {
        return RecoveryVerificationOutcome.UNVERIFIABLE;
      },
    };

    const capture = new InMemoryRuntimeSnapshotCapture(verifier);
    const report = capture.capture(buildRequest());

    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.UNVERIFIABLE);
    expect(report.snapshot.verificationOutcome).toBe(RecoveryVerificationOutcome.UNVERIFIABLE);
    expect(report.success).toBe(false);
    expect(report.failureReason).toBe('snapshot-verification-failed');
  });

  test('runtime state immutability', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(buildRequest());

    expect(Object.isFrozen(report.snapshot.runtimeState)).toBe(true);

    expect(() => {
      (report.snapshot.runtimeState as { runtimeStatus: string }).runtimeStatus = 'STOPPED';
    }).toThrow(TypeError);
  });

  test('invalid request fails closed', () => {
    const capture = new InMemoryRuntimeSnapshotCapture();
    const report = capture.capture(
      buildRequest({ recoveryId: '', transactionId: '', correlationId: '', guildId: '' }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('RECOVERY_ID_REQUIRED');
  });

  test('no Discord.js, no REST/fetch, no filesystem writes, no persistence/database, no restoration, no dashboard, no commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/runtime-snapshot-capture.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|\brest\b/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/restore|restoration/i);
    expect(source).not.toMatch(/dashboard|command/i);
  });
});
