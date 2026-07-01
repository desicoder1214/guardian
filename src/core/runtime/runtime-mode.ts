export enum GuardianRuntimeMode {
  PRODUCTION = 'production',
  VALIDATION = 'validation',
  TESTING = 'testing',
  CERTIFICATION = 'certification',
}

const DEFAULT_RUNTIME_MODE = GuardianRuntimeMode.PRODUCTION;

export function parseGuardianRuntimeMode(value: string | undefined): GuardianRuntimeMode {
  switch ((value ?? '').trim().toLowerCase()) {
    case GuardianRuntimeMode.PRODUCTION:
      return GuardianRuntimeMode.PRODUCTION;
    case GuardianRuntimeMode.VALIDATION:
      return GuardianRuntimeMode.VALIDATION;
    case GuardianRuntimeMode.TESTING:
      return GuardianRuntimeMode.TESTING;
    case GuardianRuntimeMode.CERTIFICATION:
      return GuardianRuntimeMode.CERTIFICATION;
    default:
      return DEFAULT_RUNTIME_MODE;
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
