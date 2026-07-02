import {
  DetectionConfidence,
  DetectionContext,
  DetectionDisposition,
  DetectionFinding,
  DetectionResult,
  DetectionSeverity,
} from './detection-engine';
import { DetectorPlugin } from './detection-plugin-framework';
import { SecurityActionType } from './security-policy-types';

export class UnauthorizedMemberModerationDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-member-moderation-detector';
  readonly version = '1.0.0';
  readonly priority = 97;
  readonly supportedActionTypes = Object.freeze([
    SecurityActionType.MEMBER_BAN,
    SecurityActionType.MEMBER_KICK,
  ]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const moderationAction = this.resolveModerationAction(eventName, payload);
    const memberUserId = this.readMemberUserId(payload);
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor';

    const authorizedMemberIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedMemberIds',
      'authorized_member_ids',
      'memberModerationAuthorization',
    );
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedActorIds',
      'authorized_actor_ids',
      'memberModerationAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'memberModerationAuthorization',
    );

    const memberModerationPolicyViolation =
      this.readBoolean(
        payload,
        'memberModerationPolicyViolation',
        'member_moderation_policy_violation',
        'memberPolicyViolation',
        'member_policy_violation',
        'dangerousMemberModeration',
        'dangerous_member_moderation',
        'policyViolation',
        'policy_violation',
      ) ?? false;

    const isAuthorizedMember = typeof memberUserId === 'string' && authorizedMemberIds.has(memberUserId);
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const unauthorizedMemberModeration =
      moderationAction !== 'UNKNOWN' && !isAuthorizedMember && !isAuthorizedActor && !isTrustedActor;
    const malicious = unauthorizedMemberModeration || memberModerationPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        moderationAction,
        memberUserId,
        actorId,
        isAuthorizedMember,
        isAuthorizedActor,
        isTrustedActor,
        memberModerationPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        moderationAction,
        memberUserId,
        actorId,
        unauthorizedMemberModeration,
        memberModerationPolicyViolation,
        isAuthorizedMember,
        isAuthorizedActor,
        isTrustedActor,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze([context.actionType]),
                reason: 'mandatory unauthorized member moderation containment',
              }),
            ])
          : Object.freeze([]),
      }),
    });

    return Object.freeze({
      detectorId: this.detectorId,
      matched: malicious,
      findings: Object.freeze([finding]),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        detectorType: 'production-foundation',
        eventName,
        moderationAction,
        memberUserId,
        actorId,
        unauthorizedMemberModeration,
        memberModerationPolicyViolation,
        isAuthorizedMember,
        isAuthorizedActor,
        isTrustedActor,
      }),
    });
  }

  private readRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
    if (!record) {
      return undefined;
    }

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private readBoolean(record: Record<string, unknown> | undefined, ...keys: string[]): boolean | undefined {
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

  private readStringArray(record: Record<string, unknown> | undefined, key: string): readonly string[] {
    if (!record) {
      return Object.freeze([]);
    }

    const value = record[key];
    if (!Array.isArray(value)) {
      return Object.freeze([]);
    }

    return Object.freeze(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0));
  }

  private readNestedRecord(
    record: Record<string, unknown> | undefined,
    key: string,
  ): Record<string, unknown> | undefined {
    if (!record) {
      return undefined;
    }

    const value = record[key];
    return this.readRecord(value);
  }

  private readAuthorizationIds(
    metadata: Record<string, unknown> | undefined,
    directKey: string,
    alternateDirectKey: string,
    nestedKey: string,
  ): Set<string> {
    const direct = this.readStringArray(metadata, directKey);
    const alternate = this.readStringArray(metadata, alternateDirectKey);
    const nested = this.readStringArray(this.readNestedRecord(metadata, nestedKey), directKey);
    const nestedAlternate = this.readStringArray(this.readNestedRecord(metadata, nestedKey), alternateDirectKey);

    return new Set([...direct, ...alternate, ...nested, ...nestedAlternate]);
  }

  private readMemberUserId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(
      payload,
      'memberUserId',
      'member_user_id',
      'memberId',
      'member_id',
      'targetUserId',
      'target_user_id',
      'targetId',
      'target_id',
      'resourceId',
      'resource_id',
    );
    if (direct) {
      return direct;
    }

    const user = this.readNestedRecord(payload, 'user');
    return this.readString(user, 'id', 'userId', 'user_id');
  }

  private resolveModerationAction(
    eventName: string,
    payload: Record<string, unknown> | undefined,
  ): 'BAN' | 'KICK' | 'UNKNOWN' {
    if (eventName === 'GUILD_BAN_ADD' || eventName === 'MEMBER_BAN') {
      return 'BAN';
    }

    if (eventName === 'MEMBER_REMOVE') {
      return 'KICK';
    }

    if (eventName !== 'GUILD_MEMBER_REMOVE') {
      return 'UNKNOWN';
    }

    const explicitAction = this.readString(
      payload,
      'moderationAction',
      'moderation_action',
      'memberRemoveCause',
      'member_remove_cause',
      'removalType',
      'removal_type',
    );

    if (explicitAction) {
      const normalizedAction = explicitAction.toUpperCase();
      if (normalizedAction === 'KICK') {
        return 'KICK';
      }

      if (normalizedAction === 'BAN') {
        return 'BAN';
      }
    }

    const wasKicked = this.readBoolean(payload, 'kicked', 'wasKicked', 'isKick', 'memberKicked');
    if (wasKicked === true) {
      return 'KICK';
    }

    const auditEntry = this.readNestedRecord(payload, 'auditLogEntry');
    const auditActionType = this.readString(auditEntry, 'actionType', 'action_type')?.toUpperCase();
    if (auditActionType === 'MEMBER_KICK') {
      return 'KICK';
    }

    if (auditActionType === 'MEMBER_BAN') {
      return 'BAN';
    }

    return 'UNKNOWN';
  }

  private resolveReason(
    moderationAction: 'BAN' | 'KICK' | 'UNKNOWN',
    memberUserId: string | undefined,
    actorId: string,
    isAuthorizedMember: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    memberModerationPolicyViolation: boolean,
  ): string {
    if (moderationAction === 'UNKNOWN') {
      return 'Event does not represent ban/kick moderation';
    }

    if (memberModerationPolicyViolation) {
      return `Member ${memberUserId ?? 'unknown-member'} ${moderationAction.toLowerCase()} violates moderation policy`;
    }

    if (isAuthorizedMember || isAuthorizedActor || isTrustedActor) {
      return `Member ${memberUserId ?? 'unknown-member'} ${moderationAction.toLowerCase()} authorized for actor ${actorId}`;
    }

    return `Member ${memberUserId ?? 'unknown-member'} ${moderationAction.toLowerCase()} is not authorized for actor ${actorId}`;
  }

  private freezeFinding(finding: DetectionFinding): DetectionFinding {
    return Object.freeze({
      detectorId: finding.detectorId,
      severity: finding.severity,
      confidence: finding.confidence,
      disposition: finding.disposition,
      reason: finding.reason,
      correlationId: finding.correlationId,
      metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
    });
  }
}
