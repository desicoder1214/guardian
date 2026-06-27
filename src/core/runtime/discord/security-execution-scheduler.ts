import { SecurityAction, SecurityActionType } from './security-action-planner';
import { InMemoryUnsupportedExecutor } from './security-action-executor';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionScheduler,
  ExecutionState,
  ExecutorRegistry,
  resolveExecutionPriority,
} from './security-execution-types';

export class InMemoryExecutionScheduler implements ExecutionScheduler {
  private readonly unsupportedExecutor = new InMemoryUnsupportedExecutor();

  constructor(private readonly registry: ExecutorRegistry) {}

  schedule(actions: readonly SecurityAction[]): readonly SecurityAction[] {
    return [...actions].sort((left, right) => {
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
  }

  async dispatch(
    context: ExecutionContext,
    orderedActions: readonly SecurityAction[],
  ): Promise<readonly ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of orderedActions) {
      const executor = this.registry.resolve(action.type) ?? this.unsupportedExecutor;

      try {
        const result = await executor.execute(context, action);
        results.push(result);
      } catch {
        results.push({
          success: false,
          state: ExecutionState.FAILED,
          actionType: action.type,
          executorId: 'scheduler-dispatch-failure',
          metadata: { reason: 'executor threw during dispatch' },
        });
      }
    }

    return results;
  }
}
