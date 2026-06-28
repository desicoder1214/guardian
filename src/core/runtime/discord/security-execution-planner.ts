import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionType,
} from './security-action-planner';
import {
  ExecutionAuthorizationRequirement,
  SecurityExecutionAuditMetadata,
  SecurityExecutionMetadata,
  SecurityExecutionPlan,
  SecurityExecutionPlanner,
  SecurityRollbackMetadata,
} from './security-execution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from './detection-engine';
import { SecurityDecisionModel } from './security-decision-types';
import { ThreatAssessment } from './runtime-threat-interpretation-engine';

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
  action: SecurityAction,
  correlationId: string,
  decision: SecurityDecisionModel['decision'],
): ExecutionAuthorizationRequirement {
  return Object.freeze({
    actionType: action.type,
    sequence: action.sequence,
    requiresAuthorization: action.type !== SecurityActionType.NONE,
    decision,
    correlationId,
  });
}

export class InMemorySecurityExecutionPlanner implements SecurityExecutionPlanner {
  plan(actionPlan: SecurityActionPlan, decisionModel: SecurityDecisionModel): SecurityExecutionPlan {
    const plannedActions = Object.freeze(actionPlan.actions.map((action) => freezeAction(action)));
    const threatAssessment = this.readThreatAssessment(actionPlan.metadata?.threatAssessment);
    const planId = this.resolvePlanId(actionPlan.correlationId, decisionModel.decision, plannedActions);
    const authorizationRequirements = Object.freeze(
      plannedActions.map((action) => freezeAuthorizationRequirement(action, actionPlan.correlationId, decisionModel.decision)),
    );

    return Object.freeze({
      planId,
      correlationId: actionPlan.correlationId,
      threatAssessment,
      securityDecision: freezeDecisionModel(decisionModel),
      plannedActions,
      authorizationRequirements,
      executionMetadata: Object.freeze(this.buildExecutionMetadata(planId, plannedActions)),
      auditMetadata: Object.freeze(this.buildAuditMetadata(planId, decisionModel, threatAssessment)),
      rollbackMetadata: Object.freeze(this.buildRollbackMetadata(planId)),
    });
  }

  private resolvePlanId(
    correlationId: string,
    decision: SecurityDecisionModel['decision'],
    plannedActions: readonly SecurityAction[],
  ): string {
    const actionSignature = plannedActions.map((action) => `${action.sequence}:${action.type}`).join('|') || 'none';
    return `execution-plan:${correlationId}:${decision}:${actionSignature}`;
  }

  private readThreatAssessment(threatAssessment: ThreatAssessment | undefined): ThreatAssessment | undefined {
    if (!threatAssessment) {
      return undefined;
    }

    return freezeThreatAssessment(threatAssessment);
  }

  private buildExecutionMetadata(planId: string, plannedActions: readonly SecurityAction[]): SecurityExecutionMetadata {
    return {
      source: 'in-memory-security-execution-planner',
      planId,
      plannedActionCount: plannedActions.length,
      plannedActionTypes: Object.freeze(plannedActions.map((action) => action.type)),
    };
  }

  private buildAuditMetadata(
    planId: string,
    decisionModel: SecurityDecisionModel,
    threatAssessment: ThreatAssessment | undefined,
  ): SecurityExecutionAuditMetadata {
    return {
      planId,
      correlationId: decisionModel.correlationId,
      decision: decisionModel.decision,
      decisionReason: decisionModel.reason,
      threatDisposition: threatAssessment?.disposition ?? DetectionDisposition.UNKNOWN,
      threatSeverity: threatAssessment?.severity ?? DetectionSeverity.INFO,
      threatConfidence: threatAssessment?.confidence ?? DetectionConfidence.LOW,
    };
  }

  private buildRollbackMetadata(planId: string): SecurityRollbackMetadata {
    return {
      supported: false,
      strategy: 'none',
      reason: `Rollback metadata reserved for future execution layers (${planId})`,
    };
  }
}
