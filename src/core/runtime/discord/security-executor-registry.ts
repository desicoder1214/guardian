import { SecurityActionType } from './security-action-planner';
import { ExecutorRegistry } from './security-execution-types';
import { SecurityActionExecutor } from './security-action-executor';

export class InMemorySecurityActionExecutorRegistry implements ExecutorRegistry {
  private readonly executors = new Map<SecurityActionType, SecurityActionExecutor[]>();

  register(actionType: SecurityActionType, executor: SecurityActionExecutor): void {
    const existing = this.executors.get(actionType) ?? [];
    this.executors.set(actionType, [...existing, executor]);
  }

  unregister(actionType: SecurityActionType): void {
    this.executors.delete(actionType);
  }

  resolve(actionType: SecurityActionType): SecurityActionExecutor | undefined {
    return this.executors.get(actionType)?.[0];
  }

  resolveAll(actionType: SecurityActionType): readonly SecurityActionExecutor[] {
    return this.executors.get(actionType) ?? [];
  }

  list(): readonly SecurityActionExecutor[] {
    const all: SecurityActionExecutor[] = [];
    for (const executorList of this.executors.values()) {
      all.push(...executorList);
    }
    return all;
  }
}

/** @deprecated Use InMemorySecurityActionExecutorRegistry. */
export class InMemoryExecutorRegistry extends InMemorySecurityActionExecutorRegistry {}
