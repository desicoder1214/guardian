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

function shouldApplyWebhookMutationContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(metadataRecord, 'webhookContainmentRequired', 'webhook_containment_required') === true ||
    readBoolean(metadataRecord, 'unauthorizedWebhookDetected', 'unauthorized_webhook_detected') === true ||
    readBoolean(metadataRecord, 'webhookPolicyViolation', 'webhook_policy_violation') === true ||
    (typeof metadataRecord?.webhookId === 'string' && metadataRecord.webhookId.length > 0)
  );
}

function resolveWebhookMutationContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'webhookContainmentRequired',
    'webhook_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyWebhookPunishActor',
    'policy_webhook_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
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

function resolveChannelDeletionContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'channelContainmentRequired',
    'channel_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyChannelPunishActor',
    'policy_channel_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
  ];

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function resolveChannelCreationContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'channelContainmentRequired',
    'channel_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyChannelPunishActor',
    'policy_channel_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [SecurityActionType.LOCK_CHANNELS];

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function resolvePermissionOverwriteContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'permissionOverwriteContainmentRequired',
    'permission_overwrite_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyChannelPunishActor',
    'policy_channel_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [SecurityActionType.RESTORE_RESOURCE];

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function shouldApplyPermissionOverwriteContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(
      metadataRecord,
      'permissionOverwriteContainmentRequired',
      'permission_overwrite_containment_required',
    ) === true ||
    readBoolean(
      metadataRecord,
      'unauthorizedPermissionOverwrite',
      'unauthorized_permission_overwrite',
    ) === true ||
    readBoolean(
      metadataRecord,
      'permissionOverwritePolicyViolation',
      'permission_overwrite_policy_violation',
    ) === true ||
    (typeof metadataRecord?.overwriteId === 'string' && metadataRecord.overwriteId.length > 0)
  );
}

function shouldApplyChannelDeletionContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(metadataRecord, 'channelContainmentRequired', 'channel_containment_required') === true ||
    readBoolean(metadataRecord, 'unauthorizedChannelCreation', 'unauthorized_channel_creation') === true ||
    readBoolean(metadataRecord, 'unauthorizedChannelDeletion', 'unauthorized_channel_deletion') === true ||
    readBoolean(metadataRecord, 'channelPolicyViolation', 'channel_policy_violation') === true ||
    (typeof metadataRecord?.channelId === 'string' && metadataRecord.channelId.length > 0)
  );
}

function shouldApplyChannelCreationContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(metadataRecord, 'channelContainmentRequired', 'channel_containment_required') === true ||
    readBoolean(metadataRecord, 'unauthorizedChannelCreation', 'unauthorized_channel_creation') === true ||
    readBoolean(metadataRecord, 'channelPolicyViolation', 'channel_policy_violation') === true ||
    (typeof metadataRecord?.channelId === 'string' && metadataRecord.channelId.length > 0)
  );
}

function resolveRoleDeletionContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'roleDeletionContainmentRequired',
    'role_deletion_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyRoleDeletePunishActor',
    'policy_role_delete_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'roleDeletePunishActor',
    'role_delete_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';
  const memberUserId =
    typeof metadataRecord?.memberUserId === 'string' && metadataRecord.memberUserId.length > 0
      ? metadataRecord.memberUserId
      : undefined;
  const roleId =
    typeof metadataRecord?.roleId === 'string' && metadataRecord.roleId.length > 0
      ? metadataRecord.roleId
      : undefined;

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [];

  if (memberUserId && roleId) {
    actions.push(SecurityActionType.REMOVE_DANGEROUS_ROLE);
  }

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function shouldApplyRoleDeletionContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(metadataRecord, 'roleDeletionContainmentRequired', 'role_deletion_containment_required') === true ||
    readBoolean(metadataRecord, 'unauthorizedRoleDeletion', 'unauthorized_role_deletion') === true ||
    readBoolean(metadataRecord, 'roleDeletionPolicyViolation', 'role_deletion_policy_violation') === true ||
    (typeof metadataRecord?.roleId === 'string' && metadataRecord.roleId.length > 0)
  );
}

function resolveMemberModerationContainmentActions(metadata: unknown): readonly SecurityActionType[] {
  const metadataRecord = readRecord(metadata);
  const policyRecord = readRecord(metadataRecord?.policy);

  const containmentRequired = readBoolean(
    metadataRecord,
    'memberModerationContainmentRequired',
    'member_moderation_containment_required',
  ) ?? true;
  const punishActor = readBoolean(
    metadataRecord,
    'policyMemberPunishActor',
    'policy_member_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'memberPunishActor',
    'member_punish_actor',
  ) ?? readBoolean(
    policyRecord,
    'punishActor',
    'punish_actor',
  ) ?? true;
  const actorId =
    (typeof metadataRecord?.actorId === 'string' && metadataRecord.actorId.length > 0
      ? metadataRecord.actorId
      : undefined) ?? 'unknown-actor';
  const punishableActor = actorId !== 'unknown-actor';

  if (!containmentRequired) {
    return Object.freeze([SecurityActionType.NONE]);
  }

  const actions: SecurityActionType[] = [];

  if (punishActor && punishableActor) {
    actions.push(SecurityActionType.QUARANTINE_ACTOR);
  }

  actions.push(SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT);

  return Object.freeze(actions);
}

function shouldApplyMemberModerationContainment(metadata: unknown): boolean {
  const metadataRecord = readRecord(metadata);

  return (
    readBoolean(metadataRecord, 'memberModerationContainmentRequired', 'member_moderation_containment_required') === true ||
    readBoolean(metadataRecord, 'unauthorizedMemberModeration', 'unauthorized_member_moderation') === true ||
    readBoolean(metadataRecord, 'memberModerationPolicyViolation', 'member_moderation_policy_violation') === true ||
    (typeof metadataRecord?.memberUserId === 'string' && metadataRecord.memberUserId.length > 0)
  );
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
          : decisionModel.decision === SecurityDecision.BLOCK && decisionModel.actionType === 'WEBHOOK_DELETE'
            ? resolveWebhookMutationContainmentActions(decisionModel.metadata)
          : decisionModel.decision === SecurityDecision.BLOCK &&
              decisionModel.actionType === 'CHANNEL_CREATE' &&
              shouldApplyChannelCreationContainment(decisionModel.metadata)
            ? resolveChannelCreationContainmentActions(decisionModel.metadata)
          : decisionModel.decision === SecurityDecision.BLOCK &&
              decisionModel.actionType === 'CHANNEL_DELETE' &&
              shouldApplyChannelDeletionContainment(decisionModel.metadata)
            ? resolveChannelDeletionContainmentActions(decisionModel.metadata)
            : decisionModel.decision === SecurityDecision.BLOCK &&
                decisionModel.actionType === 'PERMISSION_OVERWRITE_UPDATE' &&
                shouldApplyPermissionOverwriteContainment(decisionModel.metadata)
              ? resolvePermissionOverwriteContainmentActions(decisionModel.metadata)
            : decisionModel.decision === SecurityDecision.BLOCK &&
                decisionModel.actionType === 'ROLE_DELETE' &&
                shouldApplyRoleDeletionContainment(decisionModel.metadata)
              ? resolveRoleDeletionContainmentActions(decisionModel.metadata)
            : decisionModel.decision === SecurityDecision.BLOCK &&
                (decisionModel.actionType === 'MEMBER_BAN' || decisionModel.actionType === 'MEMBER_KICK') &&
                shouldApplyMemberModerationContainment(decisionModel.metadata)
              ? resolveMemberModerationContainmentActions(decisionModel.metadata)
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
