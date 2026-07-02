import { ConfigurationError } from '../../shared/errors';

export enum GuardianRuntimeMode {
  PRODUCTION = 'production',
  VALIDATION = 'validation',
  TESTING = 'testing',
  CERTIFICATION = 'certification',
}

export function parseGuardianRuntimeMode(value: string | undefined): GuardianRuntimeMode {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized.length === 0) {
    throw new ConfigurationError(
      'Missing required environment variable: GUARDIAN_RUNTIME_MODE. Set GUARDIAN_RUNTIME_MODE to one of: production, validation, testing, certification.',
    );
  }

  switch (normalized) {
    case GuardianRuntimeMode.PRODUCTION:
      return GuardianRuntimeMode.PRODUCTION;
    case GuardianRuntimeMode.VALIDATION:
      return GuardianRuntimeMode.VALIDATION;
    case GuardianRuntimeMode.TESTING:
      return GuardianRuntimeMode.TESTING;
    case GuardianRuntimeMode.CERTIFICATION:
      return GuardianRuntimeMode.CERTIFICATION;
    default:
      throw new ConfigurationError(
        `Invalid GUARDIAN_RUNTIME_MODE: ${value}. Allowed values: production, validation, testing, certification.`,
      );
  }
}

export function resolveGuardianRuntimeMode(
  source: Record<string, string | undefined> = process.env,
): GuardianRuntimeMode {
  return parseGuardianRuntimeMode(source.GUARDIAN_RUNTIME_MODE);
}

export function isProductionMode(mode: GuardianRuntimeMode): boolean {
  return mode === GuardianRuntimeMode.PRODUCTION;
}
