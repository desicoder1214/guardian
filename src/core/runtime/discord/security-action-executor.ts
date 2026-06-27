import { SecurityAction, SecurityActionType } from './security-action-planner';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionState,
  ExecutorCapabilities,
  ExecutionPriority,
  RollbackCapable,
} from './security-execution-types';

export interface SecurityActionExecutor extends RollbackCapable {
  readonly executorId: string;
  readonly capabilities: ExecutorCapabilities;
  supports(action: SecurityAction): boolean;
  execute(context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult>;
}

export class InMemoryNoopExecutor implements SecurityActionExecutor {
  readonly executorId = 'noop-executor';

  readonly capabilities: ExecutorCapabilities = {
    supportedActions: [SecurityActionType.NONE],
    priority: ExecutionPriority.LOW,
    supportsRollback: false,
    idempotent: true,
  };

  supports(action: SecurityAction): boolean {
    return action.type === SecurityActionType.NONE;
  }

  async execute(_context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    return {
      success: true,
      state: ExecutionState.SUCCESS,
      actionType: action.type,
      executorId: this.executorId,
      metadata: { reason: 'NONE action is a safe no-op' },
    };
  }

  supportsRollback(_action: SecurityAction): boolean {
    return false;
  }

  async rollback(_context: ExecutionContext, _action: SecurityAction): Promise<void> {
    // No-op: NONE actions have nothing to roll back
  }
}

export class InMemoryUnsupportedExecutor implements SecurityActionExecutor {
  readonly executorId = 'unsupported-executor';

  readonly capabilities: ExecutorCapabilities = {
    supportedActions: [],
    priority: ExecutionPriority.LOW,
    supportsRollback: false,
    idempotent: true,
  };

  supports(_action: SecurityAction): boolean {
    return false;
  }

  async execute(_context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    return {
      success: false,
      state: ExecutionState.FAILED,
      actionType: action.type,
      executorId: this.executorId,
      metadata: { reason: `Action type ${action.type} is not supported by this executor` },
    };
  }

  supportsRollback(_action: SecurityAction): boolean {
    return false;
  }

  async rollback(_context: ExecutionContext, _action: SecurityAction): Promise<void> {
    // No-op: unsupported actions have nothing to roll back
  }
}
