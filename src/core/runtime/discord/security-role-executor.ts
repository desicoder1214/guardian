import { SecurityRoleExecutor } from './security-action-executor';
import {
  DiscordExecutionService,
  DiscordExecutionStatus,
  DiscordRoleRemovalExecutionRequest,
} from './discord-execution-service';
import {
  AuthorizationDecision,
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityExecutionRouteDecision,
} from './security-execution-types';

export enum SecurityRoleExecutionStatus {
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
}

export interface SecurityRoleExecutionResult {
  readonly status: SecurityRoleExecutionStatus;
  readonly domain: SecurityExecutorDomain.ROLE;
  readonly capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE;
  readonly correlationId: string;
  readonly planId: string;
  readonly executionPlanId: string;
  readonly metadata?: Record<string, unknown>;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeExecutionResult(result: SecurityRoleExecutionResult): SecurityRoleExecutionResult {
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
  if (request.domain !== SecurityExecutorDomain.ROLE) {
    return { accepted: false, rejectionReason: 'domain-mismatch' };
  }

  if (request.capability !== SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE) {
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

export class DiscordRoleExecutor implements SecurityRoleExecutor {
  readonly executorId = 'discord-security-role-executor';
  readonly domain = SecurityExecutorDomain.ROLE;
  readonly supportedCapabilities = Object.freeze([SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE]);

  private readonly processedRequestKeys = new Set<string>();

  constructor(private readonly discordExecutionService: DiscordExecutionService) {}

  supports(capability: SecurityExecutorCapability): boolean {
    return capability === SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE;
  }

  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult {
    const evaluation = evaluateRequest(request);
    if (!evaluation.accepted) {
      return freezeDomainResult({
        domain: SecurityExecutorDomain.ROLE,
        capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
        accepted: false,
        reason: 'INTENT_REJECTED',
        metadata: Object.freeze({ reason: evaluation.rejectionReason }),
      });
    }

    return freezeDomainResult({
      domain: SecurityExecutorDomain.ROLE,
      capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
      accepted: true,
      reason: 'INTENT_ACCEPTED',
      metadata: Object.freeze({ executorId: this.executorId }),
    });
  }

  private toDiscordExecutionRequest(request: SecurityDomainExecutionRequest, idempotencyKey: string): DiscordRoleRemovalExecutionRequest {
    const requestMetadata = readRecord(request.metadata);
    const containmentMetadata = readRecord(request.route.containmentTarget?.metadata);
    const threatAssessment = requestMetadata?.threatAssessment;
    const securityDecision = requestMetadata?.securityDecision;
    const authorizationMetadata = requestMetadata?.authorizationMetadata;

    const guildId =
      readString(requestMetadata, 'guildId', 'guild_id') ?? readString(containmentMetadata, 'guildId', 'guild_id');
    const memberUserId =
      readString(requestMetadata, 'memberUserId', 'member_user_id', 'memberId', 'member_id', 'targetUserId', 'target_user_id') ??
      readString(containmentMetadata, 'memberUserId', 'member_user_id', 'memberId', 'member_id', 'targetUserId', 'target_user_id');
    const roleId =
      readString(requestMetadata, 'roleId', 'role_id', 'dangerousRoleId', 'dangerous_role_id') ??
      readString(containmentMetadata, 'roleId', 'role_id', 'dangerousRoleId', 'dangerous_role_id');

    return Object.freeze({
      correlationId: request.correlationId,
      guildId,
      memberUserId,
      roleId,
      idempotencyKey,
      reason: 'guardian:remove-dangerous-role',
      metadata: Object.freeze({
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        routeId: request.route.routeId,
        source: this.executorId,
        threatAssessment,
        securityDecision,
        authorizationMetadata,
      }),
    });
  }

  async execute(request: SecurityDomainExecutionRequest): Promise<SecurityRoleExecutionResult> {
    const prepared = this.prepare(request);
    if (!prepared.accepted) {
      return freezeExecutionResult({
        status: SecurityRoleExecutionStatus.REJECTED,
        domain: SecurityExecutorDomain.ROLE,
        capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ reason: prepared.metadata?.reason ?? 'intent-rejected' }),
      });
    }

    const key = requestKey(request);
    if (this.processedRequestKeys.has(key)) {
      return freezeExecutionResult({
        status: SecurityRoleExecutionStatus.SKIPPED_DUPLICATE,
        domain: SecurityExecutorDomain.ROLE,
        capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
        correlationId: request.correlationId,
        planId: request.planId,
        executionPlanId: request.executionPlanId,
        metadata: Object.freeze({ duplicate: true, idempotent: true }),
      });
    }

    const executionRequest = this.toDiscordExecutionRequest(request, key);
    const execution = await this.discordExecutionService.role.removeDangerousRole(executionRequest);

    if (execution.status === DiscordExecutionStatus.SUCCESS) {
      this.processedRequestKeys.add(key);
      return freezeExecutionResult({
        status: SecurityRoleExecutionStatus.EXECUTED,
        domain: SecurityExecutorDomain.ROLE,
        capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
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
      status: SecurityRoleExecutionStatus.REJECTED,
      domain: SecurityExecutorDomain.ROLE,
      capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
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
