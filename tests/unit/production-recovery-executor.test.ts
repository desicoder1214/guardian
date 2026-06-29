import fs from 'node:fs';
import path from 'node:path';
import {
  BotExecutionService,
  DiscordExecutionResult,
  DiscordExecutionStatus,
} from '../../src/core/runtime/discord/discord-execution-service';
import { RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeProductionRecoveryExecutorRequest,
  InMemoryProductionRecoveryExecutor,
  ProductionRecoveryExecutorRequest,
  RecoveryProductionExecutionStage,
} from '../../src/core/runtime/recovery/production-recovery-executor';
import {
  RecoveryExecutionVerificationReport,
  RecoveryExecutionVerificationStage,
} from '../../src/core/runtime/recovery/recovery-execution-verifier';

function buildVerificationReport(
  overrides: Partial<RecoveryExecutionVerificationReport> = {},
): RecoveryExecutionVerificationReport {
  return Object.freeze({
    verificationId: 'verification-001',
    coordinationId: 'coordination-001',
    correlationId: 'corr-001',
    transactionId: 'txn-001',
    recoveryId: 'recovery-001',
    pipelineId: 'pipeline-001',
    guildId: 'guild-001',
    containmentVerified: true,
    recoveryEvaluationStarted: true,
    recoveryScheduled: true,
    coordinationReportValid: true,
    identityIntegrityValid: true,
    runtimeDecisionIntegrityValid: true,
    schedulingIntegrityValid: true,
    stagesCompleted: Object.freeze([
      RecoveryExecutionVerificationStage.COORDINATION_REPORT_VALIDATION,
      RecoveryExecutionVerificationStage.IDENTITY_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.RUNTIME_DECISION_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.SCHEDULING_INTEGRITY_CHECK,
      RecoveryExecutionVerificationStage.VERIFICATION_RESULT_GENERATION,
    ]),
    verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
    success: true,
    idempotentReplay: false,
    startedAt: '2026-06-29T00:00:00.000Z',
    finishedAt: '2026-06-29T00:00:00.001Z',
    durationMs: 1,
    ...overrides,
  });
}

function buildRequest(
  verificationReport: RecoveryExecutionVerificationReport,
  overrides: Partial<ProductionRecoveryExecutorRequest> = {},
): ProductionRecoveryExecutorRequest {
  return Object.freeze({
    verificationReport,
    metadata: Object.freeze({
      source: 'production-recovery-executor-test',
      botUserId: 'bot-001',
    }),
    ...overrides,
  });
}

describe('ProductionRecoveryExecutor', () => {
  test('immutable requests', () => {
    const frozen = freezeProductionRecoveryExecutorRequest(
      buildRequest(buildVerificationReport()),
    );

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.verificationReport)).toBe(true);

    expect(() => {
      (frozen as { metadata: Record<string, unknown> }).metadata = { mutated: true };
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 3,
          correlationId: 'corr-001',
          metadata: Object.freeze({ operation: 'removeUnauthorizedBot' }),
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(buildRequest(buildVerificationReport()));

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic execution IDs', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const request = buildRequest(buildVerificationReport());

    const first = await executor.execute(request);
    const second = await executor.execute(request);

    expect(first.executionId).toBe(second.executionId);
  });

  test('idempotent replay', async () => {
    let calls = 0;
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        calls += 1;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const request = buildRequest(buildVerificationReport());

    const first = await executor.execute(request);
    const second = await executor.execute(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(calls).toBe(1);
  });

  test('failed verification prevents execution', async () => {
    let calls = 0;
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        calls += 1;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(
        buildVerificationReport({
          success: false,
          verificationOutcome: RecoveryVerificationOutcome.FAILED,
          failureReason: 'verification-failed',
        }),
      ),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('VERIFICATION_GATE_CLOSED');
    expect(report.executionAttempted).toBe(false);
    expect(calls).toBe(0);
    expect(report.stagesCompleted).toEqual([
      RecoveryProductionExecutionStage.VERIFICATION_GATE,
      RecoveryProductionExecutionStage.REPORT_GENERATION,
    ]);
  });

  test('successful execution path', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 5,
          correlationId: 'corr-001',
          metadata: Object.freeze({ service: 'bot' }),
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(buildRequest(buildVerificationReport()));

    expect(report.success).toBe(true);
    expect(report.executionAttempted).toBe(true);
    expect(report.executionVerified).toBe(true);
    expect(report.executionResult?.status).toBe(DiscordExecutionStatus.SUCCESS);
  });

  test('execution verification fails closed on failed execution status', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.FAILED,
          executionTimeMs: 4,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(buildRequest(buildVerificationReport()));

    expect(report.success).toBe(false);
    expect(report.executionVerified).toBe(false);
    expect(report.failureReason).toContain('EXECUTION_NOT_VERIFIED');
  });

  test('correlation preservation', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-preserved',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(buildVerificationReport({ correlationId: 'corr-preserved' })),
    );

    expect(report.correlationId).toBe('corr-preserved');
  });

  test('transaction preservation', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(buildVerificationReport({ transactionId: 'txn-preserved' })),
    );

    expect(report.transactionId).toBe('txn-preserved');
  });

  test('recoveryId preservation', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(buildVerificationReport({ recoveryId: 'recovery-preserved' })),
    );

    expect(report.recoveryId).toBe('recovery-preserved');
  });

  test('pipelineId preservation', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(buildVerificationReport({ pipelineId: 'pipeline-preserved' })),
    );

    expect(report.pipelineId).toBe('pipeline-preserved');
  });

  test('guildId preservation', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(
      buildRequest(buildVerificationReport({ guildId: 'guild-preserved' })),
    );

    expect(report.guildId).toBe('guild-preserved');
  });

  test('stage ordering', async () => {
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(): Promise<DiscordExecutionResult> {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 2,
          correlationId: 'corr-001',
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    const report = await executor.execute(buildRequest(buildVerificationReport()));

    expect(report.stagesCompleted).toEqual([
      RecoveryProductionExecutionStage.VERIFICATION_GATE,
      RecoveryProductionExecutionStage.EXECUTION_PREPARATION,
      RecoveryProductionExecutionStage.PRODUCTION_EXECUTION,
      RecoveryProductionExecutionStage.EXECUTION_VERIFICATION,
      RecoveryProductionExecutionStage.REPORT_GENERATION,
    ]);
  });

  test('execution adapter invocation', async () => {
    let capturedRequest: unknown;
    const botService: BotExecutionService = {
      async removeUnauthorizedBot(request): Promise<DiscordExecutionResult> {
        capturedRequest = request;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 2,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    };

    const executor = new InMemoryProductionRecoveryExecutor(botService);
    await executor.execute(
      buildRequest(buildVerificationReport({ correlationId: 'corr-invocation' }), {
        metadata: Object.freeze({ botUserId: 'bot-invocation' }),
      }),
    );

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest).toMatchObject({
      correlationId: 'corr-invocation',
      guildId: 'guild-001',
      botUserId: 'bot-invocation',
    });
  });

  test('no Discord.js dependency, no direct fetch, no persistence, no filesystem writes, no dashboard, no commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/production-recovery-executor.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/writeFile|appendFile|mkdir|rmSync|writeFileSync|appendFileSync/i);
    expect(source).not.toMatch(/dashboard|command/i);
  });
});
