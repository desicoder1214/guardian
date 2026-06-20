export interface DiscordGatewayRawEvent {
  readonly t: string; // event name
  readonly s?: number; // sequence
  readonly op?: number; // op code
  readonly d?: unknown; // payload
  readonly ts?: string; // timestamp
}

export interface DiscordGatewayNormalizedEvent {
  readonly eventName: string;
  readonly source: 'discord-gateway';
  readonly timestamp: string;
  readonly correlationId: string;
  readonly payload: unknown;
}

export type DiscordEventHandler = (event: DiscordGatewayNormalizedEvent) => Promise<void>;

export interface CorrelationIdGenerator {
  generate(eventName: string): string;
}

export interface DiscordEventPipeline {
  start(): Promise<void>;
  stop(): Promise<void>;
  ingest(raw: DiscordGatewayRawEvent): Promise<void>;
  subscribe(handler: DiscordEventHandler): () => void;
}
