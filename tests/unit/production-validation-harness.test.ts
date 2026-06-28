import fs from 'node:fs';
import path from 'node:path';
import {
  ProductionValidationActionStatus,
  ProductionValidationHarness,
  ProductionValidationStage,
} from '../../src/core/runtime/discord/production-validation-harness';
import { ProductionDiscordHttpClient } from '../../src/core/runtime/discord/production-discord-execution-adapter';
import { DiscordBotRemovalVerificationOutcome } from '../../src/core/runtime/discord/discord-execution-service';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';

function createScenario(overrides: Partial<{ scenarioId: string; guildId: string; botUserId: string; correlationId: string; allowLiveDiscordExecution: boolean }> = {}) {
  return Object.freeze({
    scenarioId: 'scenario-unauthorized-bot-removal',
    guildId: 'guild-validation-1',
    botUserId: 'bot-validation-1',
    correlationId: 'corr-validation-1',
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
    expect(report.executionStagesCompleted).toContain(ProductionValidationStage.DETECTION);
    expect(report.actionResults.some((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)).toBe(true);
    expect(report.actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.status).toBe(
      ProductionValidationActionStatus.DRY_RUN,
    );
  });

  test('live mode requires explicit opt-in and live dependencies', async () => {
    const harness = new ProductionValidationHarness();

    await expect(
      harness.validate(
        createScenario({ allowLiveDiscordExecution: true }),
      ),
    ).rejects.toThrow('Production validation live mode requires allowLiveDiscordExecution=true, botToken, and productionDiscordHttpClient');
  });

  test('missing live parameters fail closed', async () => {
    const harness = new ProductionValidationHarness({
      productionDiscordHttpClient: createHttpClient(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { get() { return null; } },
      })),
    });

    await expect(
      harness.validate(
        createScenario({ allowLiveDiscordExecution: true }),
      ),
    ).rejects.toThrow('Production validation live mode requires allowLiveDiscordExecution=true, botToken, and productionDiscordHttpClient');
  });

  test('live execution captures rest request count and verification outcome', async () => {
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

    const report = await harness.validate(createScenario({ allowLiveDiscordExecution: true }));

    expect(report.dryRun).toBe(false);
    expect(report.restRequestCount).toBe(1);
    expect(restCalls).toBe(1);
    expect(report.verificationOutcome).toBe(DiscordBotRemovalVerificationOutcome.SUCCESS);
    expect(report.actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.status).toBe(
      ProductionValidationActionStatus.SUCCEEDED,
    );
  });

  test('validation report is immutable and preserves correlation and idempotency key', async () => {
    const harness = new ProductionValidationHarness();
    const report = await harness.validate(createScenario());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.actionResults)).toBe(true);
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
