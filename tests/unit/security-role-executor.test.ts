import {
  DiscordExecutionService,
  DiscordExecutionStatus,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  DiscordRoleExecutor,
  SecurityRoleExecutionStatus,
} from '../../src/core/runtime/discord/security-role-executor';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  AuthorizationDecision,
  AuthorizationReason,
  SecurityContainmentStrategy,
  SecurityDomainExecutionRequest,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouteReason,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityHotPathExecutionLane,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';

function buildRequest(overrides: Partial<SecurityDomainExecutionRequest> = {}): SecurityDomainExecutionRequest {
  const base: SecurityDomainExecutionRequest = Object.freeze({
    route: Object.freeze({
      routeId: 'route:remove-role:1',
      planId: 'hot-path:execution-plan:corr-role:BLOCK',
      executionPlanId: 'execution-plan:corr-role:BLOCK',
      correlationId: 'corr-role',
      actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
      sequence: 1,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      decision: SecurityExecutionRouteDecision.EXECUTABLE,
      reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.ROLE,
        resourceId: 'role:corr-role:1',
        correlationId: 'corr-role',
        metadata: Object.freeze({
          guildId: 'guild-role-1',
          memberUserId: 'member-role-1',
          roleId: 'role-dangerous-1',
        }),
      }),
      containmentStrategy: SecurityContainmentStrategy.REMOVE,
      authorizationResult: Object.freeze({
        decision: AuthorizationDecision.AUTHORIZED,
        reason: AuthorizationReason.PLAN_AUTHORIZED,
        executionPlanId: 'execution-plan:corr-role:BLOCK',
        correlationId: 'corr-role',
        authorizationRequirements: Object.freeze([]),
      }),
    }),
    planId: 'hot-path:execution-plan:corr-role:BLOCK',
    executionPlanId: 'execution-plan:corr-role:BLOCK',
    correlationId: 'corr-role',
    domain: SecurityExecutorDomain.ROLE,
    capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
    metadata: Object.freeze({
      source: 'security-role-executor-test',
      threatAssessment: Object.freeze({ rationale: 'dangerous role grant' }),
      securityDecision: Object.freeze({ decision: 'BLOCK' }),
      authorizationMetadata: Object.freeze({ source: 'auth-engine' }),
    }),
  });

  return Object.freeze({ ...base, ...overrides });
}

test('authorized dangerous role removal request executes', async () => {
  let callCount = 0;
  let observedRequest: Record<string, unknown> | undefined;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {
      async restoreRole() {
        return Object.freeze({ status: DiscordExecutionStatus.NOT_SUPPORTED, executionTimeMs: 0, correlationId: 'corr-role' });
      },
      async removeDangerousRole(request) {
        callCount += 1;
        if (typeof request !== 'string') {
          observedRequest = request.metadata;
        }

        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    },
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {} as DiscordExecutionService['bot'],
  };

  const executor = new DiscordRoleExecutor(discordExecutionService);
  const result = await executor.execute(buildRequest());

  expect(callCount).toBe(1);
  expect(result.status).toBe(SecurityRoleExecutionStatus.EXECUTED);
  expect(result.correlationId).toBe('corr-role');
  expect(observedRequest).toBeDefined();
  expect(observedRequest?.threatAssessment).toEqual({ rationale: 'dangerous role grant' });
  expect(observedRequest?.securityDecision).toEqual({ decision: 'BLOCK' });
  expect(observedRequest?.authorizationMetadata).toEqual({ source: 'auth-engine' });
});

test('idempotency prevents duplicate role execution', async () => {
  let callCount = 0;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {
      async restoreRole() {
        return Object.freeze({ status: DiscordExecutionStatus.NOT_SUPPORTED, executionTimeMs: 0, correlationId: 'corr-role' });
      },
      async removeDangerousRole(request) {
        callCount += 1;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    },
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {} as DiscordExecutionService['bot'],
  };

  const executor = new DiscordRoleExecutor(discordExecutionService);
  const first = await executor.execute(buildRequest());
  const second = await executor.execute(buildRequest());

  expect(first.status).toBe(SecurityRoleExecutionStatus.EXECUTED);
  expect(second.status).toBe(SecurityRoleExecutionStatus.SKIPPED_DUPLICATE);
  expect(callCount).toBe(1);
});

test('authorization denied role request is rejected', async () => {
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {
      async restoreRole() {
        return Object.freeze({ status: DiscordExecutionStatus.NOT_SUPPORTED, executionTimeMs: 0, correlationId: 'corr-role' });
      },
      async removeDangerousRole(request) {
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    },
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {} as DiscordExecutionService['bot'],
  };

  const denied = buildRequest({
    route: Object.freeze({
      ...buildRequest().route,
      authorizationResult: Object.freeze({
        ...buildRequest().route.authorizationResult,
        decision: AuthorizationDecision.DENIED,
        reason: AuthorizationReason.DECISION_MISMATCH,
      }),
    }),
  });

  const executor = new DiscordRoleExecutor(discordExecutionService);
  const result = await executor.execute(denied);

  expect(result.status).toBe(SecurityRoleExecutionStatus.REJECTED);
});
