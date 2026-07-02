import { DiscordGatewayNormalizedEvent } from './pipeline-types';

export enum AuditActionType {
  MEMBER_BAN = 'MEMBER_BAN',
  MEMBER_KICK = 'MEMBER_KICK',
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  PERMISSION_OVERWRITE_UPDATE = 'PERMISSION_OVERWRITE_UPDATE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_DELETE = 'ROLE_DELETE',
  WEBHOOK_CREATE = 'WEBHOOK_CREATE',
  WEBHOOK_DELETE = 'WEBHOOK_DELETE',
  BOT_ADD = 'BOT_ADD',
}

export interface AuditLogEntry {
  readonly id: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly targetId?: string;
  readonly actionType: AuditActionType;
  readonly resourceId?: string;
  readonly timestamp: string;
  readonly metadata?: unknown;
}

export enum AuditAttributionConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE',
}

export interface AuditAttributionResult {
  readonly actorId: string;
  readonly targetId?: string;
  readonly auditLogCorrelationId?: string;
  readonly confidence: AuditAttributionConfidence;
  readonly reason: string;
  readonly matchedEntry?: AuditLogEntry;
}

export interface AuditAttributionEngine {
  attribute(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: AuditActionType,
  ): Promise<AuditAttributionResult>;
}
