import {
  DiscordExecutionResult,
  DiscordExecutionService,
  DiscordExecutionStatus,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  AuthorizationDecision,
  AuthorizationReason,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouteReason,
  SecurityHotPathExecutionLane,
  SecurityResourceType,
  SecurityDomainExecutionRequest,
} from '../../src/core/runtime/discord/security-execution-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  DiscordMemberExecutor,
  SecurityMemberExecutionStatus,
} from '../../src/core/runtime/discord/security-member-executor';

function success(correlationId: string): DiscordExecutionResult {
  return Object.freeze({
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId,
    metadata: Object.freeze({ source: 'security-member-executor-test' }),
  });
}

function buildRequest(capability: SecurityExecutorCapability): SecurityDomainExecutionRequest {
  return Object.freeze({
    planId: 'plan-member-1',
    executionPlanId: 'execution-member-1',
    correlationId: 'corr-member-1',
    domain: SecurityExecutorDomain.MEMBER,
    capability,
    route: Object.freeze({
      routeId: 'route-member-1',
      planId: 'plan-member-1',
      executionPlanId: 'execution-member-1',
      correlationId: 'corr-member-1',
      actionType: SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
      sequence: 1,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      decision: SecurityExecutionRouteDecision.EXECUTABLE,
      reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.MEMBER,
        resourceId: 'member-1',
        correlationId: 'corr-member-1',
        metadata: Object.freeze({ guildId: 'guild-member-1', memberUserId: 'member-1', actorId: 'actor-1' }),
      }),
      authorizationResult: Object.freeze({
        decision: AuthorizationDecision.AUTHORIZED,
        reason: AuthorizationReason.PLAN_AUTHORIZED,
        executionPlanId: 'execution-member-1',
        correlationId: 'corr-member-1',
        authorizationRequirements: Object.freeze([]),
      }),
    }),
    metadata: Object.freeze({ guildId: 'guild-member-1', memberUserId: 'member-1', actorId: 'actor-1' }),
  });
}

function buildExecutionService(overrides: {
  kickMember?: jest.Mock;
  banMember?: jest.Mock;
} = {}): DiscordExecutionService {
  const kickMember = overrides.kickMember ?? jest.fn(async (request: { correlationId: string }) => success(request.correlationId));
  const banMember = overrides.banMember ?? jest.fn(async (request: { correlationId: string }) => success(request.correlationId));

  return Object.freeze({
    member: Object.freeze({
      kickMember,
      banMember,
      removeRoles: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
    }),
    role: Object.freeze({
      restoreRole: jest.fn(async (correlationId: string) => success(correlationId)),
      removeDangerousRole: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
    }),
    channel: Object.freeze({
      lockChannel: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
      unlockChannel: jest.fn(async (correlationId: string) => success(correlationId)),
      restoreChannel: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
    }),
    webhook: Object.freeze({
      deleteWebhook: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
      restoreWebhook: jest.fn(async (correlationId: string) => success(correlationId)),
      freezeWebhooks: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
    }),
    guild: Object.freeze({
      createIncident: jest.fn(async (correlationId: string) => success(correlationId)),
      notifyAudit: jest.fn(async (correlationId: string) => success(correlationId)),
      restoreResource: jest.fn(async (correlationId: string) => success(correlationId)),
      escalate: jest.fn(async (correlationId: string) => success(correlationId)),
    }),
    emoji: Object.freeze({
      restoreEmoji: jest.fn(async (correlationId: string) => success(correlationId)),
    }),
    vanity: Object.freeze({
      restoreVanity: jest.fn(async (correlationId: string) => success(correlationId)),
    }),
    integration: Object.freeze({
      restoreIntegration: jest.fn(async (correlationId: string) => success(correlationId)),
    }),
    bot: Object.freeze({
      removeUnauthorizedBot: jest.fn(async (request: { correlationId: string }) => success(request.correlationId)),
    }),
  });
}

test('member executor executes neutralize/quarantine via member kick path', async () => {
  const kickMember = jest.fn(async (request: { correlationId: string }) => success(request.correlationId));
  const executor = new DiscordMemberExecutor(buildExecutionService({ kickMember }));

  const result = await executor.execute(buildRequest(SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER));

  expect(result.status).toBe(SecurityMemberExecutionStatus.EXECUTED);
  expect(kickMember).toHaveBeenCalledTimes(1);
});

test('member executor executes punish actor via member ban path', async () => {
  const banMember = jest.fn(async (request: { correlationId: string }) => success(request.correlationId));
  const executor = new DiscordMemberExecutor(buildExecutionService({ banMember }));

  const result = await executor.execute(buildRequest(SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR));

  expect(result.status).toBe(SecurityMemberExecutionStatus.EXECUTED);
  expect(banMember).toHaveBeenCalledTimes(1);
});

test('member executor deduplicates repeated execution requests', async () => {
  const kickMember = jest.fn(async (request: { correlationId: string }) => success(request.correlationId));
  const executor = new DiscordMemberExecutor(buildExecutionService({ kickMember }));
  const request = buildRequest(SecurityExecutorCapability.QUARANTINE_ACTOR);

  const first = await executor.execute(request);
  const second = await executor.execute(request);

  expect(first.status).toBe(SecurityMemberExecutionStatus.EXECUTED);
  expect(second.status).toBe(SecurityMemberExecutionStatus.SKIPPED_DUPLICATE);
  expect(kickMember).toHaveBeenCalledTimes(1);
});
