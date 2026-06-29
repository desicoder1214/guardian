import {
  BotExecutionService,
  DiscordBotRemovalExecutionRequest,
  DiscordExecutionResult,
  DiscordExecutionStatus,
  InMemoryDiscordExecutionService,
} from '../discord/discord-execution-service';
import { RecoveryVerificationOutcome } from './recovery-engine';
import {
  RecoveryExecutionVerificationReport,
} from './recovery-execution-verifier';

export enum RecoveryProductionExecutionStage {
  VERIFICATION_GATE = 'VERIFICATION_GATE',
  EXECUTION_PREPARATION = 'EXECUTION_PREPARATION',
  PRODUCTION_EXECUTION = 'PRODUCTION_EXECUTION',
  EXECUTION_VERIFICATION = 'EXECUTION_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface ProductionRecoveryExecutorRequest {
  readonly verificationReport: RecoveryExecutionVerificationReport;
  readonly metadata?: Record<string, unknown>;
}

export interface ProductionRecoveryExecutionReport {
  readonly executionId: string;
  readonly verificationId: string;
  readonly recoveryId: string;
  readonly transactionId: string;
  readonly correlationId: string;
  readonly pipelineId: string;
  readonly guildId: string;
  readonly executionAttempted: boolean;
  readonly executionVerified: boolean;
  readonly stagesCompleted: readonly RecoveryProductionExecutionStage[];
  readonly executionResult?: DiscordExecutionResult;
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface ProductionRecoveryExecutor {
  execute(
    request: ProductionRecoveryExecutorRequest,
  ): Promise<ProductionRecoveryExecutionReport>;
}

const FAILURE_VERIFICATION_GATE_CLOSED = 'VERIFICATION_GATE_CLOSED';
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

function freezeVerificationReport(
  report: RecoveryExecutionVerificationReport,
): RecoveryExecutionVerificationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

export function freezeProductionRecoveryExecutorRequest(
  request: ProductionRecoveryExecutorRequest,
): ProductionRecoveryExecutorRequest {
  return deepFreeze({
    ...request,
    verificationReport: freezeVerificationReport(request.verificationReport),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeExecutionResult(result: DiscordExecutionResult): DiscordExecutionResult {
  return deepFreeze({
    ...result,
    metadata: result.metadata && typeof result.metadata === 'object'
      ? deepFreeze(result.metadata as Record<string, unknown>)
      : result.metadata,
  });
}

function freezeProductionRecoveryExecutionReport(
  report: ProductionRecoveryExecutionReport,
): ProductionRecoveryExecutionReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    executionResult: report.executionResult
      ? freezeExecutionResult(report.executionResult)
      : undefined,
  });
}

function buildDeterministicExecutionKey(
  request: ProductionRecoveryExecutorRequest,
): string {
  const report = request.verificationReport;
  return [
    report.verificationId,
    report.recoveryId,
    report.transactionId,
    report.correlationId,
    report.pipelineId,
    report.guildId,
  ].join('|');
}

function buildDeterministicExecutionId(
  request: ProductionRecoveryExecutorRequest,
): string {
  return `production-recovery-execution:${buildDeterministicExecutionKey(request)}`;
}

function verificationGatePassed(
  report: RecoveryExecutionVerificationReport,
): boolean {
  return report.success && report.verificationOutcome === RecoveryVerificationOutcome.VERIFIED;
}

function resolveBotUserId(
  request: ProductionRecoveryExecutorRequest,
): string | undefined {
  const value = request.metadata?.botUserId;
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function toBotExecutionRequest(
  request: ProductionRecoveryExecutorRequest,
): DiscordBotRemovalExecutionRequest {
  return Object.freeze({
    correlationId: request.verificationReport.correlationId,
    guildId: request.verificationReport.guildId,
    botUserId: resolveBotUserId(request),
    idempotencyKey: request.verificationReport.verificationId,
    reason: 'guardian:production-recovery-unauthorized-bot-removal',
    metadata: Object.freeze({
      verificationId: request.verificationReport.verificationId,
      recoveryId: request.verificationReport.recoveryId,
      transactionId: request.verificationReport.transactionId,
      pipelineId: request.verificationReport.pipelineId,
      guildId: request.verificationReport.guildId,
      source: 'production-recovery-executor',
    }),
  });
}

function buildReport(
  request: ProductionRecoveryExecutorRequest,
  stagesCompleted: readonly RecoveryProductionExecutionStage[],
  startedAtMs: number,
  success: boolean,
  executionAttempted: boolean,
  executionVerified: boolean,
  failureReason?: string,
  executionResult?: DiscordExecutionResult,
  idempotentReplay = false,
): ProductionRecoveryExecutionReport {
  const report = request.verificationReport;
  return freezeProductionRecoveryExecutionReport({
    executionId: buildDeterministicExecutionId(request),
    verificationId: report.verificationId,
    recoveryId: report.recoveryId,
    transactionId: report.transactionId,
    correlationId: report.correlationId,
    pipelineId: report.pipelineId,
    guildId: report.guildId,
    executionAttempted,
    executionVerified,
    stagesCompleted,
    executionResult,
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

export class InMemoryProductionRecoveryExecutor
  implements ProductionRecoveryExecutor
{
  private readonly completedExecutions = new Map<
    string,
    ProductionRecoveryExecutionReport
  >();

  constructor(
    private readonly botExecutionService: BotExecutionService =
      new InMemoryDiscordExecutionService().bot,
  ) {}

  async execute(
    request: ProductionRecoveryExecutorRequest,
  ): Promise<ProductionRecoveryExecutionReport> {
    const frozenRequest = freezeProductionRecoveryExecutorRequest(request);
    const startedAtMs = Date.now();
    const executionId = buildDeterministicExecutionId(frozenRequest);

    const existing = this.completedExecutions.get(executionId);
    if (existing) {
      return freezeProductionRecoveryExecutionReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RecoveryProductionExecutionStage[] = [];
    stagesCompleted.push(RecoveryProductionExecutionStage.VERIFICATION_GATE);

    if (!verificationGatePassed(frozenRequest.verificationReport)) {
      stagesCompleted.push(RecoveryProductionExecutionStage.REPORT_GENERATION);
      const report = buildReport(
        frozenRequest,
        Object.freeze(stagesCompleted),
        startedAtMs,
        false,
        false,
        false,
        FAILURE_VERIFICATION_GATE_CLOSED,
      );
      this.completedExecutions.set(executionId, report);
      return report;
    }

    stagesCompleted.push(RecoveryProductionExecutionStage.EXECUTION_PREPARATION);
    const botRequest = toBotExecutionRequest(frozenRequest);

    stagesCompleted.push(RecoveryProductionExecutionStage.PRODUCTION_EXECUTION);
    const executionResult = await this.botExecutionService.removeUnauthorizedBot(botRequest);

    stagesCompleted.push(RecoveryProductionExecutionStage.EXECUTION_VERIFICATION);
    const executionVerified =
      executionResult.status === DiscordExecutionStatus.SUCCESS ||
      executionResult.status === DiscordExecutionStatus.SKIPPED;

    stagesCompleted.push(RecoveryProductionExecutionStage.REPORT_GENERATION);

    const report = buildReport(
      frozenRequest,
      Object.freeze(stagesCompleted),
      startedAtMs,
      executionVerified,
      true,
      executionVerified,
      executionVerified ? undefined : FAILURE_EXECUTION_NOT_VERIFIED,
      executionResult,
    );

    this.completedExecutions.set(executionId, report);
    return report;
  }
}
