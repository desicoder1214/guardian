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

export class UnauthorizedWebhookCreateDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-webhook-create-detector';
  readonly version = '1.0.0';
  readonly priority = 95;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.WEBHOOK_CREATE]);

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readRecord(context.normalizedEvent.payload);
    const eventName = context.normalizedEvent.eventName;
    const webhookId = this.readWebhookId(payload);
    const ownerIntegrationId = this.readString(
      payload,
      'ownerIntegrationId',
      'owner_integration_id',
      'integrationId',
      'integration_id',
      'applicationId',
      'application_id',
    );

    const authorizedWebhookIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedWebhookIds',
      'authorized_webhook_ids',
      'webhookAuthorization',
    );
    const authorizedIntegrationIds = this.readAuthorizationIds(
      context.metadata,
      'authorizedIntegrationIds',
      'authorized_integration_ids',
      'integrationAuthorization',
    );

    const isWebhookCreateEvent = eventName === 'WEBHOOK_CREATE';
    const isAuthorizedWebhook = typeof webhookId === 'string' && authorizedWebhookIds.has(webhookId);
    const isAuthorizedIntegration =
      typeof ownerIntegrationId === 'string' && authorizedIntegrationIds.has(ownerIntegrationId);
    const webhookPolicyViolation = this.readBoolean(
      payload,
      'webhookPolicyViolation',
      'webhook_policy_violation',
      'dangerousWebhook',
      'dangerous_webhook',
      'policyViolation',
      'policy_violation',
    ) ?? false;

    const unauthorizedWebhookCreate = isWebhookCreateEvent && !isAuthorizedWebhook && !isAuthorizedIntegration;
    const malicious = unauthorizedWebhookCreate || webhookPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isWebhookCreateEvent,
        webhookId,
        ownerIntegrationId,
        isAuthorizedWebhook,
        isAuthorizedIntegration,
        webhookPolicyViolation,
      ),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        eventName,
        webhookId,
        ownerIntegrationId,
        unauthorizedWebhookCreate,
        webhookPolicyViolation,
        isAuthorizedWebhook,
        isAuthorizedIntegration,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['WEBHOOK_CREATE']),
                reason: 'mandatory unauthorized webhook containment',
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
        webhookId,
        ownerIntegrationId,
        unauthorizedWebhookCreate,
        webhookPolicyViolation,
        isAuthorizedWebhook,
        isAuthorizedIntegration,
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

  private readWebhookId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(payload, 'webhookId', 'webhook_id', 'targetId', 'target_id', 'resourceId', 'resource_id');
    if (direct) {
      return direct;
    }

    const webhook = this.readNestedRecord(payload, 'webhook');
    return this.readString(webhook, 'id', 'webhookId', 'webhook_id');
  }

  private resolveReason(
    isWebhookCreateEvent: boolean,
    webhookId: string | undefined,
    ownerIntegrationId: string | undefined,
    isAuthorizedWebhook: boolean,
    isAuthorizedIntegration: boolean,
    webhookPolicyViolation: boolean,
  ): string {
    if (!isWebhookCreateEvent) {
      return 'Event does not represent webhook creation';
    }

    if (webhookPolicyViolation) {
      return `Webhook ${webhookId ?? 'unknown-webhook'} violates webhook policy`; 
    }

    if (isAuthorizedWebhook || isAuthorizedIntegration) {
      return `Webhook ${webhookId ?? 'unknown-webhook'} is authorized for integration ${ownerIntegrationId ?? 'unknown-integration'}`;
    }

    return `Webhook ${webhookId ?? 'unknown-webhook'} is not authorized`;
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
