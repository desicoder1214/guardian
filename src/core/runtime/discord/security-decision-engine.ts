import { AuditAttributionConfidence, AuditAttributionResult } from './audit-attribution-types';
import { SecurityContext } from './security-context';
import { SecurityActionType, SecurityDecision } from './security-policy-types';
import {
  PolicyDecision,
  SecurityDecisionEngine,
  SecurityDecisionModel,
  SecurityDecisionReason,
} from './security-decision-types';

export class InMemorySecurityDecisionEngine implements SecurityDecisionEngine {
  async evaluate(
    context: SecurityContext,
    attribution: AuditAttributionResult,
    policyDecision: PolicyDecision,
  ): Promise<SecurityDecisionModel> {
    if (!policyDecision.enabled) {
      return this.buildDecision(context, attribution, SecurityDecision.IGNORE, SecurityDecisionReason.NO_POLICY);
    }

    if (this.isTrustedActor(context.actorId, policyDecision)) {
      return this.buildDecision(context, attribution, SecurityDecision.ALLOW, SecurityDecisionReason.TRUSTED_ACTOR);
    }

    if (this.requiresFastPathPolicyEnforcement(policyDecision) && policyDecision.thresholdExceeded) {
      const reason = policyDecision.decision === SecurityDecision.BLOCK
        ? SecurityDecisionReason.POLICY_BLOCK
        : SecurityDecisionReason.THRESHOLD_EXCEEDED;
      return this.buildDecision(context, attribution, policyDecision.decision, reason);
    }

    if (attribution.confidence === AuditAttributionConfidence.NONE || !attribution.actorId) {
      const reason = attribution.confidence === AuditAttributionConfidence.NONE
        ? SecurityDecisionReason.ATTRIBUTION_FAILED
        : SecurityDecisionReason.UNKNOWN_ACTOR;
      return this.buildDecision(context, attribution, SecurityDecision.INVESTIGATE, reason);
    }

    if (
      attribution.confidence === AuditAttributionConfidence.LOW ||
      attribution.confidence === AuditAttributionConfidence.MEDIUM
    ) {
      return this.buildDecision(
        context,
        attribution,
        SecurityDecision.INVESTIGATE,
        SecurityDecisionReason.ATTRIBUTION_LOW_CONFIDENCE,
      );
    }

    if (policyDecision.thresholdExceeded) {
      const reason = policyDecision.decision === SecurityDecision.BLOCK
        ? SecurityDecisionReason.POLICY_BLOCK
        : SecurityDecisionReason.THRESHOLD_EXCEEDED;
      return this.buildDecision(context, attribution, policyDecision.decision, reason);
    }

    return this.buildDecision(context, attribution, SecurityDecision.ALLOW, SecurityDecisionReason.POLICY_ALLOW);
  }

  private isTrustedActor(actorId: string, policyDecision: PolicyDecision): boolean {
    if (this.requiresFastPathPolicyEnforcement(policyDecision)) {
      return false;
    }

    return Boolean(policyDecision.trustedActorIds?.includes(actorId));
  }

  private requiresFastPathPolicyEnforcement(policyDecision: PolicyDecision): boolean {
    const metadata =
      policyDecision.metadata && typeof policyDecision.metadata === 'object'
        ? (policyDecision.metadata as Record<string, unknown>)
        : undefined;

    return metadata?.fastPathEnforcement === true;
  }

  private buildDecision(
    context: SecurityContext,
    attribution: AuditAttributionResult,
    decision: SecurityDecision,
    reason: SecurityDecisionReason,
  ): SecurityDecisionModel {
    return {
      decision,
      reason,
      confidence: attribution.confidence,
      actorId: attribution.actorId || context.actorId,
      guildId: context.guildId,
      actionType: context.actionType,
      correlationId: context.correlationId,
      auditLogCorrelationId: attribution.auditLogCorrelationId ?? context.auditLogCorrelationId,
      metadata: context.metadata ?? attribution.matchedEntry?.metadata,
    };
  }
}
