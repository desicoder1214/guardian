import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  CreateIncidentExecutor,
  FreezeWebhooksExecutor,
  NotifyAuditExecutor,
  QuarantineActorExecutor,
  RemoveUnauthorizedBotExecutor,
} from '../../src/core/runtime/discord/mock-production-executors';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionEngine,
  DetectionResult,
  DetectionSeverity,
  InMemoryDetectionEngine,
} from '../../src/core/runtime/discord/detection-engine';
import { DetectorPlugin, InMemoryDetectorPluginRegistry } from '../../src/core/runtime/discord/detection-plugin-framework';
import { InMemoryUnsupportedExecutor } from '../../src/core/runtime/discord/security-action-executor';
import { InMemorySecurityActionPlanner, SecurityAction, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import {
  DetectionAwareSecurityEvaluationPipeline,
  SecurityEvaluationPipeline,
} from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { InMemorySecurityActionExecutorRegistry } from '../../src/core/runtime/discord/security-executor-registry';
import { ActionExecutionResult, ExecutionContext, ExecutionState } from '../../src/core/runtime/discord/security-execution-types';
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
  InMemorySecurityRuntimeEngine,
  SecurityRuntimeEngine,
} from '../../src/core/runtime/discord/security-runtime-engine';
import {
  InMemoryRuntimeResultAggregator,
  RuntimeExecutionSummary,
} from '../../src/core/runtime/discord/security-runtime-result-aggregator';
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

class RecordingDetectionAwareEvaluationPipeline implements DetectionAwareSecurityEvaluationPipeline {
  readonly callOrder: string[] = [];
  stagedDetectionResults: readonly DetectionResult[] = Object.freeze([]);

  async evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityDecisionModel> {
    this.callOrder.push('evaluate');

    return {
      decision: SecurityDecision.ALLOW,
      reason: SecurityDecisionReason.POLICY_ALLOW,
      confidence: AuditAttributionConfidence.HIGH,
      actorId,
      guildId: 'guild-1',
      actionType,
      correlationId: normalizedEvent.correlationId,
      auditLogCorrelationId: 'audit-1',
      metadata: Object.freeze({ detectionResults: this.stagedDetectionResults }),
    };
  }

  stageDetectionResults(detectionResults: readonly DetectionResult[]): void {
    this.callOrder.push('stageDetectionResults');
    this.stagedDetectionResults = detectionResults;
  }
}

class RecordingRemoveUnauthorizedBotExecutor extends RemoveUnauthorizedBotExecutor {
  constructor(private readonly callOrder: string[]) {
    super();
  }

  async execute(context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    this.callOrder.push(this.executorId);
    return super.execute(context, action);
  }
}

class RecordingFreezeWebhooksExecutor extends FreezeWebhooksExecutor {
  constructor(private readonly callOrder: string[]) {
    super();
  }

  async execute(context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    this.callOrder.push(this.executorId);
    return super.execute(context, action);
  }
}

class RecordingCreateIncidentExecutor extends CreateIncidentExecutor {
  constructor(private readonly callOrder: string[]) {
    super();
  }

  async execute(context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    this.callOrder.push(this.executorId);
    return super.execute(context, action);
  }
}

class RecordingNotifyAuditExecutor extends NotifyAuditExecutor {
  constructor(private readonly callOrder: string[]) {
    super();
  }

  async execute(context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    this.callOrder.push(this.executorId);
    return super.execute(context, action);
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

function createDetectionEngineDetector(
  detectorId: string,
  callOrder: string[],
  supportedActionTypes: readonly SecurityPolicyActionType[] = [SecurityPolicyActionType.CHANNEL_DELETE],
): DetectorPlugin {
  return {
    detectorId,
    version: '1.0.0',
    priority: 0,
    supportedActionTypes,
    enabled: () => true,
    async evaluate(context) {
      callOrder.push(`detector:${detectorId}`);
      return Object.freeze({
        detectorId,
        matched: true,
        findings: Object.freeze([
          Object.freeze({
            detectorId,
            severity: DetectionSeverity.LOW,
            confidence: DetectionConfidence.MEDIUM,
            disposition: DetectionDisposition.SUSPICIOUS,
            reason: `${detectorId} matched`,
            correlationId: context.correlationId,
            metadata: Object.freeze({ mock: true }),
          }),
        ]),
        correlationId: context.correlationId,
        metadata: Object.freeze({ mock: true }),
      });
    },
  };
}

function createDetectorPluginRegistry(...plugins: readonly DetectorPlugin[]): InMemoryDetectorPluginRegistry {
  const registry = new InMemoryDetectorPluginRegistry();
  for (const plugin of plugins) {
    registry.register(plugin);
  }

  return registry;
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

test('BLOCK produces FREEZE_WEBHOOKS, CREATE_INCIDENT, and NOTIFY_AUDIT mock executions for webhook delete', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.BLOCK, (registry) => {
    registry.register(SecurityActionType.FREEZE_WEBHOOKS, new FreezeWebhooksExecutor());
    registry.register(SecurityActionType.CREATE_INCIDENT, new CreateIncidentExecutor());
    registry.register(SecurityActionType.NOTIFY_AUDIT, new NotifyAuditExecutor());
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.WEBHOOK_DELETE);

  expect(result.actionPlan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.map((execution) => execution.actionType)).toEqual([
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(result.executionResults.every((execution) => execution.success)).toBe(true);
});

test('BOT_ADD fast path keeps REMOVE_UNAUTHORIZED_BOT first in plan and execution order', async () => {
  const callOrder: string[] = [];
  const orchestrator = createOrchestrator(SecurityDecision.BLOCK, (registry) => {
    registry.register(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, new RecordingRemoveUnauthorizedBotExecutor(callOrder));
    registry.register(SecurityActionType.FREEZE_WEBHOOKS, new RecordingFreezeWebhooksExecutor(callOrder));
    registry.register(SecurityActionType.CREATE_INCIDENT, new RecordingCreateIncidentExecutor(callOrder));
    registry.register(SecurityActionType.NOTIFY_AUDIT, new RecordingNotifyAuditExecutor(callOrder));
  });

  const result = await orchestrator.orchestrate(normalizedEvent(), 'actor-1', SecurityPolicyActionType.BOT_ADD);

  expect(result.actionPlan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(callOrder[0]).toBe('remove-unauthorized-bot-executor');
  expect(result.executionResults[0]?.executorId).toBe('remove-unauthorized-bot-executor');
  expect(result.metadata).toMatchObject({
    fastPath: true,
    dispatchTargetMs: '1-5',
  });
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

  expect(result.executionResults).toHaveLength(3);
  expect(result.executionResults.map((execution) => execution.success)).toEqual([false, true, false]);
  expect(result.executionResults.map((execution) => execution.state)).toEqual([
    ExecutionState.SKIPPED,
    ExecutionState.SUCCESS,
    ExecutionState.SKIPPED,
  ]);
  expect(result.executionResults.map((execution) => execution.executorId)).toEqual([
    'unregistered-executor',
    'create-incident-executor',
    'unregistered-executor',
  ]);
  expect(result.executionResults[0]?.metadata).toMatchObject({
    skipped: true,
    reason: 'No executor registered for action type FREEZE_WEBHOOKS',
  });
  expect(result.executionResults[1]?.metadata).toMatchObject({
    mock: true,
    sideEffectFree: true,
    simulated: true,
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

test('runtime engine delegates once and preserves identity inputs', async () => {
  const orchestrate = jest.fn().mockResolvedValue(
    Object.freeze({
      decision: {
        decision: SecurityDecision.ALLOW,
        reason: SecurityDecisionReason.POLICY_ALLOW,
        confidence: AuditAttributionConfidence.HIGH,
        actorId: 'actor-1',
        guildId: 'guild-1',
        actionType: SecurityPolicyActionType.CHANNEL_CREATE,
        correlationId: 'corr-1',
        auditLogCorrelationId: 'audit-1',
        metadata: Object.freeze({ source: 'orchestrator' }),
      },
      actionPlan: Object.freeze({
        decision: SecurityDecision.ALLOW,
        actions: Object.freeze([]),
        correlationId: 'corr-1',
      }),
      executionResults: Object.freeze([]),
      correlationId: 'corr-1',
      metadata: Object.freeze({ orchestrator: 'mock-orchestrator' }),
    }),
  );

  const orchestrator = { orchestrate } as unknown as SecurityRuntimeOrchestrator;
  const engine: SecurityRuntimeEngine = new InMemorySecurityRuntimeEngine(orchestrator);
  const event = normalizedEvent();

  const result = await engine.process(event, 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);

  expect(orchestrate).toHaveBeenCalledTimes(1);
  expect(orchestrate).toHaveBeenCalledWith(event, 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);
  expect(result.correlationId).toBe('corr-1');
  expect(result.metadata).toMatchObject({
    engine: 'in-memory-security-runtime-engine',
    processedAt: event.timestamp,
    correlationId: 'corr-1',
    orchestrator: 'mock-orchestrator',
  });
});

test('runtime engine executes detection engine exactly once before evaluation pipeline', async () => {
  const pipeline = new RecordingDetectionAwareEvaluationPipeline();
  const registry = new InMemorySecurityActionExecutorRegistry();
  const orchestrator = new InMemorySecurityRuntimeOrchestrator(
    pipeline,
    new InMemorySecurityActionPlanner(),
    registry,
    new InMemoryExecutionAuthorizationEngine(new InMemoryExecutionAuthorizationProvider()),
  );
  const callOrder: string[] = [];
  const detectionEngine: DetectionEngine = {
    evaluate: jest.fn(async () => {
      callOrder.push('detect');
      return Object.freeze([]);
    }),
  };
  const engine = new InMemorySecurityRuntimeEngine(
    orchestrator,
    pipeline,
    new InMemoryDetectorPluginRegistry(),
    detectionEngine,
  );

  await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(detectionEngine.evaluate).toHaveBeenCalledTimes(1);
  expect([...callOrder, ...pipeline.callOrder]).toEqual(['detect', 'stageDetectionResults', 'evaluate']);
});

test('runtime engine passes detection results into security evaluation pipeline unchanged', async () => {
  const pipeline = new RecordingDetectionAwareEvaluationPipeline();
  const orchestrator = new InMemorySecurityRuntimeOrchestrator(
    pipeline,
    new InMemorySecurityActionPlanner(),
    new InMemorySecurityActionExecutorRegistry(),
    new InMemoryExecutionAuthorizationEngine(new InMemoryExecutionAuthorizationProvider()),
  );
  const detectionResults = Object.freeze([
    Object.freeze({
      detectorId: 'detector-a',
      matched: true,
      findings: Object.freeze([]),
      correlationId: 'corr-1',
      metadata: Object.freeze({ mock: true }),
    }),
  ]);
  const detectionEngine: DetectionEngine = {
    evaluate: jest.fn(async () => detectionResults),
  };
  const engine = new InMemorySecurityRuntimeEngine(
    orchestrator,
    pipeline,
    new InMemoryDetectorPluginRegistry(),
    detectionEngine,
  );

  await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(pipeline.stagedDetectionResults).toBe(detectionResults);
});

test('runtime engine preserves detector ordering and duplicate suppression', async () => {
  const pipeline = new RecordingDetectionAwareEvaluationPipeline();
  const orchestrator = new InMemorySecurityRuntimeOrchestrator(
    pipeline,
    new InMemorySecurityActionPlanner(),
    new InMemorySecurityActionExecutorRegistry(),
    new InMemoryExecutionAuthorizationEngine(new InMemoryExecutionAuthorizationProvider()),
  );
  const callOrder: string[] = [];
  const registry = createDetectorPluginRegistry(
    createDetectionEngineDetector('detector-b', callOrder),
    createDetectionEngineDetector('detector-a', callOrder),
    createDetectionEngineDetector('detector-c', callOrder, [SecurityPolicyActionType.ROLE_DELETE]),
  );
  const engine = new InMemorySecurityRuntimeEngine(
    orchestrator,
    pipeline,
    registry,
    new InMemoryDetectionEngine(registry),
  );

  await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(callOrder).toEqual(['detector:detector-a', 'detector:detector-b']);
  expect(pipeline.stagedDetectionResults.map((result) => result.detectorId)).toEqual(['detector-a', 'detector-b']);
});

test('runtime engine preserves correlationId end-to-end through detection integration', async () => {
  const pipeline = new RecordingDetectionAwareEvaluationPipeline();
  const orchestrator = new InMemorySecurityRuntimeOrchestrator(
    pipeline,
    new InMemorySecurityActionPlanner(),
    new InMemorySecurityActionExecutorRegistry(),
    new InMemoryExecutionAuthorizationEngine(new InMemoryExecutionAuthorizationProvider()),
  );
  const registry = createDetectorPluginRegistry(createDetectionEngineDetector('detector-a', []));
  const engine = new InMemorySecurityRuntimeEngine(
    orchestrator,
    pipeline,
    registry,
    new InMemoryDetectionEngine(registry),
  );

  const result = await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_DELETE);

  expect(result.correlationId).toBe('corr-1');
  expect(result.decision.correlationId).toBe('corr-1');
  expect(pipeline.stagedDetectionResults[0]?.correlationId).toBe('corr-1');
});

test('runtime engine result is immutable', async () => {
  const orchestrator = createOrchestrator(SecurityDecision.ALLOW, () => {
    // Intentionally empty.
  });
  const engine = new InMemorySecurityRuntimeEngine(orchestrator, new RecordingDetectionAwareEvaluationPipeline());

  const result = await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.metadata ?? {})).toBe(true);

  expect(() => {
    (result as { correlationId: string }).correlationId = 'mutated';
  }).toThrow(TypeError);

  expect(() => {
    (result.metadata as Record<string, unknown>).engine = 'changed';
  }).toThrow(TypeError);
});

test('runtime engine wraps orchestrator errors consistently', async () => {
  const orchestrator = {
    orchestrate: jest.fn().mockRejectedValue(new Error('orchestrator failure')),
  } as unknown as SecurityRuntimeOrchestrator;
  const engine = new InMemorySecurityRuntimeEngine(orchestrator, new RecordingDetectionAwareEvaluationPipeline());

  await expect(engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE)).rejects.toThrow(
    'InMemorySecurityRuntimeEngine.process failed: orchestrator failure',
  );
});

test('runtime engine remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  const engine = new InMemorySecurityRuntimeEngine(
    createOrchestrator(SecurityDecision.ALLOW, () => {}),
    new RecordingDetectionAwareEvaluationPipeline(),
  );

  try {
    await engine.process(normalizedEvent(), 'actor-1', SecurityPolicyActionType.CHANNEL_CREATE);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});

function runtimeResultForAggregator(states: ExecutionState[]): RuntimeExecutionSummary | never {
  const aggregator = new InMemoryRuntimeResultAggregator();
  const runtimeResult = {
    decision: {
      decision: SecurityDecision.INVESTIGATE,
      reason: SecurityDecisionReason.ATTRIBUTION_LOW_CONFIDENCE,
      confidence: AuditAttributionConfidence.HIGH,
      actorId: 'actor-1',
      guildId: 'guild-1',
      actionType: SecurityPolicyActionType.CHANNEL_CREATE,
      correlationId: 'corr-1',
      auditLogCorrelationId: 'audit-1',
      metadata: Object.freeze({ source: 'runtime-result-fixture' }),
    },
    actionPlan: Object.freeze({
      decision: SecurityDecision.INVESTIGATE,
      actions: Object.freeze([]),
      correlationId: 'corr-1',
    }),
    executionResults: Object.freeze(
      states.map((state, index) =>
        Object.freeze({
          success: state === ExecutionState.SUCCESS,
          state,
          actionType: SecurityActionType.CREATE_INCIDENT,
          executorId: `executor-${index + 1}`,
          metadata: Object.freeze({ state }),
        }),
      ),
    ),
    correlationId: 'corr-1',
    metadata: Object.freeze({ source: 'runtime-result-fixture' }),
  } as never;

  return aggregator.aggregate(runtimeResult);
}

test('runtime result aggregation counts mixed states correctly', () => {
  const summary = runtimeResultForAggregator([
    ExecutionState.SUCCESS,
    ExecutionState.FAILED,
    ExecutionState.DENIED,
    ExecutionState.SKIPPED,
    ExecutionState.DRY_RUN,
    ExecutionState.SUCCESS,
  ]);

  expect(summary.correlationId).toBe('corr-1');
  expect(summary.totalActions).toBe(6);
  expect(summary.successCount).toBe(2);
  expect(summary.failedCount).toBe(1);
  expect(summary.deniedCount).toBe(1);
  expect(summary.skippedCount).toBe(1);
  expect(summary.dryRunCount).toBe(1);
  expect(summary.executedCount).toBe(2);
});

test('runtime result aggregation final state precedence is deterministic', () => {
  const summary = runtimeResultForAggregator([
    ExecutionState.SUCCESS,
    ExecutionState.DRY_RUN,
    ExecutionState.SKIPPED,
    ExecutionState.DENIED,
    ExecutionState.FAILED,
  ]);

  expect(summary.finalState).toBe(ExecutionState.FAILED);
});

test('runtime result aggregation preserves correlationId and populates processedAt', () => {
  const summary = runtimeResultForAggregator([ExecutionState.SUCCESS]);

  expect(summary.correlationId).toBe('corr-1');
  expect(summary.processedAt).toBeDefined();
  expect(Number.isNaN(Date.parse(summary.processedAt))).toBe(false);
});

test('runtime result aggregation returns immutable summary', () => {
  const summary = runtimeResultForAggregator([ExecutionState.SUCCESS, ExecutionState.SKIPPED]);

  expect(Object.isFrozen(summary)).toBe(true);
  expect(Object.isFrozen(summary.metadata ?? {})).toBe(true);

  expect(() => {
    (summary as { totalActions: number }).totalActions = 99;
  }).toThrow(TypeError);

  expect(() => {
    (summary.metadata as Record<string, unknown>).engine = 'changed';
  }).toThrow(TypeError);
});

test('runtime result aggregation remains side-effect free', () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const summary = runtimeResultForAggregator([ExecutionState.SUCCESS]);
    expect(summary.finalState).toBe(ExecutionState.SUCCESS);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
