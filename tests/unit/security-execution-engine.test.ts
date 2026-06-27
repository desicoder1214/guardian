import { DetectionResult } from '../../src/core/runtime/discord/generic-detector-types';
import { IncidentContext, IncidentSeverity } from '../../src/core/runtime/discord/incident-correlation-types';
import { InMemorySecurityExecutionEngine } from '../../src/core/runtime/discord/security-execution-engine';
import { InMemoryExecutionScheduler } from '../../src/core/runtime/discord/security-execution-scheduler';
import { InMemorySecurityActionExecutorRegistry } from '../../src/core/runtime/discord/security-executor-registry';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionScheduler,
  ExecutionState,
  RollbackCapable,
  resolveExecutionPriority,
} from '../../src/core/runtime/discord/security-execution-types';
import {
  InMemoryNoopExecutor,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor';
import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

function detection(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    detectorId: 'detector-a',
    detectorName: 'DetectorA',
    eventType: 'GUILD_MEMBER_UPDATE',
    detected: true,
    confidence: 0.8,
    metadata: {
      guildId: 'guild-1',
      actorId: 'actor-1',
    },
    correlationId: 'corr-det-1',
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentContext> = {}): IncidentContext {
  return {
    incidentId: 'incident-000001',
    guildId: 'guild-1',
    actorId: 'actor-1',
    correlationIds: ['corr-1', 'corr-2'],
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-01-01T00:00:02.000Z',
    severity: IncidentSeverity.MEDIUM,
    detections: [detection()],
    metadata: {
      escalationLevel: 'MEDIUM',
      source: 'test',
    },
    ...overrides,
  };
}

function action(
  type: SecurityActionType,
  priority: SecurityActionPriority,
  sequence: number,
  metadata?: unknown,
): SecurityAction {
  return {
    type,
    priority,
    sequence,
    metadata,
  };
}

function plan(actions: readonly SecurityAction[], correlationId = 'corr-plan-1'): SecurityActionPlan {
  return {
    decision: SecurityDecision.INVESTIGATE,
    actions,
    correlationId,
  };
}

class RecordingExecutor implements SecurityActionExecutor {
  readonly executorId: string;
  readonly capabilities = {
    supportedActions: [] as readonly SecurityActionType[],
    priority: 3,
    supportsRollback: false,
    idempotent: true,
  };
  readonly invocations: Array<{ context: ExecutionContext; action: SecurityAction }> = [];

  constructor(executorId = 'recording-executor') {
    this.executorId = executorId;
  }

  supports(): boolean {
    return true;
  }

  async execute(context: ExecutionContext, candidate: SecurityAction): Promise<ActionExecutionResult> {
    this.invocations.push({ context, action: candidate });
    return {
      success: true,
      state: ExecutionState.SUCCESS,
      actionType: candidate.type,
      executorId: this.executorId,
    };
  }

  supportsRollback(): boolean {
    return false;
  }

  async rollback(): Promise<void> {
    throw new Error('rollback should not be called');
  }
}

class FailingExecutor extends RecordingExecutor {
  override async execute(context: ExecutionContext, candidate: SecurityAction): Promise<ActionExecutionResult> {
    this.invocations.push({ context, action: candidate });
    return {
      success: false,
      state: ExecutionState.FAILED,
      actionType: candidate.type,
      executorId: this.executorId,
    };
  }
}

function createEngine(
  registrations: ReadonlyArray<[SecurityActionType, SecurityActionExecutor]>,
  now: () => number = () => Date.parse('2026-01-01T10:00:00.000Z'),
): { engine: InMemorySecurityExecutionEngine; registry: InMemorySecurityActionExecutorRegistry } {
  const registry = new InMemorySecurityActionExecutorRegistry();
  for (const [actionType, executor] of registrations) {
    registry.register(actionType, executor);
  }

  const scheduler = new InMemoryExecutionScheduler(registry);
  return {
    engine: new InMemorySecurityExecutionEngine(scheduler, { now }),
    registry,
  };
}

class RecordingScheduler implements ExecutionScheduler {
  readonly scheduleInputs: Array<readonly SecurityAction[]> = [];

  constructor(private readonly inner: ExecutionScheduler) {}

  schedule(actions: readonly SecurityAction[]): readonly SecurityAction[] {
    this.scheduleInputs.push([...actions]);
    return this.inner.schedule(actions);
  }

  async dispatch(context: ExecutionContext, orderedActions: readonly SecurityAction[]): Promise<readonly ActionExecutionResult[]> {
    return this.inner.dispatch(context, orderedActions);
  }
}

test('execution order is deterministic by priority then sequence then type', async () => {
  const actions: SecurityAction[] = [
    action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 4),
    action(SecurityActionType.LOCK_CHANNELS, SecurityActionPriority.HIGH, 3),
    action(SecurityActionType.CREATE_INCIDENT, SecurityActionPriority.NORMAL, 2),
    action(SecurityActionType.ESCALATE, SecurityActionPriority.CRITICAL, 5),
    action(SecurityActionType.INVESTIGATE, SecurityActionPriority.HIGH, 1),
  ];

  const expectedOrder = [...actions].sort((left, right) => {
    const byPriority = resolveExecutionPriority(left.priority) - resolveExecutionPriority(right.priority);
    if (byPriority !== 0) {
      return byPriority;
    }

    const bySequence = left.sequence - right.sequence;
    if (bySequence !== 0) {
      return bySequence;
    }

    return left.type.localeCompare(right.type);
  });

  const executor = new RecordingExecutor();
  const { engine } = createEngine(actions.map((entry) => [entry.type, executor]));

  const result = await engine.execute(plan(actions), incident());

  expect(result.success).toBe(true);
  expect(result.partialSuccess).toBe(false);
  expect(result.failedActions).toEqual([]);
  expect(result.completedActions).toEqual(expectedOrder.map((entry) => entry.type));
  expect(result.state).toBe(ExecutionState.SUCCESS);
  expect(executor.invocations.map((entry) => entry.action.type)).toEqual(expectedOrder.map((entry) => entry.type));
});

test('unknown executor fails safely and reports completed/failed actions', async () => {
  const supported = new RecordingExecutor();
  const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, supported]]);

  const result = await engine.execute(
    plan([
      action(SecurityActionType.CREATE_INCIDENT, SecurityActionPriority.NORMAL, 1),
      action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 2),
    ]),
    incident(),
  );

  expect(result.success).toBe(false);
  expect(result.partialSuccess).toBe(true);
  expect(result.completedActions).toEqual([SecurityActionType.NOTIFY_AUDIT]);
  expect(result.failedActions).toEqual([SecurityActionType.CREATE_INCIDENT]);
  expect(result.state).toBe(ExecutionState.PARTIAL_SUCCESS);
});

test('all-failed execution has FAILED state', async () => {
  const failing = new FailingExecutor();
  const { engine } = createEngine([[SecurityActionType.CREATE_INCIDENT, failing]]);

  const result = await engine.execute(
    plan([action(SecurityActionType.CREATE_INCIDENT, SecurityActionPriority.NORMAL, 1)]),
    incident(),
  );

  expect(result.success).toBe(false);
  expect(result.partialSuccess).toBe(false);
  expect(result.failedActions).toEqual([SecurityActionType.CREATE_INCIDENT]);
  expect(result.state).toBe(ExecutionState.FAILED);
});

test('registry lookup is deterministic for action type', () => {
  const executor = new RecordingExecutor();
  const { registry } = createEngine([[SecurityActionType.NOTIFY_AUDIT, executor]]);

  const first = registry.resolve(SecurityActionType.NOTIFY_AUDIT);
  const second = registry.resolve(SecurityActionType.NOTIFY_AUDIT);

  expect(first).toBe(executor);
  expect(second).toBe(first);
});

test('duplicate executionId is idempotent and ignored safely', async () => {
  const recorder = new RecordingExecutor();
  const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, recorder]]);

  const actionPlan = plan([action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 1)]);

  const first = await engine.execute(actionPlan, incident());
  const second = await engine.execute(actionPlan, incident());

  expect(first.executionId).toBe(second.executionId);
  expect(recorder.invocations).toHaveLength(1);
  expect(second.completedActions).toEqual([]);
  expect(second.failedActions).toEqual([]);
  expect(second.state).toBe(ExecutionState.SKIPPED_DUPLICATE);
});

test('empty plan is handled safely', async () => {
  const recorder = new RecordingExecutor();
  const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, recorder]]);

  const result = await engine.execute(plan([]), incident());

  expect(result.success).toBe(true);
  expect(result.partialSuccess).toBe(false);
  expect(result.completedActions).toEqual([]);
  expect(result.failedActions).toEqual([]);
  expect(recorder.invocations).toHaveLength(0);
});

test('NONE action plan is handled safely through NoopExecutor', async () => {
  const noop = new InMemoryNoopExecutor();
  const { engine } = createEngine([[SecurityActionType.NONE, noop]]);

  const result = await engine.execute(
    plan([action(SecurityActionType.NONE, SecurityActionPriority.LOW, 1)]),
    incident(),
  );

  expect(result.success).toBe(true);
  expect(result.partialSuccess).toBe(false);
  expect(result.completedActions).toEqual([SecurityActionType.NONE]);
  expect(result.failedActions).toEqual([]);
  expect(result.state).toBe(ExecutionState.SUCCESS);
});

test('execution engine is side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const recorder = new RecordingExecutor();
    const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, recorder]]);

    await engine.execute(plan([action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 1)]), incident());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});

test('scheduler owns action ordering and engine does not sort directly', async () => {
  const unsortedActions: SecurityAction[] = [
    action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 4),
    action(SecurityActionType.ESCALATE, SecurityActionPriority.CRITICAL, 5),
    action(SecurityActionType.CREATE_INCIDENT, SecurityActionPriority.NORMAL, 2),
  ];

  const registry = new InMemorySecurityActionExecutorRegistry();
  const recorder = new RecordingExecutor();
  for (const act of unsortedActions) {
    registry.register(act.type, recorder);
  }

  const innerScheduler = new InMemoryExecutionScheduler(registry);
  const recordingScheduler = new RecordingScheduler(innerScheduler);
  const engine = new InMemorySecurityExecutionEngine(recordingScheduler, {
    now: () => Date.parse('2026-01-01T10:00:00.000Z'),
  });

  await engine.execute(plan(unsortedActions), incident());

  expect(recordingScheduler.scheduleInputs).toHaveLength(1);
  expect(recordingScheduler.scheduleInputs[0].map((entry) => entry.type)).toEqual(
    unsortedActions.map((entry) => entry.type),
  );
});

test('execution metrics are populated', async () => {
  let nowMs = Date.parse('2026-01-01T10:00:00.000Z');
  const now = (): number => {
    const current = nowMs;
    nowMs += 25;
    return current;
  };

  const recorder = new RecordingExecutor();
  const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, recorder]], now);

  const result = await engine.execute(
    plan([action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 1)]),
    incident(),
  );

  expect(result.startedAt).toBe('2026-01-01T10:00:00.000Z');
  expect(result.finishedAt).toBe('2026-01-01T10:00:00.050Z');
  expect(result.durationMs).toBe(50);
});

test('rollback contract exists but is not invoked during normal execution', async () => {
  const rollbackMock = jest.fn();

  class RollbackExecutor extends RecordingExecutor implements RollbackCapable {
    override supportsRollback(): boolean {
      return true;
    }

    override async rollback(): Promise<void> {
      rollbackMock();
    }
  }

  const executor = new RollbackExecutor();
  const { engine } = createEngine([[SecurityActionType.NOTIFY_AUDIT, executor]]);

  const result = await engine.execute(
    plan([action(SecurityActionType.NOTIFY_AUDIT, SecurityActionPriority.NORMAL, 1)]),
    incident(),
  );

  expect(result.state).toBe(ExecutionState.SUCCESS);
  expect(rollbackMock).not.toHaveBeenCalled();
});