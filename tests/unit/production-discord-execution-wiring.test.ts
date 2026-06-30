import fs from 'node:fs';
import path from 'node:path';
import {
  freezeProductionDiscordExecutionWiringRequest,
  InMemoryProductionDiscordExecutionWiring,
  ProductionDiscordExecutionWiringRequest,
  ProductionDiscordExecutionWiringStage,
} from '../../src/core/runtime/discord/production-discord-execution-wiring';
import { RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';

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

function buildRequest(
  overrides: Partial<ProductionDiscordExecutionWiringRequest> = {},
): ProductionDiscordExecutionWiringRequest {
  const fetchFn: FetchLike = async () =>
    Object.freeze({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: Object.freeze({
        get(): string | null {
          return null;
        },
      }),
    });

  return Object.freeze({
    botToken: 'test-token-001',
    discordApiBaseUrl: 'https://discord.example',
    guildId: 'guild-001',
    correlationId: 'corr-001',
    runtimeId: 'runtime-001',
    fetchFn,
    metadata: Object.freeze({ source: 'production-discord-execution-wiring-test' }),
    ...overrides,
  });
}

describe('ProductionDiscordExecutionWiring', () => {
  test('immutable requests', () => {
    const frozen = freezeProductionDiscordExecutionWiringRequest(buildRequest());

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.metadata)).toBe(true);

    expect(() => {
      (frozen as { guildId: string }).guildId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic wiring IDs', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const request = buildRequest();

    const first = wiring.wire(request);
    const second = wiring.wire(request);

    expect(first.wiringId).toBe(second.wiringId);
  });

  test('missing token fails closed', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest({ botToken: '' }));

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('BOT_TOKEN_REQUIRED');
    expect(report.wiring).toBeUndefined();
  });

  test('missing guildId fails closed', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest({ guildId: '' }));

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('GUILD_ID_REQUIRED');
    expect(report.wiring).toBeUndefined();
  });

  test('valid request constructs wiring', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
    expect(report.restClientConstructed).toBe(true);
    expect(report.executionAdapterConstructed).toBe(true);
    expect(report.botExecutionServiceConstructed).toBe(true);
    expect(report.wiringVerified).toBe(true);
    expect(report.wiring).toBeDefined();
  });

  test('no Discord call during wiring', () => {
    let fetchCalls = 0;
    const fetchFn: FetchLike = async () => {
      fetchCalls += 1;
      return Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({
          get(): string | null {
            return null;
          },
        }),
      });
    };

    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest({ fetchFn }));

    expect(report.success).toBe(true);
    expect(fetchCalls).toBe(0);
  });

  test('no execution during wiring', () => {
    let fetchCalls = 0;
    const fetchFn: FetchLike = async () => {
      fetchCalls += 1;
      return Object.freeze({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: Object.freeze({
          get(): string | null {
            return null;
          },
        }),
      });
    };

    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest({ fetchFn }));

    expect(report.success).toBe(true);
    expect(report.wiring?.productionRecoveryExecutor).toBeDefined();
    expect(fetchCalls).toBe(0);
  });

  test('bot execution service exists', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(report.wiring).toBeDefined();
    expect(typeof report.wiring?.botExecutionService.removeUnauthorizedBot).toBe(
      'function',
    );
  });

  test('adapter exists', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(report.wiring).toBeDefined();
    expect(report.wiring?.executionAdapter).toBeDefined();
    expect(report.wiring?.executionAdapter.bot).toBe(report.wiring?.botExecutionService);
  });

  test('REST client dependency is preserved', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(report.wiring?.restClient).toBe(report.wiring?.restClientDependency);
  });

  test('stage ordering', () => {
    const wiring = new InMemoryProductionDiscordExecutionWiring();
    const report = wiring.wire(buildRequest());

    expect(report.stagesCompleted).toEqual([
      ProductionDiscordExecutionWiringStage.REQUEST_VALIDATION,
      ProductionDiscordExecutionWiringStage.REST_CLIENT_CONSTRUCTION,
      ProductionDiscordExecutionWiringStage.EXECUTION_ADAPTER_CONSTRUCTION,
      ProductionDiscordExecutionWiringStage.BOT_EXECUTION_SERVICE_CONSTRUCTION,
      ProductionDiscordExecutionWiringStage.WIRING_VERIFICATION,
      ProductionDiscordExecutionWiringStage.REPORT_GENERATION,
    ]);
  });

  test('no persistence/database, no filesystem writes, no dashboard, no commands, no new planners, no new orchestrators in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/discord/production-discord-execution-wiring.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/dashboard|command/i);
    expect(source).not.toMatch(/planner|orchestrator/i);
  });
});
