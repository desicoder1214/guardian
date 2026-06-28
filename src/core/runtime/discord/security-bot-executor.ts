import { SecurityBotExecutor } from './security-action-executor';
import {
  DiscordBotRemovalExecutionRequest,
  DiscordExecutionService,
  DiscordExecutionStatus,
} from './discord-execution-service';
import {
  AuthorizationDecision,
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityExecutionRouteDecision,
} from './security-execution-types';

export enum SecurityBotExecutionStatus {
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
}

export interface SecurityBotExecutionResult {
  readonly status: SecurityBotExecutionStatus;
  readonly domain: SecurityExecutorDomain.BOT;
  readonly capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT;
  readonly correlationId: string;
  readonly planId: string;
  readonly executionPlanId: string;
  readonly metadata?: Record<string, unknown>;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeExecutionResult(result: SecurityBotExecutionResult): SecurityBotExecutionResult {
  return Object.freeze({
    status: result.status,
    domain: result.domain,
    capability: result.capability,
    correlationId: result.correlationId,
    planId: result.planId,
    executionPlanId: result.executionPlanId,
    metadata: freezeMetadata(result.metadata),
  });
}

function freezeDomainResult(result: SecurityDomainExecutionResult): SecurityDomainExecutionResult {
  return Object.freeze({
    domain: result.domain,
    capability: result.capability,
    accepted: result.accepted,
    reason: result.reason,
    metadata: freezeMetadata(result.metadata),
  });
}

function requestKey(request: SecurityDomainExecutionRequest): string {
  return `${request.planId}:${request.executionPlanId}:${request.route.routeId}:${request.correlationId}`;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function evaluateRequest(request: SecurityDomainExecutionRequest): {
  accepted: boolean;
  rejectionReason?: string;
} {
  if (request.domain !== SecurityExecutorDomain.BOT) {
    return { accepted: false, rejectionReason: 'domain-mismatch' };
  }

  if (request.capability !== SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT) {
    return { accepted: false, rejectionReason: 'unsupported-capability' };
  }

  if (request.route.decision !== SecurityExecutionRouteDecision.EXECUTABLE) {
    return { accepted: false, rejectionReason: 'route-not-executable' };
  }

  if (request.route.authorizationResult.decision !== AuthorizationDecision.AUTHORIZED) {
    return { accepted: false, rejectionReason: 'authorization-not-authorized' };
  }

  return { accepted: true };
}

export class InMemorySecurityBotExecutor implements SecurityBotExecutor {
  readonly executorId = 'in-memory-security-bot-executor';
  readonly domain = SecurityExecutorDomain.BOT;
  readonly supportedCapabilities = Object.freeze([SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]);

  private readonly processedRequestKeys = new Set<string>();

  supports(capability: SecurityExecutorCapability): boolean {
    return capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT;
  }

  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult {
    const evaluation = evaluateRequest(request);
    if (!evaluation.accepted) {
      return freezeDomainResult({
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        accepted: false,
        reason: 'INTENT_REJECTED',
        metadata: Object.freeze({ reason: evaluation.rejectionReason }),
      });
    }

    return freezeDomainResult({
      domain: SecurityExecutorDomain.BOT,
      capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      accepted: true,
      reason: 'INTENT_ACCEPTED',
      metadata: Object.freeze({ executorId: this.executorId }),
    });
  }

  execute(request: SecurityDomainExecutionRequest): SecurityBotExecutionResult {
    const prepared = this.prepare(request);
    if (!prepared.accepted) {
      return freezeExecutionResult({
        status: SecurityBotExecutionStatus.REJECTED,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ reason: prepared.metadata?.reason ?? 'intent-rejected' }),
      });
    }

    const key = requestKey(request);
    if (this.processedRequestKeys.has(key)) {
      return freezeExecutionResult({
        status: SecurityBotExecutionStatus.SKIPPED_DUPLICATE,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ duplicate: true, idempotent: true }),
      });
    }

    this.processedRequestKeys.add(key);

    return freezeExecutionResult({
      status: SecurityBotExecutionStatus.EXECUTED,
      domain: SecurityExecutorDomain.BOT,
      capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      correlationId: request.correlationId,
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      metadata: Object.freeze({ mode: 'in-memory', idempotent: true }),
    });
  }
}

export class DiscordBotExecutor implements SecurityBotExecutor {
  readonly executorId = 'discord-security-bot-executor';
  readonly domain = SecurityExecutorDomain.BOT;
  readonly supportedCapabilities = Object.freeze([SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]);

  private readonly processedRequestKeys = new Set<string>();

  constructor(private readonly discordExecutionService: DiscordExecutionService) {}

  supports(capability: SecurityExecutorCapability): boolean {
    return capability === SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT;
  }

  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult {
    const evaluation = evaluateRequest(request);
    if (!evaluation.accepted) {
      return freezeDomainResult({
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        accepted: false,
        reason: 'INTENT_REJECTED',
        metadata: Object.freeze({ reason: evaluation.rejectionReason }),
      });
    }

    return freezeDomainResult({
      domain: SecurityExecutorDomain.BOT,
      capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      accepted: true,
      reason: 'INTENT_ACCEPTED',
      metadata: Object.freeze({ executorId: this.executorId }),
    });
  }

  private toDiscordExecutionRequest(request: SecurityDomainExecutionRequest, idempotencyKey: string): DiscordBotRemovalExecutionRequest {
    const requestMetadata = readRecord(request.metadata);
    const containmentMetadata = readRecord(request.route.containmentTarget?.metadata);

    const guildId =
      readString(requestMetadata, 'guildId', 'guild_id') ?? readString(containmentMetadata, 'guildId', 'guild_id');
    const botUserId =
      readString(requestMetadata, 'botUserId', 'bot_user_id', 'botId', 'bot_id') ??
      readString(containmentMetadata, 'botUserId', 'bot_user_id', 'botId', 'bot_id');

    return Object.freeze({
      correlationId: request.correlationId,
      guildId,
      botUserId,
      idempotencyKey,
      reason: 'guardian:remove-unauthorized-bot',
      metadata: Object.freeze({
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        routeId: request.route.routeId,
        source: this.executorId,
      }),
    });
  }

  async execute(request: SecurityDomainExecutionRequest): Promise<SecurityBotExecutionResult> {
    const prepared = this.prepare(request);
    if (!prepared.accepted) {
      return freezeExecutionResult({
        status: SecurityBotExecutionStatus.REJECTED,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ reason: prepared.metadata?.reason ?? 'intent-rejected' }),
      });
    }

    const key = requestKey(request);
    if (this.processedRequestKeys.has(key)) {
      return freezeExecutionResult({
        status: SecurityBotExecutionStatus.SKIPPED_DUPLICATE,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ duplicate: true, idempotent: true }),
      });
    }

    const discordRequest = this.toDiscordExecutionRequest(request, key);
    const execution = await this.discordExecutionService.bot.removeUnauthorizedBot(discordRequest);
    if (execution.status === DiscordExecutionStatus.SUCCESS) {
      this.processedRequestKeys.add(key);
      return freezeExecutionResult({
        status: SecurityBotExecutionStatus.EXECUTED,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({
          idempotent: true,
          discordExecutionStatus: execution.status,
          executionTimeMs: execution.executionTimeMs,
          discordExecutionMetadata:
            execution.metadata && typeof execution.metadata === 'object'
              ? Object.freeze({ ...(execution.metadata as Record<string, unknown>) })
              : undefined,
        }),
      });
    }

    return freezeExecutionResult({
      status: SecurityBotExecutionStatus.REJECTED,
      domain: SecurityExecutorDomain.BOT,
      capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      correlationId: request.correlationId,
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      metadata: Object.freeze({
        reason: 'discord-execution-failed',
        discordExecutionStatus: execution.status,
        executionTimeMs: execution.executionTimeMs,
        discordExecutionMetadata:
          execution.metadata && typeof execution.metadata === 'object'
            ? Object.freeze({ ...(execution.metadata as Record<string, unknown>) })
            : undefined,
      }),
    });
  }
}
