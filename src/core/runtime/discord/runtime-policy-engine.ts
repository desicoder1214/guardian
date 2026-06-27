import { SecurityActionType as SecurityPolicyActionType } from './security-policy-types';

export enum RuntimePolicyDecisionOutcome {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  DRY_RUN = 'DRY_RUN',
  SKIP = 'SKIP',
}

export enum RuntimePolicyDecisionReason {
  AUTHORIZED = 'AUTHORIZED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  DRY_RUN_MODE = 'DRY_RUN_MODE',
  TRUSTED_ACTOR = 'TRUSTED_ACTOR',
  TRUSTED_BOT = 'TRUSTED_BOT',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  ACTION_DISABLED = 'ACTION_DISABLED',
  UNKNOWN = 'UNKNOWN',
}

export interface RuntimePolicy {
  readonly maintenanceMode: boolean;
  readonly dryRun: boolean;
  readonly featureEnabled: boolean;
  readonly trustedActorIds: readonly string[];
  readonly trustedBotIds: readonly string[];
  readonly actionEnabled: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimePolicyDecision {
  readonly decision: RuntimePolicyDecisionOutcome;
  readonly reason: RuntimePolicyDecisionReason;
  readonly maintenanceMode: boolean;
  readonly dryRun: boolean;
  readonly featureEnabled: boolean;
  readonly trustedActor: boolean;
  readonly trustedBot: boolean;
  readonly actionEnabled: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimePolicyEvaluationContext {
  readonly policy: RuntimePolicy;
  readonly actorId: string;
  readonly botId: string;
  readonly actionType: SecurityPolicyActionType;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimePolicyEngine {
  evaluate(context: RuntimePolicyEvaluationContext): RuntimePolicyDecision;
}

export class InMemoryRuntimePolicyEngine implements RuntimePolicyEngine {
  private readonly policy: RuntimePolicy;

  constructor(policy: RuntimePolicy) {
    this.policy = Object.freeze({
      maintenanceMode: policy.maintenanceMode,
      dryRun: policy.dryRun,
      featureEnabled: policy.featureEnabled,
      trustedActorIds: Object.freeze([...policy.trustedActorIds]),
      trustedBotIds: Object.freeze([...policy.trustedBotIds]),
      actionEnabled: policy.actionEnabled,
      metadata: policy.metadata ? Object.freeze({ ...policy.metadata }) : undefined,
    });
  }

  evaluate(context: RuntimePolicyEvaluationContext): RuntimePolicyDecision {
    const trustedActor = this.policy.trustedActorIds.includes(context.actorId);
    const trustedBot = this.policy.trustedBotIds.includes(context.botId);

    if (this.policy.maintenanceMode) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.DENY,
        RuntimePolicyDecisionReason.MAINTENANCE_MODE,
        trustedActor,
        trustedBot,
      );
    }

    if (this.policy.dryRun) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.DRY_RUN,
        RuntimePolicyDecisionReason.DRY_RUN_MODE,
        trustedActor,
        trustedBot,
      );
    }

    if (trustedActor) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.ALLOW,
        RuntimePolicyDecisionReason.TRUSTED_ACTOR,
        trustedActor,
        trustedBot,
      );
    }

    if (trustedBot) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.ALLOW,
        RuntimePolicyDecisionReason.TRUSTED_BOT,
        trustedActor,
        trustedBot,
      );
    }

    if (!this.policy.featureEnabled) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.DENY,
        RuntimePolicyDecisionReason.FEATURE_DISABLED,
        trustedActor,
        trustedBot,
      );
    }

    if (!this.policy.actionEnabled) {
      return this.createDecision(
        RuntimePolicyDecisionOutcome.SKIP,
        RuntimePolicyDecisionReason.ACTION_DISABLED,
        trustedActor,
        trustedBot,
      );
    }

    return this.createDecision(
      RuntimePolicyDecisionOutcome.ALLOW,
      RuntimePolicyDecisionReason.AUTHORIZED,
      trustedActor,
      trustedBot,
    );
  }

  private createDecision(
    decision: RuntimePolicyDecisionOutcome,
    reason: RuntimePolicyDecisionReason,
    trustedActor: boolean,
    trustedBot: boolean,
  ): RuntimePolicyDecision {
    return Object.freeze({
      decision,
      reason,
      maintenanceMode: this.policy.maintenanceMode,
      dryRun: this.policy.dryRun,
      featureEnabled: this.policy.featureEnabled,
      trustedActor,
      trustedBot,
      actionEnabled: this.policy.actionEnabled,
      metadata: this.policy.metadata ? Object.freeze({ ...this.policy.metadata }) : undefined,
    });
  }
}