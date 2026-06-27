import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemorySecurityActionPlanner, SecurityActionType, SecurityActionPlan } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision, SecurityActionType as PolicySecurityActionType } from '../../src/core/runtime/discord/security-policy-types';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  SecurityDecisionModel,
  SecurityDecisionReason,
} from '../../src/core/runtime/discord/security-decision-types';
import { ExecutionResult, ExecutionState, SecurityExecutionEngine } from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityRuntimeCoordinator } from '../../src/core/runtime/discord/security-runtime-coordinator';
import {
  SecurityRuntimeCoordinatorInput,
  SecurityRuntimeResult,
} from '../../src/core/runtime/discord/security-runtime-coordinator-types';
import { IncidentContext, IncidentSeverity } from '../../src/core/runtime/discord/incident-correlation-types';
import { SecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';

class RecordingEvaluationPipeline implements SecurityEvaluationPipeline {
  readonly calls: Array<{ normalizedEvent: DiscordGatewayNormalizedEvent; actorId: string; actionType: PolicySecurityActionType }> = [];

  constructor(private readonly decision: SecurityDecisionModel) {}

  async evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: PolicySecurityActionType,
  ): Promise<SecurityDecisionModel> {
    this.calls.push({ normalizedEvent, actorId, actionType });
    return this.decision;
  }
}

class RecordingExecutionEngine implements SecurityExecutionEngine {
  readonly calls: Array<{ plan: SecurityActionPlan; incident: IncidentContext }> = [];

  constructor(private readonly result: ExecutionResult) {}

  async execute(plan: SecurityActionPlan, incident: IncidentContext): Promise<ExecutionResult> {
    this.calls.push({ plan, incident });
    return this.result;
  }
}

class RecordingActionPlanner extends InMemorySecurityActionPlanner {
  readonly calls: SecurityDecisionModel[] = [];

  override plan(decisionModel: SecurityDecisionModel): SecurityActionPlan {
    this.calls.push(decisionModel);
    return super.plan(decisionModel);
  }
}

function buildEvent(correlationId = 'corr-1'): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId,
    payload: { guildId: 'guild-1' },
  };
}

function buildDecision(decision: SecurityDecision, correlationId = 'corr-1'): SecurityDecisionModel {
  return {
    decision,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: PolicySecurityActionType.CHANNEL_DELETE,
    correlationId,
  };
}

function buildExecutionResult(overrides: Partial<ExecutionResult> = {}): ExecutionResult {
  return {
    success: true,
    partialSuccess: false,
    failedActions: [],
    completedActions: [],
    executionId: 'exec-1',
    correlationId: 'corr-1',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:00:00.010Z',
    durationMs: 10,
    state: ExecutionState.SUCCESS,
    ...overrides,
  };
}

function buildInput(overrides: Partial<SecurityRuntimeCoordinatorInput> = {}): SecurityRuntimeCoordinatorInput {
  return {
    normalizedEvent: buildEvent(),
    actorId: 'actor-1',
    actionType: PolicySecurityActionType.CHANNEL_DELETE,
    ...overrides,
  };
}

function resultActions(result: SecurityRuntimeResult): string[] {
  return result.actionPlan.actions.map((action) => action.type);
}

test('evaluation then planning then execution runs in order', async () => {
  const decision = buildDecision(SecurityDecision.ALLOW);
  const evaluationPipeline = new RecordingEvaluationPipeline(decision);
  const actionPlanner = new RecordingActionPlanner();
  const executionEngine = new RecordingExecutionEngine(buildExecutionResult());
  const clock = { nowMs: Date.parse('2026-01-01T00:00:00.000Z') };
  const now = (): number => {
    const current = clock.nowMs;
    clock.nowMs += 25;
    return current;
  };
  const coordinator = new InMemorySecurityRuntimeCoordinator(evaluationPipeline, actionPlanner, executionEngine, { now });

  const result = await coordinator.coordinate(buildInput());

  expect(evaluationPipeline.calls).toHaveLength(1);
  expect(actionPlanner.calls).toHaveLength(1);
  expect(executionEngine.calls).toHaveLength(1);
  expect(result.decision).toBe(decision);
  expect(result.correlationId).toBe('corr-1');
  expect(result.startedAt).toBe('2026-01-01T00:00:00.000Z');
  expect(result.finishedAt).toBe('2026-01-01T00:00:00.025Z');
  expect(result.durationMs).toBe(25);
});

test('ALLOW decision creates NONE plan and safe execution result', async () => {
  const decision = buildDecision(SecurityDecision.ALLOW);
  const evaluationPipeline = new RecordingEvaluationPipeline(decision);
  const actionPlanner = new RecordingActionPlanner();
  const executionEngine = new RecordingExecutionEngine(buildExecutionResult());
  const coordinator = new InMemorySecurityRuntimeCoordinator(evaluationPipeline, actionPlanner, executionEngine);

  const result = await coordinator.coordinate(buildInput());

  expect(result.decision.decision).toBe(SecurityDecision.ALLOW);
  expect(result.actionPlan.actions).toEqual([
    expect.objectContaining({ type: SecurityActionType.NONE }),
  ]);
  expect(result.executionResult).toEqual(expect.objectContaining({ success: true }));
});

test('INVESTIGATE decision creates incident and audit plan', async () => {
  const decision = buildDecision(SecurityDecision.INVESTIGATE);
  const evaluationPipeline = new RecordingEvaluationPipeline(decision);
  const actionPlanner = new RecordingActionPlanner();
  const executionEngine = new RecordingExecutionEngine(buildExecutionResult());
  const coordinator = new InMemorySecurityRuntimeCoordinator(evaluationPipeline, actionPlanner, executionEngine);

  const result = await coordinator.coordinate(buildInput());

  expect(result.decision.decision).toBe(SecurityDecision.INVESTIGATE);
  expect(resultActions(result)).toEqual([
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
});

test('BLOCK decision creates block plan', async () => {
  const decision = buildDecision(SecurityDecision.BLOCK);
  const evaluationPipeline = new RecordingEvaluationPipeline(decision);
  const actionPlanner = new RecordingActionPlanner();
  const executionEngine = new RecordingExecutionEngine(buildExecutionResult());
  const coordinator = new InMemorySecurityRuntimeCoordinator(evaluationPipeline, actionPlanner, executionEngine);

  const result = await coordinator.coordinate(buildInput());

  expect(result.decision.decision).toBe(SecurityDecision.BLOCK);
  expect(resultActions(result)).toEqual(
    expect.arrayContaining([
      SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      SecurityActionType.CREATE_INCIDENT,
      SecurityActionType.NOTIFY_AUDIT,
    ]),
  );
});

test('execution failures are surfaced', async () => {
  const decision = buildDecision(SecurityDecision.BLOCK);
  const failureResult = buildExecutionResult({
    success: false,
    partialSuccess: true,
    failedActions: [SecurityActionType.CREATE_INCIDENT],
  });
  const coordinator = new InMemorySecurityRuntimeCoordinator(
    new RecordingEvaluationPipeline(decision),
    new RecordingActionPlanner(),
    new RecordingExecutionEngine(failureResult),
  );

  const result = await coordinator.coordinate(buildInput());

  expect(result.executionResult.success).toBe(false);
  expect(result.executionResult.partialSuccess).toBe(true);
  expect(result.executionResult.failedActions).toEqual(['CREATE_INCIDENT']);
});

test('correlationId is preserved', async () => {
  const decision = buildDecision(SecurityDecision.ALLOW, 'corr-keep');
  const coordinator = new InMemorySecurityRuntimeCoordinator(
    new RecordingEvaluationPipeline(decision),
    new RecordingActionPlanner(),
    new RecordingExecutionEngine(buildExecutionResult({ correlationId: 'corr-keep' })),
  );

  const result = await coordinator.coordinate(buildInput({ normalizedEvent: buildEvent('corr-keep') }));

  expect(result.correlationId).toBe('corr-keep');
  expect(result.executionResult.correlationId).toBe('corr-keep');
  expect(result.actionPlan.correlationId).toBe('corr-keep');
});

test('coordinator is side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const coordinator = new InMemorySecurityRuntimeCoordinator(
      new RecordingEvaluationPipeline(buildDecision(SecurityDecision.ALLOW)),
      new RecordingActionPlanner(),
      new RecordingExecutionEngine(buildExecutionResult()),
    );

    await coordinator.coordinate(buildInput());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
