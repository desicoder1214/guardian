import {
  SecurityActionType,
  SecurityDecision,
  SecurityDecisionResult,
  SecurityPolicyEngine,
  ThresholdRule,
} from './security-policy-types';
import type { SecurityContext } from './security-context';
import { SecurityPolicyProvider } from './security-policy-provider';
import { InMemoryThresholdTracker, ThresholdTracker } from './threshold-tracker';

export class InMemorySecurityPolicyEngine implements SecurityPolicyEngine {
  constructor(
    private readonly policyProvider: SecurityPolicyProvider,
    private readonly thresholdTracker: ThresholdTracker = new InMemoryThresholdTracker(),
  ) {}

  async evaluate(
    context: SecurityContext,
  ): Promise<SecurityDecisionResult> {
    if (!context.guildId) {
      return {
        decision: SecurityDecision.IGNORE,
        actorId: context.actorId,
        actionType: context.actionType,
        eventName: context.eventName,
        reason: 'guildId missing from security context',
        policyEnabled: false,
        thresholdExceeded: false,
        trustedActorIds: [],
        metadata: { state: 'missing-guild-id' },
      };
    }

    const policy = this.policyProvider.getPolicy(context.guildId);
    if (!policy) {
      return {
        decision: SecurityDecision.ALLOW,
        guildId: context.guildId,
        actorId: context.actorId,
        actionType: context.actionType,
        eventName: context.eventName,
        reason: 'no policy configured',
        policyEnabled: false,
        thresholdExceeded: false,
        trustedActorIds: [],
        metadata: { state: 'missing-policy' },
      };
    }

    const rule = this.findRule(policy.rules, context.actionType);
    if (!rule) {
      return {
        decision: SecurityDecision.ALLOW,
        guildId: context.guildId,
        actorId: context.actorId,
        actionType: context.actionType,
        eventName: context.eventName,
        reason: 'no matching threshold rule',
        policyEnabled: false,
        thresholdExceeded: false,
        trustedActorIds: policy.trustedUserIds,
        metadata: { state: 'missing-rule' },
      };
    }

    if (!rule.enabled) {
      return {
        decision: SecurityDecision.ALLOW,
        guildId: context.guildId,
        actorId: context.actorId,
        actionType: context.actionType,
        eventName: context.eventName,
        reason: 'threshold rule disabled',
        policyEnabled: false,
        thresholdExceeded: false,
        trustedActorIds: policy.trustedUserIds,
        metadata: { state: 'rule-disabled' },
      };
    }

    const tracked = this.thresholdTracker.recordAction(
      context.guildId,
      context.actorId,
      context.actionType,
      rule.threshold,
      rule.windowMs,
    );

    if (!tracked.exceeded) {
      return {
        decision: SecurityDecision.ALLOW,
        guildId: context.guildId,
        actorId: context.actorId,
        actionType: context.actionType,
        eventName: context.eventName,
        reason: 'within threshold',
        policyEnabled: true,
        thresholdExceeded: false,
        trustedActorIds: policy.trustedUserIds,
        observedCount: tracked.observedCount,
        threshold: rule.threshold,
        metadata: { state: 'within-threshold', windowMs: rule.windowMs },
      };
    }

    return {
      decision: rule.decisionOnViolation,
      guildId: context.guildId,
      actorId: context.actorId,
      actionType: context.actionType,
      eventName: context.eventName,
      reason: 'threshold exceeded',
      policyEnabled: true,
      thresholdExceeded: true,
      trustedActorIds: policy.trustedUserIds,
      observedCount: tracked.observedCount,
      threshold: rule.threshold,
      metadata: { state: 'threshold-exceeded', windowMs: rule.windowMs },
    };
  }

  private findRule(rules: readonly ThresholdRule[], actionType: SecurityActionType): ThresholdRule | undefined {
    return rules.find((rule) => rule.actionType === actionType);
  }
}
