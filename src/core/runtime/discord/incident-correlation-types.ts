import { DetectionResult } from './generic-detector-types';

export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface IncidentContext {
  readonly incidentId: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly correlationIds: readonly string[];
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly severity: IncidentSeverity;
  readonly detections: readonly DetectionResult[];
  readonly metadata: Record<string, unknown>;
}

export interface IncidentCorrelationEngine {
  correlate(detection: DetectionResult): IncidentContext;
  getIncident(id: string): IncidentContext | undefined;
  listOpenIncidents(): readonly IncidentContext[];
  expire(): readonly IncidentContext[];
}
