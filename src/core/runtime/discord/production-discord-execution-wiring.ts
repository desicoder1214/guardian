import {
  BotExecutionService,
} from './discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordHttpClient,
} from './production-discord-execution-adapter';
import {
  ProductionDiscordRestClient,
} from './production-discord-rest-client';
import {
  InMemoryProductionRecoveryExecutor,
  ProductionRecoveryExecutor,
} from '../recovery/production-recovery-executor';
import { RecoveryVerificationOutcome } from '../recovery/recovery-engine';

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

export enum ProductionDiscordExecutionWiringStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  REST_CLIENT_CONSTRUCTION = 'REST_CLIENT_CONSTRUCTION',
  EXECUTION_ADAPTER_CONSTRUCTION = 'EXECUTION_ADAPTER_CONSTRUCTION',
  BOT_EXECUTION_SERVICE_CONSTRUCTION = 'BOT_EXECUTION_SERVICE_CONSTRUCTION',
  WIRING_VERIFICATION = 'WIRING_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface ProductionDiscordExecutionWiringRequest {
  readonly botToken: string;
  readonly discordApiBaseUrl: string;
  readonly guildId: string;
  readonly correlationId: string;
  readonly runtimeId: string;
  readonly fetchFn?: FetchLike;
  readonly requestTimeoutMs?: number;
  readonly maxAttempts?: number;
  readonly apiVersion?: number;
  readonly userAgent?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ProductionDiscordExecutionWiringArtifacts {
  readonly restClient: ProductionDiscordRestClient;
  readonly restClientDependency: ProductionDiscordHttpClient;
  readonly executionAdapter: ProductionDiscordExecutionAdapter;
  readonly botExecutionService: BotExecutionService;
  readonly productionRecoveryExecutor: ProductionRecoveryExecutor;
}

export interface ProductionDiscordExecutionWiringReport {
  readonly wiringId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly correlationId: string;
  readonly wiring?: ProductionDiscordExecutionWiringArtifacts;
  readonly restClientConstructed: boolean;
  readonly executionAdapterConstructed: boolean;
  readonly botExecutionServiceConstructed: boolean;
  readonly wiringVerified: boolean;
  readonly stagesCompleted: readonly ProductionDiscordExecutionWiringStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface ProductionDiscordExecutionWiring {
  wire(
    request: ProductionDiscordExecutionWiringRequest,
  ): ProductionDiscordExecutionWiringReport;
}

const FAILURE_BOT_TOKEN_REQUIRED = 'BOT_TOKEN_REQUIRED';
const FAILURE_DISCORD_API_BASE_URL_REQUIRED = 'DISCORD_API_BASE_URL_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_WIRING_VERIFICATION_FAILED = 'WIRING_VERIFICATION_FAILED';

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

function tokenFingerprint(token: string): string {
  let sum = 0;
  for (let index = 0; index < token.length; index += 1) {
    sum += token.charCodeAt(index);
  }
  return `${token.length}:${sum}`;
}

function buildDeterministicWiringId(
  request: ProductionDiscordExecutionWiringRequest,
): string {
  return [
    'production-discord-execution-wiring',
    request.runtimeId,
    request.guildId,
    request.correlationId,
    request.discordApiBaseUrl,
    tokenFingerprint(request.botToken),
  ].join(':');
}

function resolveValidationFailures(
  request: ProductionDiscordExecutionWiringRequest,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(request.botToken)) {
    failures.push(FAILURE_BOT_TOKEN_REQUIRED);
  }

  if (!isNonEmptyString(request.discordApiBaseUrl)) {
    failures.push(FAILURE_DISCORD_API_BASE_URL_REQUIRED);
  }

  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }

  return Object.freeze(failures);
}

function freezeArtifacts(
  wiring: ProductionDiscordExecutionWiringArtifacts,
): ProductionDiscordExecutionWiringArtifacts {
  return Object.freeze({
    restClient: wiring.restClient,
    restClientDependency: wiring.restClientDependency,
    executionAdapter: wiring.executionAdapter,
    botExecutionService: wiring.botExecutionService,
    productionRecoveryExecutor: wiring.productionRecoveryExecutor,
  });
}

export function freezeProductionDiscordExecutionWiringRequest(
  request: ProductionDiscordExecutionWiringRequest,
): ProductionDiscordExecutionWiringRequest {
  return deepFreeze({
    ...request,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeProductionDiscordExecutionWiringReport(
  report: ProductionDiscordExecutionWiringReport,
): ProductionDiscordExecutionWiringReport {
  return deepFreeze({
    ...report,
    wiring: report.wiring ? freezeArtifacts(report.wiring) : undefined,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function buildReport(
  request: ProductionDiscordExecutionWiringRequest,
  stagesCompleted: readonly ProductionDiscordExecutionWiringStage[],
  startedAtMs: number,
  success: boolean,
  restClientConstructed: boolean,
  executionAdapterConstructed: boolean,
  botExecutionServiceConstructed: boolean,
  wiringVerified: boolean,
  failureReason?: string,
  wiring?: ProductionDiscordExecutionWiringArtifacts,
): ProductionDiscordExecutionWiringReport {
  return freezeProductionDiscordExecutionWiringReport({
    wiringId: buildDeterministicWiringId(request),
    runtimeId: request.runtimeId,
    guildId: request.guildId,
    correlationId: request.correlationId,
    wiring,
    restClientConstructed,
    executionAdapterConstructed,
    botExecutionServiceConstructed,
    wiringVerified,
    stagesCompleted,
    verificationOutcome: success
      ? RecoveryVerificationOutcome.VERIFIED
      : RecoveryVerificationOutcome.FAILED,
    success,
    failureReason,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
  });
}

export class InMemoryProductionDiscordExecutionWiring
  implements ProductionDiscordExecutionWiring
{
  wire(
    request: ProductionDiscordExecutionWiringRequest,
  ): ProductionDiscordExecutionWiringReport {
    const frozenRequest = freezeProductionDiscordExecutionWiringRequest(request);
    const startedAtMs = Date.now();

    const stagesCompleted: ProductionDiscordExecutionWiringStage[] = [];
    stagesCompleted.push(ProductionDiscordExecutionWiringStage.REQUEST_VALIDATION);

    const validationFailures = resolveValidationFailures(frozenRequest);
    if (validationFailures.length > 0) {
      stagesCompleted.push(ProductionDiscordExecutionWiringStage.REPORT_GENERATION);
      return buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        false,
        false,
        false,
        false,
        validationFailures.join(','),
      );
    }

    stagesCompleted.push(ProductionDiscordExecutionWiringStage.REST_CLIENT_CONSTRUCTION);
    const restClient = new ProductionDiscordRestClient({
      fetchFn: frozenRequest.fetchFn,
      requestTimeoutMs: frozenRequest.requestTimeoutMs,
      maxAttempts: frozenRequest.maxAttempts,
    });

    stagesCompleted.push(
      ProductionDiscordExecutionWiringStage.EXECUTION_ADAPTER_CONSTRUCTION,
    );
    const executionAdapter = new ProductionDiscordExecutionAdapter({
      httpClient: restClient,
      botToken: frozenRequest.botToken,
      apiBaseUrl: frozenRequest.discordApiBaseUrl,
      apiVersion: frozenRequest.apiVersion,
      userAgent: frozenRequest.userAgent,
      maxAttempts: frozenRequest.maxAttempts,
    });

    stagesCompleted.push(
      ProductionDiscordExecutionWiringStage.BOT_EXECUTION_SERVICE_CONSTRUCTION,
    );
    const botExecutionService = executionAdapter.bot;
    const productionRecoveryExecutor =
      new InMemoryProductionRecoveryExecutor(botExecutionService);

    stagesCompleted.push(ProductionDiscordExecutionWiringStage.WIRING_VERIFICATION);
    const wiring = freezeArtifacts({
      restClient,
      restClientDependency: restClient,
      executionAdapter,
      botExecutionService,
      productionRecoveryExecutor,
    });

    const wiringVerified =
      typeof wiring.executionAdapter.bot.removeUnauthorizedBot === 'function' &&
      typeof wiring.botExecutionService.removeUnauthorizedBot === 'function' &&
      wiring.restClient === wiring.restClientDependency;

    stagesCompleted.push(ProductionDiscordExecutionWiringStage.REPORT_GENERATION);

    if (!wiringVerified) {
      return buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        true,
        true,
        true,
        false,
        FAILURE_WIRING_VERIFICATION_FAILED,
        wiring,
      );
    }

    return buildReport(
      frozenRequest,
      Object.freeze(stagesCompleted),
      startedAtMs,
      true,
      true,
      true,
      true,
      true,
      undefined,
      wiring,
    );
  }
}
