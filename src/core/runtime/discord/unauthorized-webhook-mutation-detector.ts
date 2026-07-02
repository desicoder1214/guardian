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

export class UnauthorizedWebhookMutationDetector implements DetectorPlugin {
  readonly detectorId = 'unauthorized-webhook-mutation-detector';
  readonly version = '1.0.0';
  readonly priority = 96;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.WEBHOOK_DELETE]);

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

    const isWebhookMutationEvent =
      eventName === 'WEBHOOK_UPDATE' || eventName === 'WEBHOOK_DELETE' || eventName === 'WEBHOOK_MODIFICATION';
    const isAuthorizedWebhook = typeof webhookId === 'string' && authorizedWebhookIds.has(webhookId);
    const isAuthorizedIntegration =
      typeof ownerIntegrationId === 'string' && authorizedIntegrationIds.has(ownerIntegrationId);
    const webhookPolicyViolation = this.readBoolean(
      payload,
      'webhookMutationPolicyViolation',
      'webhook_mutation_policy_violation',
      'webhookPolicyViolation',
      'webhook_policy_violation',
      'dangerousWebhookMutation',
      'dangerous_webhook_mutation',
      'dangerousWebhookUpdate',
      'dangerous_webhook_update',
      'dangerousWebhookDeletion',
      'dangerous_webhook_deletion',
      'policyViolation',
      'policy_violation',
    ) ?? false;

    const unauthorizedWebhookMutation = isWebhookMutationEvent && !isAuthorizedWebhook && !isAuthorizedIntegration;
    const malicious = unauthorizedWebhookMutation || webhookPolicyViolation;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: malicious ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: malicious ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition: malicious ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
      reason: this.resolveReason(
        isWebhookMutationEvent,
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
        unauthorizedWebhookMutation,
        webhookPolicyViolation,
        isAuthorizedWebhook,
        isAuthorizedIntegration,
        runtimeThreatOverrides: malicious
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['WEBHOOK_DELETE']),
                reason: 'mandatory unauthorized webhook mutation containment',
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
        unauthorizedWebhookMutation,
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
    isWebhookMutationEvent: boolean,
    webhookId: string | undefined,
    ownerIntegrationId: string | undefined,
    isAuthorizedWebhook: boolean,
    isAuthorizedIntegration: boolean,
    webhookPolicyViolation: boolean,
  ): string {
    if (!isWebhookMutationEvent) {
      return 'Event does not represent webhook update or deletion';
    }

    if (webhookPolicyViolation) {
      return `Webhook ${webhookId ?? 'unknown-webhook'} violates webhook mutation policy`;
    }

    if (isAuthorizedWebhook || isAuthorizedIntegration) {
      return `Webhook ${webhookId ?? 'unknown-webhook'} is authorized for integration ${
        ownerIntegrationId ?? 'unknown-integration'
      }`;
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