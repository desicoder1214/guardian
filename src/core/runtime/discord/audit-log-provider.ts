import { Clock, SystemClock } from './threshold-tracker';
import { AuditActionType, AuditLogEntry } from './audit-attribution-types';

export interface AuditLogProvider {
  findRecentEntries(guildId: string, actionType: AuditActionType, windowMs: number): readonly AuditLogEntry[];
}

export class InMemoryAuditLogProvider implements AuditLogProvider {
  private readonly entries: AuditLogEntry[] = [];

  constructor(private readonly clock: Clock = new SystemClock()) {}

  record(entry: AuditLogEntry): void {
    this.entries.push(entry);
  }

  findRecentEntries(guildId: string, actionType: AuditActionType, windowMs: number): readonly AuditLogEntry[] {
    const now = this.clock.now();
    const windowStart = now - windowMs;

    return this.entries
      .filter((entry) => {
        const entryTime = Date.parse(entry.timestamp);
        return (
          entry.guildId === guildId &&
          entry.actionType === actionType &&
          Number.isFinite(entryTime) &&
          entryTime >= windowStart &&
          entryTime <= now
        );
      })
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  }
}
