import {
  AuthorizationDecision,
  AuthorizationEvaluationContext,
  AuthorizationReason,
  ExecutionAuthorizationRequirement,
  SecurityExecutionAuthorizationEngine,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionPlan,
} from './security-execution-types';
import { ThreatAssessment } from './runtime-threat-interpretation-engine';

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

function freezeRequirement(
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

function freezePlan(plan: SecurityExecutionPlan): SecurityExecutionPlan {
  return Object.freeze({
    ...plan,
    plannedActions: Object.freeze(
      plan.plannedActions.map((action) =>
        Object.freeze({
          type: action.type,
          priority: action.priority,
          sequence: action.sequence,
          metadata:
            action.metadata && typeof action.metadata === 'object'
              ? Object.freeze({ ...(action.metadata as Record<string, unknown>) })
              : action.metadata,
        }),
      ),
    ),
    authorizationRequirements: Object.freeze(plan.authorizationRequirements.map((requirement) => freezeRequirement(requirement))),
    securityDecision: Object.freeze({
      ...plan.securityDecision,
      metadata:
        plan.securityDecision.metadata && typeof plan.securityDecision.metadata === 'object'
          ? Object.freeze({ ...(plan.securityDecision.metadata as Record<string, unknown>) })
          : plan.securityDecision.metadata,
    }),
    executionMetadata: Object.freeze({ ...plan.executionMetadata }),
    auditMetadata: Object.freeze({ ...plan.auditMetadata }),
    rollbackMetadata: Object.freeze({ ...plan.rollbackMetadata }),
    threatAssessment: plan.threatAssessment ? freezeThreatAssessment(plan.threatAssessment) : undefined,
  });
}

function createResult(
  plan: SecurityExecutionPlan,
  decision: AuthorizationDecision,
  reason: AuthorizationReason,
  metadata?: Record<string, unknown>,
): SecurityExecutionAuthorizationResult {
  const securityDecisionMetadata =
    plan.securityDecision.metadata && typeof plan.securityDecision.metadata === 'object'
      ? (plan.securityDecision.metadata as Record<string, unknown>)
      : undefined;

  return Object.freeze({
    decision,
    reason,
    executionPlanId: plan.planId,
    correlationId: plan.correlationId,
    threatAssessment: plan.threatAssessment ? freezeThreatAssessment(plan.threatAssessment) : undefined,
    authorizationRequirements: Object.freeze(
      plan.authorizationRequirements.map((requirement) => freezeRequirement(requirement)),
    ),
    metadata: Object.freeze({
      ...(metadata ? { ...metadata } : {}),
      runtimeId: securityDecisionMetadata?.runtimeId,
      guildId: plan.securityDecision.guildId,
      actorId: plan.securityDecision.actorId,
      botId:
        securityDecisionMetadata?.botId ??
        securityDecisionMetadata?.botUserId ??
        securityDecisionMetadata?.targetId,
      executionPlanId: plan.planId,
      securityDecisionMetadata,
    }),
  });
}

export class InMemorySecurityExecutionAuthorizationEngine implements SecurityExecutionAuthorizationEngine {
  authorize(context: AuthorizationEvaluationContext): SecurityExecutionAuthorizationResult {
    const plan = freezePlan(context.executionPlan);

    if (plan.plannedActions.length === 0) {
      return createResult(plan, AuthorizationDecision.AUTHORIZED, AuthorizationReason.EMPTY_PLAN, {
        source: 'in-memory-security-execution-authorization-engine',
      });
    }

    for (const requirement of plan.authorizationRequirements) {
      if (requirement.correlationId !== plan.correlationId) {
        return createResult(plan, AuthorizationDecision.DENIED, AuthorizationReason.CORRELATION_MISMATCH, {
          source: 'in-memory-security-execution-authorization-engine',
          stage: 'validation',
        });
      }

      if (requirement.decision !== plan.securityDecision.decision) {
        return createResult(plan, AuthorizationDecision.DENIED, AuthorizationReason.DECISION_MISMATCH, {
          source: 'in-memory-security-execution-authorization-engine',
          stage: 'validation',
        });
      }

      if (requirement.requiresAuthorization) {
        const matchingAction = plan.plannedActions.find(
          (action) => action.type === requirement.actionType && action.sequence === requirement.sequence,
        );

        if (!matchingAction) {
          return createResult(plan, AuthorizationDecision.DENIED, AuthorizationReason.MISSING_REQUIRED_ACTION, {
            source: 'in-memory-security-execution-authorization-engine',
            stage: 'validation',
          });
        }
      }
    }

    const anyRequiredAuthorization = plan.authorizationRequirements.some(
      (requirement) => requirement.requiresAuthorization,
    );

    return createResult(
      plan,
      AuthorizationDecision.AUTHORIZED,
      anyRequiredAuthorization ? AuthorizationReason.PLAN_AUTHORIZED : AuthorizationReason.AUTHORIZATION_NOT_REQUIRED,
      { source: 'in-memory-security-execution-authorization-engine' },
    );
  }
}
