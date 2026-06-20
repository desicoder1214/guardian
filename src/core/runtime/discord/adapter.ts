import { DiscordRuntimeState, DiscordClientAdapter, DiscordRuntimeAdapter } from './types';
import { DiscordRuntimeConfiguration } from './config';
import { EventBus, KernelEvent } from '../../event/bus';
import { RuntimeEventType } from '../events';
import { HealthService } from '../health';
import { Logger } from '../logger';

export interface DiscordRuntimeAdapterOptions {
  readonly client: DiscordClientAdapter;
  readonly config: DiscordRuntimeConfiguration;
  readonly eventBus: EventBus;
  readonly healthService: HealthService;
  readonly logger: Logger;
}

export class InMemoryDiscordRuntimeAdapter implements DiscordRuntimeAdapter {
  private state: DiscordRuntimeState = 'disconnected';

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
      }

      await this.options.client.connect();
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
}
