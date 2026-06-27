import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionType } from './security-policy-types';

export interface SecurityContext {
  readonly guildId: string;
  readonly actorId: string;
  readonly targetId?: string;
  readonly actionType: SecurityActionType;
  readonly eventName: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly auditLogCorrelationId?: string;
  readonly metadata?: unknown;
}

export interface SecurityContextBuilder {
  build(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): SecurityContext;
}

export class InMemorySecurityContextBuilder implements SecurityContextBuilder {
  build(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): SecurityContext {
    const payload = this.readPayload(normalizedEvent.payload);

    return {
      guildId: this.readString(payload, 'guildId', 'guild_id') ?? '',
      actorId,
      targetId: this.readString(payload, 'targetId', 'target_id'),
      actionType,
      eventName: normalizedEvent.eventName,
      resourceType: this.readString(payload, 'resourceType', 'resource_type'),
      resourceId: this.readString(payload, 'resourceId', 'resource_id'),
      timestamp: normalizedEvent.timestamp,
      correlationId: normalizedEvent.correlationId,
      auditLogCorrelationId: this.readString(
        payload,
        'auditLogCorrelationId',
        'audit_log_correlation_id',
        'auditLogEntryId',
        'audit_log_entry_id',
      ),
      metadata: payload,
    };
  }

  private readPayload(payload: unknown): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    return payload as Record<string, unknown>;
  }

  private readString(
    payload: Record<string, unknown> | undefined,
    ...keys: string[]
  ): string | undefined {
    if (!payload) {
      return undefined;
    }

    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }
}
