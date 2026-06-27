import {
  CreateIncidentExecutor,
  EscalateExecutor,
  FreezeWebhooksExecutor,
  LockChannelsExecutor,
  NotifyAuditExecutor,
  QuarantineActorExecutor,
  RemoveUnauthorizedBotExecutor,
  RestoreResourceExecutor,
} from '../../src/core/runtime/discord/mock-production-executors';
import { SecurityActionExecutor } from '../../src/core/runtime/discord/security-action-executor';
import { InMemorySecurityActionExecutorRegistry } from '../../src/core/runtime/discord/security-executor-registry';
import {
  ExecutionContext,
  ExecutionState,
} from '../../src/core/runtime/discord/security-execution-types';
import {
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import { IncidentEscalationLevel } from '../../src/core/runtime/discord/incident-severity-types';

function buildAction(type: SecurityActionType): SecurityAction {
  return {
    type,
    priority: SecurityActionPriority.NORMAL,
    sequence: 1,
  };
}

function buildContext(): ExecutionContext {
  return {
    correlationId: 'corr-1',
    incidentId: 'incident-1',
    guildId: 'guild-1',
    actorId: 'actor-1',
    correlationIds: ['corr-1'],
    decision: SecurityDecision.BLOCK,
    actionPlan: {
      decision: SecurityDecision.BLOCK,
      actions: [],
      correlationId: 'corr-1',
    },
    severity: IncidentEscalationLevel.HIGH,
    timestamp: '2026-01-01T00:00:00.000Z',
    executionId: 'exec-1',
    metadata: Object.freeze({ source: 'test' }),
    executionState: ExecutionState.RUNNING,
  };
}

const EXECUTOR_MATRIX: ReadonlyArray<{
  readonly create: () => SecurityActionExecutor;
  readonly supportedAction: SecurityActionType;
}> = [
  { create: () => new RemoveUnauthorizedBotExecutor(), supportedAction: SecurityActionType.REMOVE_UNAUTHORIZED_BOT },
  { create: () => new FreezeWebhooksExecutor(), supportedAction: SecurityActionType.FREEZE_WEBHOOKS },
  { create: () => new QuarantineActorExecutor(), supportedAction: SecurityActionType.QUARANTINE_ACTOR },
  { create: () => new CreateIncidentExecutor(), supportedAction: SecurityActionType.CREATE_INCIDENT },
  { create: () => new NotifyAuditExecutor(), supportedAction: SecurityActionType.NOTIFY_AUDIT },
  { create: () => new LockChannelsExecutor(), supportedAction: SecurityActionType.LOCK_CHANNELS },
  { create: () => new RestoreResourceExecutor(), supportedAction: SecurityActionType.RESTORE_RESOURCE },
  { create: () => new EscalateExecutor(), supportedAction: SecurityActionType.ESCALATE },
];

test('each executor supports only its action type', () => {
  for (const item of EXECUTOR_MATRIX) {
    const executor = item.create();

    for (const actionType of Object.values(SecurityActionType)) {
      const isSupported = executor.supports(buildAction(actionType));
      expect(isSupported).toBe(actionType === item.supportedAction);
    }
  }
});

test('each executor returns SUCCESS for supported action', async () => {
  for (const item of EXECUTOR_MATRIX) {
    const executor = item.create();
    const result = await executor.execute(buildContext(), buildAction(item.supportedAction));

    expect(result.success).toBe(true);
    expect(result.state).toBe(ExecutionState.SUCCESS);
    expect(result.actionType).toBe(item.supportedAction);
    expect(result.executorId).toBe(executor.executorId);
    expect(result.metadata).toEqual({
      mock: true,
      sideEffectFree: true,
      simulated: true,
    });
  }
});

test('unsupported action is rejected safely', async () => {
  const unsupportedAction = SecurityActionType.NONE;

  for (const item of EXECUTOR_MATRIX) {
    const executor = item.create();
    const result = await executor.execute(buildContext(), buildAction(unsupportedAction));

    expect(result.success).toBe(false);
    expect(result.state).toBe(ExecutionState.FAILED);
    expect(result.actionType).toBe(unsupportedAction);
    expect(result.executorId).toBe(executor.executorId);
    expect(result.metadata).toEqual({
      rejected: true,
      reason: `Unsupported action type ${unsupportedAction}`,
      supportedActionType: item.supportedAction,
    });
  }
});

test('registry can register and resolve all mock production executors', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();

  for (const item of EXECUTOR_MATRIX) {
    registry.register(item.supportedAction, item.create());
  }

  expect(registry.list()).toHaveLength(EXECUTOR_MATRIX.length);

  for (const item of EXECUTOR_MATRIX) {
    expect(registry.resolve(item.supportedAction)).toBeDefined();
    expect(registry.resolveAll(item.supportedAction)).toHaveLength(1);
  }
});

test('mock production executors are side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    for (const item of EXECUTOR_MATRIX) {
      const executor = item.create();
      await executor.execute(buildContext(), buildAction(item.supportedAction));
    }

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
