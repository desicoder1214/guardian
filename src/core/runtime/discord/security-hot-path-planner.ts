import {
  SecurityAction,
  SecurityActionType,
} from './security-action-planner';
import {
  ExecutionAuthorizationRequirement,
  SecurityContainmentAction,
  SecurityContainmentPlan,
  SecurityContainmentStrategy,
  SecurityContainmentTarget,
  SecurityHotPathAction,
  SecurityHotPathExecutionLane,
  SecurityHotPathPlan,
  SecurityHotPathPlanner,
  SecurityHotPathPriority,
  SecurityExecutionPlan,
  SecurityResourceType,
} from './security-execution-types';
import { SecurityDecisionModel } from './security-decision-types';
import { ThreatAssessment } from './runtime-threat-interpretation-engine';

interface HotPathClassification {
  readonly lane: SecurityHotPathExecutionLane;
  readonly priority: SecurityHotPathPriority;
  readonly rank: number;
}

interface ContainmentMapping {
  readonly strategy: SecurityContainmentStrategy;
  readonly target: SecurityContainmentTarget;
}

function freezeAction(action: SecurityAction): SecurityAction {
  return Object.freeze({
    type: action.type,
    priority: action.priority,
    sequence: action.sequence,
    metadata:
      action.metadata && typeof action.metadata === 'object'
        ? Object.freeze({ ...(action.metadata as Record<string, unknown>) })
        : action.metadata,
  });
}

function freezeThreatAssessment(threatAssessment: ThreatAssessment): ThreatAssessment {
  return Object.freeze({
    severity: threatAssessment.severity,
    confidence: threatAssessment.confidence,
    disposition: threatAssessment.disposition,
    rationale: threatAssessment.rationale,
    correlationIds: Object.freeze([...threatAssessment.correlationIds]),
    overrides: Object.freeze(
      threatAssessment.overrides.map((override) =>
        Object.freeze({
          type: override.type,
          applicableEventTypes: Object.freeze([...override.applicableEventTypes]),
          reason: override.reason,
          metadata: override.metadata ? Object.freeze({ ...override.metadata }) : undefined,
        }),
      ),
    ),
  });
}

function freezeDecisionModel(decisionModel: SecurityDecisionModel): SecurityDecisionModel {
  return Object.freeze({
    ...decisionModel,
    metadata:
      decisionModel.metadata && typeof decisionModel.metadata === 'object'
        ? Object.freeze({ ...(decisionModel.metadata as Record<string, unknown>) })
        : decisionModel.metadata,
  });
}

function freezeAuthorizationRequirement(
  requirement: ExecutionAuthorizationRequirement,
): ExecutionAuthorizationRequirement {
  return Object.freeze({
    actionType: requirement.actionType,
    sequence: requirement.sequence,
    requiresAuthorization: requirement.requiresAuthorization,
    decision: requirement.decision,
    correlationId: requirement.correlationId,
  });
}

function freezeContainmentTarget(target: SecurityContainmentTarget): SecurityContainmentTarget {
  return Object.freeze({
    resourceType: target.resourceType,
    resourceId: target.resourceId,
    correlationId: target.correlationId,
    metadata: target.metadata ? Object.freeze({ ...target.metadata }) : undefined,
  });
}

function freezeContainmentAction(action: SecurityContainmentAction): SecurityContainmentAction {
  return Object.freeze({
    actionType: action.actionType,
    sequence: action.sequence,
    strategy: action.strategy,
    target: freezeContainmentTarget(action.target),
  });
}

function classifyAction(actionType: SecurityActionType): HotPathClassification {
  switch (actionType) {
    case SecurityActionType.REMOVE_UNAUTHORIZED_BOT:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
        rank: 10,
      };
    case SecurityActionType.REMOVE_DANGEROUS_ROLE:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
        rank: 12,
      };
    case SecurityActionType.FREEZE_WEBHOOKS:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        rank: 20,
      };
    case SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.HIGH_CONTAINMENT,
        rank: 25,
      };
    case SecurityActionType.QUARANTINE_ACTOR:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.CRITICAL_CONTAINMENT,
        rank: 30,
      };
    case SecurityActionType.REVOKE_ESCALATION_SOURCE:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.NORMAL_CONTAINMENT,
        rank: 35,
      };
    case SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.NORMAL_CONTAINMENT,
        rank: 60,
      };
    case SecurityActionType.LOCK_CHANNELS:
    case SecurityActionType.RESTORE_RESOURCE:
    case SecurityActionType.ESCALATE:
    case SecurityActionType.INVESTIGATE:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.NORMAL_CONTAINMENT,
        rank: 40,
      };
    case SecurityActionType.CREATE_INCIDENT:
      return {
        lane: SecurityHotPathExecutionLane.BACKGROUND,
        priority: SecurityHotPathPriority.DEFERRED_AUDIT,
        rank: 900,
      };
    case SecurityActionType.NOTIFY_AUDIT:
      return {
        lane: SecurityHotPathExecutionLane.BACKGROUND,
        priority: SecurityHotPathPriority.DEFERRED_AUDIT,
        rank: 910,
      };
    case SecurityActionType.NONE:
      return {
        lane: SecurityHotPathExecutionLane.BACKGROUND,
        priority: SecurityHotPathPriority.DEFERRED_AUDIT,
        rank: 999,
      };
    default:
      return {
        lane: SecurityHotPathExecutionLane.IMMEDIATE,
        priority: SecurityHotPathPriority.NORMAL_CONTAINMENT,
        rank: 500,
      };
  }
}

function resolveAuthorizationRequirement(
  action: SecurityAction,
  authorizationRequirements: readonly ExecutionAuthorizationRequirement[],
): ExecutionAuthorizationRequirement | undefined {
  return authorizationRequirements.find(
    (requirement) => requirement.actionType === action.type && requirement.sequence === action.sequence,
  );
}

function resolveContainmentMapping(action: SecurityAction, correlationId: string): ContainmentMapping {
  const baseMetadata = Object.freeze({
    sourceActionType: action.type,
    sourceActionSequence: action.sequence,
  });

  switch (action.type) {
    case SecurityActionType.REMOVE_UNAUTHORIZED_BOT:
      return {
        strategy: SecurityContainmentStrategy.REMOVE,
        target: Object.freeze({
          resourceType: SecurityResourceType.BOT,
          resourceId: `bot:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.REMOVE_DANGEROUS_ROLE:
      return {
        strategy: SecurityContainmentStrategy.REMOVE,
        target: Object.freeze({
          resourceType: SecurityResourceType.ROLE,
          resourceId: `role:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER:
      return {
        strategy: SecurityContainmentStrategy.NEUTRALIZE,
        target: Object.freeze({
          resourceType: SecurityResourceType.MEMBER,
          resourceId: `member:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.REVOKE_ESCALATION_SOURCE:
      return {
        strategy: SecurityContainmentStrategy.REVOKE,
        target: Object.freeze({
          resourceType: SecurityResourceType.ROLE_ASSIGNMENT,
          resourceId: `role-assignment:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.FREEZE_WEBHOOKS:
      return {
        strategy: SecurityContainmentStrategy.FREEZE,
        target: Object.freeze({
          resourceType: SecurityResourceType.WEBHOOK,
          resourceId: `webhook:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.LOCK_CHANNELS:
      return {
        strategy: SecurityContainmentStrategy.LOCK,
        target: Object.freeze({
          resourceType: SecurityResourceType.CHANNEL,
          resourceId: `channel:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.RESTORE_RESOURCE:
      return {
        strategy: SecurityContainmentStrategy.RESTORE,
        target: Object.freeze({
          resourceType: SecurityResourceType.GUILD_CONFIGURATION,
          resourceId: `guild-config:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR:
      return {
        strategy: SecurityContainmentStrategy.OBSERVE,
        target: Object.freeze({
          resourceType: SecurityResourceType.MEMBER,
          resourceId: `member:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: Object.freeze({ ...baseMetadata, policyControlled: true }),
        }),
      };
    case SecurityActionType.CREATE_INCIDENT:
    case SecurityActionType.NOTIFY_AUDIT:
    case SecurityActionType.INVESTIGATE:
    case SecurityActionType.ESCALATE:
      return {
        strategy: SecurityContainmentStrategy.OBSERVE,
        target: Object.freeze({
          resourceType: SecurityResourceType.GUILD_CONFIGURATION,
          resourceId: `guild-state:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    case SecurityActionType.QUARANTINE_ACTOR:
      return {
        strategy: SecurityContainmentStrategy.NEUTRALIZE,
        target: Object.freeze({
          resourceType: SecurityResourceType.MEMBER,
          resourceId: `member:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
    default:
      return {
        strategy: SecurityContainmentStrategy.OBSERVE,
        target: Object.freeze({
          resourceType: SecurityResourceType.INVITE,
          resourceId: `invite:${correlationId}:${action.sequence}`,
          correlationId,
          metadata: baseMetadata,
        }),
      };
  }
}

function freezeHotPathAction(
  action: SecurityAction,
  correlationId: string,
  authorizationRequirement: ExecutionAuthorizationRequirement | undefined,
): SecurityHotPathAction {
  const classification = classifyAction(action.type);
  const containmentMapping = resolveContainmentMapping(action, correlationId);

  return Object.freeze({
    actionType: action.type,
    sequence: action.sequence,
    priority: classification.priority,
    lane: classification.lane,
    action: freezeAction(action),
    containmentTarget: freezeContainmentTarget(containmentMapping.target),
    containmentStrategy: containmentMapping.strategy,
    authorizationRequirement: authorizationRequirement
      ? freezeAuthorizationRequirement(authorizationRequirement)
      : undefined,
  });
}

function buildContainmentPlan(
  planId: string,
  correlationId: string,
  threatAssessment: ThreatAssessment | undefined,
  hotPathActions: readonly SecurityHotPathAction[],
): SecurityContainmentPlan {
  const containmentActions = Object.freeze(
    hotPathActions
      .filter((action) => action.containmentTarget && action.containmentStrategy)
      .map((action) =>
        freezeContainmentAction({
          actionType: action.actionType,
          sequence: action.sequence,
          strategy: action.containmentStrategy as SecurityContainmentStrategy,
          target: action.containmentTarget as SecurityContainmentTarget,
        }),
      ),
  );

  return Object.freeze({
    planId: `containment:${planId}`,
    correlationId,
    threatAssessment: threatAssessment ? freezeThreatAssessment(threatAssessment) : undefined,
    actions: containmentActions,
    metadata: Object.freeze({
      source: 'in-memory-security-hot-path-planner',
      targetCount: containmentActions.length,
      strategyCount: containmentActions.length,
    }),
  });
}

export class InMemorySecurityHotPathPlanner implements SecurityHotPathPlanner {
  plan(executionPlan: SecurityExecutionPlan): SecurityHotPathPlan {
    const authorizationRequirements = Object.freeze(
      executionPlan.authorizationRequirements.map((requirement) =>
        freezeAuthorizationRequirement(requirement),
      ),
    );

    const actions = executionPlan.plannedActions
      .filter((action) => action.type !== SecurityActionType.NONE)
      .map((action) =>
        freezeHotPathAction(
          action,
          executionPlan.correlationId,
          resolveAuthorizationRequirement(action, authorizationRequirements),
        ),
      )
      .sort((left, right) => {
        const leftClassification = classifyAction(left.actionType);
        const rightClassification = classifyAction(right.actionType);

        if (leftClassification.rank !== rightClassification.rank) {
          return leftClassification.rank - rightClassification.rank;
        }

        if (left.sequence !== right.sequence) {
          return left.sequence - right.sequence;
        }

        return left.actionType.localeCompare(right.actionType);
      });

    const hotPathActions = Object.freeze(actions.map((action) => Object.freeze({ ...action })));
    const immediateActionCount = hotPathActions.filter(
      (action) => action.lane === SecurityHotPathExecutionLane.IMMEDIATE,
    ).length;
    const backgroundActionCount = hotPathActions.filter(
      (action) => action.lane === SecurityHotPathExecutionLane.BACKGROUND,
    ).length;

    const containmentPlan = buildContainmentPlan(
      executionPlan.planId,
      executionPlan.correlationId,
      executionPlan.threatAssessment,
      hotPathActions,
    );

    return Object.freeze({
      planId: `hot-path:${executionPlan.planId}`,
      executionPlanId: executionPlan.planId,
      correlationId: executionPlan.correlationId,
      threatAssessment: executionPlan.threatAssessment
        ? freezeThreatAssessment(executionPlan.threatAssessment)
        : undefined,
      securityDecision: freezeDecisionModel(executionPlan.securityDecision),
      actions: hotPathActions,
      containmentPlan,
      authorizationRequirements,
      metadata: Object.freeze({
        source: 'in-memory-security-hot-path-planner',
        immediateActionCount,
        backgroundActionCount,
      }),
    });
  }
}
