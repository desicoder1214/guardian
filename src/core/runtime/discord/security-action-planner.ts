import type { ThreatAssessment } from './runtime-threat-interpretation-engine';
import { SecurityDecisionModel } from './security-decision-types';
import { SecurityDecision } from './security-policy-types';

export enum SecurityActionType {
  NONE = 'NONE',
  INVESTIGATE = 'INVESTIGATE',
  QUARANTINE_ACTOR = 'QUARANTINE_ACTOR',
  REMOVE_UNAUTHORIZED_BOT = 'REMOVE_UNAUTHORIZED_BOT',
  FREEZE_WEBHOOKS = 'FREEZE_WEBHOOKS',
  REMOVE_DANGEROUS_ROLE = 'REMOVE_DANGEROUS_ROLE',
  NEUTRALIZE_ESCALATED_MEMBER = 'NEUTRALIZE_ESCALATED_MEMBER',
  REVOKE_ESCALATION_SOURCE = 'REVOKE_ESCALATION_SOURCE',
  PUNISH_ROLE_ESCALATION_ACTOR = 'PUNISH_ROLE_ESCALATION_ACTOR',
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

export interface SecurityActionPlanMetadata {
  readonly threatAssessment?: ThreatAssessment;
}

export interface SecurityActionPlan {
  readonly decision: SecurityDecision;
  readonly actions: readonly SecurityAction[];
  readonly correlationId: string;
  readonly metadata?: SecurityActionPlanMetadata;
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

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readBoolean(record: Record<string, unknown> | undefined, ...keys: string[]): boolean | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return undefined;
}

function resolveRoleEscalationActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const protectedRole = readBoolean(metadataRecord, 'protectedRole', 'protected_role') === true;
  const policyRecord = readRecord(metadataRecord?.policy);

  const punishActor = readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? readBoolean(metadataRecord, 'policyPunishActor', 'policy_punish_actor') ?? true;
  const neutralizeTarget = readBoolean(
    policyRecord,
    'neutralizeTarget',
    'neutralize_target',
  ) ?? readBoolean(metadataRecord, 'policyNeutralizeTarget', 'policy_neutralize_target') ?? true;

  const actions: SecurityActionType[] = [SecurityActionType.REMOVE_DANGEROUS_ROLE];

  if (!protectedRole && punishActor) {
    actions.push(SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR);
  }

  if (!protectedRole && neutralizeTarget) {
    actions.push(SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function resolveWebhookContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'webhookContainmentRequired',
    'webhook_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? readBoolean(metadataRecord, 'policyPunishActor', 'policy_punish_actor') ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [SecurityActionType.FREEZE_WEBHOOKS];

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

const ACTION_PRIORITY_MAP: Record<SecurityActionType, SecurityActionPriority> = {
  [SecurityActionType.NONE]: SecurityActionPriority.LOW,
  [SecurityActionType.INVESTIGATE]: SecurityActionPriority.NORMAL,
  [SecurityActionType.QUARANTINE_ACTOR]: SecurityActionPriority.CRITICAL,
  [SecurityActionType.REMOVE_UNAUTHORIZED_BOT]: SecurityActionPriority.CRITICAL,
  [SecurityActionType.FREEZE_WEBHOOKS]: SecurityActionPriority.HIGH,
  [SecurityActionType.REMOVE_DANGEROUS_ROLE]: SecurityActionPriority.CRITICAL,
  [SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER]: SecurityActionPriority.HIGH,
  [SecurityActionType.REVOKE_ESCALATION_SOURCE]: SecurityActionPriority.HIGH,
  [SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR]: SecurityActionPriority.NORMAL,
  [SecurityActionType.LOCK_CHANNELS]: SecurityActionPriority.HIGH,
  [SecurityActionType.RESTORE_RESOURCE]: SecurityActionPriority.HIGH,
  [SecurityActionType.CREATE_INCIDENT]: SecurityActionPriority.NORMAL,
  [SecurityActionType.NOTIFY_AUDIT]: SecurityActionPriority.NORMAL,
  [SecurityActionType.ESCALATE]: SecurityActionPriority.CRITICAL,
};

export class InMemorySecurityActionPlanner implements SecurityActionPlanner {
  plan(decisionModel: SecurityDecisionModel): SecurityActionPlan {
    const actionTypes = this.resolveActions(decisionModel.decision);
    const resolvedActionTypes =
      decisionModel.decision === SecurityDecision.BLOCK && decisionModel.actionType === 'ROLE_CREATE'
        ? resolveRoleEscalationActions(decisionModel.metadata)
        : decisionModel.decision === SecurityDecision.BLOCK && decisionModel.actionType === 'WEBHOOK_CREATE'
          ? resolveWebhookContainmentActions(decisionModel.metadata)
          : actionTypes;
    const uniqueActionTypes = [...new Set(resolvedActionTypes)];
    const threatAssessment = this.readThreatAssessment(decisionModel.metadata);
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
      ...(threatAssessment
        ? {
            metadata: Object.freeze({
              threatAssessment,
            }),
          }
        : {}),
    });
  }

  private resolveActions(decision: SecurityDecision): readonly SecurityActionType[] {
    return DECISION_ACTION_MATRIX[decision] ?? [SecurityActionType.NONE];
  }

  private readThreatAssessment(metadata: unknown): ThreatAssessment | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const candidate = metadata as { threatAssessment?: ThreatAssessment };
    const threatAssessment = candidate.threatAssessment;

    if (!threatAssessment || typeof threatAssessment !== 'object') {
      return undefined;
    }

    return Object.freeze({
      severity: threatAssessment.severity,
      confidence: threatAssessment.confidence,
      disposition: threatAssessment.disposition,
      rationale: threatAssessment.rationale,
      correlationIds: Object.freeze([...threatAssessment.correlationIds]),
      overrides: Object.freeze(
        threatAssessment.overrides.map((override) =>
          Object.freeze({
            type: override.type,
            applicableEventTypes: Object.freeze([...override.applicableEventTypes]),
            reason: override.reason,
            metadata: override.metadata ? Object.freeze({ ...override.metadata }) : undefined,
          }),
        ),
      ),
    });
  }
}
