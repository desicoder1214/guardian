import { DetectionResult, Detector } from './generic-detector-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';

const BOT_ADD_EVENT = 'BOT_ADD';
const GUILD_MEMBER_ADD_EVENT = 'GUILD_MEMBER_ADD';

export class UnauthorizedBotAddDetector implements Detector {
  id(): string {
    return 'unauthorized-bot-add-detector';
  }

  supports(eventName: string): boolean {
    return eventName === BOT_ADD_EVENT || eventName === GUILD_MEMBER_ADD_EVENT;
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    const payload = this.readPayload(normalizedEvent.payload);
    const authorized = this.readBoolean(payload, 'authorized', 'isAuthorized', 'trusted', 'allowlisted');
    const botSignal = this.readBotSignal(payload);
    const isBotAddEvent = this.isBotAddEvent(normalizedEvent.eventName, botSignal);
    const detected = isBotAddEvent && authorized !== true;

    return {
      detectorId: this.id(),
      detectorName: 'UnauthorizedBotAddDetector',
      eventType: normalizedEvent.eventName,
      detected,
      confidence: detected ? 0.95 : 0,
      metadata: {
        detectorType: 'production',
        supportedEventTypes: [BOT_ADD_EVENT, GUILD_MEMBER_ADD_EVENT],
        botSignal,
        isBotAddEvent,
        authorized,
        botId: this.readString(payload, 'botId', 'bot_id', 'targetId', 'target_id'),
      },
      correlationId: normalizedEvent.correlationId,
    };
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
}
