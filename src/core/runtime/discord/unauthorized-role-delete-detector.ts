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

export class UnauthorizedRoleDeleteDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-role-delete-detector';
  readonly version = '1.0.0';
  readonly priority = 95;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.ROLE_DELETE]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const roleId = this.readRoleId(payload);
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor';

    const authorizedRoleIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedRoleIds',
      'authorized_role_ids',
      'roleAuthorization',
    );
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedActorIds',
      'authorized_actor_ids',
      'roleAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'roleAuthorization',
    );

    const isRoleDeleteEvent = eventName === 'ROLE_DELETE' || eventName === 'GUILD_ROLE_DELETE';
    const isAuthorizedRole = typeof roleId === 'string' && authorizedRoleIds.has(roleId);
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const rolePolicyViolation = this.readBoolean(
      payload,
      'rolePolicyViolation',
      'role_policy_violation',
      'dangerousRoleDeletion',
      'dangerous_role_deletion',
      'policyViolation',
      'policy_violation',
    ) ?? false;

    const unauthorizedRoleDeletion =
      isRoleDeleteEvent && !isAuthorizedRole && !isAuthorizedActor && !isTrustedActor;
    const malicious = unauthorizedRoleDeletion || rolePolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isRoleDeleteEvent,
        roleId,
        actorId,
        isAuthorizedRole,
        isAuthorizedActor,
        isTrustedActor,
        rolePolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        roleId,
        actorId,
        unauthorizedRoleDeletion,
        rolePolicyViolation,
        isAuthorizedRole,
        isAuthorizedActor,
        isTrustedActor,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['ROLE_DELETE']),
                reason: 'mandatory unauthorized role deletion containment',
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
        roleId,
        actorId,
        unauthorizedRoleDeletion,
        rolePolicyViolation,
        isAuthorizedRole,
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

  private readRoleId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(
      payload,
      'roleId',
      'role_id',
      'targetRoleId',
      'target_role_id',
      'targetId',
      'target_id',
      'resourceId',
      'resource_id',
    );
    if (direct) {
      return direct;
    }

    const role = this.readNestedRecord(payload, 'role');
    return this.readString(role, 'id', 'roleId', 'role_id');
  }

  private resolveReason(
    isRoleDeleteEvent: boolean,
    roleId: string | undefined,
    actorId: string,
    isAuthorizedRole: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    rolePolicyViolation: boolean,
  ): string {
    if (!isRoleDeleteEvent) {
      return 'Event does not represent role deletion';
    }

    if (rolePolicyViolation) {
      return `Role ${roleId ?? 'unknown-role'} violates role deletion policy`;
    }

    if (isAuthorizedRole || isAuthorizedActor || isTrustedActor) {
      return `Role ${roleId ?? 'unknown-role'} deletion authorized for actor ${actorId}`;
    }

    return `Role ${roleId ?? 'unknown-role'} deletion is not authorized for actor ${actorId}`;
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
