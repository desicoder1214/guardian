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

const DEFAULT_DANGEROUS_PERMISSIONS = Object.freeze([
  'ADMINISTRATOR',
  'MANAGE_GUILD',
  'MANAGE_ROLES',
  'MANAGE_CHANNELS',
  'BAN_MEMBERS',
  'KICK_MEMBERS',
  'MANAGE_WEBHOOKS',
  'MODERATE_MEMBERS',
]);

export class UnauthorizedRoleCreateDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-role-create-detector';
  readonly version = '1.0.0';
  readonly priority = 95;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.ROLE_CREATE]);

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

    const isRoleCreateEvent = eventName === 'ROLE_CREATE' || eventName === 'GUILD_ROLE_CREATE';
    const isAuthorizedRole = typeof roleId === 'string' && authorizedRoleIds.has(roleId);
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);

    const rolePermissions = this.readRolePermissions(payload);
    const dangerousPermissions = this.readDangerousPermissions(payload);
    const dangerousPermissionOverlap = rolePermissions.filter((permission) => dangerousPermissions.has(permission));
    const dangerousRoleCreated = dangerousPermissionOverlap.length > 0;

    const rolePolicyViolation =
      this.readBoolean(
        payload,
        'rolePolicyViolation',
        'role_policy_violation',
        'dangerousRoleCreation',
        'dangerous_role_creation',
        'unauthorizedRoleCreation',
        'unauthorized_role_creation',
        'policyViolation',
        'policy_violation',
      ) ?? dangerousRoleCreated;

    const unauthorizedRoleCreation = isRoleCreateEvent && !isAuthorizedRole && !isAuthorizedActor && !isTrustedActor;
    const malicious = isRoleCreateEvent && (unauthorizedRoleCreation || rolePolicyViolation);

    const policyRecord = this.readNestedRecord(payload, 'policy');
    const policyPunishActor =
      this.readBoolean(policyRecord, 'punishActor', 'punish_actor') ??
      this.readBoolean(payload, 'policyPunishActor', 'policy_punish_actor') ??
      true;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isRoleCreateEvent,
        roleId,
        actorId,
        isAuthorizedRole,
        isAuthorizedActor,
        isTrustedActor,
        rolePolicyViolation,
        dangerousPermissionOverlap,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        roleId,
        actorId,
        unauthorizedRoleCreation,
        rolePolicyViolation,
        dangerousRoleCreated,
        dangerousPermissionOverlap: Object.freeze([...dangerousPermissionOverlap]),
        rolePermissions: Object.freeze([...rolePermissions]),
        isAuthorizedRole,
        isAuthorizedActor,
        isTrustedActor,
        policyPunishActor,
        policyNeutralizeTarget: false,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['ROLE_CREATE']),
                reason: 'mandatory unauthorized role creation containment',
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
        unauthorizedRoleCreation,
        rolePolicyViolation,
        dangerousRoleCreated,
        dangerousPermissionOverlap: Object.freeze([...dangerousPermissionOverlap]),
        isAuthorizedRole,
        isAuthorizedActor,
        isTrustedActor,
        policyPunishActor,
        policyNeutralizeTarget: false,
      }),
    });
  }

  private readRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as Record<string, unknown>;
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

  private readRolePermissions(payload: Record<string, unknown> | undefined): readonly string[] {
    const role = this.readNestedRecord(payload, 'role');
    const permissions = this.readStringArray(role, 'permissions');
    if (permissions.length > 0) {
      return permissions;
    }

    const direct = this.readStringArray(payload, 'permissions');
    if (direct.length > 0) {
      return direct;
    }

    return this.readStringArray(payload, 'rolePermissions');
  }

  private readDangerousPermissions(payload: Record<string, unknown> | undefined): Set<string> {
    const direct = this.readStringArray(payload, 'dangerousPermissions');
    if (direct.length > 0) {
      return new Set(direct);
    }

    const alternate = this.readStringArray(payload, 'dangerous_permissions');
    if (alternate.length > 0) {
      return new Set(alternate);
    }

    return new Set(DEFAULT_DANGEROUS_PERMISSIONS);
  }

  private resolveReason(
    isRoleCreateEvent: boolean,
    roleId: string | undefined,
    actorId: string,
    isAuthorizedRole: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    rolePolicyViolation: boolean,
    dangerousPermissionOverlap: readonly string[],
  ): string {
    if (!isRoleCreateEvent) {
      return 'Event does not represent role creation';
    }

    if (rolePolicyViolation) {
      if (dangerousPermissionOverlap.length > 0) {
        return `Role ${roleId ?? 'unknown-role'} created with dangerous permissions: ${dangerousPermissionOverlap.join(', ')}`;
      }

      return `Role ${roleId ?? 'unknown-role'} violates role creation policy`;
    }

    if (isAuthorizedRole || isAuthorizedActor || isTrustedActor) {
      return `Role ${roleId ?? 'unknown-role'} creation authorized for actor ${actorId}`;
    }

    return `Role ${roleId ?? 'unknown-role'} creation is not authorized for actor ${actorId}`;
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
