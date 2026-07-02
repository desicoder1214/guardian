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

const SUPPORTED_EVENT_NAMES = new Set<string>([
  'GUILD_UPDATE',
  'GUILD_SETTINGS_UPDATE',
  'GUILD_CONFIGURATION_UPDATE',
  'GUILD_FEATURES_UPDATE',
  'GUILD_LOCALE_UPDATE',
  'GUILD_COMMUNITY_UPDATE',
]);

const SECURITY_RELEVANT_CONFIGURATION_FIELDS = new Set<string>([
  'guild_name',
  'guild_icon',
  'guild_banner',
  'guild_splash',
  'guild_description',
  'verification_level',
  'explicit_content_filter',
  'default_notification_level',
  'afk_timeout',
  'afk_channel',
  'system_channel',
  'safety_alerts_channel',
  'locale',
  'community_configuration',
]);

export class UnauthorizedGuildConfigurationDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-guild-configuration-detector';
  readonly version = '1.0.0';
  readonly priority = 96;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.GUILD_CONFIGURATION_UPDATE]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const actorId =
      context.actorId && context.actorId.length > 0
        ? context.actorId
        : this.readString(payload, 'actorId', 'actor_id', 'executorId', 'executor_id', 'userId', 'user_id') ??
          'unknown-actor';

    const changedConfigurationKeys = this.readChangedConfigurationKeys(payload);
    const securityRelevantChanges = Object.freeze(
      changedConfigurationKeys.filter((field) => SECURITY_RELEVANT_CONFIGURATION_FIELDS.has(field)),
    );

    const authorizationMetadata = this.readNestedRecord(context.metadata, 'guildConfigurationAuthorization');
    const authorizedActorIds = this.readAuthorizationIds(
      context.metadata,
      authorizationMetadata,
      'authorizedActorIds',
      'authorized_actor_ids',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      authorizationMetadata,
      'trustedActorIds',
      'trusted_actor_ids',
    );
    const ownerActorIds = this.readOwnerActorIds(payload, context.metadata, authorizationMetadata);

    const isGuildConfigurationEvent =
      SUPPORTED_EVENT_NAMES.has(eventName) || securityRelevantChanges.length > 0;
    const isAuthorizedActor = authorizedActorIds.has(actorId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const isOwnerActor = ownerActorIds.has(actorId);
    const guildConfigurationPolicyViolation =
      this.readBoolean(
        payload,
        'guildConfigurationPolicyViolation',
        'guild_configuration_policy_violation',
        'configurationPolicyViolation',
        'configuration_policy_violation',
        'policyViolation',
        'policy_violation',
      ) ?? false;

    const unauthorizedGuildConfigurationChange =
      isGuildConfigurationEvent &&
      securityRelevantChanges.length > 0 &&
      !isAuthorizedActor &&
      !isTrustedActor &&
      !isOwnerActor;
    const malicious = unauthorizedGuildConfigurationChange || guildConfigurationPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isGuildConfigurationEvent,
        securityRelevantChanges,
        isAuthorizedActor,
        isTrustedActor,
        isOwnerActor,
        guildConfigurationPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        actorId,
        changedConfigurationKeys,
        securityRelevantChanges,
        unauthorizedGuildConfigurationChange,
        guildConfigurationPolicyViolation,
        isAuthorizedActor,
        isTrustedActor,
        isOwnerActor,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['GUILD_CONFIGURATION_UPDATE']),
                reason: 'mandatory unauthorized guild configuration containment',
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
        actorId,
        changedConfigurationKeys,
        securityRelevantChanges,
        unauthorizedGuildConfigurationChange,
        guildConfigurationPolicyViolation,
        isAuthorizedActor,
        isTrustedActor,
        isOwnerActor,
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

    return this.readRecord(record[key]);
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

  private normalizeConfigurationField(field: string): string {
    const normalized = field.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (normalized) {
      case 'name':
      case 'guildname':
        return 'guild_name';
      case 'icon':
      case 'iconhash':
      case 'guildicon':
        return 'guild_icon';
      case 'banner':
      case 'bannerhash':
      case 'guildbanner':
        return 'guild_banner';
      case 'splash':
      case 'splashhash':
      case 'guildsplash':
        return 'guild_splash';
      case 'description':
      case 'guilddescription':
        return 'guild_description';
      case 'verificationlevel':
        return 'verification_level';
      case 'explicitcontentfilter':
        return 'explicit_content_filter';
      case 'defaultmessagenotifications':
      case 'defaultnotificationlevel':
        return 'default_notification_level';
      case 'afktimeout':
        return 'afk_timeout';
      case 'afkchannelid':
      case 'afkchannel':
        return 'afk_channel';
      case 'systemchannelid':
      case 'systemchannel':
        return 'system_channel';
      case 'safetyalertschannelid':
      case 'safetyalertschannel':
        return 'safety_alerts_channel';
      case 'preferredlocale':
      case 'locale':
        return 'locale';
      case 'community':
      case 'communityconfiguration':
      case 'communitysettings':
      case 'ruleschannelid':
      case 'publicupdateschannelid':
      case 'widgetenabled':
      case 'widgetchannelid':
        return 'community_configuration';
      default:
        return normalized;
    }
  }

  private readChangedConfigurationKeys(payload: Record<string, unknown> | undefined): readonly string[] {
    const directFields = [
      ...this.readStringArray(payload, 'changedKeys'),
      ...this.readStringArray(payload, 'changed_keys'),
      ...this.readStringArray(payload, 'changedFields'),
      ...this.readStringArray(payload, 'changed_fields'),
    ];

    const changesRecord =
      this.readNestedRecord(payload, 'changes') ??
      this.readNestedRecord(payload, 'configurationChanges') ??
      this.readNestedRecord(payload, 'configuration_changes');
    const changeObjectFields = changesRecord ? Object.keys(changesRecord) : [];

    const before = this.readNestedRecord(payload, 'before');
    const after = this.readNestedRecord(payload, 'after');
    const beforeAfterFields = before && after
      ? Object.keys({ ...before, ...after }).filter((key) => before[key] !== after[key])
      : [];

    const normalized = [...directFields, ...changeObjectFields, ...beforeAfterFields]
      .map((field) => this.normalizeConfigurationField(field))
      .filter((field) => field.length > 0);

    return Object.freeze([...new Set(normalized)]);
  }

  private readAuthorizationIds(
    metadata: Record<string, unknown> | undefined,
    nestedMetadata: Record<string, unknown> | undefined,
    directKey: string,
    alternateKey: string,
  ): Set<string> {
    const direct = this.readStringArray(metadata, directKey);
    const alternate = this.readStringArray(metadata, alternateKey);
    const nestedDirect = this.readStringArray(nestedMetadata, directKey);
    const nestedAlternate = this.readStringArray(nestedMetadata, alternateKey);

    return new Set([...direct, ...alternate, ...nestedDirect, ...nestedAlternate]);
  }

  private readOwnerActorIds(
    payload: Record<string, unknown> | undefined,
    metadata: Record<string, unknown> | undefined,
    nestedMetadata: Record<string, unknown> | undefined,
  ): Set<string> {
    const ownerId = this.readString(payload, 'ownerId', 'owner_id', 'guildOwnerId', 'guild_owner_id');
    const payloadOwners = [
      ...this.readStringArray(payload, 'ownerIds'),
      ...this.readStringArray(payload, 'owner_ids'),
      ...this.readStringArray(payload, 'guildOwnerIds'),
      ...this.readStringArray(payload, 'guild_owner_ids'),
    ];
    const metadataOwners = [
      ...this.readStringArray(metadata, 'ownerIds'),
      ...this.readStringArray(metadata, 'owner_ids'),
      ...this.readStringArray(nestedMetadata, 'ownerIds'),
      ...this.readStringArray(nestedMetadata, 'owner_ids'),
    ];

    return new Set([...(ownerId ? [ownerId] : []), ...payloadOwners, ...metadataOwners]);
  }

  private resolveReason(
    isGuildConfigurationEvent: boolean,
    securityRelevantChanges: readonly string[],
    isAuthorizedActor: boolean,
    isTrustedActor: boolean,
    isOwnerActor: boolean,
    guildConfigurationPolicyViolation: boolean,
  ): string {
    if (!isGuildConfigurationEvent) {
      return 'Event does not represent guild configuration update';
    }

    if (guildConfigurationPolicyViolation) {
      return 'Guild configuration change violates policy';
    }

    if (securityRelevantChanges.length === 0) {
      return 'No security-relevant guild configuration change detected';
    }

    if (isOwnerActor) {
      return 'Guild owner exemption applied for guild configuration update';
    }

    if (isAuthorizedActor || isTrustedActor) {
      return `Guild configuration update is authorized for ${securityRelevantChanges.join(', ')}`;
    }

    return `Unauthorized guild configuration update detected for ${securityRelevantChanges.join(', ')}`;
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
