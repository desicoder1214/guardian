import { RecoveryVerificationOutcome } from './recovery-engine';

export enum RuntimeRecoveryStateType {
  GUILD_CONFIGURATION = 'GUILD_CONFIGURATION',
  SECURITY_RUNTIME_STATUS = 'SECURITY_RUNTIME_STATUS',
  AUTHORIZED_BOT_REGISTRY = 'AUTHORIZED_BOT_REGISTRY',
  DETECTION_RUNTIME_METADATA = 'DETECTION_RUNTIME_METADATA',
  RECOVERY_METADATA = 'RECOVERY_METADATA',
}

export enum RuntimeRecoveryStateRegistryStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  STATE_REGISTRATION = 'STATE_REGISTRATION',
  REGISTRY_VERIFICATION = 'REGISTRY_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export interface RuntimeRecoveryStateRegistration {
  readonly guildConfiguration: Record<string, unknown>;
  readonly securityRuntimeStatus: Record<string, unknown>;
  readonly authorizedBotRegistry: Record<string, unknown>;
  readonly detectionRuntimeMetadata: Record<string, unknown>;
  readonly recoveryMetadata: Record<string, unknown>;
}

export interface RuntimeRecoveryStateRegistryRequest {
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly state: RuntimeRecoveryStateRegistration;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeRecoveryStateRegistryEntry {
  readonly entryId: string;
  readonly registryId: string;
  readonly stateType: RuntimeRecoveryStateType;
  readonly stateData: Record<string, unknown>;
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly registeredAt: string;
  readonly metadata: {
    readonly source: 'in-memory-runtime-recovery-state-registry';
    readonly deterministicEntryId: true;
    readonly idempotentRegistryKey: string;
  };
}

export interface RuntimeRecoveryStateRegistryReport {
  readonly registryId: string;
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly entries: readonly RuntimeRecoveryStateRegistryEntry[];
  readonly stagesCompleted: readonly RuntimeRecoveryStateRegistryStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface RuntimeRecoveryStateRegistryVerifier {
  verify(entries: readonly RuntimeRecoveryStateRegistryEntry[]): RecoveryVerificationOutcome;
}

export interface RuntimeRecoveryStateRegistry {
  register(request: RuntimeRecoveryStateRegistryRequest): RuntimeRecoveryStateRegistryReport;
}

const FAILURE_RECOVERY_ID_REQUIRED = 'RECOVERY_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_STATE_REQUIRED = 'STATE_REQUIRED';
const FAILURE_GUILD_CONFIGURATION_REQUIRED = 'GUILD_CONFIGURATION_REQUIRED';
const FAILURE_SECURITY_RUNTIME_STATUS_REQUIRED = 'SECURITY_RUNTIME_STATUS_REQUIRED';
const FAILURE_AUTHORIZED_BOT_REGISTRY_REQUIRED = 'AUTHORIZED_BOT_REGISTRY_REQUIRED';
const FAILURE_DETECTION_RUNTIME_METADATA_REQUIRED = 'DETECTION_RUNTIME_METADATA_REQUIRED';
const FAILURE_RECOVERY_METADATA_REQUIRED = 'RECOVERY_METADATA_REQUIRED';

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value) as T;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const serialized = sortedKeys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
    return `{${serialized.join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildDeterministicRegistryKey(
  request: RuntimeRecoveryStateRegistryRequest,
): string {
  return [
    request.recoveryId,
    request.correlationId,
    request.transactionId,
    request.guildId,
    stableSerialize(request.state),
  ].join('|');
}

function buildDeterministicRegistryId(
  request: RuntimeRecoveryStateRegistryRequest,
): string {
  return `runtime-recovery-state-registry:${buildDeterministicRegistryKey(request)}`;
}

function buildDeterministicEntryId(
  request: RuntimeRecoveryStateRegistryRequest,
  stateType: RuntimeRecoveryStateType,
): string {
  return `runtime-recovery-state-entry:${buildDeterministicRegistryKey(request)}:${stateType}`;
}

function freezeEntry(
  entry: RuntimeRecoveryStateRegistryEntry,
): RuntimeRecoveryStateRegistryEntry {
  return deepFreeze({
    ...entry,
    stateData: deepFreeze({ ...entry.stateData }),
    metadata: Object.freeze({ ...entry.metadata }),
  });
}

export function freezeRuntimeRecoveryStateRegistryRequest(
  request: RuntimeRecoveryStateRegistryRequest,
): RuntimeRecoveryStateRegistryRequest {
  return deepFreeze({
    ...request,
    state: deepFreeze({
      guildConfiguration: deepFreeze({ ...request.state.guildConfiguration }),
      securityRuntimeStatus: deepFreeze({ ...request.state.securityRuntimeStatus }),
      authorizedBotRegistry: deepFreeze({ ...request.state.authorizedBotRegistry }),
      detectionRuntimeMetadata: deepFreeze({ ...request.state.detectionRuntimeMetadata }),
      recoveryMetadata: deepFreeze({ ...request.state.recoveryMetadata }),
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeRuntimeRecoveryStateRegistryReport(
  report: RuntimeRecoveryStateRegistryReport,
): RuntimeRecoveryStateRegistryReport {
  return deepFreeze({
    ...report,
    entries: Object.freeze(report.entries.map((entry) => freezeEntry(entry))),
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

function resolveValidationFailures(
  request: RuntimeRecoveryStateRegistryRequest,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(request.recoveryId)) {
    failures.push(FAILURE_RECOVERY_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.correlationId)) {
    failures.push(FAILURE_CORRELATION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.transactionId)) {
    failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
  }

  if (!isNonEmptyString(request.guildId)) {
    failures.push(FAILURE_GUILD_ID_REQUIRED);
  }

  if (!request.state || typeof request.state !== 'object') {
    failures.push(FAILURE_STATE_REQUIRED);
    return Object.freeze(failures);
  }

  if (!isRecord(request.state.guildConfiguration)) {
    failures.push(FAILURE_GUILD_CONFIGURATION_REQUIRED);
  }

  if (!isRecord(request.state.securityRuntimeStatus)) {
    failures.push(FAILURE_SECURITY_RUNTIME_STATUS_REQUIRED);
  }

  if (!isRecord(request.state.authorizedBotRegistry)) {
    failures.push(FAILURE_AUTHORIZED_BOT_REGISTRY_REQUIRED);
  }

  if (!isRecord(request.state.detectionRuntimeMetadata)) {
    failures.push(FAILURE_DETECTION_RUNTIME_METADATA_REQUIRED);
  }

  if (!isRecord(request.state.recoveryMetadata)) {
    failures.push(FAILURE_RECOVERY_METADATA_REQUIRED);
  }

  return Object.freeze(failures);
}

function buildEntries(
  request: RuntimeRecoveryStateRegistryRequest,
): readonly RuntimeRecoveryStateRegistryEntry[] {
  const registryId = buildDeterministicRegistryId(request);
  const idempotentRegistryKey = buildDeterministicRegistryKey(request);
  const registeredAt = new Date().toISOString();

  const entries: RuntimeRecoveryStateRegistryEntry[] = [
    {
      entryId: buildDeterministicEntryId(request, RuntimeRecoveryStateType.GUILD_CONFIGURATION),
      registryId,
      stateType: RuntimeRecoveryStateType.GUILD_CONFIGURATION,
      stateData: deepFreeze({ ...request.state.guildConfiguration }),
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      registeredAt,
      metadata: Object.freeze({
        source: 'in-memory-runtime-recovery-state-registry' as const,
        deterministicEntryId: true as const,
        idempotentRegistryKey,
      }),
    },
    {
      entryId: buildDeterministicEntryId(request, RuntimeRecoveryStateType.SECURITY_RUNTIME_STATUS),
      registryId,
      stateType: RuntimeRecoveryStateType.SECURITY_RUNTIME_STATUS,
      stateData: deepFreeze({ ...request.state.securityRuntimeStatus }),
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      registeredAt,
      metadata: Object.freeze({
        source: 'in-memory-runtime-recovery-state-registry' as const,
        deterministicEntryId: true as const,
        idempotentRegistryKey,
      }),
    },
    {
      entryId: buildDeterministicEntryId(request, RuntimeRecoveryStateType.AUTHORIZED_BOT_REGISTRY),
      registryId,
      stateType: RuntimeRecoveryStateType.AUTHORIZED_BOT_REGISTRY,
      stateData: deepFreeze({ ...request.state.authorizedBotRegistry }),
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      registeredAt,
      metadata: Object.freeze({
        source: 'in-memory-runtime-recovery-state-registry' as const,
        deterministicEntryId: true as const,
        idempotentRegistryKey,
      }),
    },
    {
      entryId: buildDeterministicEntryId(request, RuntimeRecoveryStateType.DETECTION_RUNTIME_METADATA),
      registryId,
      stateType: RuntimeRecoveryStateType.DETECTION_RUNTIME_METADATA,
      stateData: deepFreeze({ ...request.state.detectionRuntimeMetadata }),
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      registeredAt,
      metadata: Object.freeze({
        source: 'in-memory-runtime-recovery-state-registry' as const,
        deterministicEntryId: true as const,
        idempotentRegistryKey,
      }),
    },
    {
      entryId: buildDeterministicEntryId(request, RuntimeRecoveryStateType.RECOVERY_METADATA),
      registryId,
      stateType: RuntimeRecoveryStateType.RECOVERY_METADATA,
      stateData: deepFreeze({ ...request.state.recoveryMetadata }),
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      registeredAt,
      metadata: Object.freeze({
        source: 'in-memory-runtime-recovery-state-registry' as const,
        deterministicEntryId: true as const,
        idempotentRegistryKey,
      }),
    },
  ];

  return Object.freeze(entries.map((entry) => freezeEntry(entry)));
}

export class PassThroughRuntimeRecoveryStateRegistryVerifier
  implements RuntimeRecoveryStateRegistryVerifier
{
  verify(_entries: readonly RuntimeRecoveryStateRegistryEntry[]): RecoveryVerificationOutcome {
    return RecoveryVerificationOutcome.VERIFIED;
  }
}

export class InMemoryRuntimeRecoveryStateRegistry
  implements RuntimeRecoveryStateRegistry
{
  private readonly completedRegistrations = new Map<string, RuntimeRecoveryStateRegistryReport>();

  constructor(
    private readonly verifier: RuntimeRecoveryStateRegistryVerifier =
      new PassThroughRuntimeRecoveryStateRegistryVerifier(),
  ) {}

  register(
    request: RuntimeRecoveryStateRegistryRequest,
  ): RuntimeRecoveryStateRegistryReport {
    const frozenRequest = freezeRuntimeRecoveryStateRegistryRequest(request);
    const startedAtMs = Date.now();
    const registryId = buildDeterministicRegistryId(frozenRequest);

    const existing = this.completedRegistrations.get(registryId);
    if (existing) {
      return freezeRuntimeRecoveryStateRegistryReport({
        ...existing,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: RuntimeRecoveryStateRegistryStage[] = [];
    stagesCompleted.push(RuntimeRecoveryStateRegistryStage.REQUEST_VALIDATION);

    const validationFailures = resolveValidationFailures(frozenRequest);

    stagesCompleted.push(RuntimeRecoveryStateRegistryStage.STATE_REGISTRATION);
    const entries = validationFailures.length > 0 ? Object.freeze([]) : buildEntries(frozenRequest);

    stagesCompleted.push(RuntimeRecoveryStateRegistryStage.REGISTRY_VERIFICATION);
    const verificationOutcome =
      validationFailures.length > 0
        ? RecoveryVerificationOutcome.FAILED
        : this.verifier.verify(entries);

    stagesCompleted.push(RuntimeRecoveryStateRegistryStage.REPORT_GENERATION);

    const success = verificationOutcome === RecoveryVerificationOutcome.VERIFIED;
    const report = freezeRuntimeRecoveryStateRegistryReport({
      registryId,
      recoveryId: frozenRequest.recoveryId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      entries,
      stagesCompleted: Object.freeze(stagesCompleted),
      verificationOutcome,
      success,
      failureReason: success
        ? undefined
        : validationFailures.length > 0
          ? validationFailures.join(',')
          : 'runtime-recovery-state-registry-verification-failed',
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
    });

    this.completedRegistrations.set(registryId, report);
    return report;
  }
}
