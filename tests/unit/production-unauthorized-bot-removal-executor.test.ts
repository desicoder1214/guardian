import fs from 'node:fs';
import path from 'node:path';
import {
  freezeProductionUnauthorizedBotRemovalExecutionRequest,
  InMemoryProductionUnauthorizedBotRemovalExecutor,
  ProductionUnauthorizedBotRemovalExecutionRequest,
  ProductionUnauthorizedBotRemovalExecutionStage,
} from '../../src/core/runtime/discord/production-unauthorized-bot-removal-executor';
import {
  InMemoryProductionDiscordExecutionWiring,
  ProductionDiscordExecutionWiringReport,
  ProductionDiscordExecutionWiringRequest,
} from '../../src/core/runtime/discord/production-discord-execution-wiring';
import { BotExecutionService } from '../../src/core/runtime/discord/discord-execution-service';
import { RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import { DiscordExecutionStatus } from '../../src/core/runtime/discord/discord-execution-service';

interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers?: {
    get(name: string): string | null;
  };
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

function buildDeterministicExecutionId(
  runtimeId: string,
  wiringId: string,
  recoveryId: string,
  transactionId: string,
  correlationId: string,
  guildId: string,
  botUserId: string,
): string {
  return [
    'production-unauthorized-bot-removal-execution',
    runtimeId,
    wiringId,
    recoveryId,
    transactionId,
    correlationId,
    guildId,
    botUserId,
  ].join(':');
}

function buildWiringReport(fetchFn: FetchLike): ProductionDiscordExecutionWiringReport {
  const wiring = new InMemoryProductionDiscordExecutionWiring();
  const request: ProductionDiscordExecutionWiringRequest = Object.freeze({
    botToken: 'test-token-001',
    discordApiBaseUrl: 'https://discord.example',
    guildId: 'guild-001',
    correlationId: 'corr-001',
    runtimeId: 'runtime-001',
    fetchFn,
  });

  return wiring.wire(request);
}

function buildRequest(
  wiringReport: ProductionDiscordExecutionWiringReport,
  overrides: Partial<ProductionUnauthorizedBotRemovalExecutionRequest> = {},
): ProductionUnauthorizedBotRemovalExecutionRequest {
  const recoveryId = 'recovery-001';
  const transactionId = 'txn-001';
  const botUserId = 'bot-001';
  const executionId = buildDeterministicExecutionId(
    wiringReport.runtimeId,
    wiringReport.wiringId,
    recoveryId,
    transactionId,
    wiringReport.correlationId,
    wiringReport.guildId,
    botUserId,
  );

  return Object.freeze({
    executionId,
    recoveryId,
    runtimeId: wiringReport.runtimeId,
    wiringId: wiringReport.wiringId,
    correlationId: wiringReport.correlationId,
    transactionId,
    guildId: wiringReport.guildId,
    botUserId,
    approved: true,
    wiringReport,
    metadata: Object.freeze({ source: 'production-unauthorized-bot-removal-executor-test' }),
    ...overrides,
  });
}

function buildStubWiringReport(
  botExecutionService: BotExecutionService,
): ProductionDiscordExecutionWiringReport {
  return Object.freeze({
    wiringId: 'wiring-stub-001',
    runtimeId: 'runtime-stub-001',
    guildId: 'guild-001',
    correlationId: 'corr-001',
    wiring: Object.freeze({
      restClient: {} as never,
      restClientDependency: {} as never,
      executionAdapter: {} as never,
      botExecutionService,
      productionRecoveryExecutor: {} as never,
    }),
    restClientConstructed: true,
    executionAdapterConstructed: true,
    botExecutionServiceConstructed: true,
    wiringVerified: true,
    stagesCompleted: Object.freeze([]),
    verificationOutcome: RecoveryVerificationOutcome.VERIFIED,
    success: true,
    startedAt: '2026-06-29T00:00:00.000Z',
    finishedAt: '2026-06-29T00:00:00.001Z',
    durationMs: 1,
  });
}

describe('ProductionUnauthorizedBotRemovalExecutor', () => {
  test('immutable requests', () => {
    const report = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const frozen = freezeProductionUnauthorizedBotRemovalExecutionRequest(
      buildRequest(report),
    );

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.wiringReport)).toBe(true);

    expect(() => {
      (frozen as { transactionId: string }).transactionId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports', async () => {
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const report = await executor.execute(buildRequest(wiringReport));

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic execution IDs', async () => {
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(wiringReport);

    const first = await executor.execute(request);
    const second = await executor.execute(request);

    expect(first.executionId).toBe(second.executionId);
    expect(first.executionId).toBe(request.executionId);
  });

  test('idempotent execution', async () => {
    let botServiceCalls = 0;
    const wiringReport = buildStubWiringReport({
      async removeUnauthorizedBot() {
        botServiceCalls += 1;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 1,
          correlationId: 'corr-001',
        });
      },
    });

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(wiringReport);

    const first = await executor.execute(request);
    const second = await executor.execute(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(botServiceCalls).toBe(1);
  });

  test('missing bot ID fails closed', async () => {
    let fetchCalls = 0;
    const wiringReport = buildWiringReport(async () => {
      fetchCalls += 1;
      return Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      });
    });

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(wiringReport, {
      botUserId: '',
      executionId: buildDeterministicExecutionId(
        wiringReport.runtimeId,
        wiringReport.wiringId,
        'recovery-001',
        'txn-001',
        wiringReport.correlationId,
        wiringReport.guildId,
        '',
      ),
    });

    const report = await executor.execute(request);

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('BOT_USER_ID_REQUIRED');
    expect(report.dispatchAttempted).toBe(false);
    expect(fetchCalls).toBe(0);
  });

  test('missing guild ID fails closed', async () => {
    let fetchCalls = 0;
    const wiringReport = buildWiringReport(async () => {
      fetchCalls += 1;
      return Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      });
    });

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(wiringReport, {
      guildId: '',
      executionId: buildDeterministicExecutionId(
        wiringReport.runtimeId,
        wiringReport.wiringId,
        'recovery-001',
        'txn-001',
        wiringReport.correlationId,
        '',
        'bot-001',
      ),
    });

    const report = await executor.execute(request);

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('GUILD_ID_REQUIRED');
    expect(report.dispatchAttempted).toBe(false);
    expect(fetchCalls).toBe(0);
  });

  test('dispatch through BotExecutionService', async () => {
    let botServiceCalls = 0;
    let capturedRequest: unknown;
    const wiringReport = buildStubWiringReport({
      async removeUnauthorizedBot(request) {
        botServiceCalls += 1;
        capturedRequest = request;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 3,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    });

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const report = await executor.execute(buildRequest(wiringReport));

    expect(botServiceCalls).toBe(1);
    expect(capturedRequest).toMatchObject({
      correlationId: 'corr-001',
      guildId: 'guild-001',
      botUserId: 'bot-001',
      idempotencyKey: report.executionId,
    });
    expect(report.dispatchAttempted).toBe(true);
    expect(report.executionResult?.status).toBe(DiscordExecutionStatus.SUCCESS);
  });

  test('verification propagation', async () => {
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: Object.freeze({ get: () => null }),
        json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
      }),
    );

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const report = await executor.execute(buildRequest(wiringReport));

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('EXECUTION_NOT_VERIFIED');
  });

  test('correlation preservation', async () => {
    const customCorrelation = 'corr-preserved';
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const alignedWiringReport = Object.freeze({
      ...wiringReport,
      correlationId: customCorrelation,
    });

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(alignedWiringReport, {
      correlationId: customCorrelation,
      executionId: buildDeterministicExecutionId(
        alignedWiringReport.runtimeId,
        alignedWiringReport.wiringId,
        'recovery-001',
        'txn-001',
        customCorrelation,
        alignedWiringReport.guildId,
        'bot-001',
      ),
    });

    const report = await executor.execute(request);
    expect(report.correlationId).toBe(customCorrelation);
  });

  test('transaction preservation', async () => {
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const request = buildRequest(wiringReport, {
      transactionId: 'txn-preserved',
      executionId: buildDeterministicExecutionId(
        wiringReport.runtimeId,
        wiringReport.wiringId,
        'recovery-001',
        'txn-preserved',
        wiringReport.correlationId,
        wiringReport.guildId,
        'bot-001',
      ),
    });

    const report = await executor.execute(request);
    expect(report.transactionId).toBe('txn-preserved');
  });

  test('stage ordering', async () => {
    const wiringReport = buildWiringReport(async () =>
      Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({ get: () => null }),
      }),
    );

    const executor = new InMemoryProductionUnauthorizedBotRemovalExecutor();
    const report = await executor.execute(buildRequest(wiringReport));

    expect(report.stagesCompleted).toEqual([
      ProductionUnauthorizedBotRemovalExecutionStage.REQUEST_VALIDATION,
      ProductionUnauthorizedBotRemovalExecutionStage.EXECUTION_AUTHORIZATION,
      ProductionUnauthorizedBotRemovalExecutionStage.BOT_REMOVAL_DISPATCH,
      ProductionUnauthorizedBotRemovalExecutionStage.EXECUTION_VERIFICATION,
      ProductionUnauthorizedBotRemovalExecutionStage.REPORT_GENERATION,
    ]);
  });

  test('no direct REST usage outside adapter, no Discord.js dependency, no persistence, no filesystem writes, no dashboard, no commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/discord/production-unauthorized-bot-removal-executor.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|ProductionDiscordRestClient/i);
    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/dashboard|command/i);
  });
});
