import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditAttributionEngine,
  AuditAttributionResult,
  AuditLogEntry,
} from './audit-attribution-types';
import { AuditLogProvider } from './audit-log-provider';

export class InMemoryAuditAttributionEngine implements AuditAttributionEngine {
  constructor(
    private readonly auditLogProvider: AuditLogProvider,
    private readonly lookbackWindowMs = 5_000,
  ) {}

  async attribute(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: AuditActionType,
  ): Promise<AuditAttributionResult> {
    const guildId = this.extractGuildId(normalizedEvent);
    if (!guildId) {
      return this.none(normalizedEvent, 'guildId missing from event payload');
    }

    const candidates = this.auditLogProvider.findRecentEntries(guildId, actionType, this.lookbackWindowMs);
    if (candidates.length === 0) {
      return this.none(normalizedEvent, 'no recent audit entry matched');
    }

    const eventTargetId = this.extractString(normalizedEvent.payload, 'targetId', 'target_id');
    const eventResourceId = this.extractString(normalizedEvent.payload, 'resourceId', 'resource_id');
    const matchedEntry = this.selectBestCandidate(candidates, eventTargetId, eventResourceId) ?? candidates[0];

    return {
      actorId: matchedEntry.actorId,
      targetId: matchedEntry.targetId,
      auditLogCorrelationId: matchedEntry.id,
      confidence: this.resolveConfidence(matchedEntry, candidates),
      reason: 'audit entry matched',
      matchedEntry,
    };
  }

  private selectBestCandidate(
    candidates: readonly AuditLogEntry[],
    eventTargetId?: string,
    eventResourceId?: string,
  ): AuditLogEntry | undefined {
    if (!eventTargetId && !eventResourceId) {
      return undefined;
    }

    return candidates.find((entry) => {
      if (eventTargetId && entry.targetId === eventTargetId) {
        return true;
      }

      if (eventResourceId && entry.resourceId === eventResourceId) {
        return true;
      }

      return false;
    });
  }

  private resolveConfidence(entry: AuditLogEntry, candidates: readonly AuditLogEntry[]): AuditAttributionConfidence {
    if (candidates.length === 1) {
      return AuditAttributionConfidence.HIGH;
    }

    return entry === candidates[0] ? AuditAttributionConfidence.HIGH : AuditAttributionConfidence.MEDIUM;
  }

  private none(normalizedEvent: DiscordGatewayNormalizedEvent, reason: string): AuditAttributionResult {
    return {
      actorId: '',
      confidence: AuditAttributionConfidence.NONE,
      reason,
      matchedEntry: undefined,
      auditLogCorrelationId: undefined,
      targetId: undefined,
    };
  }

  private extractGuildId(normalizedEvent: DiscordGatewayNormalizedEvent): string | undefined {
    return this.extractString(normalizedEvent.payload, 'guildId', 'guild_id');
  }

  private extractString(payload: unknown, ...keys: string[]): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }
}
