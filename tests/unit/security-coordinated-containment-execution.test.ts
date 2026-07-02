import fs from 'node:fs';
import path from 'node:path';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  InMemorySecurityExecutionOrchestrator,
  CoordinatedContainmentActionStatus,
} from '../../src/core/runtime/discord/security-execution-orchestrator';
import {
  InMemorySecurityExecutionAuthorizationEngine,
} from '../../src/core/runtime/discord/security-execution-authorization-engine';
import {
  InMemorySecurityExecutionDispatcher,
} from '../../src/core/runtime/discord/security-execution-dispatcher';
import {
  InMemorySecurityExecutionRouter,
} from '../../src/core/runtime/discord/security-execution-router';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import {
  AuthorizationEvaluationContext,
  ExecutionAuthorizationRequirement,
  SecurityContainmentAction,
  SecurityContainmentStrategy,
  SecurityExecutionPlan,
  SecurityExecutionRouteDecision,
  SecurityExecutionRoutingResult,
  SecurityExecutionMetadata,
  SecurityExecutionAuditMetadata,
  SecurityRollbackMetadata,
  SecurityHotPathAction,
  SecurityHotPathExecutionLane,
  SecurityHotPathPlan,
  SecurityHotPathPlanner,
  SecurityHotPathPriority,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';
import {
  InMemorySecurityExecutorRegistry,
} from '../../src/core/runtime/discord/executor-registry';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordHttpClient,
  ProductionDiscordHttpRequest,
  ProductionDiscordHttpResponse,
} from '../../src/core/runtime/discord/production-discord-execution-adapter';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from '../../src/core/runtime/discord/security-policy-types';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';

class StubRouterActionExecutor implements SecurityActionExecutor {
  constructor(private readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'stub-router-action-executor' }),
    });
  }
}

function headers(values: Record<string, string> = {}): { get(name: string): string | null } {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return Object.freeze({
    get(name: string): string | null {
      const value = normalized[name.toLowerCase()];
      return typeof value === 'string' ? value : null;
    },
  });
}

function response(overrides: Partial<ProductionDiscordHttpResponse> = {}): ProductionDiscordHttpResponse {
  return Object.freeze({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: headers(),
    ...overrides,
  });
}

function buildDecisionModel(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-coord-1',
    guildId: 'guild-coord-1',
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: 'corr-coord-1',
    auditLogCorrelationId: 'audit-coord-1',
    metadata: Object.freeze({ source: 'security-coordinated-containment-execution-test' }),
  });
}

function buildThreatAssessment() {
  return Object.freeze({
    severity: DetectionSeverity.CRITICAL,
    confidence: DetectionConfidence.HIGH,
    disposition: DetectionDisposition.MALICIOUS,
    rationale: 'coordinated containment threat assessment',
    correlationIds: Object.freeze(['corr-coord-1']),
    overrides: Object.freeze([]),
  });
}

function buildPlannedActions(): readonly SecurityAction[] {
  return Object.freeze([
    Object.freeze({ type: SecurityActionType.REMOVE_UNAUTHORIZED_BOT, priority: SecurityActionPriority.CRITICAL, sequence: 1 }),
    Object.freeze({ type: SecurityActionType.REMOVE_DANGEROUS_ROLE, priority: SecurityActionPriority.CRITICAL, sequence: 2 }),
    Object.freeze({ type: SecurityActionType.FREEZE_WEBHOOKS, priority: SecurityActionPriority.HIGH, sequence: 3 }),
    Object.freeze({ type: SecurityActionType.LOCK_CHANNELS, priority: SecurityActionPriority.HIGH, sequence: 4 }),
    Object.freeze({ type: SecurityActionType.RESTORE_RESOURCE, priority: SecurityActionPriority.HIGH, sequence: 5 }),
    Object.freeze({ type: SecurityActionType.REVOKE_ESCALATION_SOURCE, priority: SecurityActionPriority.HIGH, sequence: 6 }),
    Object.freeze({ type: SecurityActionType.CREATE_INCIDENT, priority: SecurityActionPriority.NORMAL, sequence: 7 }),
  ]);
}

function buildAuthorizationRequirements(): readonly ExecutionAuthorizationRequirement[] {
  return Object.freeze([
    Object.freeze({ actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT, sequence: 1, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE, sequence: 2, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.FREEZE_WEBHOOKS, sequence: 3, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.LOCK_CHANNELS, sequence: 4, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.RESTORE_RESOURCE, sequence: 5, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.REVOKE_ESCALATION_SOURCE, sequence: 6, requiresAuthorization: true, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
    Object.freeze({ actionType: SecurityActionType.CREATE_INCIDENT, sequence: 7, requiresAuthorization: false, decision: SecurityDecision.BLOCK, correlationId: 'corr-coord-1' }),
  ]);
}

function buildExecutionPlan(): SecurityExecutionPlan {
  const executionMetadata: SecurityExecutionMetadata = Object.freeze({
    source: 'in-memory-security-execution-planner',
    planId: 'execution-plan:corr-coord-1:BLOCK',
    plannedActionCount: 7,
    plannedActionTypes: Object.freeze(buildPlannedActions().map((action) => action.type)),
  });

  const auditMetadata: SecurityExecutionAuditMetadata = Object.freeze({
    planId: 'execution-plan:corr-coord-1:BLOCK',
    correlationId: 'corr-coord-1',
    decision: SecurityDecision.BLOCK,
    decisionReason: SecurityDecisionReason.POLICY_ALLOW,
    threatDisposition: DetectionDisposition.MALICIOUS,
    threatSeverity: DetectionSeverity.CRITICAL,
    threatConfidence: DetectionConfidence.HIGH,
  });

  const rollbackMetadata: SecurityRollbackMetadata = Object.freeze({
    supported: false,
    strategy: 'none',
    reason: 'no rollback in coordinated containment foundation',
  });

  return Object.freeze({
    planId: 'execution-plan:corr-coord-1:BLOCK',
    correlationId: 'corr-coord-1',
    threatAssessment: buildThreatAssessment(),
    securityDecision: buildDecisionModel(),
    plannedActions: buildPlannedActions(),
    authorizationRequirements: buildAuthorizationRequirements(),
    executionMetadata,
    auditMetadata,
    rollbackMetadata,
  });
}

class DeterministicContainmentHotPathPlanner implements SecurityHotPathPlanner {
  plan(executionPlan: SecurityExecutionPlan): SecurityHotPathPlan {
    const authorizationRequirements = buildAuthorizationRequirements();
    const actions: readonly SecurityHotPathAction[] = Object.freeze([
      Object.freeze({
        actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        sequence: 1,
        priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[0],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.BOT,
          resourceId: 'bot-user-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', botUserId: 'bot-user-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.REMOVE,
        authorizationRequirement: authorizationRequirements[0],
      }),
      Object.freeze({
        actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
        sequence: 2,
        priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[1],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.ROLE,
          resourceId: 'role-dangerous-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', memberUserId: 'member-1', roleId: 'role-dangerous-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.REMOVE,
        authorizationRequirement: authorizationRequirements[1],
      }),
      Object.freeze({
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        sequence: 3,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[2],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.WEBHOOK,
          resourceId: 'webhook-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', webhookId: 'webhook-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.FREEZE,
        authorizationRequirement: authorizationRequirements[2],
      }),
      Object.freeze({
        actionType: SecurityActionType.LOCK_CHANNELS,
        sequence: 4,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[3],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.CHANNEL,
          resourceId: 'channel-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', channelId: 'channel-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.LOCK,
        authorizationRequirement: authorizationRequirements[3],
      }),
      Object.freeze({
        actionType: SecurityActionType.RESTORE_RESOURCE,
        sequence: 5,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[4],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.CHANNEL,
          resourceId: 'channel-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', channelId: 'channel-1', overwriteId: 'overwrite-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.RESTORE,
        authorizationRequirement: authorizationRequirements[4],
      }),
      Object.freeze({
        actionType: SecurityActionType.REVOKE_ESCALATION_SOURCE,
        sequence: 6,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        action: executionPlan.plannedActions[5],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.GUILD_CONFIGURATION,
          resourceId: 'integration-1',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1', integrationId: 'integration-1', applicationId: 'application-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.REMOVE,
        authorizationRequirement: authorizationRequirements[5],
      }),
      Object.freeze({
        actionType: SecurityActionType.CREATE_INCIDENT,
        sequence: 7,
        priority: SecurityHotPathPriority.DEFERRED_AUDIT,
        lane: SecurityHotPathExecutionLane.BACKGROUND,
        action: executionPlan.plannedActions[6],
        containmentTarget: Object.freeze({
          resourceType: SecurityResourceType.GUILD_CONFIGURATION,
          resourceId: 'guild-state',
          correlationId: executionPlan.correlationId,
          metadata: Object.freeze({ guildId: 'guild-coord-1' }),
        }),
        containmentStrategy: SecurityContainmentStrategy.OBSERVE,
        authorizationRequirement: authorizationRequirements[6],
      }),
    ]);

    const containmentActions: readonly SecurityContainmentAction[] = Object.freeze(
      actions.map((action) =>
        Object.freeze({
          actionType: action.actionType,
          sequence: action.sequence,
          strategy: action.containmentStrategy!,
          target: action.containmentTarget!,
        }),
      ),
    );

    return Object.freeze({
      planId: 'hot-path:execution-plan:corr-coord-1:BLOCK',
      executionPlanId: executionPlan.planId,
      correlationId: executionPlan.correlationId,
      threatAssessment: executionPlan.threatAssessment,
      securityDecision: executionPlan.securityDecision,
      actions,
      containmentPlan: Object.freeze({
        planId: 'containment:execution-plan:corr-coord-1:BLOCK',
        correlationId: executionPlan.correlationId,
        threatAssessment: executionPlan.threatAssessment,
        actions: containmentActions,
        metadata: Object.freeze({
          source: 'in-memory-security-hot-path-planner',
          targetCount: containmentActions.length,
          strategyCount: containmentActions.length,
        }),
      }),
      authorizationRequirements,
      metadata: Object.freeze({
        source: 'in-memory-security-hot-path-planner',
        immediateActionCount: 5,
        backgroundActionCount: 1,
      }),
    });
  }
}

function createOrchestratorAndAdapter(client: ProductionDiscordHttpClient): {
  orchestrator: InMemorySecurityExecutionOrchestrator;
  adapter: ProductionDiscordExecutionAdapter;
  executionPlan: SecurityExecutionPlan;
} {
  const actionRegistry = new InMemorySecurityActionExecutorRegistry();
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.REMOVE_UNAUTHORIZED_BOT));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.REMOVE_DANGEROUS_ROLE));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.FREEZE_WEBHOOKS));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.LOCK_CHANNELS));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.RESTORE_RESOURCE));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.REVOKE_ESCALATION_SOURCE));
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.CREATE_INCIDENT));

  const adapter = new ProductionDiscordExecutionAdapter({
    httpClient: client,
    botToken: 'test-token',
    apiBaseUrl: 'https://discord.example',
    apiVersion: 10,
    maxAttempts: 2,
  });

  const orchestrator = new InMemorySecurityExecutionOrchestrator(
    new DeterministicContainmentHotPathPlanner(),
    new InMemorySecurityExecutionAuthorizationEngine(),
    new InMemorySecurityExecutorRegistry(),
    new InMemorySecurityExecutionRouter(actionRegistry),
    new InMemorySecurityExecutionDispatcher(),
  );

  return {
    orchestrator,
    adapter,
    executionPlan: buildExecutionPlan(),
  };
}

function classifyRequest(request: ProductionDiscordHttpRequest): SecurityActionType {
  if (request.method === 'DELETE' && request.url.includes('/permissions/')) {
    return SecurityActionType.RESTORE_RESOURCE;
  }

  if (request.method === 'PATCH' && request.url.includes('/channels/channel-1')) {
    return SecurityActionType.LOCK_CHANNELS;
  }

  if (request.method === 'DELETE' && request.url.includes('/webhooks/')) {
    return SecurityActionType.FREEZE_WEBHOOKS;
  }

  if (request.method === 'DELETE' && request.url.includes('/roles/')) {
    return SecurityActionType.REMOVE_DANGEROUS_ROLE;
  }

  if (request.method === 'DELETE' && request.url.includes('/integrations/')) {
    return SecurityActionType.REVOKE_ESCALATION_SOURCE;
  }

  return SecurityActionType.REMOVE_UNAUTHORIZED_BOT;
}

function readSource(fileName: string): string {
  return fs.readFileSync(path.resolve(__dirname, `../../src/core/runtime/discord/${fileName}`), 'utf8');
}

test('ordered coordinated containment executes immediate actions before background and preserves correlation/metadata', async () => {
  const callOrder: SecurityActionType[] = [];
  const requests: ProductionDiscordHttpRequest[] = [];

  const { orchestrator, adapter, executionPlan } = createOrchestratorAndAdapter({
    async request(request) {
      requests.push(request);
      callOrder.push(classifyRequest(request));
      return response({ status: request.method === 'PATCH' ? 200 : 204 });
    },
  });

  const result = await orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan, metadata: Object.freeze({ source: 'coordinated-test' }) }),
    Object.freeze({ discordExecutionService: adapter }),
  );

  expect(callOrder).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
  ]);

  expect(result.correlationId).toBe('corr-coord-1');
  expect(result.executionPlanId).toBe(executionPlan.planId);
  expect(result.actionResults.every((item) => item.correlationId === 'corr-coord-1')).toBe(true);
  expect(result.failedActions).toEqual([]);
  expect(result.skippedDuplicateActions).toEqual([]);
  expect(result.unsupportedActions).toEqual([SecurityActionType.CREATE_INCIDENT]);
  expect(result.succeededActions).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
  ]);

  const requestByActionType = new Map<SecurityActionType, ProductionDiscordHttpRequest>();
  for (const request of requests) {
    requestByActionType.set(classifyRequest(request), request);
  }

  expect(requestByActionType.get(SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.url).toBe(
    'https://discord.example/api/v10/guilds/guild-coord-1/members/bot-user-1',
  );
  expect(requestByActionType.get(SecurityActionType.REMOVE_DANGEROUS_ROLE)?.url).toBe(
    'https://discord.example/api/v10/guilds/guild-coord-1/members/member-1/roles/role-dangerous-1',
  );
  expect(requestByActionType.get(SecurityActionType.FREEZE_WEBHOOKS)?.url).toBe(
    'https://discord.example/api/v10/webhooks/webhook-1',
  );
  expect(requestByActionType.get(SecurityActionType.LOCK_CHANNELS)?.url).toBe(
    'https://discord.example/api/v10/channels/channel-1',
  );
  expect(requestByActionType.get(SecurityActionType.RESTORE_RESOURCE)?.url).toBe(
    'https://discord.example/api/v10/channels/channel-1/permissions/overwrite-1',
  );
  expect(requestByActionType.get(SecurityActionType.REVOKE_ESCALATION_SOURCE)?.url).toBe(
    'https://discord.example/api/v10/guilds/guild-coord-1/integrations/integration-1',
  );

  for (const item of result.actionResults.filter((entry) => entry.status === CoordinatedContainmentActionStatus.SUCCEEDED)) {
    const metadata = item.metadata as {
      metadata?: {
        planId?: string;
        executionPlanId?: string;
        routeId?: string;
        threatAssessment?: unknown;
        securityDecision?: unknown;
        authorizationMetadata?: unknown;
      };
      idempotencyKey?: string;
    };

    expect(metadata.idempotencyKey).toBeDefined();
    expect(metadata.metadata?.planId).toBe(result.planId);
    expect(metadata.metadata?.executionPlanId).toBe(result.executionPlanId);
    expect(metadata.metadata?.routeId).toEqual(expect.any(String));
    expect(metadata.metadata?.threatAssessment).toBeDefined();
    expect(metadata.metadata?.securityDecision).toBeDefined();
    expect(metadata.metadata?.authorizationMetadata).toBeDefined();
    expect(item.actionType).toBeDefined();
  }

  expect(requests.every((request) => request.headers.Authorization === 'Bot test-token')).toBe(true);
});

test('duplicate coordinated containment execution is idempotently skipped', async () => {
  const callOrder: SecurityActionType[] = [];

  const { orchestrator, adapter, executionPlan } = createOrchestratorAndAdapter({
    async request(request) {
      callOrder.push(classifyRequest(request));
      return response({ status: request.method === 'PATCH' ? 200 : 204 });
    },
  });

  await orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan }),
    Object.freeze({ discordExecutionService: adapter }),
  );

  const second = await orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan }),
    Object.freeze({ discordExecutionService: adapter }),
  );

  expect(second.skippedDuplicateActions).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
  ]);
  expect(second.failedActions).toEqual([]);
  expect(second.unsupportedActions).toEqual([SecurityActionType.CREATE_INCIDENT]);
  expect(callOrder).toHaveLength(6);
});

test('partial failures and unsupported actions are reported without corrupting aggregate result', async () => {
  const { orchestrator, adapter, executionPlan } = createOrchestratorAndAdapter({
    async request(request) {
      if (request.url.includes('/roles/')) {
        return response({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
        });
      }

      return response({ status: request.method === 'PATCH' ? 200 : 204 });
    },
  });

  const result = await orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan }),
    Object.freeze({ discordExecutionService: adapter }),
  );

  expect(result.failedActions).toEqual([SecurityActionType.REMOVE_DANGEROUS_ROLE]);
  expect(result.succeededActions).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
  ]);
  expect(result.unsupportedActions).toEqual([SecurityActionType.CREATE_INCIDENT]);
  expect(result.actionResults.find((item) => item.actionType === SecurityActionType.REMOVE_DANGEROUS_ROLE)?.status).toBe(
    CoordinatedContainmentActionStatus.FAILED,
  );
});

test('aggregate coordinated execution result is immutable', async () => {
  const { orchestrator, adapter, executionPlan } = createOrchestratorAndAdapter({
    async request(request) {
      return response({ status: request.method === 'PATCH' ? 200 : 204 });
    },
  });

  const result = await orchestrator.executeCoordinatedContainment(
    Object.freeze({ executionPlan }),
    Object.freeze({ discordExecutionService: adapter }),
  );

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.actionResults)).toBe(true);
  expect(Object.isFrozen(result.metadata)).toBe(true);
  expect(Object.isFrozen(result.actionResults[0])).toBe(true);

  expect(() => {
    (result as { correlationId: string }).correlationId = 'mutated';
  }).toThrow(TypeError);
});

test('coordinated execution source contains no prohibited additions', () => {
  const source = readSource('security-execution-orchestrator.ts');

  expect(source).not.toMatch(/UnauthorizedBotAddDetector|class\s+.*Detector|new\s+.*Detector/);
  expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(source).not.toMatch(/dashboard|command/i);
  expect(source).not.toMatch(/gateway|discord\.js/i);
  expect(source).not.toMatch(/botToken:\s*['\"](?!test-token)/i);
});
