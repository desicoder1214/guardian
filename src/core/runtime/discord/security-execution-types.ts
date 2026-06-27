import type { SecurityActionExecutor } from './security-action-executor';
import { IncidentContext } from './incident-correlation-types';
import { IncidentEscalationLevel } from './incident-severity-types';
import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPriority,
  SecurityActionType,
} from './security-action-planner';
import { SecurityDecision } from './security-policy-types';

export type ExecutionId = string;

export enum ExecutionPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

export enum ExecutionState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
  DENIED = 'DENIED',
  SKIPPED = 'SKIPPED',
  DRY_RUN = 'DRY_RUN',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
}

export interface ExecutionContext {
  readonly correlationId: string;
  readonly incidentId: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly correlationIds: readonly string[];
  readonly decision: SecurityDecision;
  readonly actionPlan: SecurityActionPlan;
  readonly severity: IncidentEscalationLevel;
  readonly timestamp: string;
  readonly executionId: ExecutionId;
  readonly metadata: Record<string, unknown>;
  readonly executionState: ExecutionState;
}

export interface ExecutionResult {
  readonly success: boolean;
  readonly partialSuccess: boolean;
  readonly failedActions: readonly SecurityActionType[];
  readonly completedActions: readonly SecurityActionType[];
  readonly executionId: ExecutionId;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly state: ExecutionState;
}

export interface RollbackCapable {
  supportsRollback(action: SecurityAction): boolean;
  rollback(context: ExecutionContext, action: SecurityAction): Promise<void>;
}

export interface ExecutorCapabilities {
  readonly supportedActions: readonly SecurityActionType[];
  readonly priority: ExecutionPriority;
  readonly supportsRollback: boolean;
  readonly idempotent: boolean;
}

export interface ActionExecutionResult {
  readonly success: boolean;
  readonly state: ExecutionState;
  readonly actionType: SecurityActionType;
  readonly executorId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ExecutionScheduler {
  schedule(actions: readonly SecurityAction[]): readonly SecurityAction[];
  dispatch(context: ExecutionContext, orderedActions: readonly SecurityAction[]): Promise<readonly ActionExecutionResult[]>;
}

export interface ExecutorRegistry {
  register(actionType: SecurityActionType, executor: SecurityActionExecutor): void;
  unregister(actionType: SecurityActionType): void;
  resolve(actionType: SecurityActionType): SecurityActionExecutor | undefined;
  resolveAll(actionType: SecurityActionType): readonly SecurityActionExecutor[];
  list(): readonly SecurityActionExecutor[];
}

export interface SecurityExecutionEngine {
  execute(plan: SecurityActionPlan, incident: IncidentContext): Promise<ExecutionResult>;
}

export function resolveExecutionPriority(priority: SecurityActionPriority): ExecutionPriority {
  switch (priority) {
    case SecurityActionPriority.CRITICAL:
      return ExecutionPriority.CRITICAL;
    case SecurityActionPriority.HIGH:
      return ExecutionPriority.HIGH;
    case SecurityActionPriority.NORMAL:
      return ExecutionPriority.NORMAL;
    case SecurityActionPriority.LOW:
      return ExecutionPriority.LOW;
    default:
      return ExecutionPriority.LOW;
  }
}
