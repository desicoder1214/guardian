import fs from 'node:fs';
import path from 'node:path';
import {
  LIVE_DRILL_OPERATOR_ACKNOWLEDGMENT,
  ProductionValidationActionStatus,
  ProductionValidationHarness,
  ProductionValidationStage,
} from '../../src/core/runtime/discord/production-validation-harness';
import { ProductionDiscordHttpClient } from '../../src/core/runtime/discord/production-discord-execution-adapter';
import { DiscordBotRemovalVerificationOutcome } from '../../src/core/runtime/discord/discord-execution-service';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';

type ScenarioOverrides = Partial<{
  scenarioId: string;
  guildId: string;
  botUserId: string;
  correlationId: string;
  allowLiveDiscordExecution: boolean;
  testGuildConfirmed: boolean;
  disposableBotConfirmed: boolean;
  dryRunConfirmed: boolean;
  operatorAcknowledgment: string;
}>;

function createScenario(overrides: ScenarioOverrides = {}) {
  return Object.freeze({
    scenarioId: 'scenario-unauthorized-bot-removal',
    guildId: 'guild-validation-1',
    botUserId: 'bot-validation-1',
    correlationId: 'corr-validation-1',
    testGuildConfirmed: false,
    disposableBotConfirmed: false,
    dryRunConfirmed: false,
    operatorAcknowledgment: '',
    ...overrides,
  });
}

function createLiveReadyScenario(overrides: ScenarioOverrides = {}) {
  return createScenario({
    allowLiveDiscordExecution: true,
    testGuildConfirmed: true,
    disposableBotConfirmed: true,
    dryRunConfirmed: true,
    operatorAcknowledgment: LIVE_DRILL_OPERATOR_ACKNOWLEDGMENT,
    ...overrides,
  });
}

function createHttpClient(responseFactory: () => Promise<{ ok: boolean; status: number; statusText?: string; headers: { get(name: string): string | null }; json?(): Promise<unknown>; text?(): Promise<string> }>): ProductionDiscordHttpClient {
  return Object.freeze({
    async request() {
      return responseFactory();
    },
  });
}

describe('ProductionValidationHarness', () => {
  test('dry-run is the default mode', async () => {
    const harness = new ProductionValidationHarness();
    const report = await harness.validate(createScenario());

    expect(report.dryRun).toBe(true);
    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe('DRY_RUN');
    expect(report.restRequestCount).toBe(0);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.liveExecutionAllowed).toBe(false);
    expect(report.executionStagesCompleted).toContain(ProductionValidationStage.DETECTION);
    expect(report.actionResults.some((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)).toBe(true);
    expect(report.actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.status).toBe(
      ProductionValidationActionStatus.DRY_RUN,
    );
  });

  test('live mode fails without test-guild confirmation', async () => {
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
      productionDiscordHttpClient: createHttpClient(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { get() { return null; } },
      })),
    });

    const report = await harness.validate(createLiveReadyScenario({ testGuildConfirmed: false }));

    expect(report.success).toBe(false);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.failedRequirements).toContain('TEST_GUILD_CONFIRMATION_REQUIRED');
    expect(report.restRequestCount).toBe(0);
  });

  test('live mode fails without disposable-bot confirmation', async () => {
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
      productionDiscordHttpClient: createHttpClient(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { get() { return null; } },
      })),
    });

    const report = await harness.validate(createLiveReadyScenario({ disposableBotConfirmed: false }));

    expect(report.success).toBe(false);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.failedRequirements).toContain('DISPOSABLE_BOT_CONFIRMATION_REQUIRED');
    expect(report.restRequestCount).toBe(0);
  });

  test('live mode fails without prior dry-run confirmation', async () => {
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
      productionDiscordHttpClient: createHttpClient(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { get() { return null; } },
      })),
    });

    const report = await harness.validate(createLiveReadyScenario({ dryRunConfirmed: false }));

    expect(report.success).toBe(false);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.failedRequirements).toContain('PRIOR_DRY_RUN_CONFIRMATION_REQUIRED');
    expect(report.restRequestCount).toBe(0);
  });

  test('live mode fails without operator acknowledgment', async () => {
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
      productionDiscordHttpClient: createHttpClient(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { get() { return null; } },
      })),
    });

    const report = await harness.validate(createLiveReadyScenario({ operatorAcknowledgment: 'NOPE' }));

    expect(report.success).toBe(false);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.failedRequirements).toContain('OPERATOR_ACKNOWLEDGMENT_REQUIRED');
    expect(report.restRequestCount).toBe(0);
  });

  test('no live Discord call occurs in tests unless mocked HTTP client is injected', async () => {
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
    });

    const report = await harness.validate(createLiveReadyScenario());

    expect(report.success).toBe(false);
    expect(report.readiness.ready).toBe(false);
    expect(report.readiness.failedRequirements).toContain('PRODUCTION_DISCORD_HTTP_CLIENT_REQUIRED');
    expect(report.restRequestCount).toBe(0);
  });

  test('live mode succeeds only when every prerequisite is present', async () => {
    let restCalls = 0;
    const harness = new ProductionValidationHarness({
      botToken: 'test-token',
      productionDiscordHttpClient: createHttpClient(async () => {
        restCalls += 1;
        return {
          ok: true,
          status: 204,
          statusText: 'No Content',
          headers: { get() { return null; } },
        };
      }),
    });

    const report = await harness.validate(createLiveReadyScenario());

    expect(report.success).toBe(true);
    expect(report.dryRun).toBe(false);
    expect(report.readiness.ready).toBe(true);
    expect(report.readiness.liveExecutionAllowed).toBe(true);
    expect(report.restRequestCount).toBe(1);
    expect(restCalls).toBe(1);
    expect(report.verificationOutcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
    expect(report.actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.status).toBe(
      ProductionValidationActionStatus.SUCCEEDED,
    );
  });

  test('readiness result is immutable', async () => {
    const harness = new ProductionValidationHarness();
    const report = await harness.validate(createScenario());

    expect(Object.isFrozen(report.readiness)).toBe(true);
    expect(Object.isFrozen(report.readiness.failedRequirements)).toBe(true);
    expect(Object.isFrozen(report.readiness.warnings)).toBe(true);

    expect(() => {
      (report.readiness as { ready: boolean }).ready = true;
    }).toThrow(TypeError);
  });

  test('validation report is immutable and preserves correlation and idempotency key', async () => {
    const harness = new ProductionValidationHarness();
    const report = await harness.validate(createScenario());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.actionResults)).toBe(true);
    expect(Object.isFrozen(report.readiness)).toBe(true);
    expect(report.correlationId).toBe('corr-validation-1');
    expect(report.idempotencyKey).toContain('corr-validation-1');

    expect(() => {
      (report as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('no process env reads or persistence writes exist in the harness source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/discord/production-validation-harness.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/process\.env\b/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream|typeorm|prisma|mongoose|sequelize/i);
  });
});
