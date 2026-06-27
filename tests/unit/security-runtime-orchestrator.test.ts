import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  CreateIncidentExecutor,
  FreezeWebhooksExecutor,
  NotifyAuditExecutor,
  QuarantineActorExecutor,
  RemoveUnauthorizedBotExecutor,
} from '../../src/core/runtime/discord/mock-production-executors';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemoryUnsupportedExecutor } from '../../src/core/runtime/discord/security-action-executor';
import { InMemorySecurityActionPlanner, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { SecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { InMemorySecurityActionExecutorRegistry } from '../../src/core/runtime/discord/security-executor-registry';
import { ExecutionState } from '../../src/core/runtime/discord/security-execution-types';
import {
  ExecutionAuthorizationPolicy,
  InMemoryExecutionAuthorizationEngine,
  InMemoryExecutionAuthorizationProvider,
} from '../../src/core/runtime/discord/execution-authorization';
import {
  InMemorySecurityRuntimeOrchestrator,
  SecurityRuntimeOrchestrator,
} from '../../src/core/runtime/discord/security-runtime-orchestrator';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from '../../src/core/runtime/discord/security-policy-types';

class FixedDecisionEvaluationPipeline implements SecurityEvaluationPipeline {
  constructor(private readonly decision: SecurityDecision) {}

  async evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityDecisionModel> {
    return {
      decision: this.decision,
      reason: this.reasonForDecision(this.decision),
      confidence: AuditAttributionConfidence.HIGH,
      actorId,
      guildId: 'guild-1',
      actionType,
      correlationId: normalizedEvent.correlationId,
      auditLogCorrelationId: 'audit-1',
      metadata: { source: 'fixed-decision-evaluation-pipeline' },
    };
  }

  private reasonForDecision(decision: SecurityDecision): SecurityDecisionReason {
    switch (decision) {
      case SecurityDecision.BLOCK:
        return SecurityDecisionReason.POLICY_BLOCK;
      case SecurityDecision.CONTAIN:
        return SecurityDecisionReason.THRESHOLD_EXCEEDED;
      case SecurityDecision.INVESTIGATE:
        return SecurityDecisionReason.ATTRIBUTION_LOW_CONFIDENCE;
      case SecurityDecision.IGNORE:
        return SecurityDecisionReason.NO_POLICY;
      case SecurityDecision.ALLOW:
      default:
        return SecurityDecisionReason.POLICY_ALLOW;
    }
  }
}

function normalizedEvent(): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-1',
    payload: { id: 'event-1' },
  };
}

function createOrchestrator(
  decision: SecurityDecision,
  configureRegistry: (registry: InMemorySecurityActionExecutorRegistry) => void,
  authorizationPolicyOverrides: Partial<ExecutionAuthorizationPolicy> = {},
): SecurityRuntimeOrchestrator {
  const registry = new InMemorySecurityActionExecutorRegistry();
  configureRegistry(registry);
  const authorizationProvider = new InMemoryExecutionAuthorizationProvider(authorizationPolicyOverrides);
  const authorizationEngine = new InMemoryExecutionAuthorizationEngine(authorizationProvider);

  return new InMemorySecurityRuntimeOrchestrator(
    new FixedDecisionEvaluationPipeline(decision),
    new InMemorySecurityActionPlanner(),
    registry,
    authorizationEngine,
  );
}

test('authorized action executes mock executor', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, (registry) => {
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);

  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'create-incident-executor',
    'notify-audit-executor',
  ]);
  expect(result.executionResults.every((execution) => execution.state === ExecutionState.SUCCESS)).toBe(true);
  expect(result.executionResults.every((execution) => execution.success)).toBe(true);
});

test('dry-run action does not execute executor', async () => {
  const createIncidentExecuteSpy = jest.spyOn(CreateIncidentExecutor.prototype, 'execute');
  const notifyAuditExecuteSpy = jest.spyOn(NotifyAuditExecutor.prototype, 'execute');
  const orchestrator = createOrchestrator(
    SecurityDecision.INVESTIGATE,
    (registry) => {
      registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
      registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
    },
    { dryRun: true },
  );

  try {
    const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.ROLE_DELETE);
    expect(createIncidentExecuteSpy).not.toHaveBeenCalled();
    expect(notifyAuditExecuteSpy).not.toHaveBeenCalled();
    expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
      'authorization-engine',
      'authorization-engine',
    ]);
    expect(result.executionResults.every((execution) => execution.state === ExecutionState.DRY_RUN)).toBe(true);
    expect(result.executionResults.every((execution) => execution.success)).toBe(true);
  } finally {
    createIncidentExecuteSpy.mockRestore();
    notifyAuditExecuteSpy.mockRestore();
  }
});

test('global kill switch denies execution', async () => {
  const orchestrator = createOrchestrator(
    SecurityDecision.INVESTIGATE,
    (registry) => {
      registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
      registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
    },
    { globalKillSwitch: true },
  );

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(result.executionResults.map((execution) => execution.metadata)).toEqual([
    {
      denied: true,
      policyControlled: true,
      authorizationDecision: 'DENY',
      authorizationReason: 'GLOBAL_KILL_SWITCH',
    },
    {
      denied: true,
      policyControlled: true,
      authorizationDecision: 'DENY',
      authorizationReason: 'GLOBAL_KILL_SWITCH',
    },
  ]);
  expect(result.executionResults.every((execution) => execution.state === ExecutionState.DENIED)).toBe(true);
});

test('disabled guild denies execution', async () => {
  const orchestrator = createOrchestrator(
    SecurityDecision.INVESTIGATE,
    (registry) => {
      registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
      registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
    },
    { disabledGuildIds: ['guild-1'] },
  );

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(result.executionResults.every((execution) => execution.executorId === 'authorization-engine')).toBe(true);
  expect(result.executionResults.every((execution) => execution.state === ExecutionState.DENIED)).toBe(true);
  expect(result.executionResults.every((execution) => execution.metadata?.authorizationReason === 'GUILD_DISABLED')).toBe(true);
});

test('disabled action skips execution', async () => {
  const orchestrator = createOrchestrator(
    SecurityDecision.INVESTIGATE,
    (registry) => {
      registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
      registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
    },
    { disabledActionTypes: [SecurityActionType.CREATE_INCIDENT] },
  );

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.ROLE_DELETE);

  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'authorization-engine',
    'notify-audit-executor',
  ]);
  expect(result.executionResults[0]?.metadata).toMatchObject({
    skipped: true,
    policyControlled: true,
    authorizationDecision: 'SKIP',
    authorizationReason: 'ACTION_DISABLED',
  });
  expect(result.executionResults[0]?.state).toBe(ExecutionState.SKIPPED);
  expect(result.executionResults[1]?.state).toBe(ExecutionState.SUCCESS);
  expect(result.executionResults[1]?.success).toBe(true);
});

test('trusted actor placeholder allows execution', async () => {
  const orchestrator = createOrchestrator(
    SecurityDecision.INVESTIGATE,
    (registry) => {
      registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
      registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
    },
    { trustedActorIds: ['actor-1'] },
  );

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.ROLE_DELETE);

  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'create-incident-executor',
    'notify-audit-executor',
  ]);
  expect(result.executionResults.every((execution) => execution.state === ExecutionState.SUCCESS)).toBe(true);
  expect(result.executionResults.every((execution) => execution.success)).toBe(true);
});

test('NONE still executes nothing', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.ALLOW, () => {
    // Intentionally empty to confirm no executor execution for NONE actions
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(result.decision.decision).toBe(SecurityDecision.ALLOW);
  expect(result.actionPlan.actions.map((action) => action.type)).toEqual([SecurityActionType.NONE]);
  expect(result.executionResults).toEqual([]);
  expect(result.correlationId).toBe('corr-1');
});

test('CONTAIN produces QUARANTINE_ACTOR, CREATE_INCIDENT, and NOTIFY_AUDIT mock executions', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.CONTAIN, (registry) => {
    registry.register(SecurityActionType.QUARANTINE_ACTOR, new QuarantineActorExecutor());
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.BOT_ADD);

  expect(result.actionPlan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.map((execution) => execution.actionType)).toEqual([
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.every((execution) => execution.success)).toBe(true);
});

test('BLOCK produces REMOVE_UNAUTHORIZED_BOT, FREEZE_WEBHOOKS, CREATE_INCIDENT, and NOTIFY_AUDIT mock executions', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.BLOCK, (registry) => {
    registry.register(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, new RemoveUnauthorizedBotExecutor());
    registry.register(SecurityActionType.FREEZE_WEBHOOKS, new FreezeWebhooksExecutor());
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.WEBHOOK_DELETE);

  expect(result.actionPlan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.map((execution) => execution.actionType)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.every((execution) => execution.success)).toBe(true);
});

test('missing executor still safely reports unregistered executor after authorization ALLOW', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, () => {
    // Intentionally empty: authorization allows, registry has no executors.
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(result.executionResults).toHaveLength(2);
  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'unregistered-executor',
    'unregistered-executor',
  ]);
  expect(result.executionResults.every((execution) => execution.state === ExecutionState.SKIPPED)).toBe(true);
});

test('unsupported actions are safely reported without throwing', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.BLOCK, (registry) => {
    registry.register(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, new InMemoryUnsupportedExecutor());
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.WEBHOOK_DELETE);

  expect(result.executionResults).toHaveLength(4);
  expect(result.executionResults.map((execution) => execution.success)).toEqual([false, false, true, false]);
  expect(result.executionResults.map((execution) => execution.state)).toEqual([
    ExecutionState.SKIPPED,
    ExecutionState.SKIPPED,
    ExecutionState.SUCCESS,
    ExecutionState.SKIPPED,
  ]);
  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'unsupported-executor',
    'unregistered-executor',
    'create-incident-executor',
    'unregistered-executor',
  ]);
  expect(result.executionResults[0]?.metadata).toMatchObject({
    skipped: true,
    reason: 'Executor unsupported-executor does not support action type REMOVE_UNAUTHORIZED_BOT',
  });
  expect(result.executionResults[1]?.metadata).toMatchObject({
    skipped: true,
    reason: 'No executor registered for action type FREEZE_WEBHOOKS',
  });
});

test('real executor exception still uses FAILED', async () => {
  const executeSpy = jest.spyOn(CreateIncidentExecutor.prototype, 'execute').mockRejectedValue(new Error('boom'));
  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, (registry) => {
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
  });

  try {
    const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);
    expect(result.executionResults.map((execution) => execution.state)).toEqual([
      ExecutionState.FAILED,
      ExecutionState.SKIPPED,
    ]);
    expect(result.executionResults[0]?.metadata).toMatchObject({
      error: 'boom',
      safelyHandled: true,
    });
  } finally {
    executeSpy.mockRestore();
  }
});

test('correlationId is preserved', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, (registry) => {
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);

  expect(result.correlationId).toBe('corr-1');
  expect(result.decision.correlationId).toBe('corr-1');
});

test('result object is immutable', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, (registry) => {
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.executionResults)).toBe(true);
  expect(Object.isFrozen(result.metadata ?? {})).toBe(true);

  expect(() => {
    (result as { correlationId: string }).correlationId = 'mutated';
  }).toThrow(TypeError);

  expect(() => {
    (result.executionResults as unknown as unknown[]).push('mutated');
  }).toThrow(TypeError);
});

test('runtime orchestration remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  const orchestrator = createOrchestrator(SecurityDecision.INVESTIGATE, (registry) => {
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  try {
    await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
