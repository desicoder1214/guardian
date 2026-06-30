import { RuntimeEvent, RuntimeEventType } from './events';
import { Logger } from './logger';
import { HealthService } from './health';
import { EventBus, KernelEvent } from '../event/bus';
import {
  SecurityStartupRuntimeCoordinationReport,
  SecurityStartupRuntimeCoordinationRequest,
  SecurityStartupRuntimeCoordinator,
} from './security/security-startup-runtime-coordinator';

export enum RuntimeStartupMode {
  COLD_START = 'COLD_START',
  RECONNECT_START = 'RECONNECT_START',
  RECOVERY_START = 'RECOVERY_START',
}

export interface RuntimeStartupCoordinationRequestFactory {
  create(mode: RuntimeStartupMode): SecurityStartupRuntimeCoordinationRequest;
}

export interface RuntimeGatewayProcessingGate {
  isGatewayEventProcessingEnabled(): boolean;
}

export interface RuntimeLifecycle {
  start(): Promise<void>;
  reconnect(): Promise<void>;
  startRecovery(): Promise<void>;
  stop(): Promise<void>;
}

export class RuntimeManager implements RuntimeLifecycle, RuntimeGatewayProcessingGate {
  private stopping = false;
  private started = false;
  private startupReady = false;
  private latestStartupReport?: SecurityStartupRuntimeCoordinationReport;
  private startupFailureReport?: SecurityStartupRuntimeCoordinationReport;

  constructor(
    private readonly logger: Logger,
    private readonly healthService: HealthService,
    private readonly eventBus: EventBus,
    private readonly startupRuntimeCoordinator?: SecurityStartupRuntimeCoordinator,
    private readonly startupRequestFactory?: RuntimeStartupCoordinationRequestFactory,
  ) {}

  async start(): Promise<void> {
    if (this.started && this.startupReady) {
      return;
    }

    await this.coordinateStartup(RuntimeStartupMode.COLD_START);
  }

  async reconnect(): Promise<void> {
    await this.coordinateStartup(RuntimeStartupMode.RECONNECT_START);
  }

  async startRecovery(): Promise<void> {
    await this.coordinateStartup(RuntimeStartupMode.RECOVERY_START);
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    this.started = false;
    this.startupReady = false;
    this.publish(RuntimeEventType.ApplicationStopping);
    this.logger.info('Runtime stopping');
    this.healthService.setShutdownHealth(false, 'shutdown initiated');
    this.publish(RuntimeEventType.ApplicationStopped);
  }

  isGatewayEventProcessingEnabled(): boolean {
    return this.startupReady;
  }

  getLatestStartupCoordinationReport(): SecurityStartupRuntimeCoordinationReport | undefined {
    return this.latestStartupReport;
  }

  getStartupFailureReport(): SecurityStartupRuntimeCoordinationReport | undefined {
    return this.startupFailureReport;
  }

  private async coordinateStartup(mode: RuntimeStartupMode): Promise<void> {
    this.publish(RuntimeEventType.ApplicationStarting, { mode });
    this.logger.info('Runtime starting');
    this.startupReady = false;
    this.healthService.setStartupHealth(false, 'startup verification pending');

    if (this.startupRuntimeCoordinator && this.startupRequestFactory) {
      const report = await this.startupRuntimeCoordinator.coordinate(
        this.startupRequestFactory.create(mode),
      );

      if (!report.success) {
        this.startupFailureReport = report;
        this.latestStartupReport = undefined;
        this.healthService.setStartupHealth(false, 'startup coordination failed');
        this.publish(RuntimeEventType.ApplicationStopped, {
          mode,
          startupVerificationFailed: true,
          startupFailureReport: report,
        });
        throw new Error(
          `STARTUP_COORDINATION_FAILED:${report.failureReason ?? 'unknown'}`,
        );
      }

      this.latestStartupReport = report;
      this.startupFailureReport = undefined;
    }

    this.started = true;
    this.startupReady = true;
    this.healthService.setStartupHealth(true, 'startup complete');
    this.publish(RuntimeEventType.ApplicationStarted, {
      mode,
      startupVerified: true,
      coordinatorId: this.latestStartupReport?.coordinatorId,
    });
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
