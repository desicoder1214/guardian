export interface HealthStatus {
  readonly healthy: boolean;
  readonly details?: string;
}

export interface HealthService {
  getReadiness(): HealthStatus;
  getLiveness(): HealthStatus;
  setStartupHealth(healthy: boolean, details?: string): void;
  setShutdownHealth(healthy: boolean, details?: string): void;
}

export class RuntimeHealthService implements HealthService {
  private readiness: HealthStatus = { healthy: false, details: 'starting' };
  private liveness: HealthStatus = { healthy: true, details: 'alive' };

  getReadiness(): HealthStatus {
    return this.readiness;
  }

  getLiveness(): HealthStatus {
    return this.liveness;
  }

  setStartupHealth(healthy: boolean, details?: string): void {
    this.readiness = { healthy, details };
  }

  setShutdownHealth(healthy: boolean, details?: string): void {
    this.liveness = { healthy, details };
  }
}
