import { DetectionResult } from './generic-detector-types';
import { IncidentContext, IncidentCorrelationEngine, IncidentSeverity } from './incident-correlation-types';

interface IncidentCorrelationEngineOptions {
  readonly correlationWindowMs?: number;
  readonly now?: () => number;
}

interface IncidentKey {
  readonly guildId: string;
  readonly actorId: string;
}

const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

export class InMemoryIncidentCorrelationEngine implements IncidentCorrelationEngine {
  private readonly incidents: IncidentContext[] = [];
  private readonly correlationWindowMs: number;
  private readonly now: () => number;
  private incidentCounter = 0;

  constructor(options: IncidentCorrelationEngineOptions = {}) {
    this.correlationWindowMs = options.correlationWindowMs ?? DEFAULT_WINDOW_MS;
    this.now = options.now ?? (() => Date.now());
  }

  correlate(detection: DetectionResult): IncidentContext {
    const key = this.extractIncidentKey(detection);
    const observedAtMs = this.extractObservedAtMs(detection);
    const incident = this.findMatch(key, observedAtMs);

    if (!incident) {
      const created = this.createIncident(key, detection, observedAtMs);
      this.incidents.push(created);
      return created;
    }

    const merged = this.mergeIncident(incident, detection, observedAtMs);
    const index = this.incidents.findIndex((entry) => entry.incidentId === incident.incidentId);
    this.incidents[index] = merged;
    return merged;
  }

  getIncident(id: string): IncidentContext | undefined {
    return this.incidents.find((incident) => incident.incidentId === id);
  }

  listOpenIncidents(): readonly IncidentContext[] {
    return [...this.incidents].sort((left, right) => {
      const leftMs = Date.parse(left.firstSeen);
      const rightMs = Date.parse(right.firstSeen);
      if (leftMs !== rightMs) {
        return leftMs - rightMs;
      }

      return left.incidentId.localeCompare(right.incidentId);
    });
  }

  expire(): readonly IncidentContext[] {
    const nowMs = this.now();
    const expired: IncidentContext[] = [];

    for (const incident of this.incidents) {
      const ageMs = nowMs - Date.parse(incident.lastSeen);
      if (ageMs > this.correlationWindowMs) {
        expired.push(incident);
      }
    }

    if (expired.length > 0) {
      const expiredIds = new Set(expired.map((incident) => incident.incidentId));
      for (let index = this.incidents.length - 1; index >= 0; index -= 1) {
        if (expiredIds.has(this.incidents[index].incidentId)) {
          this.incidents.splice(index, 1);
        }
      }
    }

    return expired;
  }

  private createIncident(key: IncidentKey, detection: DetectionResult, observedAtMs: number): IncidentContext {
    const timestamp = new Date(observedAtMs).toISOString();

    return {
      incidentId: this.nextIncidentId(),
      guildId: key.guildId,
      actorId: key.actorId,
      correlationIds: [detection.correlationId],
      firstSeen: timestamp,
      lastSeen: timestamp,
      severity: this.calculateSeverity([detection]),
      detections: [detection],
      metadata: {
        open: true,
        detectionCount: 1,
      },
    };
  }

  private mergeIncident(incident: IncidentContext, detection: DetectionResult, observedAtMs: number): IncidentContext {
    const detections = [...incident.detections, detection];
    const correlationIds = incident.correlationIds.includes(detection.correlationId)
      ? [...incident.correlationIds]
      : [...incident.correlationIds, detection.correlationId];

    return {
      ...incident,
      detections,
      correlationIds,
      lastSeen: new Date(Math.max(Date.parse(incident.lastSeen), observedAtMs)).toISOString(),
      severity: this.calculateSeverity(detections),
      metadata: {
        ...incident.metadata,
        detectionCount: detections.length,
      },
    };
  }

  private calculateSeverity(detections: readonly DetectionResult[]): IncidentSeverity {
    const count = detections.length;
    const maxConfidence = detections.reduce((max, detection) => Math.max(max, detection.confidence), 0);

    if (count >= 5 || maxConfidence >= 0.99) {
      return IncidentSeverity.CRITICAL;
    }

    if (count >= 3 || maxConfidence >= 0.95) {
      return IncidentSeverity.HIGH;
    }

    if (count >= 2 || maxConfidence >= 0.75) {
      return IncidentSeverity.MEDIUM;
    }

    return IncidentSeverity.LOW;
  }

  private findMatch(key: IncidentKey, observedAtMs: number): IncidentContext | undefined {
    const cutoffMs = observedAtMs - this.correlationWindowMs;

    return this.listOpenIncidents()
      .filter((incident) => Date.parse(incident.lastSeen) >= cutoffMs)
      .find((incident) => this.sameKey(incident, key));
  }

  private sameKey(incident: IncidentContext, key: IncidentKey): boolean {
    if (incident.guildId !== key.guildId) {
      return false;
    }

    if (key.actorId === 'unknown-actor') {
      return true;
    }

    return incident.actorId === key.actorId;
  }

  private extractIncidentKey(detection: DetectionResult): IncidentKey {
    const metadata = this.readMetadata(detection.metadata);

    return {
      guildId: this.readString(metadata, 'guildId', 'guild_id') ?? 'unknown-guild',
      actorId: this.readString(metadata, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor',
    };
  }

  private extractObservedAtMs(detection: DetectionResult): number {
    const metadata = this.readMetadata(detection.metadata);
    const timestamp = this.readString(metadata, 'timestamp', 'eventTimestamp', 'occurredAt');

    if (!timestamp) {
      return this.now();
    }

    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      return this.now();
    }

    return parsed;
  }

  private readMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return metadata ?? {};
  }

  private readString(
    metadata: Record<string, unknown>,
    ...keys: string[]
  ): string | undefined {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private nextIncidentId(): string {
    this.incidentCounter += 1;
    return `incident-${this.incidentCounter.toString().padStart(6, '0')}`;
  }
}
