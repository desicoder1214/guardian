import { DetectionResult, Detector } from './generic-detector-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';

const SUPPORTED_EVENTS = ['GUILD_MEMBER_UPDATE', 'GUILD_ROLE_UPDATE', 'MEMBER_ROLE_ADD'] as const;
const DEFAULT_DANGEROUS_PERMISSIONS = [
  'ADMINISTRATOR',
  'MANAGE_GUILD',
  'MANAGE_ROLES',
  'MANAGE_CHANNELS',
  'BAN_MEMBERS',
  'KICK_MEMBERS',
  'MANAGE_WEBHOOKS',
  'MODERATE_MEMBERS',
] as const;

export class DangerousRoleGrantDetector implements Detector {
  id(): string {
    return 'dangerous-role-grant-detector';
  }

  supports(eventName: string): boolean {
    return SUPPORTED_EVENTS.includes(eventName as (typeof SUPPORTED_EVENTS)[number]);
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    const payload = this.readPayload(normalizedEvent.payload);
    const dangerousPermissions = this.resolveDangerousPermissions(payload);
    const beforePermissions = this.resolveBeforePermissions(payload);
    const afterPermissions = this.resolveAfterPermissions(payload);

    const newlyGrantedPermissions = this.diff(afterPermissions, beforePermissions);
    const grantedDangerousPermissions = newlyGrantedPermissions.filter((permission) =>
      dangerousPermissions.has(permission),
    );

    const detected = this.supports(normalizedEvent.eventName) && grantedDangerousPermissions.length > 0;
    const runtimeThreatOverrides = detected
      ? Object.freeze([
          Object.freeze({
            type: 'FORCE_BLOCK',
            applicableEventTypes: Object.freeze(['ROLE_CREATE']),
            reason: 'mandatory dangerous role containment',
            metadata: Object.freeze({ source: this.id() }),
          }),
        ])
      : Object.freeze([]);

    return {
      detectorId: this.id(),
      detectorName: 'DangerousRoleGrantDetector',
      eventType: normalizedEvent.eventName,
      detected,
      confidence: detected ? 0.96 : 0,
      metadata: {
        detectorType: 'production',
        supportedEventTypes: [...SUPPORTED_EVENTS],
        beforePermissions: [...beforePermissions],
        afterPermissions: [...afterPermissions],
        newlyGrantedPermissions,
        grantedDangerousPermissions,
        runtimeThreatOverrides,
      },
      correlationId: normalizedEvent.correlationId,
    };
  }

  private resolveDangerousPermissions(payload: Record<string, unknown> | undefined): Set<string> {
    const configured = this.readStringArray(payload, 'dangerousPermissions', 'dangerous_permissions');
    if (configured.length > 0) {
      return new Set(configured);
    }

    return new Set(DEFAULT_DANGEROUS_PERMISSIONS);
  }

  private resolveBeforePermissions(payload: Record<string, unknown> | undefined): Set<string> {
    return new Set([
      ...this.readStringArray(payload, 'beforePermissions', 'before_permissions'),
      ...this.readStringArray(this.readNestedRecord(payload, 'before'), 'permissions', 'permissionNames'),
      ...this.readStringArray(this.readNestedRecord(this.readNestedRecord(payload, 'before'), 'role'), 'permissions'),
      ...this.readStringArray(payload, 'previousPermissions', 'previous_permissions'),
    ]);
  }

  private resolveAfterPermissions(payload: Record<string, unknown> | undefined): Set<string> {
    return new Set([
      ...this.readStringArray(payload, 'afterPermissions', 'after_permissions'),
      ...this.readStringArray(this.readNestedRecord(payload, 'after'), 'permissions', 'permissionNames'),
      ...this.readStringArray(this.readNestedRecord(this.readNestedRecord(payload, 'after'), 'role'), 'permissions'),
      ...this.readStringArray(payload, 'rolePermissions', 'role_permissions'),
      ...this.readStringArray(payload, 'addedRolePermissions', 'added_role_permissions'),
    ]);
  }

  private readPayload(payload: unknown): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    return payload as Record<string, unknown>;
  }

  private readNestedRecord(
    payload: Record<string, unknown> | undefined,
    key: string,
  ): Record<string, unknown> | undefined {
    if (!payload) {
      return undefined;
    }

    const value = payload[key];
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private readStringArray(payload: Record<string, unknown> | undefined, ...keys: string[]): string[] {
    if (!payload) {
      return [];
    }

    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string');
      }
    }

    return [];
  }

  private diff(afterPermissions: Set<string>, beforePermissions: Set<string>): string[] {
    const granted: string[] = [];
    for (const permission of afterPermissions) {
      if (!beforePermissions.has(permission)) {
        granted.push(permission);
      }
    }

    return granted;
  }
}
