import type { SecurityActionExecutor } from './security-action-executor';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from './detection-engine';
import { IncidentContext } from './incident-correlation-types';
import { IncidentEscalationLevel } from './incident-severity-types';
import { ThreatAssessment } from './runtime-threat-interpretation-engine';
import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPriority,
  SecurityActionType,
} from './security-action-planner';
import { SecurityDecision } from './security-policy-types';
import { SecurityDecisionModel, SecurityDecisionReason } from './security-decision-types';

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

export interface ExecutionAuthorizationRequirement {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly requiresAuthorization: boolean;
  readonly decision: SecurityDecision;
  readonly correlationId: string;
}

export interface SecurityExecutionMetadata {
  readonly source: 'in-memory-security-execution-planner';
  readonly planId: string;
  readonly plannedActionCount: number;
  readonly plannedActionTypes: readonly SecurityActionType[];
}

export interface SecurityExecutionAuditMetadata {
  readonly planId: string;
  readonly correlationId: string;
  readonly decision: SecurityDecision;
  readonly decisionReason: SecurityDecisionReason;
  readonly threatDisposition: DetectionDisposition;
  readonly threatSeverity: DetectionSeverity;
  readonly threatConfidence: DetectionConfidence;
}

export interface SecurityRollbackMetadata {
  readonly supported: boolean;
  readonly strategy: 'none';
  readonly reason: string;
}

export interface SecurityExecutionPlan {
  readonly planId: string;
  readonly correlationId: string;
  readonly threatAssessment?: ThreatAssessment;
  readonly securityDecision: SecurityDecisionModel;
  readonly plannedActions: readonly SecurityAction[];
  readonly authorizationRequirements: readonly ExecutionAuthorizationRequirement[];
  readonly executionMetadata: SecurityExecutionMetadata;
  readonly auditMetadata: SecurityExecutionAuditMetadata;
  readonly rollbackMetadata: SecurityRollbackMetadata;
}

export interface SecurityExecutionPlanner {
  plan(actionPlan: SecurityActionPlan, decisionModel: SecurityDecisionModel): SecurityExecutionPlan;
}

export enum SecurityResourceType {
  BOT = 'BOT',
  MEMBER = 'MEMBER',
  ROLE = 'ROLE',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  CHANNEL = 'CHANNEL',
  WEBHOOK = 'WEBHOOK',
  GUILD_CONFIGURATION = 'GUILD_CONFIGURATION',
  INVITE = 'INVITE',
}

export enum SecurityContainmentStrategy {
  REMOVE = 'REMOVE',
  REVOKE = 'REVOKE',
  FREEZE = 'FREEZE',
  LOCK = 'LOCK',
  RESTORE = 'RESTORE',
  NEUTRALIZE = 'NEUTRALIZE',
  OBSERVE = 'OBSERVE',
}

export interface SecurityContainmentTarget {
  readonly resourceType: SecurityResourceType;
  readonly resourceId: string;
  readonly correlationId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityContainmentAction {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly strategy: SecurityContainmentStrategy;
  readonly target: SecurityContainmentTarget;
}

export interface SecurityContainmentPlan {
  readonly planId: string;
  readonly correlationId: string;
  readonly threatAssessment?: ThreatAssessment;
  readonly actions: readonly SecurityContainmentAction[];
  readonly metadata: {
    readonly source: 'in-memory-security-hot-path-planner';
    readonly targetCount: number;
    readonly strategyCount: number;
  };
}

export enum SecurityHotPathPriority {
  CRITICAL_CONTAINMENT = 1,
  HIGH_CONTAINMENT = 2,
  NORMAL_CONTAINMENT = 3,
  DEFERRED_AUDIT = 4,
}

export enum SecurityHotPathExecutionLane {
  IMMEDIATE = 'IMMEDIATE',
  BACKGROUND = 'BACKGROUND',
}

export interface SecurityHotPathAction {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly priority: SecurityHotPathPriority;
  readonly lane: SecurityHotPathExecutionLane;
  readonly action: SecurityAction;
  readonly containmentTarget?: SecurityContainmentTarget;
  readonly containmentStrategy?: SecurityContainmentStrategy;
  readonly authorizationRequirement?: ExecutionAuthorizationRequirement;
}

export interface SecurityHotPathPlan {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly threatAssessment?: ThreatAssessment;
  readonly securityDecision: SecurityDecisionModel;
  readonly actions: readonly SecurityHotPathAction[];
  readonly containmentPlan: SecurityContainmentPlan;
  readonly authorizationRequirements: readonly ExecutionAuthorizationRequirement[];
  readonly metadata: {
    readonly source: 'in-memory-security-hot-path-planner';
    readonly immediateActionCount: number;
    readonly backgroundActionCount: number;
  };
}

export interface SecurityHotPathDispatchResult {
  readonly planId: string;
  readonly correlationId: string;
  readonly dispatchedActionTypes: readonly SecurityActionType[];
  readonly deferredActionTypes: readonly SecurityActionType[];
  readonly lane: SecurityHotPathExecutionLane;
  readonly success: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityHotPathPlanner {
  plan(executionPlan: SecurityExecutionPlan): SecurityHotPathPlan;
}

export enum SecurityLatencyStage {
  DETECTION = 'DETECTION',
  THREAT_INTERPRETATION = 'THREAT_INTERPRETATION',
  DECISION = 'DECISION',
  ACTION_PLANNING = 'ACTION_PLANNING',
  EXECUTION_PLANNING = 'EXECUTION_PLANNING',
  HOT_PATH_PLANNING = 'HOT_PATH_PLANNING',
  AUTHORIZATION = 'AUTHORIZATION',
}

export interface SecurityLatencyBudget {
  readonly stage: SecurityLatencyStage;
  readonly targetMs: number;
}

export interface SecurityLatencyViolation {
  readonly stage: SecurityLatencyStage;
  readonly targetMs: number;
  readonly observedMs: number;
  readonly exceededByMs: number;
}

export interface SecurityHotPathGuardrails {
  readonly prohibitPersistence: boolean;
  readonly prohibitFilesystemWrites: boolean;
  readonly prohibitDashboardUpdates: boolean;
  readonly prohibitAuditLogPollingBeforeImmediateContainment: boolean;
  readonly allowBackgroundDeferredOperations: boolean;
}

export interface SecurityLatencyBudgetProfile {
  readonly name: string;
  readonly budgets: readonly SecurityLatencyBudget[];
  readonly guardrails: SecurityHotPathGuardrails;
}

export interface SecurityHotPathLatencyEnvelope {
  readonly profile: SecurityLatencyBudgetProfile;
  readonly measuredStageDurationsMs: Readonly<Record<SecurityLatencyStage, number>>;
  readonly violations: readonly SecurityLatencyViolation[];
  readonly withinBudget: boolean;
}

export const DEFAULT_SECURITY_HOT_PATH_GUARDRAILS: SecurityHotPathGuardrails = Object.freeze({
  prohibitPersistence: true,
  prohibitFilesystemWrites: true,
  prohibitDashboardUpdates: true,
  prohibitAuditLogPollingBeforeImmediateContainment: true,
  allowBackgroundDeferredOperations: true,
});

export const DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE: SecurityLatencyBudgetProfile = Object.freeze({
  name: 'default-internal-hot-path-latency-budget',
  budgets: Object.freeze([
    Object.freeze({ stage: SecurityLatencyStage.DETECTION, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.THREAT_INTERPRETATION, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.DECISION, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.ACTION_PLANNING, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.EXECUTION_PLANNING, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.HOT_PATH_PLANNING, targetMs: 1 }),
    Object.freeze({ stage: SecurityLatencyStage.AUTHORIZATION, targetMs: 1 }),
  ]),
  guardrails: DEFAULT_SECURITY_HOT_PATH_GUARDRAILS,
});

export enum AuthorizationDecision {
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED',
}

export enum AuthorizationReason {
  AUTHORIZATION_NOT_REQUIRED = 'AUTHORIZATION_NOT_REQUIRED',
  PLAN_AUTHORIZED = 'PLAN_AUTHORIZED',
  EMPTY_PLAN = 'EMPTY_PLAN',
  CORRELATION_MISMATCH = 'CORRELATION_MISMATCH',
  DECISION_MISMATCH = 'DECISION_MISMATCH',
  MISSING_REQUIRED_ACTION = 'MISSING_REQUIRED_ACTION',
}

export interface AuthorizationEvaluationContext {
  readonly executionPlan: SecurityExecutionPlan;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionAuthorizationResult {
  readonly decision: AuthorizationDecision;
  readonly reason: AuthorizationReason;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly threatAssessment?: ThreatAssessment;
  readonly authorizationRequirements: readonly ExecutionAuthorizationRequirement[];
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionAuthorizationEngine {
  authorize(context: AuthorizationEvaluationContext): SecurityExecutionAuthorizationResult;
}

export enum SecurityExecutionRouteDecision {
  EXECUTABLE = 'EXECUTABLE',
  DEFERRED = 'DEFERRED',
  SKIPPED = 'SKIPPED',
}

export enum SecurityExecutionRouteReason {
  AUTHORIZED_IMMEDIATE = 'AUTHORIZED_IMMEDIATE',
  BACKGROUND_DEFERRED = 'BACKGROUND_DEFERRED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  NO_EXECUTOR = 'NO_EXECUTOR',
}

export interface SecurityExecutionRoute {
  readonly routeId: string;
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly lane: SecurityHotPathExecutionLane;
  readonly decision: SecurityExecutionRouteDecision;
  readonly reason: SecurityExecutionRouteReason;
  readonly containmentTarget?: SecurityContainmentTarget;
  readonly containmentStrategy?: SecurityContainmentStrategy;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
}

export interface SecurityExecutionRoutingContext {
  readonly hotPathPlan: SecurityHotPathPlan;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionRoutingResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
  readonly routes: readonly SecurityExecutionRoute[];
  readonly metadata: {
    readonly source: 'in-memory-security-execution-router';
    readonly executableRouteCount: number;
    readonly deferredRouteCount: number;
    readonly skippedRouteCount: number;
    readonly ignoredNoneActionCount: number;
  };
}

export interface SecurityExecutionRouter {
  route(context: SecurityExecutionRoutingContext): SecurityExecutionRoutingResult;
}

export interface SecurityExecutionDispatchIntent {
  readonly route: SecurityExecutionRoute;
  readonly dispatchDecision: SecurityExecutionRouteDecision;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionDispatchResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly intents: readonly SecurityExecutionDispatchIntent[];
  readonly metadata: {
    readonly source: 'in-memory-security-execution-dispatcher';
    readonly executableIntentCount: number;
    readonly deferredIntentCount: number;
    readonly skippedIntentCount: number;
  };
}

export interface SecurityExecutionDispatcher {
  dispatch(routingResult: SecurityExecutionRoutingResult): SecurityExecutionDispatchResult;
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
