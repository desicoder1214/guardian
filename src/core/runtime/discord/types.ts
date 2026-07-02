import { DiscordGatewayRawEvent } from './pipeline-types';

export type DiscordRuntimeState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'stopping';

export interface DiscordGatewayEvent {
  readonly type: string;
  readonly payload?: unknown;
}

export interface DiscordClientAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(listener: (event: DiscordGatewayRawEvent) => Promise<void> | void): () => void;
}

export interface DiscordRuntimeAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  reconnect(): Promise<void>;
  setGatewayEventSink?(
    sink: (event: DiscordGatewayRawEvent) => Promise<void>,
  ): void;
  getState(): DiscordRuntimeState;
}
