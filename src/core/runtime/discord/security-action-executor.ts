import { SecurityAction, SecurityActionType } from './security-action-planner';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionState,
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
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

export interface SecurityDomainExecutorContract {
  readonly executorId: string;
  readonly domain: SecurityExecutorDomain;
  readonly supportedCapabilities: readonly SecurityExecutorCapability[];
  supports(capability: SecurityExecutorCapability): boolean;
  prepare(request: SecurityDomainExecutionRequest): SecurityDomainExecutionResult;
}

export interface SecurityBotExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.BOT;
}

export interface SecurityRoleExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.ROLE;
}

export interface SecurityMemberExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.MEMBER;
}

export interface SecurityChannelExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.CHANNEL;
}

export interface SecurityWebhookExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.WEBHOOK;
}

export interface SecurityGuildExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.GUILD;
}

export interface SecurityIntegrationExecutor extends SecurityDomainExecutorContract {
  readonly domain: SecurityExecutorDomain.INTEGRATION;
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
