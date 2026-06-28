import type { ActionExecutionResult } from './security-action-dispatcher';
import { SecurityAction, SecurityActionType } from './security-action-planner';
import {
  SecurityDomainExecutorContract,
} from './security-action-executor';
import { SecurityExecutorCapability, SecurityExecutorDomain } from './security-execution-types';

export interface SecurityActionExecutor {
  supports(actionType: SecurityActionType): boolean;
  execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult>;
}

export interface SecurityActionExecutorRegistry {
  register(executor: SecurityActionExecutor): void;
  resolve(actionType: SecurityActionType): SecurityActionExecutor | undefined;
  list(): readonly SecurityActionExecutor[];
}

export interface SecurityDomainExecutorRegistry {
  register(executor: SecurityDomainExecutorContract): void;
  resolve(
    domain: SecurityExecutorDomain,
    capability: SecurityExecutorCapability,
  ): SecurityDomainExecutorContract | undefined;
  list(domain?: SecurityExecutorDomain): readonly SecurityDomainExecutorContract[];
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

export class InMemorySecurityDomainExecutorRegistry implements SecurityDomainExecutorRegistry {
  private readonly executors: SecurityDomainExecutorContract[] = [];

  register(executor: SecurityDomainExecutorContract): void {
    this.executors.push(executor);
  }

  resolve(
    domain: SecurityExecutorDomain,
    capability: SecurityExecutorCapability,
  ): SecurityDomainExecutorContract | undefined {
    return this.executors.find(
      (executor) => executor.domain === domain && executor.supports(capability),
    );
  }

  list(domain?: SecurityExecutorDomain): readonly SecurityDomainExecutorContract[] {
    if (!domain) {
      return [...this.executors];
    }

    return this.executors.filter((executor) => executor.domain === domain);
  }
}
