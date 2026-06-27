import { AuditAttributionConfidence, AuditAttributionResult } from './audit-attribution-types';
import { SecurityActionType, SecurityDecision } from './security-policy-types';
import { SecurityContext } from './security-context';

export enum SecurityDecisionReason {
  POLICY_ALLOW = 'POLICY_ALLOW',
  POLICY_BLOCK = 'POLICY_BLOCK',
  THRESHOLD_EXCEEDED = 'THRESHOLD_EXCEEDED',
  NO_POLICY = 'NO_POLICY',
  ATTRIBUTION_FAILED = 'ATTRIBUTION_FAILED',
  ATTRIBUTION_LOW_CONFIDENCE = 'ATTRIBUTION_LOW_CONFIDENCE',
  TRUSTED_ACTOR = 'TRUSTED_ACTOR',
  UNKNOWN_ACTOR = 'UNKNOWN_ACTOR',
}

export interface PolicyDecision {
  readonly enabled: boolean;
  readonly decision: SecurityDecision;
  readonly thresholdExceeded: boolean;
  readonly trustedActorIds?: readonly string[];
  readonly threshold?: number;
  readonly observedCount?: number;
}

export interface SecurityDecisionModel {
  readonly decision: SecurityDecision;
  readonly reason: SecurityDecisionReason;
  readonly confidence: AuditAttributionConfidence;
  readonly actorId: string;
  readonly guildId: string;
  readonly actionType: SecurityActionType;
  readonly correlationId: string;
  readonly auditLogCorrelationId?: string;
  readonly metadata?: unknown;
}

export interface SecurityDecisionEngine {
  evaluate(
    context: SecurityContext,
    attribution: AuditAttributionResult,
    policyDecision: PolicyDecision,
  ): Promise<SecurityDecisionModel>;
}
