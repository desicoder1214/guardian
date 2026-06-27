import { SecurityDecisionModel } from './security-decision-types';
import { SecurityDecision } from './security-policy-types';

export enum SecurityActionType {
  NONE = 'NONE',
  INVESTIGATE = 'INVESTIGATE',
  QUARANTINE_ACTOR = 'QUARANTINE_ACTOR',
  REMOVE_UNAUTHORIZED_BOT = 'REMOVE_UNAUTHORIZED_BOT',
  FREEZE_WEBHOOKS = 'FREEZE_WEBHOOKS',
  LOCK_CHANNELS = 'LOCK_CHANNELS',
  RESTORE_RESOURCE = 'RESTORE_RESOURCE',
  CREATE_INCIDENT = 'CREATE_INCIDENT',
  NOTIFY_AUDIT = 'NOTIFY_AUDIT',
  ESCALATE = 'ESCALATE',
}

export enum SecurityActionPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export interface SecurityAction {
  readonly type: SecurityActionType;
  readonly priority: SecurityActionPriority;
  readonly sequence: number;
  readonly metadata?: unknown;
}

export interface SecurityActionPlan {
  readonly decision: SecurityDecision;
  readonly actions: readonly SecurityAction[];
  readonly correlationId: string;
}

export interface SecurityActionPlanner {
  plan(decisionModel: SecurityDecisionModel): SecurityActionPlan;
}

const DECISION_ACTION_MATRIX: Record<SecurityDecision, readonly SecurityActionType[]> = {
  [SecurityDecision.ALLOW]: [SecurityActionType.NONE],
  [SecurityDecision.IGNORE]: [SecurityActionType.NONE],
  [SecurityDecision.INVESTIGATE]: [SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT],
  [SecurityDecision.CONTAIN]: [
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ],
  [SecurityDecision.BLOCK]: [
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ],
};

const ACTION_PRIORITY_MAP: Record<SecurityActionType, SecurityActionPriority> = {
  [SecurityActionType.NONE]: SecurityActionPriority.LOW,
  [SecurityActionType.INVESTIGATE]: SecurityActionPriority.NORMAL,
  [SecurityActionType.QUARANTINE_ACTOR]: SecurityActionPriority.CRITICAL,
  [SecurityActionType.REMOVE_UNAUTHORIZED_BOT]: SecurityActionPriority.CRITICAL,
  [SecurityActionType.FREEZE_WEBHOOKS]: SecurityActionPriority.HIGH,
  [SecurityActionType.LOCK_CHANNELS]: SecurityActionPriority.HIGH,
  [SecurityActionType.RESTORE_RESOURCE]: SecurityActionPriority.HIGH,
  [SecurityActionType.CREATE_INCIDENT]: SecurityActionPriority.NORMAL,
  [SecurityActionType.NOTIFY_AUDIT]: SecurityActionPriority.NORMAL,
  [SecurityActionType.ESCALATE]: SecurityActionPriority.CRITICAL,
};

export class InMemorySecurityActionPlanner implements SecurityActionPlanner {
  plan(decisionModel: SecurityDecisionModel): SecurityActionPlan {
    const actionTypes = this.resolveActions(decisionModel.decision);
    const uniqueActionTypes = [...new Set(actionTypes)];
    const actions = uniqueActionTypes.map((type, index) => {
      const metadata = Object.freeze({
        decision: decisionModel.decision,
        reason: decisionModel.reason,
      });

      return Object.freeze({
        type,
        priority: ACTION_PRIORITY_MAP[type],
        sequence: index + 1,
        metadata,
      });
    });

    return Object.freeze({
      decision: decisionModel.decision,
      actions: Object.freeze(actions),
      correlationId: decisionModel.correlationId,
    });
  }

  private resolveActions(decision: SecurityDecision): readonly SecurityActionType[] {
    return DECISION_ACTION_MATRIX[decision] ?? [SecurityActionType.NONE];
  }
}
