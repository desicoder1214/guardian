import { EventBus, KernelEvent } from '../../event/bus';
import { Logger } from '../logger';
import { HealthService } from '../health';
import {
  DiscordGatewayRawEvent,
  DiscordGatewayNormalizedEvent,
  DiscordEventHandler,
  DiscordEventPipeline,
  CorrelationIdGenerator,
} from './pipeline-types';
import { RuntimeEventType } from '../events';

class DefaultCorrelationIdGenerator implements CorrelationIdGenerator {
  generate(eventName: string): string {
    return `${eventName}-${Date.now()}`;
  }
}

const PIPELINE_CONTEXT = 'discord-event-pipeline';

export class InMemoryDiscordEventPipeline implements DiscordEventPipeline {
  private handlers: DiscordEventHandler[] = [];
  private running = false;
  private readonly correlationIdGenerator: CorrelationIdGenerator;

  constructor(
    private readonly eventBus: EventBus,
    private readonly health: HealthService,
    private readonly logger: Logger,
    correlationIdGenerator?: CorrelationIdGenerator,
  ) {
    this.correlationIdGenerator = correlationIdGenerator ?? new DefaultCorrelationIdGenerator();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.logger.info('Discord event pipeline starting');
    this.publishRuntimeEvent(RuntimeEventType.DiscordEventPipelineStarted, {
      note: 'pipeline started',
    });
    this.health.setStartupHealth(true, 'discord event pipeline started');
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.logger.info('Discord event pipeline stopping');
    this.publishRuntimeEvent(RuntimeEventType.DiscordEventPipelineStopped, {
      note: 'pipeline stopped',
    });
    this.health.setShutdownHealth(false, 'discord event pipeline stopped');
  }

  async ingest(raw: DiscordGatewayRawEvent): Promise<void> {
    if (!this.running) {
      throw new Error('pipeline not started');
    }

    const correlationId = this.correlationIdGenerator.generate(raw.t);
    const normalized: DiscordGatewayNormalizedEvent = {
      eventName: raw.t,
      source: 'discord-gateway',
      timestamp: raw.ts ?? new Date().toISOString(),
      correlationId,
      payload: raw.d ?? null,
    };

    // publish received runtime event
    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayEventReceived, { eventName: raw.t });

    // publish normalized as KernelEvent to EventBus
    const kernelEvent: KernelEvent = {
      id: `${correlationId}-event`,
      correlationId,
      guildId: PIPELINE_CONTEXT,
      type: RuntimeEventType.DiscordGatewayEventNormalized,
      payload: normalized,
    };

    await this.eventBus.publish(kernelEvent);

    // fan-out to registered handlers
    await Promise.all(this.handlers.map((h) => h(normalized)));

    this.publishRuntimeEvent(RuntimeEventType.DiscordGatewayEventDispatched, {
      event: normalized.eventName,
    });
  }

  subscribe(handler: DiscordEventHandler): () => void {
    this.handlers.push(handler);
    this.publishRuntimeEvent(RuntimeEventType.DiscordEventSubscriptionRegistered, {
      count: this.handlers.length,
    });
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
      this.publishRuntimeEvent(RuntimeEventType.DiscordEventSubscriptionRemoved, {
        count: this.handlers.length,
      });
    };
  }

  private publishRuntimeEvent(type: RuntimeEventType, payload?: unknown): void {
    const correlationId = this.correlationIdGenerator.generate(type);
    const event = {
      id: `${correlationId}-runtime`,
      correlationId,
      guildId: PIPELINE_CONTEXT,
      type,
      payload,
    } as KernelEvent;

    this.eventBus.publish(event).catch(() => undefined);
  }
}
