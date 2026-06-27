import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditAttributionEngine,
  AuditAttributionResult,
} from './audit-attribution-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityDecisionEngine, SecurityDecisionModel } from './security-decision-types';
import { SecurityContextBuilder } from './security-context';
import {
  SecurityActionType,
  SecurityDecisionResult,
  SecurityPolicyEngine,
} from './security-policy-types';

export const SECURITY_ACTION_TO_AUDIT_ACTION_MAP: Readonly<Record<SecurityActionType, AuditActionType>> = {
  [SecurityActionType.MEMBER_BAN]: AuditActionType.MEMBER_BAN,
  [SecurityActionType.MEMBER_KICK]: AuditActionType.MEMBER_KICK,
  [SecurityActionType.CHANNEL_CREATE]: AuditActionType.CHANNEL_CREATE,
  [SecurityActionType.CHANNEL_DELETE]: AuditActionType.CHANNEL_DELETE,
  [SecurityActionType.ROLE_CREATE]: AuditActionType.ROLE_CREATE,
  [SecurityActionType.ROLE_DELETE]: AuditActionType.ROLE_DELETE,
  [SecurityActionType.WEBHOOK_CREATE]: AuditActionType.WEBHOOK_CREATE,
  [SecurityActionType.WEBHOOK_DELETE]: AuditActionType.WEBHOOK_DELETE,
  [SecurityActionType.BOT_ADD]: AuditActionType.BOT_ADD,
};

export function resolveAuditActionType(actionType: SecurityActionType): AuditActionType | undefined {
  return SECURITY_ACTION_TO_AUDIT_ACTION_MAP[actionType];
}

export interface SecurityEvaluationPipeline {
  evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): Promise<SecurityDecisionModel>;
}

export class InMemorySecurityEvaluationPipeline implements SecurityEvaluationPipeline {
  constructor(
    private readonly contextBuilder: SecurityContextBuilder,
    private readonly attributionEngine: AuditAttributionEngine,
    private readonly policyEngine: SecurityPolicyEngine,
    private readonly decisionEngine: SecurityDecisionEngine,
  ) {}

  async evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): Promise<SecurityDecisionModel> {
    const context = this.contextBuilder.build(normalizedEvent, actorId, actionType);
    const mappedActionType = resolveAuditActionType(actionType);
    const attribution = mappedActionType
      ? await this.attributionEngine.attribute(normalizedEvent, mappedActionType)
      : this.unsupportedActionAttribution(actorId);
    const policy = await this.policyEngine.evaluate(context);

    return this.decisionEngine.evaluate(context, attribution, this.toPolicyDecision(policy));
  }

  private toPolicyDecision(policy: SecurityDecisionResult) {
    return {
      enabled: policy.policyEnabled ?? true,
      decision: policy.decision,
      thresholdExceeded: policy.thresholdExceeded ?? false,
      threshold: policy.threshold,
      observedCount: policy.observedCount,
      trustedActorIds: policy.trustedActorIds ?? [],
    };
  }

  private unsupportedActionAttribution(actorId: string): AuditAttributionResult {
    return {
      actorId,
      confidence: AuditAttributionConfidence.NONE,
      reason: 'unsupported security action to audit action mapping',
    };
  }
}
