import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';

export enum SecurityIntegrationInventoryReconciliationStage {
  RECONCILIATION_VALIDATION = 'RECONCILIATION_VALIDATION',
  SOURCE_EVALUATION = 'SOURCE_EVALUATION',
  DRIFT_DETECTION = 'DRIFT_DETECTION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityIntegrationInventoryReconciliationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityIntegrationIdentity {
  readonly integrationId: string;
  readonly applicationId: string;
  readonly name?: string;
  readonly enabled: boolean;
  readonly ownerBotUserId?: string;
  readonly privileged: boolean;
  readonly suspicious: boolean;
  readonly highRisk: boolean;
  readonly ownedWebhookIds: readonly string[];
  readonly permissions: readonly string[];
}

export interface SecurityIntegrationInventorySnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly integrationInventory: readonly SecurityIntegrationIdentity[];
}

export interface SecurityAuthorizedIntegrationRegistryRecord {
  readonly integrationId: string;
  readonly applicationId: string;
  readonly expectedEnabled: boolean;
  readonly ownerBotUserId?: string;
  readonly privileged: boolean;
  readonly required: boolean;
  readonly ownedWebhookIds: readonly string[];
  readonly permissions: readonly string[];
}

export interface SecurityAuthorizedIntegrationRegistryState {
  readonly registryId: string;
  readonly registryVersion: number;
  readonly records: readonly SecurityAuthorizedIntegrationRegistryRecord[];
}

export interface SecurityIntegrationInventoryReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly authorizedIntegrationRegistry: SecurityAuthorizedIntegrationRegistryState;
  readonly currentGuildIntegrationInventory: readonly SecurityIntegrationIdentity[];
  readonly runtimeSnapshot: SecurityIntegrationInventorySnapshot;
  readonly recoverySnapshot: SecurityIntegrationInventorySnapshot;
  readonly startupInventory: SecurityIntegrationInventorySnapshot;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityIntegrationInventoryReconciliationReport {
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityIntegrationInventoryReconciliationStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly reconciliationRequired: boolean;
  readonly verificationOutcome: SecurityIntegrationInventoryReconciliationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-integration-inventory-reconciliation';
    readonly deterministicReconciliationId: true;
    readonly findingsOnly: true;
    readonly registryId: string;
    readonly registryVersion: number;
    readonly runtimeSnapshotId: string;
    readonly recoverySnapshotId: string;
    readonly startupSnapshotId: string;
  };
}

export interface SecurityIntegrationInventoryReconciler {
  execute(
    request: SecurityIntegrationInventoryReconciliationRequest,
  ): Promise<SecurityIntegrationInventoryReconciliationReport>;
}

const FAILURE_RECONCILIATION_ID_REQUIRED = 'RECONCILIATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_REGISTRY_ID_REQUIRED = 'REGISTRY_ID_REQUIRED';
const FAILURE_REGISTRY_VERSION_INVALID = 'REGISTRY_VERSION_INVALID';
const FAILURE_RUNTIME_SNAPSHOT_ID_REQUIRED = 'RUNTIME_SNAPSHOT_ID_REQUIRED';
const FAILURE_RECOVERY_SNAPSHOT_ID_REQUIRED = 'RECOVERY_SNAPSHOT_ID_REQUIRED';
const FAILURE_STARTUP_SNAPSHOT_ID_REQUIRED = 'STARTUP_SNAPSHOT_ID_REQUIRED';
const FAILURE_SNAPSHOT_GUILD_MISMATCH = 'SNAPSHOT_GUILD_MISMATCH';
const FAILURE_SNAPSHOT_RUNTIME_MISMATCH = 'SNAPSHOT_RUNTIME_MISMATCH';
const FAILURE_INCONSISTENT_STATE = 'INCONSISTENT_STATE';
const FAILURE_VERIFICATION_FAILED = 'VERIFICATION_FAILED';

const PERMISSION_SENSITIVE_KEYS = Object.freeze([
  'ADMINISTRATOR',
  'MANAGE_GUILD',
  'MANAGE_WEBHOOKS',
  'MANAGE_ROLES',
]);

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

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function toSortedSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function setEquals(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function hasPermissionSensitiveDrift(current: readonly string[], expected: readonly string[]): boolean {
  const currentSet = new Set(current);
  const expectedSet = new Set(expected);
  for (const key of PERMISSION_SENSITIVE_KEYS) {
    if (currentSet.has(key) !== expectedSet.has(key)) {
      return true;
    }
  }
  return false;
}

function freezeIntegrationIdentity(integration: SecurityIntegrationIdentity): SecurityIntegrationIdentity {
  return deepFreeze({
    ...integration,
    ownedWebhookIds: toSortedSet(integration.ownedWebhookIds),
    permissions: toSortedSet(integration.permissions),
  });
}

function freezeSnapshot(snapshot: SecurityIntegrationInventorySnapshot): SecurityIntegrationInventorySnapshot {
  return deepFreeze({
    ...snapshot,
    integrationInventory: Object.freeze(
      snapshot.integrationInventory.map((entry) => freezeIntegrationIdentity(entry)),
    ),
  });
}

function freezeRegistryRecord(
  record: SecurityAuthorizedIntegrationRegistryRecord,
): SecurityAuthorizedIntegrationRegistryRecord {
  return deepFreeze({
    ...record,
    ownedWebhookIds: toSortedSet(record.ownedWebhookIds),
    permissions: toSortedSet(record.permissions),
  });
}

function freezeRegistry(
  registry: SecurityAuthorizedIntegrationRegistryState,
): SecurityAuthorizedIntegrationRegistryState {
  return deepFreeze({
    ...registry,
    records: Object.freeze(registry.records.map((entry) => freezeRegistryRecord(entry))),
  });
}

function freezeFinding(finding: SecurityReconciliationFinding): SecurityReconciliationFinding {
  return deepFreeze({
    ...finding,
    metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
  });
}

export function freezeSecurityIntegrationInventoryReconciliationRequest(
  request: SecurityIntegrationInventoryReconciliationRequest,
): SecurityIntegrationInventoryReconciliationRequest {
  return deepFreeze({
    ...request,
    authorizedIntegrationRegistry: freezeRegistry(request.authorizedIntegrationRegistry),
    currentGuildIntegrationInventory: Object.freeze(
      request.currentGuildIntegrationInventory.map((entry) => freezeIntegrationIdentity(entry)),
    ),
    runtimeSnapshot: freezeSnapshot(request.runtimeSnapshot),
    recoverySnapshot: freezeSnapshot(request.recoverySnapshot),
    startupInventory: freezeSnapshot(request.startupInventory),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityIntegrationInventoryReconciliationReport,
): SecurityIntegrationInventoryReconciliationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReconciliationId(
  request: SecurityIntegrationInventoryReconciliationRequest,
): string {
  return [
    'security-integration-inventory-reconciliation',
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.authorizedIntegrationRegistry.registryId,
    String(request.authorizedIntegrationRegistry.registryVersion),
    request.runtimeSnapshot.snapshotId,
    request.recoverySnapshot.snapshotId,
    request.startupInventory.snapshotId,
  ].join(':');
}

function buildFinding(
  request: SecurityIntegrationInventoryReconciliationRequest,
  reconciliationId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
  summary: string,
  metadata?: Record<string, unknown>,
): SecurityReconciliationFinding {
  return freezeFinding({
    findingId: `${reconciliationId}:finding:${type}:${targetId}`,
    type,
    severity,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    correlationId: request.correlationId,
    targetId,
    summary,
    metadata,
  });
}

function indexByIntegrationId<T>(
  entries: readonly T[],
  selectIntegrationId: (entry: T) => string,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    result.set(selectIntegrationId(entry), entry);
  }
  return result;
}

function firstDefinedBaseline(
  integrationId: string,
  runtimeById: ReadonlyMap<string, SecurityIntegrationIdentity>,
  recoveryById: ReadonlyMap<string, SecurityIntegrationIdentity>,
  startupById: ReadonlyMap<string, SecurityIntegrationIdentity>,
): SecurityIntegrationIdentity | undefined {
  return runtimeById.get(integrationId) ?? recoveryById.get(integrationId) ?? startupById.get(integrationId);
}

function validateInput(
  request: SecurityIntegrationInventoryReconciliationRequest,
  reconciliationId: string,
): readonly string[] {
  const failures: string[] = [];

  if (!isNonEmptyString(reconciliationId)) {
    failures.push(FAILURE_RECONCILIATION_ID_REQUIRED);
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
  if (!isNonEmptyString(request.runtimeId)) {
    failures.push(FAILURE_RUNTIME_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.authorizedIntegrationRegistry.registryId)) {
    failures.push(FAILURE_REGISTRY_ID_REQUIRED);
  }
  if (request.authorizedIntegrationRegistry.registryVersion < 0) {
    failures.push(FAILURE_REGISTRY_VERSION_INVALID);
  }
  if (!isNonEmptyString(request.runtimeSnapshot.snapshotId)) {
    failures.push(FAILURE_RUNTIME_SNAPSHOT_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.recoverySnapshot.snapshotId)) {
    failures.push(FAILURE_RECOVERY_SNAPSHOT_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.startupInventory.snapshotId)) {
    failures.push(FAILURE_STARTUP_SNAPSHOT_ID_REQUIRED);
  }

  const snapshots: readonly SecurityIntegrationInventorySnapshot[] = [
    request.runtimeSnapshot,
    request.recoverySnapshot,
    request.startupInventory,
  ];

  for (const snapshot of snapshots) {
    if (snapshot.guildId !== request.guildId) {
      failures.push(`${FAILURE_SNAPSHOT_GUILD_MISMATCH}:${snapshot.snapshotId}`);
    }
    if (snapshot.runtimeId !== request.runtimeId) {
      failures.push(`${FAILURE_SNAPSHOT_RUNTIME_MISMATCH}:${snapshot.snapshotId}`);
    }
  }

  return Object.freeze(failures);
}

function detectDriftFindings(
  request: SecurityIntegrationInventoryReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];

  const registryById = indexByIntegrationId(
    request.authorizedIntegrationRegistry.records,
    (entry) => entry.integrationId,
  );
  const currentById = indexByIntegrationId(
    request.currentGuildIntegrationInventory,
    (entry) => entry.integrationId,
  );
  const runtimeById = indexByIntegrationId(request.runtimeSnapshot.integrationInventory, (entry) => entry.integrationId);
  const recoveryById = indexByIntegrationId(
    request.recoverySnapshot.integrationInventory,
    (entry) => entry.integrationId,
  );
  const startupById = indexByIntegrationId(
    request.startupInventory.integrationInventory,
    (entry) => entry.integrationId,
  );

  for (const currentIntegration of request.currentGuildIntegrationInventory) {
    const registryRecord = registryById.get(currentIntegration.integrationId);
    const baseline = firstDefinedBaseline(
      currentIntegration.integrationId,
      runtimeById,
      recoveryById,
      startupById,
    );

    if (!registryRecord) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          currentIntegration.integrationId,
          `Unknown integration ${currentIntegration.integrationId} exists in current guild inventory but is missing from the authorized integration registry.`,
          Object.freeze({ category: 'UNKNOWN_INTEGRATION' }),
        ),
      );
    }

    if (!baseline) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
          SecurityReconciliationFindingSeverity.MEDIUM,
          currentIntegration.integrationId,
          `Integration ${currentIntegration.integrationId} appears in current inventory but not in runtime, recovery, or startup baselines.`,
          Object.freeze({ category: 'NEWLY_ADDED_INTEGRATION' }),
        ),
      );
    }

    if (baseline) {
      const modified =
        currentIntegration.applicationId !== baseline.applicationId ||
        currentIntegration.enabled !== baseline.enabled ||
        currentIntegration.ownerBotUserId !== baseline.ownerBotUserId ||
        currentIntegration.privileged !== baseline.privileged ||
        currentIntegration.name !== baseline.name;

      if (modified) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.REGISTRY_MISMATCH,
            SecurityReconciliationFindingSeverity.MEDIUM,
            currentIntegration.integrationId,
            `Integration ${currentIntegration.integrationId} metadata drifted from reconciliation baselines.`,
            Object.freeze({ category: 'MODIFIED_INTEGRATION' }),
          ),
        );
      }

      const currentPermissions = toSortedSet(currentIntegration.permissions);
      const expectedPermissions = toSortedSet(
        baseline.permissions.length > 0
          ? baseline.permissions
          : registryRecord?.permissions ?? Object.freeze([]),
      );
      if (
        !setEquals(currentPermissions, expectedPermissions) &&
        hasPermissionSensitiveDrift(currentPermissions, expectedPermissions)
      ) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.PERMISSION_DRIFT,
            SecurityReconciliationFindingSeverity.CRITICAL,
            currentIntegration.integrationId,
            `Integration ${currentIntegration.integrationId} has permission-sensitive drift from reconciliation baselines.`,
            Object.freeze({
              category: 'PERMISSION_SENSITIVE_INTEGRATION_DRIFT',
              currentPermissions,
              expectedPermissions,
            }),
          ),
        );
      }
    }

    if (currentIntegration.suspicious) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          currentIntegration.integrationId,
          `Integration ${currentIntegration.integrationId} is marked suspicious by inventory telemetry.`,
          Object.freeze({ category: 'SUSPICIOUS_INTEGRATION' }),
        ),
      );
    }

    if (currentIntegration.highRisk || currentIntegration.privileged) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PRIVILEGE_ESCALATION,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentIntegration.integrationId,
          `Integration ${currentIntegration.integrationId} is high risk due to privileged behavior or risk heuristics.`,
          Object.freeze({ category: 'HIGH_RISK_INTEGRATION' }),
        ),
      );
    }

    if (
      currentIntegration.ownedWebhookIds.length > 0 &&
      (currentIntegration.highRisk || currentIntegration.privileged || currentIntegration.suspicious)
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentIntegration.integrationId,
          `Integration ${currentIntegration.integrationId} owns webhooks and is risk-elevated.`,
          Object.freeze({
            category: 'INTEGRATION_OWNED_WEBHOOK_RISK',
            ownedWebhookIds: currentIntegration.ownedWebhookIds,
          }),
        ),
      );
    }

    if (
      isNonEmptyString(currentIntegration.ownerBotUserId ?? '') &&
      (currentIntegration.highRisk || currentIntegration.privileged || currentIntegration.suspicious)
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentIntegration.integrationId,
          `Integration ${currentIntegration.integrationId} references an owned bot while in a risk-elevated state.`,
          Object.freeze({
            category: 'INTEGRATION_OWNED_BOT_RISK',
            ownerBotUserId: currentIntegration.ownerBotUserId,
          }),
        ),
      );
    }
  }

  for (const record of request.authorizedIntegrationRegistry.records) {
    const currentIntegration = currentById.get(record.integrationId);
    const runtimeIntegration = runtimeById.get(record.integrationId);
    const recoveryIntegration = recoveryById.get(record.integrationId);
    const startupIntegration = startupById.get(record.integrationId);

    if (!currentIntegration) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          record.integrationId,
          `Authorized integration ${record.integrationId} is missing from current guild inventory.`,
          Object.freeze({ category: 'MISSING_AUTHORIZED_INTEGRATION' }),
        ),
      );
    }

    if (
      currentIntegration === undefined &&
      record.required &&
      runtimeIntegration === undefined &&
      recoveryIntegration === undefined &&
      startupIntegration === undefined
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.CRITICAL,
          record.integrationId,
          `Required integration ${record.integrationId} is absent from current inventory and all reconciliation baselines.`,
          Object.freeze({ category: 'ORPHANED_INTEGRATION' }),
        ),
      );
    }

    const baseline = runtimeIntegration ?? recoveryIntegration ?? startupIntegration;
    if (baseline) {
      const registryMismatch =
        record.applicationId !== baseline.applicationId ||
        record.expectedEnabled !== baseline.enabled ||
        record.ownerBotUserId !== baseline.ownerBotUserId ||
        record.privileged !== baseline.privileged ||
        !setEquals(toSortedSet(record.permissions), toSortedSet(baseline.permissions));

      if (registryMismatch) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.REGISTRY_MISMATCH,
            SecurityReconciliationFindingSeverity.HIGH,
            record.integrationId,
            `Authorized integration registry entry for ${record.integrationId} mismatches snapshot/startup baselines.`,
            Object.freeze({ category: 'REGISTRY_MISMATCH' }),
          ),
        );
      }
    }
  }

  const allBaselineIntegrationIds = new Set<string>([
    ...request.runtimeSnapshot.integrationInventory.map((entry) => entry.integrationId),
    ...request.recoverySnapshot.integrationInventory.map((entry) => entry.integrationId),
    ...request.startupInventory.integrationInventory.map((entry) => entry.integrationId),
  ]);

  for (const integrationId of allBaselineIntegrationIds) {
    const runtimeIntegration = runtimeById.get(integrationId);
    const recoveryIntegration = recoveryById.get(integrationId);
    const startupIntegration = startupById.get(integrationId);

    const presence = [runtimeIntegration, recoveryIntegration, startupIntegration].map(
      (entry) => entry !== undefined,
    );
    const hasPresenceInconsistency = presence.includes(true) && presence.includes(false);

    const appIds = [runtimeIntegration, recoveryIntegration, startupIntegration]
      .filter((entry): entry is SecurityIntegrationIdentity => entry !== undefined)
      .map((entry) => entry.applicationId);
    const enabledFlags = [runtimeIntegration, recoveryIntegration, startupIntegration]
      .filter((entry): entry is SecurityIntegrationIdentity => entry !== undefined)
      .map((entry) => String(entry.enabled));
    const ownerIds = [runtimeIntegration, recoveryIntegration, startupIntegration]
      .filter((entry): entry is SecurityIntegrationIdentity => entry !== undefined)
      .map((entry) => entry.ownerBotUserId ?? '');
    const permissionSets = [runtimeIntegration, recoveryIntegration, startupIntegration]
      .filter((entry): entry is SecurityIntegrationIdentity => entry !== undefined)
      .map((entry) => toSortedSet(entry.permissions).join(','));

    const hasBaselineInconsistency =
      new Set(appIds).size > 1 ||
      new Set(enabledFlags).size > 1 ||
      new Set(ownerIds).size > 1 ||
      new Set(permissionSets).size > 1;

    if (hasPresenceInconsistency || hasBaselineInconsistency) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
          SecurityReconciliationFindingSeverity.HIGH,
          integrationId,
          `Integration ${integrationId} has inconsistent state across runtime, recovery, and startup baselines.`,
          Object.freeze({
            category: 'SNAPSHOT_INCONSISTENCY',
            hasPresenceInconsistency,
            hasBaselineInconsistency,
          }),
        ),
      );
    }
  }

  for (const integrationId of allBaselineIntegrationIds) {
    if (!currentById.has(integrationId)) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
          SecurityReconciliationFindingSeverity.MEDIUM,
          integrationId,
          `Integration ${integrationId} existed in reconciliation baselines but is absent from current guild inventory.`,
          Object.freeze({ category: 'DELETED_INTEGRATION' }),
        ),
      );
    }
  }

  const sortedFindings = findings.sort((left, right) => {
    const leftRank =
      left.severity === SecurityReconciliationFindingSeverity.CRITICAL
        ? 0
        : left.severity === SecurityReconciliationFindingSeverity.HIGH
          ? 1
          : left.severity === SecurityReconciliationFindingSeverity.MEDIUM
            ? 2
            : 3;
    const rightRank =
      right.severity === SecurityReconciliationFindingSeverity.CRITICAL
        ? 0
        : right.severity === SecurityReconciliationFindingSeverity.HIGH
          ? 1
          : right.severity === SecurityReconciliationFindingSeverity.MEDIUM
            ? 2
            : 3;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const typeCompare = left.type.localeCompare(right.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }

    const targetCompare = left.targetId.localeCompare(right.targetId);
    if (targetCompare !== 0) {
      return targetCompare;
    }

    return left.findingId.localeCompare(right.findingId);
  });

  return Object.freeze(sortedFindings.map((entry) => freezeFinding(entry)));
}

function buildFailureReport(
  request: SecurityIntegrationInventoryReconciliationRequest,
  reconciliationId: string,
  stagesCompleted: readonly SecurityIntegrationInventoryReconciliationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityIntegrationInventoryReconciliationReport {
  return freezeReport({
    reconciliationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted,
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityIntegrationInventoryReconciliationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-integration-inventory-reconciliation' as const,
      deterministicReconciliationId: true as const,
      findingsOnly: true as const,
      registryId: request.authorizedIntegrationRegistry.registryId,
      registryVersion: request.authorizedIntegrationRegistry.registryVersion,
      runtimeSnapshotId: request.runtimeSnapshot.snapshotId,
      recoverySnapshotId: request.recoverySnapshot.snapshotId,
      startupSnapshotId: request.startupInventory.snapshotId,
    }),
  });
}

export class InMemorySecurityIntegrationInventoryReconciler
  implements SecurityIntegrationInventoryReconciler
{
  private readonly completedReports = new Map<string, SecurityIntegrationInventoryReconciliationReport>();

  async execute(
    request: SecurityIntegrationInventoryReconciliationRequest,
  ): Promise<SecurityIntegrationInventoryReconciliationReport> {
    const frozenRequest = freezeSecurityIntegrationInventoryReconciliationRequest(request);
    const reconciliationId =
      frozenRequest.reconciliationId ?? toDeterministicReconciliationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(reconciliationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityIntegrationInventoryReconciliationStage[] = [];
    stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.RECONCILIATION_VALIDATION);

    const validationFailures = validateInput(frozenRequest, reconciliationId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_INCONSISTENT_STATE}:${validationFailures.join(',')}`,
      );
      this.completedReports.set(reconciliationId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.SOURCE_EVALUATION);
    stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.DRIFT_DETECTION);
    const findings = detectDriftFindings(frozenRequest, reconciliationId);

    stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.VERIFICATION);
    const verificationSucceeded = findings.every(
      (finding) =>
        finding.correlationId === frozenRequest.correlationId &&
        finding.guildId === frozenRequest.guildId &&
        finding.runtimeId === frozenRequest.runtimeId,
    );

    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.REPORT_GENERATION);
      const failure = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        FAILURE_VERIFICATION_FAILED,
      );
      this.completedReports.set(reconciliationId, failure);
      return failure;
    }

    stagesCompleted.push(SecurityIntegrationInventoryReconciliationStage.REPORT_GENERATION);
    const report = freezeReport({
      reconciliationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      findings,
      reconciliationRequired: findings.length > 0,
      verificationOutcome: SecurityIntegrationInventoryReconciliationVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-integration-inventory-reconciliation' as const,
        deterministicReconciliationId: true as const,
        findingsOnly: true as const,
        registryId: frozenRequest.authorizedIntegrationRegistry.registryId,
        registryVersion: frozenRequest.authorizedIntegrationRegistry.registryVersion,
        runtimeSnapshotId: frozenRequest.runtimeSnapshot.snapshotId,
        recoverySnapshotId: frozenRequest.recoverySnapshot.snapshotId,
        startupSnapshotId: frozenRequest.startupInventory.snapshotId,
      }),
    });

    this.completedReports.set(reconciliationId, report);
    return report;
  }
}
