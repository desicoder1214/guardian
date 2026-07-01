import { SecurityMemberExecutor } from './security-action-executor';
import {
  DiscordExecutionService,
  DiscordExecutionStatus,
  DiscordMemberContainmentExecutionRequest,
} from './discord-execution-service';
import {
  AuthorizationDecision,
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityExecutionRouteDecision,
} from './security-execution-types';

export enum SecurityMemberExecutionStatus {
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
}

export interface SecurityMemberExecutionResult {
  readonly status: SecurityMemberExecutionStatus;
  readonly domain: SecurityExecutorDomain.MEMBER;
  readonly capability:
    | SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER
    | SecurityExecutorCapability.QUARANTINE_ACTOR
    | SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR;
  readonly correlationId: string;
  readonly planId: string;
  readonly executionPlanId: string;
  readonly metadata?: Record<string, unknown>;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeExecutionResult(result: SecurityMemberExecutionResult): SecurityMemberExecutionResult {
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

function isSupportedCapability(
  capability: SecurityExecutorCapability,
): capability is
  | SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER
  | SecurityExecutorCapability.QUARANTINE_ACTOR
  | SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR {
  return (
    capability === SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER ||
    capability === SecurityExecutorCapability.QUARANTINE_ACTOR ||
    capability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR
  );
}

function evaluateRequest(request: SecurityDomainExecutionRequest): {
  accepted: boolean;
  rejectionReason?: string;
} {
  if (request.domain !== SecurityExecutorDomain.MEMBER) {
    return { accepted: false, rejectionReason: 'domain-mismatch' };
  }

  if (!isSupportedCapability(request.capability)) {
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

export class DiscordMemberExecutor implements SecurityMemberExecutor {
  readonly executorId = 'discord-security-member-executor';
  readonly domain = SecurityExecutorDomain.MEMBER;
  readonly supportedCapabilities = Object.freeze([
    SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
    SecurityExecutorCapability.QUARANTINE_ACTOR,
    SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR,
  ]);

  private readonly processedRequestKeys = new Set<string>();

  constructor(private readonly discordExecutionService: DiscordExecutionService) {}

  supports(capability: SecurityExecutorCapability): boolean {
    return isSupportedCapability(capability);
  }

  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult {
    const evaluation = evaluateRequest(request);
    if (!evaluation.accepted) {
      return freezeDomainResult({
        domain: SecurityExecutorDomain.MEMBER,
        capability: request.capability,
        accepted: false,
        reason: 'INTENT_REJECTED',
        metadata: Object.freeze({ reason: evaluation.rejectionReason }),
      });
    }

    return freezeDomainResult({
      domain: SecurityExecutorDomain.MEMBER,
      capability: request.capability,
      accepted: true,
      reason: 'INTENT_ACCEPTED',
      metadata: Object.freeze({ executorId: this.executorId }),
    });
  }

  private toDiscordExecutionRequest(
    request: SecurityDomainExecutionRequest,
    idempotencyKey: string,
  ): DiscordMemberContainmentExecutionRequest {
    const requestMetadata = readRecord(request.metadata);
    const containmentMetadata = readRecord(request.route.containmentTarget?.metadata);
    const securityDecisionMetadata = readRecord(requestMetadata?.securityDecisionMetadata);

    const guildId =
      readString(requestMetadata, 'guildId', 'guild_id') ?? readString(containmentMetadata, 'guildId', 'guild_id');

    const defaultMemberUserId =
      readString(
        requestMetadata,
        'memberUserId',
        'member_user_id',
        'memberId',
        'member_id',
        'targetUserId',
        'target_user_id',
      ) ??
      readString(
        containmentMetadata,
        'memberUserId',
        'member_user_id',
        'memberId',
        'member_id',
        'targetUserId',
        'target_user_id',
      );

    const actorId =
      readString(requestMetadata, 'actorId', 'actor_id') ??
      readString(securityDecisionMetadata, 'actorId', 'actor_id') ??
      readString(containmentMetadata, 'actorId', 'actor_id');

    const memberUserId =
      request.capability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR
        ? actorId ?? defaultMemberUserId
        : defaultMemberUserId ?? actorId;

    return Object.freeze({
      correlationId: request.correlationId,
      guildId,
      memberUserId,
      idempotencyKey,
      reason:
        request.capability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR
          ? 'guardian:punish-role-escalation-actor'
          : 'guardian:neutralize-escalated-member',
      metadata: Object.freeze({
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        routeId: request.route.routeId,
        source: this.executorId,
        threatAssessment: requestMetadata?.threatAssessment,
        securityDecision: requestMetadata?.securityDecision,
        authorizationMetadata: requestMetadata?.authorizationMetadata,
      }),
    });
  }

  async execute(request: SecurityDomainExecutionRequest): Promise<SecurityMemberExecutionResult> {
    const prepared = this.prepare(request);
    if (!prepared.accepted || !isSupportedCapability(request.capability)) {
      return freezeExecutionResult({
        status: SecurityMemberExecutionStatus.REJECTED,
        domain: SecurityExecutorDomain.MEMBER,
        capability: SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ reason: prepared.metadata?.reason ?? 'intent-rejected' }),
      });
    }

    const key = requestKey(request);
    if (this.processedRequestKeys.has(key)) {
      return freezeExecutionResult({
        status: SecurityMemberExecutionStatus.SKIPPED_DUPLICATE,
        domain: SecurityExecutorDomain.MEMBER,
        capability: request.capability,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ duplicate: true, idempotent: true }),
      });
    }

    const executionRequest = this.toDiscordExecutionRequest(request, key);
    const execution =
      request.capability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR
        ? await this.discordExecutionService.member.banMember(executionRequest)
        : await this.discordExecutionService.member.kickMember(executionRequest);

    if (execution.status === DiscordExecutionStatus.SUCCESS) {
      this.processedRequestKeys.add(key);
      return freezeExecutionResult({
        status: SecurityMemberExecutionStatus.EXECUTED,
        domain: SecurityExecutorDomain.MEMBER,
        capability: request.capability,
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
      status: SecurityMemberExecutionStatus.REJECTED,
      domain: SecurityExecutorDomain.MEMBER,
      capability: request.capability,
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
