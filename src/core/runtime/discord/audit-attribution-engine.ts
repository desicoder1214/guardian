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
    private readonly attributionTimeoutMs = 0,
    private readonly resolutionPollIntervalMs = 25,
    private readonly staleEntrySkewMs = Number.MAX_SAFE_INTEGER,
  ) {}

  async attribute(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: AuditActionType,
  ): Promise<AuditAttributionResult> {
    const guildId = this.extractGuildId(normalizedEvent);
    if (!guildId) {
      return this.none(normalizedEvent, 'guildId missing from event payload');
    }

    const eventTimestampMs = Date.parse(normalizedEvent.timestamp);
    const eventTargetId = this.extractString(normalizedEvent.payload, 'targetId', 'target_id');
    const eventResourceId = this.extractString(normalizedEvent.payload, 'resourceId', 'resource_id');

    const deadlineMs = Date.now() + Math.max(0, this.attributionTimeoutMs);
    let sawStaleCandidate = false;

    while (true) {
      const candidates = this.auditLogProvider.findRecentEntries(
        guildId,
        actionType,
        this.lookbackWindowMs + Math.max(0, this.attributionTimeoutMs),
      );
      const freshCandidates = candidates.filter((entry) =>
        this.isFreshEntry(entry, eventTimestampMs),
      );

      if (freshCandidates.length > 0) {
        const matchedEntry =
          this.selectBestCandidate(
            freshCandidates,
            eventTargetId,
            eventResourceId,
            eventTimestampMs,
          ) ?? freshCandidates[0];

        return {
          actorId: matchedEntry.actorId,
          targetId: matchedEntry.targetId,
          auditLogCorrelationId: matchedEntry.id,
          confidence: this.resolveConfidence(matchedEntry, freshCandidates),
          reason: this.resolveMatchReason(
            matchedEntry,
            freshCandidates,
            eventTargetId,
            eventResourceId,
            eventTimestampMs,
          ),
          matchedEntry,
        };
      }

      if (candidates.length > 0 && freshCandidates.length === 0) {
        sawStaleCandidate = true;
      }

      if (Date.now() >= deadlineMs || this.attributionTimeoutMs <= 0) {
        const reason = sawStaleCandidate
          ? 'stale audit entries rejected after bounded attribution timeout'
          : 'no correlated audit entry matched within bounded attribution timeout';
        return this.none(normalizedEvent, reason);
      }

      await this.wait(Math.max(1, this.resolutionPollIntervalMs));
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private isFreshEntry(entry: AuditLogEntry, eventTimestampMs: number): boolean {
    if (!Number.isFinite(eventTimestampMs)) {
      return true;
    }

    const entryTimestampMs = Date.parse(entry.timestamp);
    if (!Number.isFinite(entryTimestampMs)) {
      return false;
    }

    return Math.abs(entryTimestampMs - eventTimestampMs) <= this.staleEntrySkewMs;
  }

  private scoreCandidate(
    entry: AuditLogEntry,
    eventTargetId: string | undefined,
    eventResourceId: string | undefined,
    eventTimestampMs: number,
  ): number {
    const targetMatch = eventTargetId && entry.targetId === eventTargetId ? 1_000_000 : 0;
    const resourceMatch = eventResourceId && entry.resourceId === eventResourceId ? 1_000_000 : 0;
    const entryTimestampMs = Date.parse(entry.timestamp);
    const timestampDistance = Number.isFinite(eventTimestampMs) && Number.isFinite(entryTimestampMs)
      ? Math.abs(entryTimestampMs - eventTimestampMs)
      : this.staleEntrySkewMs;
    const proximityScore = Math.max(0, this.staleEntrySkewMs - Math.min(this.staleEntrySkewMs, timestampDistance));

    return resourceMatch + targetMatch + proximityScore;
  }

  private selectBestCandidate(
    candidates: readonly AuditLogEntry[],
    eventTargetId?: string,
    eventResourceId?: string,
    eventTimestampMs = Number.NaN,
  ): AuditLogEntry | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    return [...candidates].sort((left, right) => {
      const scoreDiff =
        this.scoreCandidate(right, eventTargetId, eventResourceId, eventTimestampMs) -
        this.scoreCandidate(left, eventTargetId, eventResourceId, eventTimestampMs);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const timestampDiff = Date.parse(right.timestamp) - Date.parse(left.timestamp);
      if (timestampDiff !== 0) {
        return timestampDiff;
      }

      const actorDiff = left.actorId.localeCompare(right.actorId);
      if (actorDiff !== 0) {
        return actorDiff;
      }

      return left.id.localeCompare(right.id);
    })[0];
  }

  private resolveMatchReason(
    entry: AuditLogEntry,
    candidates: readonly AuditLogEntry[],
    eventTargetId?: string,
    eventResourceId?: string,
    eventTimestampMs = Number.NaN,
  ): string {
    if (candidates.length <= 1) {
      return 'audit entry matched via action/resource/timestamp correlation';
    }

    const distinctActors = new Set(candidates.map((candidate) => candidate.actorId));
    const selectedByResource = Boolean(eventResourceId && entry.resourceId === eventResourceId);
    const selectedByTarget = Boolean(eventTargetId && entry.targetId === eventTargetId);
    const selectedByTimestamp = Number.isFinite(eventTimestampMs);

    if (distinctActors.size > 1) {
      return `conflicting audit entries resolved deterministically (resource=${selectedByResource},target=${selectedByTarget},timestamp=${selectedByTimestamp})`;
    }

    return 'multiple audit candidates correlated; deterministic actor selected';
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
