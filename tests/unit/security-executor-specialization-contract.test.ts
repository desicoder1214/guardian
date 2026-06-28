import fs from 'node:fs';
import path from 'node:path';
import {
  SecurityBotExecutor,
  SecurityChannelExecutor,
  SecurityDomainExecutorContract,
  SecurityGuildExecutor,
  SecurityIntegrationExecutor,
  SecurityMemberExecutor,
  SecurityRoleExecutor,
  SecurityWebhookExecutor,
} from '../../src/core/runtime/discord/security-action-executor';
import { InMemorySecurityDomainExecutorRegistry } from '../../src/core/runtime/discord/security-action-executor-registry';
import { InMemorySecurityExecutionCapabilityResolver } from '../../src/core/runtime/discord/security-execution-capability-resolver';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionStrategyResolver } from '../../src/core/runtime/discord/security-execution-strategy';
import { InMemorySecurityExecutionTopologyResolver } from '../../src/core/runtime/discord/security-execution-topology';
import {
  AuthorizationDecision,
  AuthorizationReason,
  SecurityContainmentStrategy,
  SecurityDomainExecutionRequest,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouteReason,
  SecurityExecutionRoutingResult,
  SecurityExecutionCapabilityResolver,
  SecurityExecutionCapabilityResolution,
  SecurityExecutionCapabilityResolutionReason,
  SecurityExecutionDispatchMode,
  SecurityExecutionIdempotencyPolicy,
  SecurityExecutionOrderingConstraint,
  SecurityExecutionStrategyResolution,
  SecurityExecutionStrategyResolutionReason,
  SecurityExecutionStrategyResolver,
  SecurityExecutionTopologyResolver,
  SecurityExecutionTopologyResolution,
  SecurityExecutionTopologyResolutionReason,
  SecurityHotPathExecutionLane,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';

class StubDomainExecutor<TDomain extends SecurityExecutorDomain> implements SecurityDomainExecutorContract {
  constructor(
    readonly executorId: string,
    readonly domain: TDomain,
    readonly supportedCapabilities: readonly SecurityExecutorCapability[],
  ) {}

  supports(capability: SecurityExecutorCapability): boolean {
    return this.supportedCapabilities.includes(capability);
  }

  prepare(request: SecurityDomainExecutionRequest) {
    return Object.freeze({
      domain: this.domain,
      capability: request.capability,
      accepted: true,
      reason: 'INTENT_ACCEPTED' as const,
      metadata: Object.freeze({ executorId: this.executorId, requestFrozen: Object.isFrozen(request) }),
    });
  }
}

class TrackingResolver implements SecurityExecutionCapabilityResolver {
  readonly actionCalls: SecurityActionType[] = [];

  resolve(actionType: SecurityActionType): SecurityExecutionCapabilityResolution {
    this.actionCalls.push(actionType);

    if (actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT) {
      return Object.freeze({
        actionType,
        resolved: true,
        reason: SecurityExecutionCapabilityResolutionReason.RESOLVED,
        domain: SecurityExecutorDomain.BOT,
        capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
      });
    }

    if (actionType === SecurityActionType.FREEZE_WEBHOOKS) {
      return Object.freeze({
        actionType,
        resolved: true,
        reason: SecurityExecutionCapabilityResolutionReason.RESOLVED,
        domain: SecurityExecutorDomain.WEBHOOK,
        capability: SecurityExecutorCapability.FREEZE_WEBHOOKS,
      });
    }

    return Object.freeze({
      actionType,
      resolved: false,
      reason: SecurityExecutionCapabilityResolutionReason.UNSUPPORTED_ACTION,
    });
  }
}

class TrackingStrategyResolver implements SecurityExecutionStrategyResolver {
  readonly actionCalls: SecurityActionType[] = [];

  getProfile() {
    const resolver = new InMemorySecurityExecutionStrategyResolver();
    return resolver.getProfile();
  }

  resolve(actionType: SecurityActionType): SecurityExecutionStrategyResolution {
    this.actionCalls.push(actionType);
    const resolver = new InMemorySecurityExecutionStrategyResolver();
    return resolver.resolve(actionType);
  }
}

class TrackingTopologyResolver implements SecurityExecutionTopologyResolver {
  readonly actionCalls: SecurityActionType[] = [];

  getTopology() {
    return Object.freeze({
      entries: Object.freeze([]),
      metadata: Object.freeze({
        source: 'in-memory-security-execution-topology-resolver' as const,
        entryCount: 0,
      }),
    });
  }

  resolve(actionType: SecurityActionType): SecurityExecutionTopologyResolution {
    this.actionCalls.push(actionType);

    if (actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT) {
      return Object.freeze({
        actionType,
        resolved: true,
        reason: SecurityExecutionTopologyResolutionReason.RESOLVED,
        entry: Object.freeze({
          actionType,
          domain: SecurityExecutorDomain.BOT,
          capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
        }),
      });
    }

    return Object.freeze({
      actionType,
      resolved: false,
      reason: SecurityExecutionTopologyResolutionReason.UNSUPPORTED_ACTION,
    });
  }
}

function buildRoutingResult(): SecurityExecutionRoutingResult {
  return Object.freeze({
    planId: 'hot-path:execution-plan:corr-specialized:BLOCK',
    executionPlanId: 'execution-plan:corr-specialized:BLOCK',
    correlationId: 'corr-specialized',
    authorizationResult: Object.freeze({
      decision: AuthorizationDecision.AUTHORIZED,
      reason: AuthorizationReason.PLAN_AUTHORIZED,
      executionPlanId: 'execution-plan:corr-specialized:BLOCK',
      correlationId: 'corr-specialized',
      authorizationRequirements: Object.freeze([]),
    }),
    routes: Object.freeze([
      Object.freeze({
        routeId: 'route:1',
        planId: 'hot-path:execution-plan:corr-specialized:BLOCK',
        executionPlanId: 'execution-plan:corr-specialized:BLOCK',
        correlationId: 'corr-specialized',
        actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        sequence: 1,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        decision: SecurityExecutionRouteDecision.EXECUTABLE,
        reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.BOT,
          resourceId: 'bot:corr-specialized:1',
          correlationId: 'corr-specialized',
        }),
        containmentStrategy: SecurityContainmentStrategy.REMOVE,
        authorizationResult: Object.freeze({
          decision: AuthorizationDecision.AUTHORIZED,
          reason: AuthorizationReason.PLAN_AUTHORIZED,
          executionPlanId: 'execution-plan:corr-specialized:BLOCK',
          correlationId: 'corr-specialized',
          authorizationRequirements: Object.freeze([]),
        }),
      }),
      Object.freeze({
        routeId: 'route:2',
        planId: 'hot-path:execution-plan:corr-specialized:BLOCK',
        executionPlanId: 'execution-plan:corr-specialized:BLOCK',
        correlationId: 'corr-specialized',
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        sequence: 2,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        decision: SecurityExecutionRouteDecision.EXECUTABLE,
        reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.WEBHOOK,
          resourceId: 'webhook:corr-specialized:2',
          correlationId: 'corr-specialized',
        }),
        containmentStrategy: SecurityContainmentStrategy.FREEZE,
        authorizationResult: Object.freeze({
          decision: AuthorizationDecision.AUTHORIZED,
          reason: AuthorizationReason.PLAN_AUTHORIZED,
          executionPlanId: 'execution-plan:corr-specialized:BLOCK',
          correlationId: 'corr-specialized',
          authorizationRequirements: Object.freeze([]),
        }),
      }),
    ]),
    metadata: Object.freeze({
      source: 'in-memory-security-execution-router' as const,
      executableRouteCount: 2,
      deferredRouteCount: 0,
      skippedRouteCount: 0,
      ignoredNoneActionCount: 0,
    }),
  });
}

function readSource(fileName: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../../src/core/runtime/discord/${fileName}`), 'utf8');
}

test('resolver mapping is deterministic for supported actions', () => {
  const resolver = new InMemorySecurityExecutionCapabilityResolver();

  const first = resolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
  const second = resolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);

  expect(first).toEqual(second);
  expect(first).toEqual({
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    resolved: true,
    reason: SecurityExecutionCapabilityResolutionReason.RESOLVED,
    domain: SecurityExecutorDomain.BOT,
    capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  });
  expect(Object.isFrozen(first)).toBe(true);
});

test('resolver maps NONE to unsupported/no resolution', () => {
  const resolver = new InMemorySecurityExecutionCapabilityResolver();
  const resolution = resolver.resolve(SecurityActionType.NONE);

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe(SecurityExecutionCapabilityResolutionReason.UNSUPPORTED_ACTION);
  expect(resolution.domain).toBeUndefined();
  expect(resolution.capability).toBeUndefined();
});

test('topology resolves all supported mappings deterministically', () => {
  const topologyResolver = new InMemorySecurityExecutionTopologyResolver();
  const supported = [
    [SecurityActionType.REMOVE_UNAUTHORIZED_BOT, SecurityExecutorDomain.BOT, SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT],
    [SecurityActionType.REMOVE_DANGEROUS_ROLE, SecurityExecutorDomain.ROLE, SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE],
    [SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER, SecurityExecutorDomain.MEMBER, SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER],
    [SecurityActionType.QUARANTINE_ACTOR, SecurityExecutorDomain.MEMBER, SecurityExecutorCapability.QUARANTINE_ACTOR],
    [SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR, SecurityExecutorDomain.MEMBER, SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR],
    [SecurityActionType.LOCK_CHANNELS, SecurityExecutorDomain.CHANNEL, SecurityExecutorCapability.LOCK_CHANNELS],
    [SecurityActionType.FREEZE_WEBHOOKS, SecurityExecutorDomain.WEBHOOK, SecurityExecutorCapability.FREEZE_WEBHOOKS],
    [SecurityActionType.REVOKE_ESCALATION_SOURCE, SecurityExecutorDomain.INTEGRATION, SecurityExecutorCapability.REVOKE_ESCALATION_SOURCE],
    [SecurityActionType.CREATE_INCIDENT, SecurityExecutorDomain.GUILD, SecurityExecutorCapability.CREATE_INCIDENT],
    [SecurityActionType.NOTIFY_AUDIT, SecurityExecutorDomain.GUILD, SecurityExecutorCapability.NOTIFY_AUDIT],
    [SecurityActionType.RESTORE_RESOURCE, SecurityExecutorDomain.GUILD, SecurityExecutorCapability.RESTORE_RESOURCE],
    [SecurityActionType.ESCALATE, SecurityExecutorDomain.GUILD, SecurityExecutorCapability.ESCALATE],
    [SecurityActionType.INVESTIGATE, SecurityExecutorDomain.GUILD, SecurityExecutorCapability.INVESTIGATE],
  ] as const;

  for (const [actionType, domain, capability] of supported) {
    const first = topologyResolver.resolve(actionType);
    const second = topologyResolver.resolve(actionType);

    expect(first).toEqual(second);
    expect(first.resolved).toBe(true);
    expect(first.reason).toBe(SecurityExecutionTopologyResolutionReason.RESOLVED);
    expect(first.entry).toEqual({ actionType, domain, capability });
    expect(Object.isFrozen(first)).toBe(true);
  }

  const topology = topologyResolver.getTopology();
  expect(Object.isFrozen(topology)).toBe(true);
  expect(Object.isFrozen(topology.entries)).toBe(true);
});

test('topology resolves NONE as unsupported', () => {
  const topologyResolver = new InMemorySecurityExecutionTopologyResolver();
  const resolution = topologyResolver.resolve(SecurityActionType.NONE);

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe(SecurityExecutionTopologyResolutionReason.UNSUPPORTED_ACTION);
  expect(resolution.entry).toBeUndefined();
});

test('capability resolver delegates to topology resolver', () => {
  const trackingTopology = new TrackingTopologyResolver();
  const capabilityResolver = new InMemorySecurityExecutionCapabilityResolver(trackingTopology);

  const resolved = capabilityResolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
  const unsupported = capabilityResolver.resolve(SecurityActionType.NONE);

  expect(trackingTopology.actionCalls).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.NONE,
  ]);
  expect(resolved).toEqual({
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    resolved: true,
    reason: SecurityExecutionCapabilityResolutionReason.RESOLVED,
    domain: SecurityExecutorDomain.BOT,
    capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  });
  expect(unsupported).toEqual({
    actionType: SecurityActionType.NONE,
    resolved: false,
    reason: SecurityExecutionCapabilityResolutionReason.UNSUPPORTED_ACTION,
  });
});

test('strategy resolver mapping is deterministic for supported actions', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const first = resolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
  const second = resolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);

  expect(first).toEqual(second);
  expect(first.resolved).toBe(true);
  expect(first.reason).toBe(SecurityExecutionStrategyResolutionReason.RESOLVED);
  expect(first.strategy?.dispatchMode).toBe(SecurityExecutionDispatchMode.FIRE_AND_FORGET);
  expect(Object.isFrozen(first)).toBe(true);
});

test('strategy resolver maps NONE to unsupported/no strategy', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const resolution = resolver.resolve(SecurityActionType.NONE);

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe(SecurityExecutionStrategyResolutionReason.UNSUPPORTED_ACTION);
  expect(resolution.strategy).toBeUndefined();
});

test('containment actions are hot-path safe by strategy', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const actions = [
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
    SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
  ];

  for (const actionType of actions) {
    const resolution = resolver.resolve(actionType);
    expect(resolution.resolved).toBe(true);
    expect(resolution.strategy?.hotPathSafe).toBe(true);
    expect(resolution.strategy?.lane).toBe(SecurityHotPathExecutionLane.IMMEDIATE);
  }
});

test('audit and deferred actions are not hot-path blocking', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const actions = [
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
    SecurityActionType.INVESTIGATE,
    SecurityActionType.ESCALATE,
  ];

  for (const actionType of actions) {
    const resolution = resolver.resolve(actionType);
    expect(resolution.resolved).toBe(true);
    expect(resolution.strategy?.hotPathSafe).toBe(false);
    expect(resolution.strategy?.lane).toBe(SecurityHotPathExecutionLane.BACKGROUND);
  }
});

test('strategy metadata preserves dispatch mode, retry and idempotency policies immutably', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const removeBot = resolver.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT).strategy;
  const neutralize = resolver.resolve(SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER).strategy;

  expect(removeBot?.dispatchMode).toBe(SecurityExecutionDispatchMode.FIRE_AND_FORGET);
  expect(neutralize?.dispatchMode).toBe(SecurityExecutionDispatchMode.AWAIT_ACK);

  expect(removeBot?.idempotencyPolicy).toBe(SecurityExecutionIdempotencyPolicy.REQUIRED);
  expect(removeBot?.retryPolicy.eligible).toBe(true);
  expect(removeBot?.retryPolicy.maxAttempts).toBe(2);
  expect(Object.isFrozen(removeBot?.retryPolicy)).toBe(true);
  expect(Object.isFrozen(removeBot)).toBe(true);

  expect(() => {
    ((removeBot as unknown as { retryPolicy: { maxAttempts: number } }).retryPolicy.maxAttempts = 99);
  }).toThrow(TypeError);
});

test('strategy ordering constraints are preserved', () => {
  const resolver = new InMemorySecurityExecutionStrategyResolver();
  const punish = resolver.resolve(SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR).strategy;

  expect(punish?.orderingConstraint).toBe(SecurityExecutionOrderingConstraint.AFTER_CONTAINMENT);
});

test('capability declarations are explicit across domain executor contracts', () => {
  const botExecutor: SecurityBotExecutor = new StubDomainExecutor('bot-exec', SecurityExecutorDomain.BOT, [
    SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  ]);
  const roleExecutor: SecurityRoleExecutor = new StubDomainExecutor('role-exec', SecurityExecutorDomain.ROLE, [
    SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
  ]);
  const memberExecutor: SecurityMemberExecutor = new StubDomainExecutor('member-exec', SecurityExecutorDomain.MEMBER, [
    SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
  ]);
  const channelExecutor: SecurityChannelExecutor = new StubDomainExecutor('channel-exec', SecurityExecutorDomain.CHANNEL, [
    SecurityExecutorCapability.LOCK_CHANNELS,
  ]);
  const webhookExecutor: SecurityWebhookExecutor = new StubDomainExecutor('webhook-exec', SecurityExecutorDomain.WEBHOOK, [
    SecurityExecutorCapability.FREEZE_WEBHOOKS,
  ]);
  const guildExecutor: SecurityGuildExecutor = new StubDomainExecutor('guild-exec', SecurityExecutorDomain.GUILD, [
    SecurityExecutorCapability.CREATE_INCIDENT,
  ]);
  const integrationExecutor: SecurityIntegrationExecutor = new StubDomainExecutor(
    'integration-exec',
    SecurityExecutorDomain.INTEGRATION,
    [SecurityExecutorCapability.REVOKE_ESCALATION_SOURCE],
  );

  expect(botExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);
  expect(roleExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE);
  expect(memberExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER);
  expect(channelExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.LOCK_CHANNELS);
  expect(webhookExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.FREEZE_WEBHOOKS);
  expect(guildExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.CREATE_INCIDENT);
  expect(integrationExecutor.supportedCapabilities).toContain(SecurityExecutorCapability.REVOKE_ESCALATION_SOURCE);
});

test('deterministic executor selection uses first matching registration', () => {
  const registry = new InMemorySecurityDomainExecutorRegistry();
  registry.register(new StubDomainExecutor('first-bot', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));
  registry.register(new StubDomainExecutor('second-bot', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));

  const resolved = registry.resolve(SecurityExecutorDomain.BOT, SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);
  expect(resolved?.executorId).toBe('first-bot');
});

test('dispatcher routes executable actions to correct domain executor contracts', () => {
  const registry = new InMemorySecurityDomainExecutorRegistry();
  registry.register(new StubDomainExecutor('bot-exec', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));
  registry.register(new StubDomainExecutor('webhook-exec', SecurityExecutorDomain.WEBHOOK, [SecurityExecutorCapability.FREEZE_WEBHOOKS]));
  const resolver = new TrackingResolver();
  const strategyResolver = new TrackingStrategyResolver();

  const dispatcher = new InMemorySecurityExecutionDispatcher(registry, resolver, strategyResolver);
  const result = dispatcher.dispatch(buildRoutingResult());

  expect(resolver.actionCalls).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
  ]);
  expect(strategyResolver.actionCalls).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
  ]);
  expect(result.intents[0].targetedDomain).toBe(SecurityExecutorDomain.BOT);
  expect(result.intents[0].targetedCapability).toBe(SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT);
  expect(result.intents[0].executionStrategy?.dispatchMode).toBe(SecurityExecutionDispatchMode.FIRE_AND_FORGET);
  expect(result.intents[0].executionResult?.metadata).toEqual({ executorId: 'bot-exec', requestFrozen: true });

  expect(result.intents[1].targetedDomain).toBe(SecurityExecutorDomain.WEBHOOK);
  expect(result.intents[1].targetedCapability).toBe(SecurityExecutorCapability.FREEZE_WEBHOOKS);
  expect(result.intents[1].executionResult?.metadata).toEqual({ executorId: 'webhook-exec', requestFrozen: true });
});

test('execution requests and dispatch results are immutable', () => {
  const registry = new InMemorySecurityDomainExecutorRegistry();
  registry.register(new StubDomainExecutor('bot-exec', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));
  registry.register(new StubDomainExecutor('webhook-exec', SecurityExecutorDomain.WEBHOOK, [SecurityExecutorCapability.FREEZE_WEBHOOKS]));
  const resolver = new TrackingResolver();

  const dispatcher = new InMemorySecurityExecutionDispatcher(registry, resolver, new TrackingStrategyResolver());
  const result = dispatcher.dispatch(buildRoutingResult());

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.intents)).toBe(true);
  expect(Object.isFrozen(result.intents[0].executionRequest)).toBe(true);
  expect(Object.isFrozen(result.intents[0].executionResult)).toBe(true);

  expect(() => {
    (result as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);
});

test('dispatcher preserves route order and containment fields', () => {
  const registry = new InMemorySecurityDomainExecutorRegistry();
  registry.register(new StubDomainExecutor('bot-exec', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));
  registry.register(new StubDomainExecutor('webhook-exec', SecurityExecutorDomain.WEBHOOK, [SecurityExecutorCapability.FREEZE_WEBHOOKS]));

  const dispatcher = new InMemorySecurityExecutionDispatcher(
    registry,
    new TrackingResolver(),
    new TrackingStrategyResolver(),
  );
  const routingResult = buildRoutingResult();
  const result = dispatcher.dispatch(routingResult);

  expect(result.intents.map((intent) => intent.route.actionType)).toEqual(
    routingResult.routes.map((route) => route.actionType),
  );
  expect(result.intents[0].route.containmentTarget).toEqual(routingResult.routes[0].containmentTarget);
  expect(result.intents[0].route.containmentStrategy).toBe(routingResult.routes[0].containmentStrategy);
  expect(result.intents[1].route.containmentTarget).toEqual(routingResult.routes[1].containmentTarget);
  expect(result.intents[1].route.containmentStrategy).toBe(routingResult.routes[1].containmentStrategy);
});

test('missing executor produces rejected intent without execution behavior', () => {
  const registry = new InMemorySecurityDomainExecutorRegistry();
  registry.register(new StubDomainExecutor('bot-exec', SecurityExecutorDomain.BOT, [SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT]));

  const dispatcher = new InMemorySecurityExecutionDispatcher(
    registry,
    new TrackingResolver(),
    new TrackingStrategyResolver(),
  );
  const result = dispatcher.dispatch(buildRoutingResult());

  expect(result.intents[0].executionResult?.accepted).toBe(true);
  expect(result.intents[1].executionResult?.accepted).toBe(false);
  expect(result.intents[1].executionResult?.reason).toBe('INTENT_REJECTED');
  expect(result.intents[1].executionResult?.metadata).toEqual({ reason: 'no-domain-executor-registered' });
});

test('specialized contracts and dispatcher sources have no forbidden side-effect surfaces', () => {
  const executorSource = readSource('security-action-executor.ts');
  const registrySource = readSource('security-action-executor-registry.ts');
  const dispatcherSource = readSource('security-execution-dispatcher.ts');
  const resolverSource = readSource('security-execution-capability-resolver.ts');
  const topologySource = readSource('security-execution-topology.ts');
  const strategySource = readSource('security-execution-strategy.ts');

  expect(executorSource).not.toMatch(/discord\.js|WebhookClient/i);
  expect(registrySource).not.toMatch(/discord\.js|WebhookClient/i);
  expect(dispatcherSource).not.toMatch(/discord\.js|WebhookClient/i);
  expect(resolverSource).not.toMatch(/discord\.js|WebhookClient/i);
  expect(topologySource).not.toMatch(/discord\.js|WebhookClient/i);
  expect(strategySource).not.toMatch(/discord\.js|WebhookClient/i);

  expect(executorSource).not.toMatch(/fetch\s*\(|axios/i);
  expect(registrySource).not.toMatch(/fetch\s*\(|axios/i);
  expect(dispatcherSource).not.toMatch(/fetch\s*\(|axios/i);
  expect(resolverSource).not.toMatch(/fetch\s*\(|axios/i);
  expect(topologySource).not.toMatch(/fetch\s*\(|axios/i);
  expect(strategySource).not.toMatch(/fetch\s*\(|axios/i);

  expect(executorSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(registrySource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(dispatcherSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(resolverSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(topologySource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(strategySource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);

  expect(executorSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(registrySource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(dispatcherSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(resolverSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(topologySource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(strategySource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);

  expect(executorSource).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.timeout\s*\(|\.quarantine\s*\(/i);
  expect(dispatcherSource).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.timeout\s*\(|\.quarantine\s*\(/i);
  expect(dispatcherSource).not.toMatch(/dashboard|command/i);
  expect(resolverSource).not.toMatch(/dashboard|command/i);
  expect(topologySource).not.toMatch(/dashboard|command/i);
  expect(strategySource).not.toMatch(/dashboard|command/i);
  expect(dispatcherSource).not.toMatch(/SecurityActionType\./);
  expect(resolverSource).not.toMatch(/switch\s*\(actionType\)/);
});
