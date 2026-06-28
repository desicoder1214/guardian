import {
  DetectionConfidence,
  DetectionContext,
  DetectionDisposition,
  DetectionFinding,
  DetectionResult,
  DetectionSeverity,
} from './detection-engine';
import { DetectorPlugin } from './detection-plugin-framework';
import { DetectionResult as GenericDetectionResult, Detector } from './generic-detector-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionType } from './security-policy-types';

const BOT_ADD_EVENT = 'BOT_ADD';
const GUILD_MEMBER_ADD_EVENT = 'GUILD_MEMBER_ADD';

export class UnauthorizedBotAddDetector implements DetectorPlugin, Detector {
  readonly detectorId = 'unauthorized-bot-add-detector';
  readonly version = '1.0.0';
  readonly priority = 100;
  readonly supportedActionTypes = Object.freeze([SecurityActionType.BOT_ADD]);

  id(): string {
    return this.detectorId;
  }

  supports(eventName: string): boolean {
    return eventName === BOT_ADD_EVENT || eventName === GUILD_MEMBER_ADD_EVENT;
  }

  enabled(_context: DetectionContext): boolean {
    return true;
  }

  async evaluate(context: DetectionContext): Promise<DetectionResult> {
    const payload = this.readPayload(context.normalizedEvent.payload);
    const botSignal = this.readBotSignal(payload);
    const isBotAddEvent = this.isBotAddEvent(context.normalizedEvent.eventName, botSignal);
    const botId = this.readBotId(payload);
    const authorizedBotIds = this.readAuthorizationIds(context.metadata, 'authorizedBotIds');
    const trustedBotIds = this.readAuthorizationIds(context.metadata, 'trustedBotIds');
    const allAuthorizedBotIds = new Set([...authorizedBotIds, ...trustedBotIds]);
    const isAuthorizedBot = typeof botId === 'string' && allAuthorizedBotIds.has(botId);
    const disposition = !isBotAddEvent
      ? DetectionDisposition.CLEAN
      : isAuthorizedBot
        ? DetectionDisposition.CLEAN
        : DetectionDisposition.MALICIOUS;

    const finding = this.freezeFinding({
      detectorId: this.detectorId,
      severity: disposition === DetectionDisposition.MALICIOUS ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
      confidence: disposition === DetectionDisposition.MALICIOUS ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
      disposition,
      reason: this.resolveReason(disposition, isBotAddEvent, botId),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        botId,
        eventName: context.normalizedEvent.eventName,
        isBotAddEvent,
        isAuthorizedBot,
        runtimeThreatOverrides:
          disposition === DetectionDisposition.MALICIOUS
            ? Object.freeze([
                Object.freeze({
                  type: 'FORCE_BLOCK',
                  applicableEventTypes: Object.freeze(['BOT_ADD']),
                  reason: 'malicious unauthorized bot add detected',
                }),
              ])
            : Object.freeze([]),
      }),
    });

    return Object.freeze({
      detectorId: this.detectorId,
      matched: disposition === DetectionDisposition.MALICIOUS,
      findings: Object.freeze([finding]),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        detectorType: 'production-foundation',
        supportedEventTypes: [BOT_ADD_EVENT, GUILD_MEMBER_ADD_EVENT],
        botId,
        isBotAddEvent,
        isAuthorizedBot,
      }),
    });
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<GenericDetectionResult> {
    const result = await this.evaluate({
      normalizedEvent,
      actorId: this.readActorId(normalizedEvent.payload),
      guildId: this.readGuildId(normalizedEvent.payload),
      actionType: SecurityActionType.BOT_ADD,
      correlationId: normalizedEvent.correlationId,
      timestamp: normalizedEvent.timestamp,
      metadata: Object.freeze({
        authorizedBotIds: Object.freeze([]),
        trustedBotIds: Object.freeze([]),
      }),
    });

    const primaryFinding = result.findings[0];

    return Object.freeze({
      detectorId: this.id(),
      detectorName: 'UnauthorizedBotAddDetector',
      eventType: normalizedEvent.eventName,
      detected: result.matched,
      confidence: primaryFinding?.confidence === DetectionConfidence.HIGH ? 0.95 : 1,
      metadata: Object.freeze({
        disposition: primaryFinding?.disposition ?? DetectionDisposition.UNKNOWN,
        reason: primaryFinding?.reason ?? 'No finding produced',
        ...(result.metadata ?? {}),
      }),
      correlationId: normalizedEvent.correlationId,
    });
  }

  private isBotAddEvent(eventName: string, botSignal: boolean | undefined): boolean {
    if (eventName === BOT_ADD_EVENT) {
      return true;
    }

    if (eventName === GUILD_MEMBER_ADD_EVENT) {
      return botSignal === true;
    }

    return false;
  }

  private readPayload(payload: unknown): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    return payload as Record<string, unknown>;
  }

  private readGuildId(payload: unknown): string {
    const record = this.readPayload(payload);
    return this.readString(record, 'guildId', 'guild_id') ?? 'unknown-guild';
  }

  private readActorId(payload: unknown): string {
    const record = this.readPayload(payload);
    return this.readString(record, 'actorId', 'actor_id', 'userId', 'user_id', 'executorId', 'executor_id') ?? 'unknown-actor';
  }

  private readString(payload: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
    if (!payload) {
      return undefined;
    }

    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }

  private readBoolean(payload: Record<string, unknown> | undefined, ...keys: string[]): boolean | undefined {
    if (!payload) {
      return undefined;
    }

    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }

    return undefined;
  }

  private readAuthorizationIds(metadata: Record<string, unknown> | undefined, key: string): readonly string[] {
    const direct = this.readStringArray(metadata, key);
    if (direct.length > 0) {
      return direct;
    }

    const authorization = this.readNestedRecord(metadata, 'botAuthorization');
    return this.readStringArray(authorization, key);
  }

  private readStringArray(payload: Record<string, unknown> | undefined, key: string): readonly string[] {
    if (!payload) {
      return Object.freeze([]);
    }

    const value = payload[key];
    if (!Array.isArray(value)) {
      return Object.freeze([]);
    }

    return Object.freeze(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0));
  }

  private readBotId(payload: Record<string, unknown> | undefined): string | undefined {
    const direct = this.readString(payload, 'botId', 'bot_id', 'targetId', 'target_id');
    if (direct) {
      return direct;
    }

    const user = this.readNestedRecord(payload, 'user');
    const userId = this.readString(user, 'id', 'userId', 'user_id');
    if (userId) {
      return userId;
    }

    const member = this.readNestedRecord(payload, 'member');
    const memberId = this.readString(member, 'id', 'userId', 'user_id');
    if (memberId) {
      return memberId;
    }

    const memberUser = this.readNestedRecord(member, 'user');
    return this.readString(memberUser, 'id', 'userId', 'user_id');
  }

  private readBotSignal(payload: Record<string, unknown> | undefined): boolean | undefined {
    const direct = this.readBoolean(payload, 'bot', 'isBot');
    if (typeof direct === 'boolean') {
      return direct;
    }

    const user = this.readNestedRecord(payload, 'user');
    const userBot = this.readBoolean(user, 'bot', 'isBot');
    if (typeof userBot === 'boolean') {
      return userBot;
    }

    const member = this.readNestedRecord(payload, 'member');
    const memberBot = this.readBoolean(member, 'bot', 'isBot');
    if (typeof memberBot === 'boolean') {
      return memberBot;
    }

    const memberUser = this.readNestedRecord(member, 'user');
    return this.readBoolean(memberUser, 'bot', 'isBot');
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

  private resolveReason(
    disposition: DetectionDisposition,
    isBotAddEvent: boolean,
    botId: string | undefined,
  ): string {
    if (!isBotAddEvent) {
      return 'Event does not represent a bot add operation';
    }

    if (disposition === DetectionDisposition.CLEAN) {
      return `Bot ${botId ?? 'unknown-bot'} is authorized for addition`;
    }

    return `Bot ${botId ?? 'unknown-bot'} is not authorized for addition`;
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
