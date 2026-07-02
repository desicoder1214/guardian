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

export class UnauthorizedPermissionOverwriteDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-permission-overwrite-detector';
  readonly version = '1.0.0';
  readonly priority = 96;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.PERMISSION_OVERWRITE_UPDATE]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const overwriteId = this.readOverwriteId(payload);
    const channelId = this.readChannelId(payload);
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor';

    const authorizedOverwriteIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedOverwriteIds',
      'authorized_overwrite_ids',
      'permissionOverwriteAuthorization',
    );
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedActorIds',
      'authorized_actor_ids',
      'permissionOverwriteAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'permissionOverwriteAuthorization',
    );

    const isOverwriteEvent =
      eventName === 'PERMISSION_OVERWRITE_CREATE' ||
      eventName === 'PERMISSION_OVERWRITE_UPDATE' ||
      eventName === 'PERMISSION_OVERWRITE_DELETE' ||
      eventName === 'CHANNEL_OVERWRITE_CREATE' ||
      eventName === 'CHANNEL_OVERWRITE_UPDATE' ||
      eventName === 'CHANNEL_OVERWRITE_DELETE';
    const isAuthorizedOverwrite = typeof overwriteId === 'string' && authorizedOverwriteIds.has(overwriteId);
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const overwritePolicyViolation =
      this.readBoolean(
        payload,
        'permissionOverwritePolicyViolation',
        'permission_overwrite_policy_violation',
        'overwritePolicyViolation',
        'overwrite_policy_violation',
        'dangerousPermissionOverwrite',
        'dangerous_permission_overwrite',
        'policyViolation',
        'policy_violation',
      ) ?? false;

    const unauthorizedPermissionOverwrite =
      isOverwriteEvent && !isAuthorizedOverwrite && !isAuthorizedActor && !isTrustedActor;
    const malicious = unauthorizedPermissionOverwrite || overwritePolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isOverwriteEvent,
        overwriteId,
        channelId,
        actorId,
        isAuthorizedOverwrite,
        isAuthorizedActor,
        isTrustedActor,
        overwritePolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        overwriteId,
        channelId,
        actorId,
        unauthorizedPermissionOverwrite,
        overwritePolicyViolation,
        isAuthorizedOverwrite,
        isAuthorizedActor,
        isTrustedActor,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['PERMISSION_OVERWRITE_UPDATE']),
                reason: 'mandatory unauthorized permission overwrite containment',
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
        overwriteId,
        channelId,
        actorId,
        unauthorizedPermissionOverwrite,
        overwritePolicyViolation,
        isAuthorizedOverwrite,
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

  private readOverwriteId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(
      payload,
      'overwriteId',
      'overwrite_id',
      'targetOverwriteId',
      'target_overwrite_id',
      'targetId',
      'target_id',
      'resourceId',
      'resource_id',
    );
    if (direct) {
      return direct;
    }

    const overwrite = this.readNestedRecord(payload, 'overwrite');
    return this.readString(overwrite, 'id', 'overwriteId', 'overwrite_id');
  }

  private readChannelId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(
      payload,
      'channelId',
      'channel_id',
      'targetChannelId',
      'target_channel_id',
    );
    if (direct) {
      return direct;
    }

    const channel = this.readNestedRecord(payload, 'channel');
    return this.readString(channel, 'id', 'channelId', 'channel_id');
  }

  private resolveReason(
    isOverwriteEvent: boolean,
    overwriteId: string | undefined,
    channelId: string | undefined,
    actorId: string,
    isAuthorizedOverwrite: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    overwritePolicyViolation: boolean,
  ): string {
    if (!isOverwriteEvent) {
      return 'Event does not represent permission overwrite mutation';
    }

    if (overwritePolicyViolation) {
      return `Permission overwrite ${overwriteId ?? 'unknown-overwrite'} violates overwrite policy on channel ${channelId ?? 'unknown-channel'}`;
    }

    if (isAuthorizedOverwrite || isAuthorizedActor || isTrustedActor) {
      return `Permission overwrite ${overwriteId ?? 'unknown-overwrite'} change authorized for actor ${actorId}`;
    }

    return `Permission overwrite ${overwriteId ?? 'unknown-overwrite'} change is not authorized for actor ${actorId}`;
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
