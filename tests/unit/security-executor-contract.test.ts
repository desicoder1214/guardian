import { InMemorySecurityActionExecutorRegistry } from '../../src/core/runtime/discord/security-executor-registry';
import {
  InMemoryNoopExecutor,
  InMemoryUnsupportedExecutor,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor';
import {
  ExecutionContext,
  ExecutionPriority,
  ExecutionState,
  ExecutorCapabilities,
} from '../../src/core/runtime/discord/security-execution-types';
import {
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import { IncidentEscalationLevel } from '../../src/core/runtime/discord/incident-severity-types';

function action(type: SecurityActionType): SecurityAction {
  return { type, priority: SecurityActionPriority.NORMAL, sequence: 1 };
}

function context(): ExecutionContext {
  return {
    correlationId: 'corr-1',
    incidentId: 'incident-001',
    guildId: 'guild-1',
    actorId: 'actor-1',
    correlationIds: ['corr-1'],
    decision: SecurityDecision.INVESTIGATE,
    actionPlan: { decision: SecurityDecision.INVESTIGATE, actions: [], correlationId: 'corr-1' },
    severity: IncidentEscalationLevel.MEDIUM,
    timestamp: '2026-01-01T00:00:00.000Z',
    executionId: 'exec-001',
    metadata: { source: 'test' },
    executionState: ExecutionState.RUNNING,
  };
}

test('NoopExecutor supports NONE action only', () => {
  const executor = new InMemoryNoopExecutor();
  expect(executor.supports(action(SecurityActionType.NONE))).toBe(true);
  expect(executor.supports(action(SecurityActionType.NOTIFY_AUDIT))).toBe(false);
  expect(executor.supports(action(SecurityActionType.CREATE_INCIDENT))).toBe(false);
});

test('NoopExecutor returns SUCCESS for NONE action', async () => {
  const executor = new InMemoryNoopExecutor();
  const result = await executor.execute(context(), action(SecurityActionType.NONE));
  expect(result.success).toBe(true);
  expect(result.state).toBe(ExecutionState.SUCCESS);
  expect(result.actionType).toBe(SecurityActionType.NONE);
  expect(result.executorId).toBe('noop-executor');
});

test('NoopExecutor is idempotent', async () => {
  const executor = new InMemoryNoopExecutor();
  const first = await executor.execute(context(), action(SecurityActionType.NONE));
  const second = await executor.execute(context(), action(SecurityActionType.NONE));
  expect(first).toEqual(second);
});

test('NoopExecutor exposes expected capabilities', () => {
  const executor = new InMemoryNoopExecutor();
  const caps: ExecutorCapabilities = executor.capabilities;
  expect(caps.supportedActions).toEqual([SecurityActionType.NONE]);
  expect(caps.priority).toBe(ExecutionPriority.LOW);
  expect(caps.supportsRollback).toBe(false);
  expect(caps.idempotent).toBe(true);
});

test('UnsupportedExecutor returns deterministic FAILED result', async () => {
  const executor = new InMemoryUnsupportedExecutor();
  const result = await executor.execute(context(), action(SecurityActionType.ESCALATE));
  expect(result.success).toBe(false);
  expect(result.state).toBe(ExecutionState.FAILED);
  expect(result.actionType).toBe(SecurityActionType.ESCALATE);
  expect(result.executorId).toBe('unsupported-executor');
});

test('registry lookup returns registered executor', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  const executor = new InMemoryNoopExecutor();
  registry.register(SecurityActionType.NONE, executor);
  expect(registry.resolve(SecurityActionType.NONE)).toBe(executor);
});

test('registry supports multiple executors and deterministic primary lookup', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  const first = new InMemoryNoopExecutor();
  const second = new InMemoryNoopExecutor();
  registry.register(SecurityActionType.NONE, first);
  registry.register(SecurityActionType.NONE, second);
  expect(registry.resolveAll(SecurityActionType.NONE)).toHaveLength(2);
  expect(registry.resolve(SecurityActionType.NONE)).toBe(first);
});

test('registry capability discovery works through list()', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  const noop = new InMemoryNoopExecutor();
  const unsupported = new InMemoryUnsupportedExecutor();
  registry.register(SecurityActionType.NONE, noop);
  registry.register(SecurityActionType.ESCALATE, unsupported);

  const all = registry.list();
  expect(all).toHaveLength(2);
  expect((all[0] as SecurityActionExecutor).capabilities).toBeDefined();
  expect((all[1] as SecurityActionExecutor).capabilities).toBeDefined();
});

test('rollback contract exists on unified executors', async () => {
  const noop = new InMemoryNoopExecutor();
  const unsupported = new InMemoryUnsupportedExecutor();
  expect(noop.supportsRollback(action(SecurityActionType.NONE))).toBe(false);
  expect(unsupported.supportsRollback(action(SecurityActionType.ESCALATE))).toBe(false);
  await expect(noop.rollback(context(), action(SecurityActionType.NONE))).resolves.toBeUndefined();
  await expect(unsupported.rollback(context(), action(SecurityActionType.ESCALATE))).resolves.toBeUndefined();
});

test('executor implementations remain side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    await new InMemoryNoopExecutor().execute(context(), action(SecurityActionType.NONE));
    await new InMemoryUnsupportedExecutor().execute(context(), action(SecurityActionType.ESCALATE));
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});