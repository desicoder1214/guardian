export interface Disposable {
  dispose(): Promise<void>;
}

export interface HealthCheck {
  check(): Promise<HealthStatus>;
}

export interface HealthStatus {
  readonly healthy: boolean;
  readonly message?: string;
}
