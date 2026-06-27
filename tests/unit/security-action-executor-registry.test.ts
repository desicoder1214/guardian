import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import { ActionExecutionResult, ActionExecutionStatus } from '../../src/core/runtime/discord/security-action-dispatcher';
import { SecurityAction } from '../../src/core/runtime/discord/security-action-planner';

class StubExecutor implements SecurityActionExecutor {
  constructor(readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return {
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: { supportedActionType: this.supportedActionType },
    };
  }
}

test('registry resolves registered executors', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  const createIncident = new StubExecutor(SecurityActionType.CREATE_INCIDENT);
  const notifyAudit = new StubExecutor(SecurityActionType.NOTIFY_AUDIT);

  registry.register(createIncident);
  registry.register(notifyAudit);

  expect(registry.resolve(SecurityActionType.CREATE_INCIDENT)).toBe(createIncident);
  expect(registry.resolve(SecurityActionType.NOTIFY_AUDIT)).toBe(notifyAudit);
});

test('registry list preserves registration order', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  const first = new StubExecutor(SecurityActionType.CREATE_INCIDENT);
  const second = new StubExecutor(SecurityActionType.NOTIFY_AUDIT);

  registry.register(first);
  registry.register(second);

  expect(registry.list()).toEqual([first, second]);
});

test('registry returns undefined for unsupported actions', () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new StubExecutor(SecurityActionType.CREATE_INCIDENT));

  expect(registry.resolve(SecurityActionType.FREEZE_WEBHOOKS)).toBeUndefined();
});
