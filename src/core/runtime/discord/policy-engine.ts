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
        observedCount: tracked.observedCount,
        threshold: rule.threshold,
      };
    }

    return {
      decision: rule.decisionOnViolation,
      guildId: context.guildId,
      actorId: context.actorId,
      actionType: context.actionType,
      eventName: context.eventName,
      reason: 'threshold exceeded',
      observedCount: tracked.observedCount,
      threshold: rule.threshold,
    };
  }

  private findRule(rules: readonly ThresholdRule[], actionType: SecurityActionType): ThresholdRule | undefined {
    return rules.find((rule) => rule.actionType === actionType);
  }
}
