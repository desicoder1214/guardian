import { EventBus, KernelEvent } from '../../event/bus';
import { Logger } from '../logger';
import { HealthService } from '../health';
import { RuntimeEventType } from '../events';
import {
  DiscordGatewayAdapter,
  DiscordGatewayAdapterOptions,
  DiscordGatewayEventListener,
  DiscordGatewayEventSource,
} from './gateway-types';
import { DiscordEventPipeline, DiscordGatewayRawEvent } from './pipeline-types';

const GATEWAY_CONTEXT = 'discord-gateway-adapter';

export class InMemoryDiscordGatewayAdapter implements DiscordGatewayAdapter {
  private listeners: DiscordGatewayEventListener[] = [];
  private connected = false;
  private started = false;
  private sourceUnsubscribe?: () => void;

  constructor(private readonly options: DiscordGatewayAdapterOptions) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterStarting);
    this.options.logger.info('Discord gateway adapter starting');

    try {
      await this.connect();
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterStarted);
      this.options.logger.info('Discord gateway adapter started');
      this.options.healthService.setStartupHealth(true, 'discord gateway adapter started');
    } catch (error) {
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterError, { error });
      this.options.logger.error('Discord gateway adapter failed to start', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterStopping);
    this.options.logger.info('Discord gateway adapter stopping');

    try {
      await this.disconnect();
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterStopped);
      this.options.logger.info('Discord gateway adapter stopped');
      this.options.healthService.setShutdownHealth(false, 'discord gateway adapter stopped');
    } catch (error) {
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterError, { error });
      this.options.logger.error('Discord gateway adapter failed to stop', { error });
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.options.source.connect();
      await this.afterSourceConnect();
      this.connected = true;
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterConnected);
      this.options.logger.info('Discord gateway adapter connected');
      this.options.healthService.setStartupHealth(true, 'discord gateway connected');
    } catch (error) {
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterError, { error });
      this.options.logger.error('Discord gateway adapter connect failed', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.options.source.disconnect();
      this.connected = false;
      this.releaseSourceSubscription();
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterDisconnected);
      this.options.logger.info('Discord gateway adapter disconnected');
      this.options.healthService.setShutdownHealth(false, 'discord gateway disconnected');
    } catch (error) {
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterError, { error });
      this.options.logger.error('Discord gateway adapter disconnect failed', { error });
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterReconnecting);
    this.options.logger.info('Discord gateway adapter reconnecting');

    await this.disconnect();
    await this.connect();
  }

  async shutdown(): Promise<void> {
    await this.stop();
  }

  subscribe(listener: DiscordGatewayEventListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async onGatewayEvent(raw: DiscordGatewayRawEvent): Promise<void> {
    this.dispatchListeners(raw);
    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterEventReceived, { eventName: raw.t });
    this.options.logger.debug('Discord gateway event received', { event: raw.t });

    try {
      await this.options.pipeline.ingest(raw);
      this.options.logger.info('Discord gateway event forwarded to pipeline', { event: raw.t });
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterEventForwarded, { eventName: raw.t });
    } catch (error) {
      this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayAdapterEventForwardFailed, {
        eventName: raw.t,
        error,
      });
      this.options.logger.error('Discord gateway event forwarding failed', { error, event: raw.t });
      throw error;
    }
  }

  private dispatchListeners(raw: DiscordGatewayRawEvent): void {
    const listenersSnapshot = [...this.listeners];
    for (const listener of listenersSnapshot) {
      try {
        const result = listener(raw);
        if (result instanceof Promise) {
          result.catch(() => undefined);
        }
      } catch {
        // swallow listener errors to avoid disrupting adapter flow
      }
    }
  }

  private async afterSourceConnect(): Promise<void> {
    this.sourceUnsubscribe = this.options.source.subscribe((raw) => this.onGatewayEvent(raw));
  }

  private releaseSourceSubscription(): void {
    if (this.sourceUnsubscribe) {
      this.sourceUnsubscribe();
      this.sourceUnsubscribe = undefined;
    }
  }

  private publishRuntimeEvent(type: RuntimeEventType, payload?: unknown): void {
    const event: KernelEvent = {
      id: `${type}-${Date.now()}`,
      correlationId: `${type}-${Date.now()}`,
      guildId: GATEWAY_CONTEXT,
      type,
      payload,
    };

    this.options.eventBus.publish(event).catch(() => undefined);
  }
}
