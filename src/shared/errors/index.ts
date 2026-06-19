export class GuardianError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardianError';
  }
}

export class ConfigurationError extends GuardianError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ServiceResolutionError extends GuardianError {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceResolutionError';
  }
}
