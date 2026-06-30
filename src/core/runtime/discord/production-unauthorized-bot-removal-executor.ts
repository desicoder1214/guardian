import {
  BotExecutionService,
  DiscordExecutionResult,
  DiscordExecutionStatus,
} from './discord-execution-service';
import {
  ProductionDiscordExecutionWiringReport,
} from './production-discord-execution-wiring';
import { RecoveryVerificationOutcome } from '../recovery/recovery-engine';

export enum ProductionUnauthorizedBotRemovalExecutionStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  EXECUTION_AUTHORIZATION = 'EXECUTION_AUTHORIZATION',
  BOT_REMOVAL_DISPATCH = 'BOT_REMOVAL_DISPATCH',
  EXECUTION_VERIFICATION = 'EXECUTION_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface ProductionUnauthorizedBotRemovalExecutionRequest {
  readonly executionId: string;
  readonly recoveryId: string;
  readonly runtimeId: string;
  readonly wiringId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly botUserId: string;
  readonly approved: boolean;
  readonly wiringReport: ProductionDiscordExecutionWiringReport;
  readonly metadata?: Record<string, unknown>;
}

export interface ProductionUnauthorizedBotRemovalExecutionReport {
  readonly executionId: string;
  readonly recoveryId: string;
  readonly runtimeId: string;
  readonly wiringId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly botUserId: string;
  readonly dispatchAttempted: boolean;
  readonly executionResult?: DiscordExecutionResult;
  readonly stagesCompleted: readonly ProductionUnauthorizedBotRemovalExecutionStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface ProductionUnauthorizedBotRemovalExecutor {
  execute(
    request: ProductionUnauthorizedBotRemovalExecutionRequest,
  ): Promise<ProductionUnauthorizedBotRemovalExecutionReport>;
}

const FAILURE_EXECUTION_ID_REQUIRED = 'EXECUTION_ID_REQUIRED';
const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_WIRING_ID_REQUIRED = 'WIRING_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_BOT_USER_ID_REQUIRED = 'BOT_USER_ID_REQUIRED';
const FAILURE_EXECUTION_NOT_APPROVED = 'EXECUTION_NOT_APPROVED';
const FAILURE_WIRING_NOT_AVAILABLE = 'WIRING_NOT_AVAILABLE';
const FAILURE_WIRING_RUNTIME_MISMATCH = 'WIRING_RUNTIME_MISMATCH';
const FAILURE_WIRING_GUILD_MISMATCH = 'WIRING_GUILD_MISMATCH';
const FAILURE_WIRING_CORRELATION_MISMATCH = 'WIRING_CORRELATION_MISMATCH';
const FAILURE_WIRING_ID_MISMATCH = 'WIRING_ID_MISMATCH';
const FAILURE_EXECUTION_ID_NON_DETERMINISTIC = 'EXECUTION_ID_NON_DETERMINISTIC';
const FAILURE_EXECUTION_NOT_VERIFIED = 'EXECUTION_NOT_VERIFIED';

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

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function buildDeterministicExecutionId(
  request: ProductionUnauthorizedBotRemovalExecutionRequest,
): string {
  return [
    'production-unauthorized-bot-removal-execution',
    request.runtimeId,
    request.wiringId,
    request.recoveryId,
    request.transactionId,
    request.correlationId,
    request.guildId,
    request.botUserId,
  ].join(':');
}

function freezeWiringReport(
  report: ProductionDiscordExecutionWiringReport,
): ProductionDiscordExecutionWiringReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function freezeExecutionResult(result: DiscordExecutionResult): DiscordExecutionResult {
  return deepFreeze({
    ...result,
    metadata:
      result.metadata && typeof result.metadata === 'object'
        ? deepFreeze(result.metadata as Record<string, unknown>)
        : result.metadata,
  });
}

export function freezeProductionUnauthorizedBotRemovalExecutionRequest(
  request: ProductionUnauthorizedBotRemovalExecutionRequest,
): ProductionUnauthorizedBotRemovalExecutionRequest {
  return deepFreeze({
    ...request,
    wiringReport: freezeWiringReport(request.wiringReport),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeProductionUnauthorizedBotRemovalExecutionReport(
  report: ProductionUnauthorizedBotRemovalExecutionReport,
): ProductionUnauthorizedBotRemovalExecutionReport {
  return deepFreeze({
    ...report,
    executionResult: report.executionResult
      ? freezeExecutionResult(report.executionResult)
      : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function resolveValidationFailures(
  request: ProductionUnauthorizedBotRemovalExecutionRequest,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(request.executionId)) {
    failures.push(FAILURE_EXECUTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.wiringId)) {
    failures.push(FAILURE_WIRING_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.botUserId)) {
    failures.push(FAILURE_BOT_USER_ID_REQUIRED);
  }

  if (request.executionId !== buildDeterministicExecutionId(request)) {
    failures.push(FAILURE_EXECUTION_ID_NON_DETERMINISTIC);
  }

  return Object.freeze(failures);
}

function resolveAuthorizationFailures(
  request: ProductionUnauthorizedBotRemovalExecutionRequest,
): readonly string[] {
  const failures: string[] = [];

  if (!request.approved) {
    failures.push(FAILURE_EXECUTION_NOT_APPROVED);
  }

  if (!request.wiringReport.success || !request.wiringReport.wiring) {
    failures.push(FAILURE_WIRING_NOT_AVAILABLE);
    return Object.freeze(failures);
  }

  if (request.wiringReport.runtimeId !== request.runtimeId) {
    failures.push(FAILURE_WIRING_RUNTIME_MISMATCH);
  }

  if (request.wiringReport.guildId !== request.guildId) {
    failures.push(FAILURE_WIRING_GUILD_MISMATCH);
  }

  if (request.wiringReport.correlationId !== request.correlationId) {
    failures.push(FAILURE_WIRING_CORRELATION_MISMATCH);
  }

  if (request.wiringReport.wiringId !== request.wiringId) {
    failures.push(FAILURE_WIRING_ID_MISMATCH);
  }

  return Object.freeze(failures);
}

function buildReport(
  request: ProductionUnauthorizedBotRemovalExecutionRequest,
  stagesCompleted: readonly ProductionUnauthorizedBotRemovalExecutionStage[],
  startedAtMs: number,
  success: boolean,
  dispatchAttempted: boolean,
  failureReason?: string,
  executionResult?: DiscordExecutionResult,
  idempotentReplay = false,
): ProductionUnauthorizedBotRemovalExecutionReport {
  return freezeProductionUnauthorizedBotRemovalExecutionReport({
    executionId: request.executionId,
    recoveryId: request.recoveryId,
    runtimeId: request.runtimeId,
    wiringId: request.wiringId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    botUserId: request.botUserId,
    dispatchAttempted,
    executionResult,
    stagesCompleted,
    verificationOutcome: success
      ? RecoveryVerificationOutcome.VERIFIED
      : RecoveryVerificationOutcome.FAILED,
    success,
    failureReason,
    idempotentReplay,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
  });
}

export class InMemoryProductionUnauthorizedBotRemovalExecutor
  implements ProductionUnauthorizedBotRemovalExecutor
{
  private readonly completedExecutions = new Map<
    string,
    ProductionUnauthorizedBotRemovalExecutionReport
  >();

  async execute(
    request: ProductionUnauthorizedBotRemovalExecutionRequest,
  ): Promise<ProductionUnauthorizedBotRemovalExecutionReport> {
    const frozenRequest = freezeProductionUnauthorizedBotRemovalExecutionRequest(request);
    const startedAtMs = Date.now();

    const existing = this.completedExecutions.get(frozenRequest.executionId);
    if (existing) {
      return freezeProductionUnauthorizedBotRemovalExecutionReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: ProductionUnauthorizedBotRemovalExecutionStage[] = [];
    stagesCompleted.push(ProductionUnauthorizedBotRemovalExecutionStage.REQUEST_VALIDATION);

    const validationFailures = resolveValidationFailures(frozenRequest);
    if (validationFailures.length > 0) {
      stagesCompleted.push(ProductionUnauthorizedBotRemovalExecutionStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        false,
        validationFailures.join(','),
      );
      this.completedExecutions.set(frozenRequest.executionId, report);
      return report;
    }

    stagesCompleted.push(
      ProductionUnauthorizedBotRemovalExecutionStage.EXECUTION_AUTHORIZATION,
    );
    const authorizationFailures = resolveAuthorizationFailures(frozenRequest);
    if (authorizationFailures.length > 0) {
      stagesCompleted.push(ProductionUnauthorizedBotRemovalExecutionStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        false,
        authorizationFailures.join(','),
      );
      this.completedExecutions.set(frozenRequest.executionId, report);
      return report;
    }

    const botExecutionService = frozenRequest.wiringReport.wiring
      ?.botExecutionService as BotExecutionService;

    stagesCompleted.push(
      ProductionUnauthorizedBotRemovalExecutionStage.BOT_REMOVAL_DISPATCH,
    );
    const executionResult = await botExecutionService.removeUnauthorizedBot(
      Object.freeze({
        correlationId: frozenRequest.correlationId,
        guildId: frozenRequest.guildId,
        botUserId: frozenRequest.botUserId,
        idempotencyKey: frozenRequest.executionId,
        reason: 'guardian:production-unauthorized-bot-removal-executor',
        metadata: Object.freeze({
          source: 'production-unauthorized-bot-removal-executor',
          executionId: frozenRequest.executionId,
          recoveryId: frozenRequest.recoveryId,
          runtimeId: frozenRequest.runtimeId,
          wiringId: frozenRequest.wiringId,
          transactionId: frozenRequest.transactionId,
        }),
      }),
    );

    stagesCompleted.push(
      ProductionUnauthorizedBotRemovalExecutionStage.EXECUTION_VERIFICATION,
    );
    const executionVerified =
      executionResult.status === DiscordExecutionStatus.SUCCESS ||
      executionResult.status === DiscordExecutionStatus.SKIPPED;

    stagesCompleted.push(ProductionUnauthorizedBotRemovalExecutionStage.REPORT_GENERATION);
    const report = buildReport(
      frozenRequest,
      Object.freeze(stagesCompleted),
      startedAtMs,
      executionVerified,
      true,
      executionVerified ? undefined : FAILURE_EXECUTION_NOT_VERIFIED,
      executionResult,
    );

    this.completedExecutions.set(frozenRequest.executionId, report);
    return report;
  }
}
