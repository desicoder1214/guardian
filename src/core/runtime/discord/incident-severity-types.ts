import { IncidentContext } from './incident-correlation-types';

export enum IncidentEscalationLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface IncidentEscalationResult {
  readonly incidentId: string;
  readonly escalationLevel: IncidentEscalationLevel;
  readonly reasons: readonly string[];
  readonly confidence: number;
  readonly recommendedActions: readonly string[];
  readonly evaluatedAt: string;
}

export interface IncidentSeverityEvaluator {
  evaluate(incident: IncidentContext): IncidentEscalationResult;
}
