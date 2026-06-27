import type { SecurityContext } from './security-context';

export enum SecurityActionType {
  MEMBER_BAN = 'MEMBER_BAN',
  MEMBER_KICK = 'MEMBER_KICK',
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_DELETE = 'ROLE_DELETE',
  WEBHOOK_CREATE = 'WEBHOOK_CREATE',
  WEBHOOK_DELETE = 'WEBHOOK_DELETE',
  BOT_ADD = 'BOT_ADD',
}

export enum SecurityDecision {
  ALLOW = 'ALLOW',
  IGNORE = 'IGNORE',
  INVESTIGATE = 'INVESTIGATE',
  CONTAIN = 'CONTAIN',
  BLOCK = 'BLOCK',
}

export interface ThresholdRule {
  readonly actionType: SecurityActionType;
  readonly enabled: boolean;
  readonly threshold: number;
  readonly windowMs: number;
  readonly decisionOnViolation: SecurityDecision;
}

export interface GuildSecurityPolicy {
  readonly guildId: string;
  readonly rules: readonly ThresholdRule[];
  readonly trustedUserIds: readonly string[];
}

export interface SecurityDecisionResult {
  readonly decision: SecurityDecision;
  readonly guildId?: string;
  readonly actorId: string;
  readonly actionType: SecurityActionType;
  readonly eventName: string;
  readonly reason: string;
  readonly observedCount?: number;
  readonly threshold?: number;
}

export interface SecurityPolicyEngine {
  evaluate(context: SecurityContext): Promise<SecurityDecisionResult>;
}
