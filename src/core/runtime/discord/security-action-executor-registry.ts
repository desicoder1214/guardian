import type { ActionExecutionResult } from './security-action-dispatcher';
import { SecurityAction, SecurityActionType } from './security-action-planner';

export interface SecurityActionExecutor {
  supports(actionType: SecurityActionType): boolean;
  execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult>;
}

export interface SecurityActionExecutorRegistry {
  register(executor: SecurityActionExecutor): void;
  resolve(actionType: SecurityActionType): SecurityActionExecutor | undefined;
  list(): readonly SecurityActionExecutor[];
}

export class InMemorySecurityActionExecutorRegistry implements SecurityActionExecutorRegistry {
  private readonly executors: SecurityActionExecutor[] = [];

  register(executor: SecurityActionExecutor): void {
    this.executors.push(executor);
  }

  resolve(actionType: SecurityActionType): SecurityActionExecutor | undefined {
    return this.executors.find((executor) => executor.supports(actionType));
  }

  list(): readonly SecurityActionExecutor[] {
    return [...this.executors];
  }
}
