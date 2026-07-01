import { SecurityActionType } from './security-action-planner';
import {
  SecurityExecutionDispatchIntent,
  SecurityExecutionRouteDecision,
  SecurityHotPathExecutionLane,
  SecurityExecutorCapability,
  SecurityDomainExecutionRequest,
  SecurityExecutionDispatchResult,
} from './security-execution-types';
import {
  DiscordBotRemovalExecutionRequest,
  DiscordChannelContainmentExecutionRequest,
  DiscordExecutionResult,
  DiscordExecutionService,
  DiscordExecutionStatus,
  DiscordMemberContainmentExecutionRequest,
  DiscordPermissionOverwriteExecutionRequest,
  DiscordRoleRemovalExecutionRequest,
  DiscordWebhookRemovalExecutionRequest,
} from './discord-execution-service';
import { SecurityBotExecutionResult, SecurityBotExecutionStatus } from './security-bot-executor';
import { SecurityMemberExecutionResult, SecurityMemberExecutionStatus } from './security-member-executor';
import { SecurityRoleExecutionResult, SecurityRoleExecutionStatus } from './security-role-executor';

export enum CoordinatedContainmentActionStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
  UNSUPPORTED = 'UNSUPPORTED',
}

export interface CoordinatedContainmentActionResult {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly capability?: SecurityExecutorCapability;
  readonly correlationId: string;
  readonly status: CoordinatedContainmentActionStatus;
  readonly executionTimeMs: number;
  readonly metadata?: Record<string, unknown>;
}

export interface CoordinatedContainmentExecutionResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly succeededActions: readonly SecurityActionType[];
  readonly failedActions: readonly SecurityActionType[];
  readonly skippedDuplicateActions: readonly SecurityActionType[];
  readonly unsupportedActions: readonly SecurityActionType[];
  readonly actionResults: readonly CoordinatedContainmentActionResult[];
  readonly totalExecutionTimeMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-execution-orchestrator';
    readonly idempotencyKey: string;
    readonly securityDecisionPreserved: boolean;
    readonly threatAssessmentPreserved: boolean;
  };
}

export interface CoordinatedContainmentExecutionDependencies {
  readonly discordExecutionService: DiscordExecutionService;
  readonly botExecutor?: {
    execute(request: SecurityDomainExecutionRequest):
      | SecurityBotExecutionResult
      | Promise<SecurityBotExecutionResult>;
  };
  readonly memberExecutor?: {
    execute(request: SecurityDomainExecutionRequest):
      | SecurityMemberExecutionResult
      | Promise<SecurityMemberExecutionResult>;
  };
  readonly roleExecutor?: {
    execute(request: SecurityDomainExecutionRequest):
      | SecurityRoleExecutionResult
      | Promise<SecurityRoleExecutionResult>;
  };
}

export interface CoordinatedContainmentOrchestrationSnapshot {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly securityDecisionPreserved: boolean;
  readonly threatAssessmentPreserved: boolean;
  readonly dispatchResult: SecurityExecutionDispatchResult;
  readonly metadata: {
    readonly source: 'in-memory-security-execution-orchestrator';
    readonly idempotencyKey: string;
    readonly idempotentReplay: boolean;
  };
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
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

function resolveExecutionRequestIdempotencyKey(request: SecurityDomainExecutionRequest): string {
  const base = `${request.planId}:${request.executionPlanId}:${request.route.routeId}:${request.correlationId}`;
  const metadata = resolveContainmentMetadata(request);
  const targetResourceId = readString(
    metadata,
    'webhookId',
    'webhook_id',
    'botUserId',
    'bot_user_id',
    'memberUserId',
    'member_user_id',
    'roleId',
    'role_id',
    'channelId',
    'channel_id',
    'overwriteId',
    'overwrite_id',
    'resourceId',
    'resource_id',
    'targetId',
    'target_id',
  );

  return targetResourceId ? `${base}:${targetResourceId}` : base;
}

function freezeActionResult(result: CoordinatedContainmentActionResult): CoordinatedContainmentActionResult {
  return Object.freeze({
    actionType: result.actionType,
    sequence: result.sequence,
    capability: result.capability,
    correlationId: result.correlationId,
    status: result.status,
    executionTimeMs: result.executionTimeMs,
    metadata: freezeMetadata(result.metadata),
  });
}

function toUnsupportedActionResult(intent: SecurityExecutionDispatchIntent, reason: string): CoordinatedContainmentActionResult {
  return freezeActionResult({
    actionType: intent.route.actionType,
    sequence: intent.route.sequence,
    capability: intent.targetedCapability,
    correlationId: intent.route.correlationId,
    status: CoordinatedContainmentActionStatus.UNSUPPORTED,
    executionTimeMs: 0,
    metadata: Object.freeze({
      reason,
      dispatchDecision: intent.dispatchDecision,
      routeReason: intent.route.reason,
      metadata: freezeMetadata(intent.executionRequest?.metadata),
    }),
  });
}

function classifyDiscordResult(result: DiscordExecutionResult): CoordinatedContainmentActionStatus {
  if (result.status === DiscordExecutionStatus.SUCCESS) {
    return CoordinatedContainmentActionStatus.SUCCEEDED;
  }

  if (result.status === DiscordExecutionStatus.SKIPPED) {
    return CoordinatedContainmentActionStatus.SKIPPED_DUPLICATE;
  }

  if (result.status === DiscordExecutionStatus.NOT_SUPPORTED) {
    return CoordinatedContainmentActionStatus.UNSUPPORTED;
  }

  return CoordinatedContainmentActionStatus.FAILED;
}

function classifyBotResult(result: SecurityBotExecutionResult): CoordinatedContainmentActionStatus {
  if (result.status === SecurityBotExecutionStatus.EXECUTED) {
    return CoordinatedContainmentActionStatus.SUCCEEDED;
  }

  if (result.status === SecurityBotExecutionStatus.SKIPPED_DUPLICATE) {
    return CoordinatedContainmentActionStatus.SKIPPED_DUPLICATE;
  }

  return CoordinatedContainmentActionStatus.FAILED;
}

function classifyRoleResult(result: SecurityRoleExecutionResult): CoordinatedContainmentActionStatus {
  if (result.status === SecurityRoleExecutionStatus.EXECUTED) {
    return CoordinatedContainmentActionStatus.SUCCEEDED;
  }

  if (result.status === SecurityRoleExecutionStatus.SKIPPED_DUPLICATE) {
    return CoordinatedContainmentActionStatus.SKIPPED_DUPLICATE;
  }

  return CoordinatedContainmentActionStatus.FAILED;
}

function classifyMemberResult(result: SecurityMemberExecutionResult): CoordinatedContainmentActionStatus {
  if (result.status === SecurityMemberExecutionStatus.EXECUTED) {
    return CoordinatedContainmentActionStatus.SUCCEEDED;
  }

  if (result.status === SecurityMemberExecutionStatus.SKIPPED_DUPLICATE) {
    return CoordinatedContainmentActionStatus.SKIPPED_DUPLICATE;
  }

  return CoordinatedContainmentActionStatus.FAILED;
}

function freezeExecutionSummary(
  orchestration: CoordinatedContainmentOrchestrationSnapshot,
  results: readonly CoordinatedContainmentActionResult[],
  totalExecutionTimeMs: number,
): CoordinatedContainmentExecutionResult {
  const succeededActions = Object.freeze(
    results
      .filter((result) => result.status === CoordinatedContainmentActionStatus.SUCCEEDED)
      .map((result) => result.actionType),
  );
  const failedActions = Object.freeze(
    results
      .filter((result) => result.status === CoordinatedContainmentActionStatus.FAILED)
      .map((result) => result.actionType),
  );
  const skippedDuplicateActions = Object.freeze(
    results
      .filter((result) => result.status === CoordinatedContainmentActionStatus.SKIPPED_DUPLICATE)
      .map((result) => result.actionType),
  );
  const unsupportedActions = Object.freeze(
    results
      .filter((result) => result.status === CoordinatedContainmentActionStatus.UNSUPPORTED)
      .map((result) => result.actionType),
  );

  return Object.freeze({
    planId: orchestration.planId,
    executionPlanId: orchestration.executionPlanId,
    correlationId: orchestration.correlationId,
    succeededActions,
    failedActions,
    skippedDuplicateActions,
    unsupportedActions,
    actionResults: Object.freeze(results.map((result) => freezeActionResult(result))),
    totalExecutionTimeMs,
    metadata: Object.freeze({
      source: 'in-memory-security-execution-orchestrator',
      idempotencyKey: orchestration.metadata.idempotencyKey,
      securityDecisionPreserved: orchestration.securityDecisionPreserved,
      threatAssessmentPreserved: orchestration.threatAssessmentPreserved,
    }),
  });
}

function sortByContainmentOrder(intents: readonly SecurityExecutionDispatchIntent[]): readonly SecurityExecutionDispatchIntent[] {
  return Object.freeze(
    [...intents].sort((left, right) => {
      const laneWeight =
        (left.route.lane === SecurityHotPathExecutionLane.IMMEDIATE ? 0 : 1) -
        (right.route.lane === SecurityHotPathExecutionLane.IMMEDIATE ? 0 : 1);
      if (laneWeight !== 0) {
        return laneWeight;
      }

      return left.route.sequence - right.route.sequence;
    }),
  );
}

function resolveContainmentMetadata(request: SecurityDomainExecutionRequest): Record<string, unknown> {
  return Object.freeze({
    ...(readRecord(request.route.containmentTarget?.metadata) ?? {}),
    ...(readRecord(request.metadata) ?? {}),
  });
}

function toBotRequest(request: SecurityDomainExecutionRequest): DiscordBotRemovalExecutionRequest {
  const metadata = resolveContainmentMetadata(request);
  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    botUserId: readString(metadata, 'botUserId', 'bot_user_id', 'botId', 'bot_id'),
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: 'guardian:remove-unauthorized-bot',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function toRoleRequest(request: SecurityDomainExecutionRequest): DiscordRoleRemovalExecutionRequest {
  const metadata = resolveContainmentMetadata(request);
  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    memberUserId: readString(metadata, 'memberUserId', 'member_user_id', 'memberId', 'member_id', 'targetUserId', 'target_user_id'),
    roleId: readString(metadata, 'roleId', 'role_id', 'dangerousRoleId', 'dangerous_role_id'),
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: 'guardian:remove-dangerous-role',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function toWebhookRequest(request: SecurityDomainExecutionRequest): DiscordWebhookRemovalExecutionRequest {
  const metadata = resolveContainmentMetadata(request);
  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    webhookId: readString(metadata, 'webhookId', 'webhook_id'),
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: 'guardian:remove-dangerous-webhook',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function toChannelRequest(request: SecurityDomainExecutionRequest): DiscordChannelContainmentExecutionRequest {
  const metadata = resolveContainmentMetadata(request);
  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    channelId: readString(metadata, 'channelId', 'channel_id'),
    lockPermissions: true,
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: 'guardian:contain-channel',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function toPermissionOverwriteRequest(request: SecurityDomainExecutionRequest): DiscordPermissionOverwriteExecutionRequest {
  const metadata = resolveContainmentMetadata(request);
  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    channelId: readString(metadata, 'channelId', 'channel_id'),
    overwriteId: readString(metadata, 'overwriteId', 'overwrite_id'),
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: 'guardian:restore-permission-overwrite',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function toMemberRequest(request: SecurityDomainExecutionRequest): DiscordMemberContainmentExecutionRequest {
  const metadata = resolveContainmentMetadata(request);

  const memberUserIdFromTarget =
    intentSupportsActorPunishment(request.capability)
      ? readString(metadata, 'actorId', 'actor_id')
      : undefined;

  const memberUserId =
    memberUserIdFromTarget ??
    readString(metadata, 'memberUserId', 'member_user_id', 'memberId', 'member_id', 'targetUserId', 'target_user_id');

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: readString(metadata, 'guildId', 'guild_id'),
    memberUserId,
    idempotencyKey: resolveExecutionRequestIdempotencyKey(request),
    reason: intentSupportsActorPunishment(request.capability)
      ? request.capability === SecurityExecutorCapability.QUARANTINE_ACTOR
        ? 'guardian:quarantine-actor'
        : 'guardian:punish-role-escalation-actor'
      : 'guardian:neutralize-escalated-member',
    metadata: Object.freeze({
      planId: request.planId,
      executionPlanId: request.executionPlanId,
      routeId: request.route.routeId,
      threatAssessment: metadata.threatAssessment,
      securityDecision: metadata.securityDecision,
      authorizationMetadata: metadata.authorizationMetadata,
    }),
  });
}

function intentSupportsActorPunishment(capability: SecurityExecutorCapability): boolean {
  return (
    capability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR ||
    capability === SecurityExecutorCapability.QUARANTINE_ACTOR
  );
}

export class InMemoryCoordinatedContainmentExecution {
  async execute(
    orchestration: CoordinatedContainmentOrchestrationSnapshot,
    dependencies: CoordinatedContainmentExecutionDependencies,
  ): Promise<CoordinatedContainmentExecutionResult> {
    const orderedIntents = sortByContainmentOrder(orchestration.dispatchResult.intents);
    const startedAt = Date.now();

    const actionResults: CoordinatedContainmentActionResult[] = [];

    for (const intent of orderedIntents) {
      if (
        intent.dispatchDecision !== SecurityExecutionRouteDecision.EXECUTABLE ||
        !intent.executionRequest ||
        !intent.targetedCapability
      ) {
        actionResults.push(toUnsupportedActionResult(intent, 'intent-not-executable'));
        continue;
      }

      const request = intent.executionRequest;
      const actionStartedAt = Date.now();

      switch (intent.targetedCapability) {
        case SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT: {
          if (dependencies.botExecutor) {
            const botResult = await dependencies.botExecutor.execute(request);
            actionResults.push(
              freezeActionResult({
                actionType: intent.route.actionType,
                sequence: intent.route.sequence,
                capability: intent.targetedCapability,
                correlationId: request.correlationId,
                status: classifyBotResult(botResult),
                executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
                metadata: freezeMetadata(botResult.metadata),
              }),
            );
            break;
          }

          const fallbackBotResult = await dependencies.discordExecutionService.bot.removeUnauthorizedBot(toBotRequest(request));
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(fallbackBotResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(fallbackBotResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        case SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE: {
          if (dependencies.roleExecutor) {
            const roleResult = await dependencies.roleExecutor.execute(request);
            actionResults.push(
              freezeActionResult({
                actionType: intent.route.actionType,
                sequence: intent.route.sequence,
                capability: intent.targetedCapability,
                correlationId: request.correlationId,
                status: classifyRoleResult(roleResult),
                executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
                metadata: freezeMetadata(roleResult.metadata),
              }),
            );
            break;
          }

          const fallbackRoleResult = await dependencies.discordExecutionService.role.removeDangerousRole(toRoleRequest(request));
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(fallbackRoleResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(fallbackRoleResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        case SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER:
        case SecurityExecutorCapability.QUARANTINE_ACTOR:
        case SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR: {
          if (dependencies.memberExecutor) {
            const memberResult = await dependencies.memberExecutor.execute(request);
            actionResults.push(
              freezeActionResult({
                actionType: intent.route.actionType,
                sequence: intent.route.sequence,
                capability: intent.targetedCapability,
                correlationId: request.correlationId,
                status: classifyMemberResult(memberResult),
                executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
                metadata: freezeMetadata(memberResult.metadata),
              }),
            );
            break;
          }

          const memberRequest = toMemberRequest(request);
          const fallbackMemberResult = intent.targetedCapability === SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR
            ? await dependencies.discordExecutionService.member.banMember(memberRequest)
            : await dependencies.discordExecutionService.member.kickMember(memberRequest);
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(fallbackMemberResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(fallbackMemberResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        case SecurityExecutorCapability.FREEZE_WEBHOOKS: {
          const webhookResult = await dependencies.discordExecutionService.webhook.deleteWebhook(toWebhookRequest(request));
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(webhookResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(webhookResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        case SecurityExecutorCapability.LOCK_CHANNELS: {
          const channelResult = await dependencies.discordExecutionService.channel.lockChannel(toChannelRequest(request));
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(channelResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(channelResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        case SecurityExecutorCapability.RESTORE_RESOURCE: {
          const restoreResult = await dependencies.discordExecutionService.channel.restoreChannel(
            toPermissionOverwriteRequest(request),
          );
          actionResults.push(
            freezeActionResult({
              actionType: intent.route.actionType,
              sequence: intent.route.sequence,
              capability: intent.targetedCapability,
              correlationId: request.correlationId,
              status: classifyDiscordResult(restoreResult),
              executionTimeMs: Math.max(0, Date.now() - actionStartedAt),
              metadata: freezeMetadata(restoreResult.metadata as Record<string, unknown> | undefined),
            }),
          );
          break;
        }
        default:
          actionResults.push(toUnsupportedActionResult(intent, 'unsupported-capability-in-coordinated-containment'));
      }
    }

    return freezeExecutionSummary(
      orchestration,
      actionResults,
      Math.max(0, Date.now() - startedAt),
    );
  }
}
