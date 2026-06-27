import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { DetectionResult, Detector } from './generic-detector-types';

abstract class BasePlaceholderDetector implements Detector {
  constructor(
    private readonly detectorId: string,
    private readonly detectorName: string,
    private readonly supportedEventType: string,
  ) {}

  id(): string {
    return this.detectorId;
  }

  supports(eventName: string): boolean {
    return eventName === this.supportedEventType;
  }

  async detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult> {
    const detected = this.supports(normalizedEvent.eventName);

    return {
      detectorId: this.id(),
      detectorName: this.detectorName,
      eventType: normalizedEvent.eventName,
      detected,
      confidence: detected ? 0.9 : 0,
      metadata: {
        placeholder: true,
        supportedEventType: this.supportedEventType,
      },
      correlationId: normalizedEvent.correlationId,
    };
  }
}

export class ChannelDeleteDetector extends BasePlaceholderDetector {
  constructor() {
    super('channel-delete-detector', 'ChannelDeleteDetector', 'CHANNEL_DELETE');
  }
}

export class ChannelCreateDetector extends BasePlaceholderDetector {
  constructor() {
    super('channel-create-detector', 'ChannelCreateDetector', 'CHANNEL_CREATE');
  }
}

export class RoleDeleteDetector extends BasePlaceholderDetector {
  constructor() {
    super('role-delete-detector', 'RoleDeleteDetector', 'ROLE_DELETE');
  }
}

export class RoleCreateDetector extends BasePlaceholderDetector {
  constructor() {
    super('role-create-detector', 'RoleCreateDetector', 'ROLE_CREATE');
  }
}

export class WebhookCreateDetector extends BasePlaceholderDetector {
  constructor() {
    super('webhook-create-detector', 'WebhookCreateDetector', 'WEBHOOKS_UPDATE');
  }
}

export class BotAddDetector extends BasePlaceholderDetector {
  constructor() {
    super('bot-add-detector', 'BotAddDetector', 'GUILD_MEMBER_ADD');
  }
}
