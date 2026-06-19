import { RuntimeEvent, RuntimeEventType } from './events';
import { Logger } from './logger';
import { HealthService } from './health';
import { EventBus, KernelEvent } from '../event/bus';

export interface RuntimeLifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class RuntimeManager implements RuntimeLifecycle {
  private stopping = false;

  constructor(
    private readonly logger: Logger,
    private readonly healthService: HealthService,
    private readonly eventBus: EventBus,
  ) {}

  async start(): Promise<void> {
    this.publish(RuntimeEventType.ApplicationStarting);
    this.logger.info('Runtime starting');
    this.healthService.setStartupHealth(true, 'startup complete');
    this.publish(RuntimeEventType.ApplicationStarted);
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    this.publish(RuntimeEventType.ApplicationStopping);
    this.logger.info('Runtime stopping');
    this.healthService.setShutdownHealth(false, 'shutdown initiated');
    this.publish(RuntimeEventType.ApplicationStopped);
  }

  private publish(type: RuntimeEventType, payload?: unknown): void {
    const event: RuntimeEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    const kernelEvent: KernelEvent = {
      id: `${type}-${Date.now()}`,
      correlationId: `${type}-${Date.now()}`,
      guildId: 'runtime',
      type,
      payload: event,
    };

    this.eventBus.publish(kernelEvent).catch((error) => {
      this.logger.error('Failed to publish runtime event', { error });
    });
  }
}
