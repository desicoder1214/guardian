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

export class UnauthorizedChannelCreateDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-channel-create-detector';
  readonly version = '1.0.0';
  readonly priority = 95;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.CHANNEL_CREATE]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const channelId = this.readChannelId(payload);
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor';

    const authorizedChannelIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedChannelIds',
      'authorized_channel_ids',
      'channelAuthorization',
    );
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedActorIds',
      'authorized_actor_ids',
      'actorAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'actorAuthorization',
    );

    const isChannelCreateEvent = eventName === 'CHANNEL_CREATE';
    const isAuthorizedChannel = typeof channelId === 'string' && authorizedChannelIds.has(channelId);
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const channelPolicyViolation = this.readBoolean(
      payload,
      'channelPolicyViolation',
      'channel_policy_violation',
      'dangerousChannelCreation',
      'dangerous_channel_creation',
      'policyViolation',
      'policy_violation',
    ) ?? false;

    const unauthorizedChannelCreation = isChannelCreateEvent && !isAuthorizedChannel && !isAuthorizedActor && !isTrustedActor;
    const malicious = unauthorizedChannelCreation || channelPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isChannelCreateEvent,
        channelId,
        actorId,
        isAuthorizedChannel,
        isAuthorizedActor,
        isTrustedActor,
        channelPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        channelId,
        actorId,
        unauthorizedChannelCreation,
        channelPolicyViolation,
        isAuthorizedChannel,
        isAuthorizedActor,
        isTrustedActor,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['CHANNEL_CREATE']),
                reason: 'mandatory unauthorized channel creation containment',
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
        channelId,
        actorId,
        unauthorizedChannelCreation,
        channelPolicyViolation,
        isAuthorizedChannel,
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

  private readChannelId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(
      payload,
      'channelId',
      'channel_id',
      'targetChannelId',
      'target_channel_id',
      'targetId',
      'target_id',
      'resourceId',
      'resource_id',
    );
    if (direct) {
      return direct;
    }

    const channel = this.readNestedRecord(payload, 'channel');
    return this.readString(channel, 'id', 'channelId', 'channel_id');
  }

  private resolveReason(
    isChannelCreateEvent: boolean,
    channelId: string | undefined,
    actorId: string,
    isAuthorizedChannel: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    channelPolicyViolation: boolean,
  ): string {
    if (!isChannelCreateEvent) {
      return 'Event does not represent channel creation';
    }

    if (channelPolicyViolation) {
      return `Channel ${channelId ?? 'unknown-channel'} violates channel creation policy`;
    }

    if (isAuthorizedChannel || isAuthorizedActor || isTrustedActor) {
      return `Channel ${channelId ?? 'unknown-channel'} creation authorized for actor ${actorId}`;
    }

    return `Channel ${channelId ?? 'unknown-channel'} is not authorized`;
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