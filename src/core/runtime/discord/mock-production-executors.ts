import {
  SecurityAction,
  SecurityActionType,
} from './security-action-planner';
import {
  ActionExecutionResult,
  ExecutionContext,
  ExecutionPriority,
  ExecutionState,
  ExecutorCapabilities,
} from './security-execution-types';
import { SecurityActionExecutor } from './security-action-executor';

abstract class MockProductionExecutorBase implements SecurityActionExecutor {
  readonly executorId: string;
  readonly capabilities: ExecutorCapabilities;

  constructor(
    executorId: string,
    private readonly supportedActionType: SecurityActionType,
    priority: ExecutionPriority,
  ) {
    this.executorId = executorId;
    this.capabilities = {
      supportedActions: [supportedActionType],
      priority,
      supportsRollback: false,
      idempotent: true,
    };
  }

  supports(action: SecurityAction): boolean {
    return action.type === this.supportedActionType;
  }

  async execute(_context: ExecutionContext, action: SecurityAction): Promise<ActionExecutionResult> {
    if (!this.supports(action)) {
      return {
        success: false,
        state: ExecutionState.FAILED,
        actionType: action.type,
        executorId: this.executorId,
        metadata: {
          rejected: true,
          reason: `Unsupported action type ${action.type}`,
          supportedActionType: this.supportedActionType,
        },
      };
    }

    return {
      success: true,
      state: ExecutionState.SUCCESS,
      actionType: action.type,
      executorId: this.executorId,
      metadata: {
        mock: true,
        sideEffectFree: true,
        simulated: true,
      },
    };
  }

  supportsRollback(_action: SecurityAction): boolean {
    return false;
  }

  async rollback(_context: ExecutionContext, _action: SecurityAction): Promise<void> {
    // Intentionally no-op for side-effect-free mock executors.
  }
}

export class RemoveUnauthorizedBotExecutor extends MockProductionExecutorBase {
  constructor() {
    super('remove-unauthorized-bot-executor', SecurityActionType.REMOVE_UNAUTHORIZED_BOT, ExecutionPriority.CRITICAL);
  }
}

export class FreezeWebhooksExecutor extends MockProductionExecutorBase {
  constructor() {
    super('freeze-webhooks-executor', SecurityActionType.FREEZE_WEBHOOKS, ExecutionPriority.HIGH);
  }
}

export class QuarantineActorExecutor extends MockProductionExecutorBase {
  constructor() {
    super('quarantine-actor-executor', SecurityActionType.QUARANTINE_ACTOR, ExecutionPriority.CRITICAL);
  }
}

export class CreateIncidentExecutor extends MockProductionExecutorBase {
  constructor() {
    super('create-incident-executor', SecurityActionType.CREATE_INCIDENT, ExecutionPriority.NORMAL);
  }
}

export class NotifyAuditExecutor extends MockProductionExecutorBase {
  constructor() {
    super('notify-audit-executor', SecurityActionType.NOTIFY_AUDIT, ExecutionPriority.NORMAL);
  }
}

export class LockChannelsExecutor extends MockProductionExecutorBase {
  constructor() {
    super('lock-channels-executor', SecurityActionType.LOCK_CHANNELS, ExecutionPriority.HIGH);
  }
}

export class RestoreResourceExecutor extends MockProductionExecutorBase {
  constructor() {
    super('restore-resource-executor', SecurityActionType.RESTORE_RESOURCE, ExecutionPriority.HIGH);
  }
}

export class EscalateExecutor extends MockProductionExecutorBase {
  constructor() {
    super('escalate-executor', SecurityActionType.ESCALATE, ExecutionPriority.CRITICAL);
  }
}
