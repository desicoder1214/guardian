import { EventBus } from '../../event/bus';
import { Logger } from '../logger';
import { HealthService } from '../health';
import { DiscordEventPipeline, DiscordGatewayRawEvent } from './pipeline-types';

export type DiscordGatewayEventListener = (event: DiscordGatewayRawEvent) => Promise<void> | void;

export interface DiscordGatewayEventSource {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(listener: DiscordGatewayEventListener): () => void;
}

export interface DiscordGatewayAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  shutdown(): Promise<void>;
  subscribe(listener: DiscordGatewayEventListener): () => void;
}

export interface DiscordGatewayAdapterOptions {
  readonly source: DiscordGatewayEventSource;
  readonly pipeline: DiscordEventPipeline;
  readonly eventBus: EventBus;
  readonly healthService: HealthService;
  readonly logger: Logger;
}
