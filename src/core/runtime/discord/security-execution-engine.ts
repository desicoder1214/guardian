import { IncidentContext } from './incident-correlation-types';
import { IncidentEscalationLevel } from './incident-severity-types';
import { SecurityActionPlan } from './security-action-planner';
import {
  ExecutionContext,
  ExecutionId,
  ExecutionResult,
  ExecutionScheduler,
  ExecutionState,
  SecurityExecutionEngine,
} from './security-execution-types';

interface SecurityExecutionEngineOptions {
  readonly now?: () => number;
}

export class InMemorySecurityExecutionEngine implements SecurityExecutionEngine {
  private readonly now: () => number;
  private readonly scheduler: ExecutionScheduler;
  private readonly completedExecutionIds = new Set<ExecutionId>();

  constructor(scheduler: ExecutionScheduler, options: SecurityExecutionEngineOptions = {}) {
    this.scheduler = scheduler;
    this.now = options.now ?? (() => Date.now());
  }

  async execute(plan: SecurityActionPlan, incident: IncidentContext): Promise<ExecutionResult> {
    const startedAtMs = this.now();
    const executionId = this.buildExecutionId(plan, incident);
    if (this.completedExecutionIds.has(executionId)) {
      const finishedAtMs = this.now();
      return {
        success: true,
        partialSuccess: false,
        failedActions: [],
        completedActions: [],
        executionId,
        correlationId: plan.correlationId,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs: Math.max(0, finishedAtMs - startedAtMs),
        state: ExecutionState.SKIPPED_DUPLICATE,
      };
    }

    const sortedActions = this.scheduler.schedule(plan.actions);
    const severity = this.resolveSeverity(plan, incident);
    const context = this.buildContext(plan, incident, severity, executionId);
    const actionResults = await this.scheduler.dispatch(context, sortedActions);

    this.completedExecutionIds.add(executionId);

    const finishedAtMs = this.now();

    const completedActions = actionResults
      .filter((result) => result.success)
      .map((result) => result.actionType);
    const failedActions = actionResults
      .filter((result) => !result.success)
      .map((result) => result.actionType);
    const success = failedActions.length === 0;
    const partialSuccess = completedActions.length > 0 && failedActions.length > 0;
    const state = success
      ? ExecutionState.SUCCESS
      : partialSuccess
        ? ExecutionState.PARTIAL_SUCCESS
        : ExecutionState.FAILED;

    return {
      success,
      partialSuccess,
      failedActions,
      completedActions,
      executionId,
      correlationId: plan.correlationId,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
      state,
    };
  }

  private resolveSeverity(plan: SecurityActionPlan, incident: IncidentContext): IncidentEscalationLevel {
    const metadata = incident.metadata ?? {};
    const escalationLevel = metadata.escalationLevel;

    if (typeof escalationLevel === 'string') {
      const normalized = escalationLevel.toUpperCase();
      if (normalized in IncidentEscalationLevel) {
        return IncidentEscalationLevel[normalized as keyof typeof IncidentEscalationLevel];
      }
    }

    if (plan.decision === 'BLOCK' || plan.decision === 'CONTAIN') {
      return IncidentEscalationLevel.HIGH;
    }

    if (plan.decision === 'INVESTIGATE') {
      return IncidentEscalationLevel.MEDIUM;
    }

    return IncidentEscalationLevel.LOW;
  }

  private buildContext(
    plan: SecurityActionPlan,
    incident: IncidentContext,
    severity: IncidentEscalationLevel,
    executionId: ExecutionId,
  ): ExecutionContext {
    return {
      correlationId: plan.correlationId,
      incidentId: incident.incidentId,
      guildId: incident.guildId,
      actorId: incident.actorId,
      correlationIds: incident.correlationIds,
      decision: plan.decision,
      actionPlan: plan,
      severity,
      timestamp: new Date(this.now()).toISOString(),
      executionId,
      metadata: incident.metadata ?? {},
      executionState: ExecutionState.RUNNING,
    };
  }

  private buildExecutionId(plan: SecurityActionPlan, incident: IncidentContext): ExecutionId {
    return `exec:${incident.incidentId}:${plan.correlationId}:${plan.decision}`;
  }
}
