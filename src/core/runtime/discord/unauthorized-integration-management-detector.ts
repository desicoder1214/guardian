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
  'GUILD_INTEGRATIONS_UPDATE',
  'INTEGRATION_CREATE',
  'INTEGRATION_UPDATE',
  'INTEGRATION_DELETE',
  'APPLICATION_INSTALL',
  'APPLICATION_REMOVE',
  'APPLICATION_CONFIGURATION_UPDATE',
  'APPLICATION_CONFIG_UPDATE',
]);

export class UnauthorizedIntegrationManagementDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-integration-management-detector';
  readonly version = '1.0.0';
  readonly priority = 96;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.INTEGRATION_MANAGEMENT]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const integrationId = this.readString(
      payload,
      'integrationId',
      'integration_id',
      'ownerIntegrationId',
      'owner_integration_id',
    );
    const applicationId = this.readString(
      payload,
      'applicationId',
      'application_id',
      'appId',
      'app_id',
    );
    const actorId = this.readString(payload, 'actorId', 'actor_id', 'executorId', 'executor_id') ?? context.actorId;

    const authorizedIntegrationIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedIntegrationIds',
      'authorized_integration_ids',
      'integrationAuthorization',
    );
    const authorizedApplicationIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedApplicationIds',
      'authorized_application_ids',
      'integrationAuthorization',
    );
    const trustedActorIds = this.readAuthorizationIds(
      context.metadata,
      'trustedActorIds',
      'trusted_actor_ids',
      'integrationAuthorization',
    );

    const isSupportedEvent = SUPPORTED_EVENT_NAMES.has(eventName);
    const isAuthorizedIntegration = typeof integrationId === 'string' && authorizedIntegrationIds.has(integrationId);
    const isAuthorizedApplication = typeof applicationId === 'string' && authorizedApplicationIds.has(applicationId);
    const isTrustedActor = trustedActorIds.has(actorId);
    const integrationPolicyViolation = this.readBoolean(
      payload,
      'integrationPolicyViolation',
      'integration_policy_violation',
      'applicationPolicyViolation',
      'application_policy_violation',
      'policyViolation',
      'policy_violation',
    ) ?? false;

    const unauthorizedIntegrationManagement =
      isSupportedEvent && !isAuthorizedIntegration && !isAuthorizedApplication && !isTrustedActor;
    const malicious = unauthorizedIntegrationManagement || integrationPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isSupportedEvent,
        eventName,
        integrationId,
        applicationId,
        isAuthorizedIntegration,
        isAuthorizedApplication,
        isTrustedActor,
        integrationPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        integrationId,
        applicationId,
        actorId,
        unauthorizedIntegrationManagement,
        integrationPolicyViolation,
        isAuthorizedIntegration,
        isAuthorizedApplication,
        isTrustedActor,
        auditAttributionStatus: this.readString(payload, 'auditAttributionStatus', 'audit_attribution_status'),
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['INTEGRATION_MANAGEMENT']),
                reason: 'mandatory unauthorized integration/application containment',
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
        integrationId,
        applicationId,
        actorId,
        unauthorizedIntegrationManagement,
        integrationPolicyViolation,
        isAuthorizedIntegration,
        isAuthorizedApplication,
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

  private resolveReason(
    isSupportedEvent: boolean,
    eventName: string,
    integrationId: string | undefined,
    applicationId: string | undefined,
    isAuthorizedIntegration: boolean,
    isAuthorizedApplication: boolean,
    isTrustedActor: boolean,
    integrationPolicyViolation: boolean,
  ): string {
    if (!isSupportedEvent) {
      return 'Event does not represent integration or application management';
    }

    if (integrationPolicyViolation) {
      return `Integration/application change for ${integrationId ?? applicationId ?? 'unknown-resource'} violates policy`;
    }

    if (isAuthorizedIntegration || isAuthorizedApplication) {
      return `Integration/application ${integrationId ?? applicationId ?? 'unknown-resource'} is authorized`;
    }

    if (isTrustedActor) {
      return `Trusted actor exemption applied for ${eventName}`;
    }

    return `Unauthorized integration/application management detected for ${integrationId ?? applicationId ?? 'unknown-resource'}`;
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