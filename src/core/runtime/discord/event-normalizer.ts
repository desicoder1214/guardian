import { CorrelationIdGenerator, DiscordGatewayNormalizedEvent, DiscordGatewayRawEvent } from './pipeline-types';

export interface DiscordEventNormalizer {
  normalize(raw: DiscordGatewayRawEvent): DiscordGatewayNormalizedEvent;
}

export class DefaultDiscordEventNormalizer implements DiscordEventNormalizer {
  constructor(private readonly correlationIdGenerator: CorrelationIdGenerator) {}

  normalize(raw: DiscordGatewayRawEvent): DiscordGatewayNormalizedEvent {
    return {
      eventName: raw.t,
      source: 'discord-gateway',
      timestamp: raw.ts ?? new Date().toISOString(),
      correlationId: this.correlationIdGenerator.generate(raw.t),
      payload: raw.d ?? null,
    };
  }
}
