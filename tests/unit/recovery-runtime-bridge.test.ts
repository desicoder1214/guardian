import fs from 'node:fs';
import path from 'node:path';
import {
  CoordinatedContainmentActionStatus,
  CoordinatedContainmentExecutionResult,
} from '../../src/core/runtime/discord/coordinated-containment-execution';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  RecoveryEngine,
  RecoveryOperationType,
  RecoveryReport,
  RecoveryRequest,
  RecoveryStage,
  RecoveryVerificationOutcome,
} from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRecoveryRuntimeBridgeRequest,
  InMemoryRecoveryRuntimeBridge,
  RecoveryRuntimeBridgeRequest,
  RecoveryRuntimeBridgeStage,
  RuntimeExecutionVerificationReport,
} from '../../src/core/runtime/recovery/recovery-runtime-bridge';

function buildContainmentExecutionReport(
  overrides: Partial<CoordinatedContainmentExecutionResult> = {},
): CoordinatedContainmentExecutionResult {
  return Object.freeze({
    planId: 'containment-plan-001',
    executionPlanId: 'containment-execution-plan-001',
    correlationId: 'corr-001',
    succeededActions: Object.freeze([]),
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
        metadata: Object.freeze({ source: 'bridge-test' }),
      }),
    ]),
    totalExecutionTimeMs: 5,
    metadata: Object.freeze({
      source: 'in-memory-security-execution-orchestrator' as const,
      idempotencyKey: 'containment-idem-001',
      securityDecisionPreserved: true,
      threatAssessmentPreserved: true,
    }),
    ...overrides,
  });
}

function buildExecutionVerificationReport(
  overrides: Partial<RuntimeExecutionVerificationReport> = {},
): RuntimeExecutionVerificationReport {
  return Object.freeze({
    executionId: 'execution-001',
    correlationId: 'corr-001',
    transactionId: 'txn-001',
    recoveryId: 'recovery-001',
    guildId: 'guild-001',
    verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
    success: true,
    metadata: Object.freeze({ source: 'bridge-test' }),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<RecoveryRuntimeBridgeRequest> = {},
): RecoveryRuntimeBridgeRequest {
  return Object.freeze({
    containmentExecutionReport: buildContainmentExecutionReport(),
    executionVerificationReport: buildExecutionVerificationReport(),
    metadata: Object.freeze({
      source: 'bridge-test',
      initiatedBy: 'guardian-bridge-test',
    }),
    ...overrides,
  });
}

class RecordingRecoveryEngine implements RecoveryEngine {
  public readonly requests: RecoveryRequest[] = [];

  async execute(request: RecoveryRequest): Promise<RecoveryReport> {
    this.requests.push(request);
    return Object.freeze({
      transactionId: request.transactionId,
      correlationId: request.correlationId,
      recoveryId: request.recoveryId,
      startedAt: '2026-06-29T00:00:00.000Z',
      finishedAt: '2026-06-29T00:00:01.000Z',
      durationMs: 1000,
      stagesCompleted: Object.freeze([
        RecoveryStage.REQUEST_VALIDATION,
        RecoveryStage.RECOVERY_PLANNING,
        RecoveryStage.AUTHORIZATION_CHECK,
        RecoveryStage.RECOVERY_EXECUTION_COORDINATION,
        RecoveryStage.VERIFICATION,
        RecoveryStage.REPORT_GENERATION,
      ]),
      verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
      success: true,
      idempotentReplay: false,
    });
  }
}

describe('RecoveryRuntimeBridge', () => {
  test('immutable requests', () => {
    const frozen = freezeRecoveryRuntimeBridgeRequest(buildRequest());

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.containmentExecutionReport)).toBe(true);
    expect(Object.isFrozen(frozen.executionVerificationReport)).toBe(true);

    expect(() => {
      (frozen as { metadata: Record<string, unknown> }).metadata = { mutate: true };
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic IDs', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const request = buildRequest();

    const first = await bridge.evaluate(request);
    const second = await bridge.evaluate(request);

    expect(first.bridgeId).toBe(second.bridgeId);
  });

  test('idempotent replay', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const request = buildRequest();

    const first = await bridge.evaluate(request);
    const second = await bridge.evaluate(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(engine.requests).toHaveLength(1);
  });

  test('failed execution prevents recovery', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(
      buildRequest({
        executionVerificationReport: buildExecutionVerificationReport({
          success: false,
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          failureReason: 'execution-failed',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.recoveryEngineInvoked).toBe(false);
    expect(report.failureReason).toContain('EXECUTION_VERIFICATION_GATE_CLOSED');
    expect(engine.requests).toHaveLength(0);
    expect(report.stagesCompleted).toEqual([
      RecoveryRuntimeBridgeStage.EXECUTION_REPORT_VALIDATION,
      RecoveryRuntimeBridgeStage.REPORT_GENERATION,
    ]);
  });

  test('verified execution invokes Recovery Engine', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(buildRequest());

    expect(report.success).toBe(true);
    expect(report.recoveryEngineInvoked).toBe(true);
    expect(engine.requests).toHaveLength(1);
    expect(engine.requests[0].operationType).toBe(
      RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    );
  });

  test('correlation preservation', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(
      buildRequest({
        containmentExecutionReport: buildContainmentExecutionReport({
          correlationId: 'corr-preserved',
        }),
        executionVerificationReport: buildExecutionVerificationReport({
          correlationId: 'corr-preserved',
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserved');
    expect(report.recoveryEvaluationRequest?.correlationId).toBe('corr-preserved');
  });

  test('transaction preservation', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(
      buildRequest({
        executionVerificationReport: buildExecutionVerificationReport({
          transactionId: 'txn-preserved',
        }),
      }),
    );

    expect(report.transactionId).toBe('txn-preserved');
    expect(report.recoveryEvaluationRequest?.transactionId).toBe('txn-preserved');
  });

  test('recoveryId preservation', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(
      buildRequest({
        executionVerificationReport: buildExecutionVerificationReport({
          recoveryId: 'recovery-preserved',
        }),
      }),
    );

    expect(report.recoveryId).toBe('recovery-preserved');
    expect(report.recoveryEvaluationRequest?.recoveryId).toBe('recovery-preserved');
  });

  test('executionId preservation', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(
      buildRequest({
        executionVerificationReport: buildExecutionVerificationReport({
          executionId: 'exec-preserved',
        }),
      }),
    );

    expect(report.executionId).toBe('exec-preserved');
    expect(report.recoveryEvaluationRequest?.metadata?.executionId).toBe('exec-preserved');
  });

  test('stage ordering', async () => {
    const engine = new RecordingRecoveryEngine();
    const bridge = new InMemoryRecoveryRuntimeBridge(engine);
    const report = await bridge.evaluate(buildRequest());

    expect(report.stagesCompleted).toEqual([
      RecoveryRuntimeBridgeStage.EXECUTION_REPORT_VALIDATION,
      RecoveryRuntimeBridgeStage.RECOVERY_REQUEST_GENERATION,
      RecoveryRuntimeBridgeStage.RECOVERY_ENGINE_INVOCATION,
      RecoveryRuntimeBridgeStage.VERIFICATION,
      RecoveryRuntimeBridgeStage.REPORT_GENERATION,
    ]);
  });

  test('no Discord.js, no REST/fetch, no filesystem writes, no persistence, no restoration, no dashboard, no commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/recovery-runtime-bridge.ts'),
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
