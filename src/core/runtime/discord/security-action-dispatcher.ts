import { SecurityAction, SecurityActionPlan, SecurityActionType } from './security-action-planner';
import {
  DiscordExecutionResult,
  DiscordExecutionService,
  DiscordExecutionStatus,
} from './discord-execution-service';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
  SecurityActionExecutorRegistry,
} from './security-action-executor-registry';

export enum ActionExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

export interface ActionExecutionResult {
  readonly action: SecurityAction;
  readonly status: ActionExecutionStatus;
  readonly executionTimeMs: number;
  readonly metadata?: unknown;
  readonly correlationId: string;
}

export interface ActionExecutionReport {
  readonly correlationId: string;
  readonly results: readonly ActionExecutionResult[];
}

export interface SecurityActionDispatcher {
  dispatch(plan: SecurityActionPlan): Promise<ActionExecutionReport>;
}

export class InMemorySecurityActionDispatcher implements SecurityActionDispatcher {
  constructor(private readonly registry: SecurityActionExecutorRegistry = new InMemorySecurityActionExecutorRegistry()) {}

  register(executor: SecurityActionExecutor): void {
    this.registry.register(executor);
  }

  async dispatch(plan: SecurityActionPlan): Promise<ActionExecutionReport> {
    const orderedActions = [...plan.actions].sort((left, right) => left.sequence - right.sequence);
    const results: ActionExecutionResult[] = [];
    let fatalFailureDetected = false;

    for (const action of orderedActions) {
      if (fatalFailureDetected) {
        results.push({
          action,
          status: ActionExecutionStatus.SKIPPED,
          executionTimeMs: 0,
          correlationId: plan.correlationId,
          metadata: { reason: 'skipped after fatal failure' },
        });
        continue;
      }

      const executor = this.registry.resolve(action.type);
      if (!executor) {
        results.push({
          action,
          status: ActionExecutionStatus.NOT_SUPPORTED,
          executionTimeMs: 0,
          correlationId: plan.correlationId,
          metadata: { reason: 'no executor registered' },
        });
        continue;
      }

      const execution = await executor.execute(action, plan.correlationId);
      results.push(execution);

      const metadata = this.readMetadata(execution.metadata);
      if (execution.status === ActionExecutionStatus.FAILED && metadata?.fatal === true) {
        fatalFailureDetected = true;
      }
    }

    return {
      correlationId: plan.correlationId,
      results,
    };
  }

  private readMetadata(metadata: unknown): Record<string, unknown> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    return metadata as Record<string, unknown>;
  }
}

abstract class BaseInMemoryExecutor implements SecurityActionExecutor {
  constructor(readonly actionType: SecurityActionType, protected readonly executionService: DiscordExecutionService) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.actionType;
  }

  abstract execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult>;

  protected toActionExecutionResult(action: SecurityAction, result: DiscordExecutionResult): ActionExecutionResult {
    return {
      action,
      status: this.mapStatus(result.status),
      executionTimeMs: result.executionTimeMs,
      correlationId: result.correlationId,
      metadata: result.metadata,
    };
  }

  private mapStatus(status: DiscordExecutionStatus): ActionExecutionStatus {
    switch (status) {
      case DiscordExecutionStatus.SUCCESS:
        return ActionExecutionStatus.SUCCESS;
      case DiscordExecutionStatus.FAILED:
        return ActionExecutionStatus.FAILED;
      case DiscordExecutionStatus.SKIPPED:
        return ActionExecutionStatus.SKIPPED;
      case DiscordExecutionStatus.NOT_SUPPORTED:
        return ActionExecutionStatus.NOT_SUPPORTED;
    }
  }
}

export class CreateIncidentExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.CREATE_INCIDENT, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.guild.createIncident(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class NotifyAuditExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.NOTIFY_AUDIT, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.guild.notifyAudit(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class QuarantineActorExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.QUARANTINE_ACTOR, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.member.removeRoles(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class RemoveUnauthorizedBotExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.bot.removeUnauthorizedBot(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class FreezeWebhooksExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.FREEZE_WEBHOOKS, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.webhook.freezeWebhooks(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class LockChannelsExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.LOCK_CHANNELS, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.channel.lockChannel(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class RestoreResourceExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.RESTORE_RESOURCE, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.guild.restoreResource(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}

export class EscalateExecutor extends BaseInMemoryExecutor {
  constructor(executionService: DiscordExecutionService) {
    super(SecurityActionType.ESCALATE, executionService);
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    const result = await this.executionService.guild.escalate(correlationId);
    return this.toActionExecutionResult(action, result);
  }
}
