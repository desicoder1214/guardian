import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditAttributionEngine,
  AuditAttributionResult,
} from './audit-attribution-types';
import { DetectionResult } from './detection-engine';
import {
  MetadataRuntimeThreatInterpreter,
  type RuntimeThreatInterpreter,
  RuntimeThreatOverrideType,
} from './runtime-threat-interpretation';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityDecisionEngine, SecurityDecisionModel } from './security-decision-types';
import { SecurityContextBuilder } from './security-context';
import {
  SecurityActionType,
  SecurityDecision,
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

export interface DetectionAwareSecurityEvaluationPipeline extends SecurityEvaluationPipeline {
  stageDetectionResults(detectionResults: readonly DetectionResult[]): void;
}

export class InMemorySecurityEvaluationPipeline implements DetectionAwareSecurityEvaluationPipeline {
  private stagedDetectionResults: readonly DetectionResult[] = Object.freeze([]);
      private readonly threatInterpreter: RuntimeThreatInterpreter<DetectionResult>;

  constructor(
    private readonly contextBuilder: SecurityContextBuilder,
    private readonly attributionEngine: AuditAttributionEngine,
    private readonly policyEngine: SecurityPolicyEngine,
    private readonly decisionEngine: SecurityDecisionEngine,
    threatInterpreter?: RuntimeThreatInterpreter<DetectionResult>,
  ) {
    this.threatInterpreter = threatInterpreter ?? new MetadataRuntimeThreatInterpreter();
  }

  stageDetectionResults(detectionResults: readonly DetectionResult[]): void {
    this.stagedDetectionResults = Object.freeze(
      detectionResults.map((detectionResult) =>
        Object.freeze({
          ...detectionResult,
          findings: Object.freeze(
            detectionResult.findings.map((finding) =>
              Object.freeze({
                ...finding,
                metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
              }),
            ),
          ),
          metadata: detectionResult.metadata ? Object.freeze({ ...detectionResult.metadata }) : undefined,
        }),
      ),
    );
  }

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
    const policy = this.applyDetectionPolicyOverride(actionType, await this.policyEngine.evaluate(context));

    const decision = await this.decisionEngine.evaluate(context, attribution, this.toPolicyDecision(policy));

    return {
      ...decision,
      metadata: {
        ...(typeof decision.metadata === 'object' && decision.metadata !== null
          ? (decision.metadata as Record<string, unknown>)
          : {}),
        detectionResults: this.stagedDetectionResults,
      },
    };
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

  private applyDetectionPolicyOverride(
    actionType: SecurityActionType,
    policy: SecurityDecisionResult,
  ): SecurityDecisionResult {
    const forceBlockOverride = this.stagedDetectionResults
      .flatMap((detectionResult) => this.threatInterpreter.interpret(detectionResult).overrides)
      .find(
        (override) =>
          override.type === RuntimeThreatOverrideType.FORCE_BLOCK &&
          override.applicableEventTypes.includes(actionType),
      );

    if (!forceBlockOverride) {
      return policy;
    }

    return {
      ...policy,
      decision: SecurityDecision.BLOCK,
      reason: forceBlockOverride.reason ?? 'malicious unauthorized bot add detected',
      policyEnabled: true,
      thresholdExceeded: true,
      metadata: {
        ...(policy.metadata ?? {}),
        fastPathEnforcement: true,
        detectionOverride: RuntimeThreatOverrideType.FORCE_BLOCK,
      },
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
