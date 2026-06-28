import { SecurityDecisionModel } from './security-decision-types';
import { SecurityAction, SecurityActionPlan, SecurityActionType } from './security-action-planner';
import { SecurityActionType as SecurityPolicyActionType, SecurityDecision } from './security-policy-types';

export interface FastPathExecutionPartition {
  readonly immediateActions: readonly SecurityAction[];
  readonly deferredActions: readonly SecurityAction[];
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityRuntimeExecutionAdapter {
  partition(
    decision: SecurityDecisionModel,
    actionPlan: SecurityActionPlan,
    actionType: SecurityPolicyActionType,
  ): FastPathExecutionPartition;
}

export class UnauthorizedBotAddFastPathExecutionAdapter implements SecurityRuntimeExecutionAdapter {
  partition(
    decision: SecurityDecisionModel,
    actionPlan: SecurityActionPlan,
    actionType: SecurityPolicyActionType,
  ): FastPathExecutionPartition {
    const orderedActions = [...actionPlan.actions].sort((left, right) => left.sequence - right.sequence);

    if (actionType !== SecurityPolicyActionType.BOT_ADD || decision.decision !== SecurityDecision.BLOCK) {
      return Object.freeze({
        immediateActions: Object.freeze(orderedActions),
        deferredActions: Object.freeze([]),
      });
    }

    const immediateActions = orderedActions.filter((action) => action.type === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    const deferredActions = orderedActions.filter((action) => action.type !== SecurityActionType.REMOVE_UNAUTHORIZED_BOT);

    return Object.freeze({
      immediateActions: Object.freeze(immediateActions),
      deferredActions: Object.freeze(deferredActions),
      metadata: Object.freeze({
        fastPath: true,
        dispatchTargetMs: '1-5',
      }),
    });
  }
}