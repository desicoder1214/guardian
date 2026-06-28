import fs from 'node:fs';
import path from 'node:path';
import {
  DiscordBotExecutor,
  InMemorySecurityBotExecutor,
  SecurityBotExecutionStatus,
} from '../../src/core/runtime/discord/security-bot-executor';
import { DiscordExecutionService, DiscordExecutionStatus } from '../../src/core/runtime/discord/discord-execution-service';
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
      routeId: 'route:remove-bot:1',
      planId: 'hot-path:execution-plan:corr-bot:BLOCK',
      executionPlanId: 'execution-plan:corr-bot:BLOCK',
      correlationId: 'corr-bot',
      actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      sequence: 1,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      decision: SecurityExecutionRouteDecision.EXECUTABLE,
      reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.BOT,
        resourceId: 'bot:corr-bot:1',
        correlationId: 'corr-bot',
      }),
      containmentStrategy: SecurityContainmentStrategy.REMOVE,
      authorizationResult: Object.freeze({
        decision: AuthorizationDecision.AUTHORIZED,
        reason: AuthorizationReason.PLAN_AUTHORIZED,
        executionPlanId: 'execution-plan:corr-bot:BLOCK',
        correlationId: 'corr-bot',
        authorizationRequirements: Object.freeze([]),
      }),
    }),
    planId: 'hot-path:execution-plan:corr-bot:BLOCK',
    executionPlanId: 'execution-plan:corr-bot:BLOCK',
    correlationId: 'corr-bot',
    domain: SecurityExecutorDomain.BOT,
    capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
    metadata: Object.freeze({ source: 'security-bot-executor-test' }),
  });

  return Object.freeze({ ...base, ...overrides });
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-bot-executor.ts'),
    'utf8',
  );
}

test('authorized removal request executes', async () => {
  let callCount = 0;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {} as DiscordExecutionService['role'],
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {
      async removeUnauthorizedBot(request) {
        callCount += 1;
        const correlationId = typeof request === 'string' ? request : request.correlationId;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId,
        });
      },
    },
  };

  const executor = new DiscordBotExecutor(discordExecutionService);
  const result = await executor.execute(buildRequest());

  expect(callCount).toBe(1);
  expect(result.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(result.correlationId).toBe('corr-bot');
  expect(result.planId).toBe('hot-path:execution-plan:corr-bot:BLOCK');
  expect(result.executionPlanId).toBe('execution-plan:corr-bot:BLOCK');
});

test('unauthorized request is rejected and never executes Discord call', async () => {
  let callCount = 0;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {} as DiscordExecutionService['role'],
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {
      async removeUnauthorizedBot(request) {
        callCount += 1;
        const correlationId = typeof request === 'string' ? request : request.correlationId;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId,
        });
      },
    },
  };

  const unauthorizedRequest = buildRequest({
    route: Object.freeze({
      ...buildRequest().route,
      authorizationResult: Object.freeze({
        ...buildRequest().route.authorizationResult,
        decision: AuthorizationDecision.DENIED,
        reason: AuthorizationReason.DECISION_MISMATCH,
      }),
    }),
  });

  const executor = new DiscordBotExecutor(discordExecutionService);
  const result = await executor.execute(unauthorizedRequest);

  expect(result.status).toBe(SecurityBotExecutionStatus.REJECTED);
  expect(callCount).toBe(0);
});

test('wrong capability is rejected', async () => {
  const executor = new InMemorySecurityBotExecutor();
  const result = executor.execute(
    buildRequest({ capability: SecurityExecutorCapability.FREEZE_WEBHOOKS as SecurityExecutorCapability }),
  );

  expect(result.status).toBe(SecurityBotExecutionStatus.REJECTED);
});

test('request and result remain immutable', async () => {
  const executor = new InMemorySecurityBotExecutor();
  const request = buildRequest();
  const result = executor.execute(request);

  expect(Object.isFrozen(request)).toBe(true);
  expect(Object.isFrozen(result)).toBe(true);

  expect(() => {
    (result as { status: SecurityBotExecutionStatus }).status = SecurityBotExecutionStatus.REJECTED;
  }).toThrow(TypeError);
});

test('idempotency prevents duplicate execution', async () => {
  let callCount = 0;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {} as DiscordExecutionService['role'],
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {
      async removeUnauthorizedBot(request) {
        callCount += 1;
        const correlationId = typeof request === 'string' ? request : request.correlationId;
        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId,
        });
      },
    },
  };

  const executor = new DiscordBotExecutor(discordExecutionService);
  const first = await executor.execute(buildRequest());
  const second = await executor.execute(buildRequest());

  expect(first.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(second.status).toBe(SecurityBotExecutionStatus.SKIPPED_DUPLICATE);
  expect(callCount).toBe(1);
});

test('executor preserves threat assessment and security decision metadata in execution payload', async () => {
  let observedMetadata: Record<string, unknown> | undefined;
  const discordExecutionService: DiscordExecutionService = {
    member: {} as DiscordExecutionService['member'],
    role: {} as DiscordExecutionService['role'],
    channel: {} as DiscordExecutionService['channel'],
    webhook: {} as DiscordExecutionService['webhook'],
    guild: {} as DiscordExecutionService['guild'],
    emoji: {} as DiscordExecutionService['emoji'],
    vanity: {} as DiscordExecutionService['vanity'],
    integration: {} as DiscordExecutionService['integration'],
    bot: {
      async removeUnauthorizedBot(request) {
        if (typeof request !== 'string') {
          observedMetadata = request.metadata;
        }

        return Object.freeze({
          status: DiscordExecutionStatus.SUCCESS,
          executionTimeMs: 0,
          correlationId: typeof request === 'string' ? request : request.correlationId,
        });
      },
    },
  };

  const executor = new DiscordBotExecutor(discordExecutionService);
  const result = await executor.execute(
    buildRequest({
      metadata: Object.freeze({
        source: 'security-bot-executor-test',
        threatAssessment: Object.freeze({ rationale: 'high-risk unauthorized bot add' }),
        securityDecision: Object.freeze({ decision: 'BLOCK' }),
      }),
    }),
  );

  expect(result.status).toBe(SecurityBotExecutionStatus.EXECUTED);
  expect(observedMetadata).toBeDefined();
  expect(observedMetadata?.threatAssessment).toEqual({ rationale: 'high-risk unauthorized bot add' });
  expect(observedMetadata?.securityDecision).toEqual({ decision: 'BLOCK' });
});

test('bot executor source contains no planning or policy logic', () => {
  const source = readSource();

  expect(source).not.toMatch(/security-action-planner|execution-planner|hot-path-planner|decision-engine|policy-engine/i);
  expect(source).not.toMatch(/detector|threat-interpretation|routing/i);
  expect(source).not.toMatch(/fetch\s*\(|axios|database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
});
