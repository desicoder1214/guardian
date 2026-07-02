import { DiscordRuntimeState, DiscordClientAdapter, DiscordRuntimeAdapter } from './types';
import { DiscordRuntimeConfiguration } from './config';
import { EventBus, KernelEvent } from '../../event/bus';
import { RuntimeEventType } from '../events';
import { HealthService } from '../health';
import { Logger } from '../logger';
import { DiscordGatewayRawEvent } from './pipeline-types';

export interface DiscordRuntimeAdapterOptions {
  readonly client: DiscordClientAdapter;
  readonly config: DiscordRuntimeConfiguration;
  readonly eventBus: EventBus;
  readonly healthService: HealthService;
  readonly logger: Logger;
}

export class DiscordRuntimeLifecycleAdapter implements DiscordRuntimeAdapter {
  private state: DiscordRuntimeState = 'disconnected';
  private gatewayEventSink?: (event: DiscordGatewayRawEvent) => Promise<void>;
  private clientGatewayUnsubscribe?: () => void;

  constructor(private readonly options: DiscordRuntimeAdapterOptions) {}

  async start(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');
    this.publishEvent(RuntimeEventType.DiscordRuntimeStarting);
    this.options.logger.info('Discord runtime connecting');

    try {
      await this.options.client.connect();
      this.subscribeClientEvents();
      this.setState('connected');
      this.publishEvent(RuntimeEventType.DiscordRuntimeStarted);
      this.options.logger.info('Discord runtime connected');
    } catch (error) {
      this.setState('disconnected');
      this.publishError(error);
      this.options.logger.error('Discord runtime failed to connect', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state === 'stopping' || this.state === 'disconnected') {
      return;
    }

    this.setState('stopping');
    this.publishEvent(RuntimeEventType.DiscordRuntimeStopping);
    this.options.logger.info('Discord runtime stopping');

    try {
      await this.options.client.disconnect();
      this.unsubscribeClientEvents();
      this.setState('disconnected');
      this.publishEvent(RuntimeEventType.DiscordRuntimeStopped);
      this.options.logger.info('Discord runtime stopped');
    } catch (error) {
      this.publishError(error);
      this.options.logger.error('Discord runtime failed to stop', { error });
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    if (this.state === 'reconnecting' || this.state === 'connecting') {
      return;
    }

    this.setState('reconnecting');
    this.publishEvent(RuntimeEventType.DiscordRuntimeReconnecting);
    this.options.logger.info('Discord runtime reconnecting');

    try {
      if (this.options.client.isConnected()) {
        await this.options.client.disconnect();
        this.unsubscribeClientEvents();
      }

      await this.options.client.connect();
      this.subscribeClientEvents();
      this.setState('connected');
      this.publishEvent(RuntimeEventType.DiscordRuntimeStarted);
      this.options.logger.info('Discord runtime reconnected');
    } catch (error) {
      this.setState('disconnected');
      this.publishError(error);
      this.options.logger.error('Discord runtime reconnect failed', { error });
      throw error;
    }
  }

  getState(): DiscordRuntimeState {
    return this.state;
  }

  setGatewayEventSink(sink: (event: DiscordGatewayRawEvent) => Promise<void>): void {
    this.gatewayEventSink = sink;
  }

  private setState(state: DiscordRuntimeState): void {
    this.state = state;
    if (state === 'connected') {
      this.options.healthService.setStartupHealth(true, 'discord connected');
    }
    if (state === 'stopping' || state === 'disconnected') {
      this.options.healthService.setShutdownHealth(false, 'discord stopped');
    }
  }

  private publishEvent(type: string, payload?: unknown): void {
    const event: KernelEvent = {
      id: `${type}-${Date.now()}`,
      correlationId: `${type}-${Date.now()}`,
      guildId: 'discord-runtime',
      type,
      payload,
    };

    this.options.eventBus.publish(event).catch(() => undefined);
  }

  private publishError(error: unknown): void {
    this.publishEvent(RuntimeEventType.DiscordRuntimeError, { error });
  }

  private subscribeClientEvents(): void {
    if (this.clientGatewayUnsubscribe) {
      return;
    }

    this.clientGatewayUnsubscribe = this.options.client.subscribe((event) => {
      void this.forwardGatewayEvent(event);
    });
  }

  private unsubscribeClientEvents(): void {
    if (!this.clientGatewayUnsubscribe) {
      return;
    }

    this.clientGatewayUnsubscribe();
    this.clientGatewayUnsubscribe = undefined;
  }

  private async forwardGatewayEvent(event: DiscordGatewayRawEvent): Promise<void> {
    if (!this.gatewayEventSink) {
      return;
    }

    try {
      await this.gatewayEventSink(event);
    } catch (error) {
      this.publishEvent(RuntimeEventType.DiscordGatewayEventDispatchFailed, {
        eventName: event.t,
        error,
      });
      this.options.logger.error('Discord runtime failed to forward gateway event', {
        error,
        event: event.t,
      });
    }
  }
}
