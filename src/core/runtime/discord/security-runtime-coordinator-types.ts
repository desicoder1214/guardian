import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { IncidentContext } from './incident-correlation-types';
import { SecurityActionPlan } from './security-action-planner';
import { ExecutionResult } from './security-execution-types';
import { SecurityDecisionModel } from './security-decision-types';
import { SecurityActionType } from './security-policy-types';

export interface SecurityRuntimeCoordinatorInput {
  readonly normalizedEvent: DiscordGatewayNormalizedEvent;
  readonly actorId: string;
  readonly actionType: SecurityActionType;
  readonly incidentContext?: IncidentContext;
}

export interface SecurityRuntimeResult {
  readonly decision: SecurityDecisionModel;
  readonly actionPlan: SecurityActionPlan;
  readonly executionResult: ExecutionResult;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface SecurityRuntimeCoordinator {
  coordinate(input: SecurityRuntimeCoordinatorInput): Promise<SecurityRuntimeResult>;
}
