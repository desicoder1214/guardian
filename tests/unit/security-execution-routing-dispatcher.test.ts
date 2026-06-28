import fs from 'node:fs';
import path from 'node:path';
import { SecurityAction, SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  AuthorizationDecision,
  AuthorizationReason,
  ExecutionAuthorizationRequirement,
  SecurityContainmentStrategy,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouteReason,
  SecurityHotPathAction,
  SecurityHotPathExecutionLane,
  SecurityHotPathPlan,
  SecurityHotPathPriority,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

class StubExecutor implements SecurityActionExecutor {
  constructor(private readonly actionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.actionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'stub-executor' }),
    });
  }
}

function buildAuthorizationRequirements(): readonly ExecutionAuthorizationRequirement[] {
  return Object.freeze([
    Object.freeze({
      actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
      sequence: 1,
      requiresAuthorization: true,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-route',
    }),
    Object.freeze({
      actionType: SecurityActionType.FREEZE_WEBHOOKS,
      sequence: 2,
      requiresAuthorization: true,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-route',
    }),
    Object.freeze({
      actionType: SecurityActionType.CREATE_INCIDENT,
      sequence: 3,
      requiresAuthorization: false,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-route',
    }),
  ]);
}

function buildDecisionModel(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-route',
    guildId: 'guild-route',
    actionType: SecurityEventActionType.CHANNEL_DELETE,
    correlationId: 'corr-route',
    auditLogCorrelationId: 'audit-route',
    metadata: Object.freeze({ source: 'security-execution-routing-dispatcher-test' }),
  });
}

function buildHotPathActions(): readonly SecurityHotPathAction[] {
  return Object.freeze([
    Object.freeze({
      actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
      sequence: 1,
      priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      action: Object.freeze({
        type: SecurityActionType.REMOVE_DANGEROUS_ROLE,
        priority: SecurityActionPriority.CRITICAL,
        sequence: 1,
      }),
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.ROLE,
        resourceId: 'role:corr-route:1',
        correlationId: 'corr-route',
        metadata: Object.freeze({ sourceActionType: SecurityActionType.REMOVE_DANGEROUS_ROLE }),
      }),
      containmentStrategy: SecurityContainmentStrategy.REMOVE,
      authorizationRequirement: Object.freeze({
        actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
        sequence: 1,
        requiresAuthorization: true,
        decision: SecurityDecision.BLOCK,
        correlationId: 'corr-route',
      }),
    }),
    Object.freeze({
      actionType: SecurityActionType.FREEZE_WEBHOOKS,
      sequence: 2,
      priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      action: Object.freeze({
        type: SecurityActionType.FREEZE_WEBHOOKS,
        priority: SecurityActionPriority.HIGH,
        sequence: 2,
      }),
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.WEBHOOK,
        resourceId: 'webhook:corr-route:2',
        correlationId: 'corr-route',
        metadata: Object.freeze({ sourceActionType: SecurityActionType.FREEZE_WEBHOOKS }),
      }),
      containmentStrategy: SecurityContainmentStrategy.FREEZE,
      authorizationRequirement: Object.freeze({
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        sequence: 2,
        requiresAuthorization: true,
        decision: SecurityDecision.BLOCK,
        correlationId: 'corr-route',
      }),
    }),
    Object.freeze({
      actionType: SecurityActionType.CREATE_INCIDENT,
      sequence: 3,
      priority: SecurityHotPathPriority.DEFERRED_AUDIT,
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      action: Object.freeze({
        type: SecurityActionType.CREATE_INCIDENT,
        priority: SecurityActionPriority.NORMAL,
        sequence: 3,
      }),
      containmentTarget: Object.freeze({
        resourceType: SecurityResourceType.GUILD_CONFIGURATION,
        resourceId: 'guild-state:corr-route:3',
        correlationId: 'corr-route',
        metadata: Object.freeze({ sourceActionType: SecurityActionType.CREATE_INCIDENT }),
      }),
      containmentStrategy: SecurityContainmentStrategy.OBSERVE,
      authorizationRequirement: Object.freeze({
        actionType: SecurityActionType.CREATE_INCIDENT,
        sequence: 3,
        requiresAuthorization: false,
        decision: SecurityDecision.BLOCK,
        correlationId: 'corr-route',
      }),
    }),
    Object.freeze({
      actionType: SecurityActionType.NONE,
      sequence: 4,
      priority: SecurityHotPathPriority.DEFERRED_AUDIT,
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      action: Object.freeze({
        type: SecurityActionType.NONE,
        priority: SecurityActionPriority.LOW,
        sequence: 4,
      }),
    }),
  ]);
}

function buildHotPathPlan(): SecurityHotPathPlan {
  const actions = buildHotPathActions();
  const authorizationRequirements = buildAuthorizationRequirements();

  return Object.freeze({
    planId: 'hot-path:execution-plan:corr-route:BLOCK',
    executionPlanId: 'execution-plan:corr-route:BLOCK',
    correlationId: 'corr-route',
    securityDecision: buildDecisionModel(),
    actions,
    containmentPlan: Object.freeze({
      planId: 'containment:hot-path:execution-plan:corr-route:BLOCK',
      correlationId: 'corr-route',
      actions: Object.freeze(
        actions
          .filter((action) => action.containmentTarget && action.containmentStrategy)
          .map((action) =>
            Object.freeze({
              actionType: action.actionType,
              sequence: action.sequence,
              strategy: action.containmentStrategy as SecurityContainmentStrategy,
              target: action.containmentTarget!,
            }),
          ),
      ),
      metadata: Object.freeze({
        source: 'in-memory-security-hot-path-planner' as const,
        targetCount: 3,
        strategyCount: 3,
      }),
    }),
    authorizationRequirements,
    metadata: Object.freeze({
      source: 'in-memory-security-hot-path-planner' as const,
      immediateActionCount: 2,
      backgroundActionCount: 2,
    }),
  });
}

function buildAuthorizationResult(decision: AuthorizationDecision): SecurityExecutionAuthorizationResult {
  return Object.freeze({
    decision,
    reason:
      decision === AuthorizationDecision.AUTHORIZED
        ? AuthorizationReason.PLAN_AUTHORIZED
        : AuthorizationReason.DECISION_MISMATCH,
    executionPlanId: 'execution-plan:corr-route:BLOCK',
    correlationId: 'corr-route',
    authorizationRequirements: buildAuthorizationRequirements(),
    metadata: Object.freeze({ source: 'security-execution-routing-dispatcher-test' }),
  });
}

function buildRouter(withFreezeWebhookExecutor: boolean): InMemorySecurityExecutionRouter {
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new StubExecutor(SecurityActionType.REMOVE_DANGEROUS_ROLE));
  if (withFreezeWebhookExecutor) {
    registry.register(new StubExecutor(SecurityActionType.FREEZE_WEBHOOKS));
  }
  registry.register(new StubExecutor(SecurityActionType.CREATE_INCIDENT));
  return new InMemorySecurityExecutionRouter(registry);
}

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../../src/core/runtime/discord/${file}`), 'utf8');
}

test('routes preserve hot-path ordering exactly', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  expect(routing.routes.map((route) => route.actionType)).toEqual([
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
  ]);
});

test('authorized immediate actions become executable routes', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  const immediateRoutes = routing.routes.filter((route) => route.lane === SecurityHotPathExecutionLane.IMMEDIATE);

  expect(immediateRoutes.every((route) => route.decision === SecurityExecutionRouteDecision.EXECUTABLE)).toBe(true);
  expect(immediateRoutes.every((route) => route.reason === SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE)).toBe(true);
});

test('background actions are deferred routes', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  const backgroundRoutes = routing.routes.filter((route) => route.lane === SecurityHotPathExecutionLane.BACKGROUND);
  expect(backgroundRoutes).toHaveLength(1);
  expect(backgroundRoutes[0].decision).toBe(SecurityExecutionRouteDecision.DEFERRED);
  expect(backgroundRoutes[0].reason).toBe(SecurityExecutionRouteReason.BACKGROUND_DEFERRED);
});

test('denied authorization suppresses executable immediate routes', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.DENIED),
    }),
  );

  const immediateRoutes = routing.routes.filter((route) => route.lane === SecurityHotPathExecutionLane.IMMEDIATE);

  expect(immediateRoutes.every((route) => route.decision === SecurityExecutionRouteDecision.SKIPPED)).toBe(true);
  expect(immediateRoutes.every((route) => route.reason === SecurityExecutionRouteReason.AUTHORIZATION_DENIED)).toBe(true);
});

test('missing executor produces SKIPPED NO_EXECUTOR route', () => {
  const router = buildRouter(false);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  const freezeWebhookRoute = routing.routes.find((route) => route.actionType === SecurityActionType.FREEZE_WEBHOOKS);

  expect(freezeWebhookRoute?.decision).toBe(SecurityExecutionRouteDecision.SKIPPED);
  expect(freezeWebhookRoute?.reason).toBe(SecurityExecutionRouteReason.NO_EXECUTOR);
});

test('containment fields plus correlationId and planId are preserved', () => {
  const router = buildRouter(true);
  const hotPathPlan = buildHotPathPlan();
  const authorizationResult = buildAuthorizationResult(AuthorizationDecision.AUTHORIZED);
  const routing = router.route(Object.freeze({ hotPathPlan, authorizationResult }));

  const firstRoute = routing.routes[0];

  expect(routing.planId).toBe(hotPathPlan.planId);
  expect(routing.executionPlanId).toBe(hotPathPlan.executionPlanId);
  expect(routing.correlationId).toBe(hotPathPlan.correlationId);
  expect(firstRoute.containmentTarget).toEqual(hotPathPlan.actions[0].containmentTarget);
  expect(firstRoute.containmentStrategy).toBe(hotPathPlan.actions[0].containmentStrategy);
  expect(firstRoute.authorizationResult).toEqual(authorizationResult);
});

test('NONE actions are ignored by routing', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  expect(routing.routes.some((route) => route.actionType === SecurityActionType.NONE)).toBe(false);
  expect(routing.metadata.ignoredNoneActionCount).toBe(1);
});

test('dispatcher output is immutable dispatch intent only', () => {
  const router = buildRouter(true);
  const routing = router.route(
    Object.freeze({
      hotPathPlan: buildHotPathPlan(),
      authorizationResult: buildAuthorizationResult(AuthorizationDecision.AUTHORIZED),
    }),
  );

  const dispatcher = new InMemorySecurityExecutionDispatcher();
  const dispatchResult = dispatcher.dispatch(routing);

  expect(Object.isFrozen(dispatchResult)).toBe(true);
  expect(Object.isFrozen(dispatchResult.intents)).toBe(true);
  expect(dispatchResult.intents.map((intent) => intent.dispatchDecision)).toEqual(
    routing.routes.map((route) => route.decision),
  );

  expect(() => {
    (dispatchResult as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);
});

test('router and dispatcher sources have no forbidden production execution surfaces', () => {
  const routerSource = readSource('security-execution-router.ts');
  const dispatcherSource = readSource('security-execution-dispatcher.ts');

  expect(routerSource).not.toMatch(/discord\.js/i);
  expect(dispatcherSource).not.toMatch(/discord\.js/i);
  expect(routerSource).not.toMatch(/fetch\s*\(|axios/i);
  expect(dispatcherSource).not.toMatch(/fetch\s*\(|axios/i);
  expect(routerSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(dispatcherSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(routerSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(dispatcherSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(routerSource).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(|\.timeout\s*\(/i);
  expect(dispatcherSource).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(|\.timeout\s*\(/i);
  expect(routerSource).not.toMatch(/roles\.add\s*\(|roles\.remove\s*\(|setRoles\s*\(/i);
  expect(dispatcherSource).not.toMatch(/roles\.add\s*\(|roles\.remove\s*\(|setRoles\s*\(/i);
  expect(routerSource).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
  expect(dispatcherSource).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
  expect(routerSource).not.toMatch(/dashboard|command/i);
  expect(dispatcherSource).not.toMatch(/dashboard|command/i);
});
