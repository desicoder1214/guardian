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

type EmojiStickerDeletionKind = 'EMOJI' | 'STICKER' | 'UNKNOWN';

export class UnauthorizedEmojiStickerDeletionDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-emoji-sticker-deletion-detector';
  readonly version = '1.0.0';
  readonly priority = 97;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.MEMBER_KICK]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'userId', 'user_id') ?? 'unknown-actor';

    const deletionKind = this.resolveDeletionKind(eventName, payload);
    const deletedResourceIds = this.resolveDeletedResourceIds(deletionKind, payload);

    const authorizedEmojiIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedEmojiIds',
      'authorized_emoji_ids',
      'emojiStickerAuthorization',
    );
    const authorizedStickerIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedStickerIds',
      'authorized_sticker_ids',
      'emojiStickerAuthorization',
    );
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedActorIds',
      'authorized_actor_ids',
      'emojiStickerAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'emojiStickerAuthorization',
    );

    const isDeletionEvent = deletionKind !== 'UNKNOWN';
    const isAuthorizedResource = this.isAuthorizedResource(
      deletionKind,
      deletedResourceIds,
      authorizedEmojiIds,
      authorizedStickerIds,
    );
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const emojiStickerDeletionPolicyViolation =
      this.readBoolean(
        payload,
        'emojiStickerDeletionPolicyViolation',
        'emoji_sticker_deletion_policy_violation',
        'emojiDeletionPolicyViolation',
        'emoji_deletion_policy_violation',
        'stickerDeletionPolicyViolation',
        'sticker_deletion_policy_violation',
        'dangerousEmojiDeletion',
        'dangerous_emoji_deletion',
        'dangerousStickerDeletion',
        'dangerous_sticker_deletion',
        'policyViolation',
        'policy_violation',
      ) ?? false;

    const unauthorizedEmojiStickerDeletion =
      isDeletionEvent && !isAuthorizedResource && !isAuthorizedActor && !isTrustedActor;
    const malicious = unauthorizedEmojiStickerDeletion || emojiStickerDeletionPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        deletionKind,
        deletedResourceIds,
        actorId,
        isAuthorizedResource,
        isAuthorizedActor,
        isTrustedActor,
        emojiStickerDeletionPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        deletionKind,
        deletedResourceIds,
        actorId,
        unauthorizedEmojiStickerDeletion,
        emojiStickerDeletionPolicyViolation,
        isAuthorizedResource,
        isAuthorizedActor,
        isTrustedActor,
        unauthorizedMemberModeration: unauthorizedEmojiStickerDeletion,
        memberModerationPolicyViolation: emojiStickerDeletionPolicyViolation,
        isAuthorizedMember: isAuthorizedResource,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze([context.actionType]),
                reason: 'mandatory unauthorized emoji/sticker deletion containment',
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
        deletionKind,
        deletedResourceIds,
        actorId,
        unauthorizedEmojiStickerDeletion,
        emojiStickerDeletionPolicyViolation,
        isAuthorizedResource,
        isAuthorizedActor,
        isTrustedActor,
        unauthorizedMemberModeration: unauthorizedEmojiStickerDeletion,
        memberModerationPolicyViolation: emojiStickerDeletionPolicyViolation,
        isAuthorizedMember: isAuthorizedResource,
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

  private resolveDeletionKind(
    eventName: string,
    payload: Record<string, unknown> | undefined,
  ): EmojiStickerDeletionKind {
    if (eventName === 'STICKER_DELETE') {
      return 'STICKER';
    }

    if (eventName === 'GUILD_EMOJIS_UPDATE') {
      if (this.readDeletedEmojiIds(payload, false).length > 0 || this.readDeletionIndicator(payload) === true) {
        return 'EMOJI';
      }

      return 'UNKNOWN';
    }

    if (eventName === 'GUILD_STICKERS_UPDATE') {
      if (this.readDeletedStickerIds(payload, false).length > 0 || this.readDeletionIndicator(payload) === true) {
        return 'STICKER';
      }

      return 'UNKNOWN';
    }

    return 'UNKNOWN';
  }

  private resolveDeletedResourceIds(
    kind: EmojiStickerDeletionKind,
    payload: Record<string, unknown> | undefined,
  ): readonly string[] {
    if (kind === 'EMOJI') {
      return this.readDeletedEmojiIds(payload);
    }

    if (kind === 'STICKER') {
      return this.readDeletedStickerIds(payload);
    }

    return Object.freeze([]);
  }

  private readDeletedEmojiIds(
    payload: Record<string, unknown> | undefined,
    includeSingleIdentifier = true,
  ): readonly string[] {
    const direct = new Set<string>([
      ...this.readStringArray(payload, 'deletedEmojiIds'),
      ...this.readStringArray(payload, 'deleted_emoji_ids'),
      ...this.readStringArray(payload, 'removedEmojiIds'),
      ...this.readStringArray(payload, 'removed_emoji_ids'),
    ]);

    if (includeSingleIdentifier) {
      const single = this.readString(
        payload,
        'emojiId',
        'emoji_id',
        'targetId',
        'target_id',
        'resourceId',
        'resource_id',
      );
      if (single) {
        direct.add(single);
      }
    }

    return Object.freeze([...direct]);
  }

  private readDeletedStickerIds(
    payload: Record<string, unknown> | undefined,
    includeSingleIdentifier = true,
  ): readonly string[] {
    const direct = new Set<string>([
      ...this.readStringArray(payload, 'deletedStickerIds'),
      ...this.readStringArray(payload, 'deleted_sticker_ids'),
      ...this.readStringArray(payload, 'removedStickerIds'),
      ...this.readStringArray(payload, 'removed_sticker_ids'),
    ]);

    if (includeSingleIdentifier) {
      const single = this.readString(
        payload,
        'stickerId',
        'sticker_id',
        'targetId',
        'target_id',
        'resourceId',
        'resource_id',
      );
      if (single) {
        direct.add(single);
      }
    }

    return Object.freeze([...direct]);
  }

  private readDeletionIndicator(payload: Record<string, unknown> | undefined): boolean {
    const boolValue = this.readBoolean(
      payload,
      'isDeletion',
      'is_deletion',
      'deletion',
      'deleted',
      'emojiDeleted',
      'stickerDeleted',
    );
    if (boolValue === true) {
      return true;
    }

    const action = this.readString(payload, 'action', 'mutationType', 'mutation_type', 'op', 'operation');
    if (!action) {
      return false;
    }

    const normalized = action.toUpperCase();
    return normalized.includes('DELETE') || normalized.includes('REMOVE');
  }

  private isAuthorizedResource(
    kind: EmojiStickerDeletionKind,
    resourceIds: readonly string[],
    authorizedEmojiIds: Set<string>,
    authorizedStickerIds: Set<string>,
  ): boolean {
    if (resourceIds.length === 0) {
      return false;
    }

    if (kind === 'EMOJI') {
      return resourceIds.every((id) => authorizedEmojiIds.has(id));
    }

    if (kind === 'STICKER') {
      return resourceIds.every((id) => authorizedStickerIds.has(id));
    }

    return false;
  }

  private resolveReason(
    deletionKind: EmojiStickerDeletionKind,
    deletedResourceIds: readonly string[],
    actorId: string,
    isAuthorizedResource: boolean,
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    emojiStickerDeletionPolicyViolation: boolean,
  ): string {
    if (deletionKind === 'UNKNOWN') {
      return 'Event does not represent emoji/sticker deletion';
    }

    if (emojiStickerDeletionPolicyViolation) {
      return `${deletionKind.toLowerCase()} deletion violates containment policy`;
    }

    if (isAuthorizedResource || isAuthorizedActor || isTrustedActor) {
      return `${deletionKind.toLowerCase()} deletion authorized for actor ${actorId}`;
    }

    const deletedId = deletedResourceIds[0] ?? `unknown-${deletionKind.toLowerCase()}`;
    return `${deletionKind.toLowerCase()} ${deletedId} deletion is not authorized for actor ${actorId}`;
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
