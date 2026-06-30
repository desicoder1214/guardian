import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';

export enum SecurityPermissionRoleStateReconciliationStage {
  RECONCILIATION_VALIDATION = 'RECONCILIATION_VALIDATION',
  SOURCE_EVALUATION = 'SOURCE_EVALUATION',
  DRIFT_DETECTION = 'DRIFT_DETECTION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityPermissionRoleStateReconciliationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityRoleStateIdentity {
  readonly roleId: string;
  readonly name: string;
  readonly position: number;
  readonly privileged: boolean;
  readonly permissions: readonly string[];
}

export interface SecurityChannelPermissionOverwriteIdentity {
  readonly channelId: string;
  readonly overwriteId: string;
  readonly targetId: string;
  readonly targetType: 'ROLE' | 'MEMBER';
  readonly allow: readonly string[];
  readonly deny: readonly string[];
}

export interface SecurityRoleRegistryRecord {
  readonly roleId: string;
  readonly expectedName?: string;
  readonly expectedPosition: number;
  readonly expectedPermissions: readonly string[];
  readonly required: boolean;
  readonly protected: boolean;
}

export interface SecurityRoleRegistryState {
  readonly registryId: string;
  readonly registryVersion: number;
  readonly records: readonly SecurityRoleRegistryRecord[];
}

export interface SecurityDangerousPermissionPolicy {
  readonly dangerousPermissions: readonly string[];
}

export interface SecurityPermissionRoleStateSnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly roleInventory: readonly SecurityRoleStateIdentity[];
  readonly channelPermissionOverwriteInventory: readonly SecurityChannelPermissionOverwriteIdentity[];
}

export interface SecurityPermissionRoleStateReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly authorizedRoleRegistry: SecurityRoleRegistryState;
  readonly protectedRoleRegistry: SecurityRoleRegistryState;
  readonly dangerousPermissionPolicy: SecurityDangerousPermissionPolicy;
  readonly currentGuildRoleInventory: readonly SecurityRoleStateIdentity[];
  readonly currentChannelPermissionOverwriteInventory: readonly SecurityChannelPermissionOverwriteIdentity[];
  readonly runtimeSnapshot: SecurityPermissionRoleStateSnapshot;
  readonly recoverySnapshot: SecurityPermissionRoleStateSnapshot;
  readonly startupInventory: SecurityPermissionRoleStateSnapshot;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityPermissionRoleStateReconciliationReport {
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityPermissionRoleStateReconciliationStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly reconciliationRequired: boolean;
  readonly verificationOutcome: SecurityPermissionRoleStateReconciliationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-permission-role-state-reconciliation';
    readonly deterministicReconciliationId: true;
    readonly findingsOnly: true;
    readonly authorizedRegistryId: string;
    readonly protectedRegistryId: string;
    readonly runtimeSnapshotId: string;
    readonly recoverySnapshotId: string;
    readonly startupSnapshotId: string;
  };
}

export interface SecurityPermissionRoleStateReconciler {
  execute(
    request: SecurityPermissionRoleStateReconciliationRequest,
  ): Promise<SecurityPermissionRoleStateReconciliationReport>;
}

const FAILURE_RECONCILIATION_ID_REQUIRED = 'RECONCILIATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_AUTHORIZED_REGISTRY_ID_REQUIRED = 'AUTHORIZED_REGISTRY_ID_REQUIRED';
const FAILURE_PROTECTED_REGISTRY_ID_REQUIRED = 'PROTECTED_REGISTRY_ID_REQUIRED';
const FAILURE_AUTHORIZED_REGISTRY_VERSION_INVALID = 'AUTHORIZED_REGISTRY_VERSION_INVALID';
const FAILURE_PROTECTED_REGISTRY_VERSION_INVALID = 'PROTECTED_REGISTRY_VERSION_INVALID';
const FAILURE_RUNTIME_SNAPSHOT_ID_REQUIRED = 'RUNTIME_SNAPSHOT_ID_REQUIRED';
const FAILURE_RECOVERY_SNAPSHOT_ID_REQUIRED = 'RECOVERY_SNAPSHOT_ID_REQUIRED';
const FAILURE_STARTUP_SNAPSHOT_ID_REQUIRED = 'STARTUP_SNAPSHOT_ID_REQUIRED';
const FAILURE_SNAPSHOT_GUILD_MISMATCH = 'SNAPSHOT_GUILD_MISMATCH';
const FAILURE_SNAPSHOT_RUNTIME_MISMATCH = 'SNAPSHOT_RUNTIME_MISMATCH';
const FAILURE_INCONSISTENT_STATE = 'INCONSISTENT_STATE';
const FAILURE_VERIFICATION_FAILED = 'VERIFICATION_FAILED';

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

function freezeRole(role: SecurityRoleStateIdentity): SecurityRoleStateIdentity {
  return deepFreeze({
    ...role,
    permissions: toSortedSet(role.permissions),
  });
}

function freezeOverwrite(
  overwrite: SecurityChannelPermissionOverwriteIdentity,
): SecurityChannelPermissionOverwriteIdentity {
  return deepFreeze({
    ...overwrite,
    allow: toSortedSet(overwrite.allow),
    deny: toSortedSet(overwrite.deny),
  });
}

function freezeRegistryRecord(record: SecurityRoleRegistryRecord): SecurityRoleRegistryRecord {
  return deepFreeze({
    ...record,
    expectedPermissions: toSortedSet(record.expectedPermissions),
  });
}

function freezeRegistry(registry: SecurityRoleRegistryState): SecurityRoleRegistryState {
  return deepFreeze({
    ...registry,
    records: Object.freeze(registry.records.map((entry) => freezeRegistryRecord(entry))),
  });
}

function freezeSnapshot(snapshot: SecurityPermissionRoleStateSnapshot): SecurityPermissionRoleStateSnapshot {
  return deepFreeze({
    ...snapshot,
    roleInventory: Object.freeze(snapshot.roleInventory.map((entry) => freezeRole(entry))),
    channelPermissionOverwriteInventory: Object.freeze(
      snapshot.channelPermissionOverwriteInventory.map((entry) => freezeOverwrite(entry)),
    ),
  });
}

function freezeFinding(finding: SecurityReconciliationFinding): SecurityReconciliationFinding {
  return deepFreeze({
    ...finding,
    metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
  });
}

export function freezeSecurityPermissionRoleStateReconciliationRequest(
  request: SecurityPermissionRoleStateReconciliationRequest,
): SecurityPermissionRoleStateReconciliationRequest {
  return deepFreeze({
    ...request,
    authorizedRoleRegistry: freezeRegistry(request.authorizedRoleRegistry),
    protectedRoleRegistry: freezeRegistry(request.protectedRoleRegistry),
    dangerousPermissionPolicy: deepFreeze({
      dangerousPermissions: toSortedSet(request.dangerousPermissionPolicy.dangerousPermissions),
    }),
    currentGuildRoleInventory: Object.freeze(request.currentGuildRoleInventory.map((entry) => freezeRole(entry))),
    currentChannelPermissionOverwriteInventory: Object.freeze(
      request.currentChannelPermissionOverwriteInventory.map((entry) => freezeOverwrite(entry)),
    ),
    runtimeSnapshot: freezeSnapshot(request.runtimeSnapshot),
    recoverySnapshot: freezeSnapshot(request.recoverySnapshot),
    startupInventory: freezeSnapshot(request.startupInventory),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityPermissionRoleStateReconciliationReport,
): SecurityPermissionRoleStateReconciliationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReconciliationId(
  request: SecurityPermissionRoleStateReconciliationRequest,
): string {
  return [
    'security-permission-role-state-reconciliation',
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.authorizedRoleRegistry.registryId,
    String(request.authorizedRoleRegistry.registryVersion),
    request.protectedRoleRegistry.registryId,
    String(request.protectedRoleRegistry.registryVersion),
    request.runtimeSnapshot.snapshotId,
    request.recoverySnapshot.snapshotId,
    request.startupInventory.snapshotId,
  ].join(':');
}

function buildFinding(
  request: SecurityPermissionRoleStateReconciliationRequest,
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

function indexByRoleId<T>(
  entries: readonly T[],
  selectRoleId: (entry: T) => string,
): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    map.set(selectRoleId(entry), entry);
  }
  return map;
}

function indexByOverwriteKey(
  entries: readonly SecurityChannelPermissionOverwriteIdentity[],
): ReadonlyMap<string, SecurityChannelPermissionOverwriteIdentity> {
  const map = new Map<string, SecurityChannelPermissionOverwriteIdentity>();
  for (const entry of entries) {
    const key = `${entry.channelId}:${entry.overwriteId}:${entry.targetType}:${entry.targetId}`;
    map.set(key, entry);
  }
  return map;
}

function firstRoleBaseline(
  roleId: string,
  runtimeById: ReadonlyMap<string, SecurityRoleStateIdentity>,
  recoveryById: ReadonlyMap<string, SecurityRoleStateIdentity>,
  startupById: ReadonlyMap<string, SecurityRoleStateIdentity>,
): SecurityRoleStateIdentity | undefined {
  return runtimeById.get(roleId) ?? recoveryById.get(roleId) ?? startupById.get(roleId);
}

function validateInput(
  request: SecurityPermissionRoleStateReconciliationRequest,
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
  if (!isNonEmptyString(request.authorizedRoleRegistry.registryId)) {
    failures.push(FAILURE_AUTHORIZED_REGISTRY_ID_REQUIRED);
  }
  if (!isNonEmptyString(request.protectedRoleRegistry.registryId)) {
    failures.push(FAILURE_PROTECTED_REGISTRY_ID_REQUIRED);
  }
  if (request.authorizedRoleRegistry.registryVersion < 0) {
    failures.push(FAILURE_AUTHORIZED_REGISTRY_VERSION_INVALID);
  }
  if (request.protectedRoleRegistry.registryVersion < 0) {
    failures.push(FAILURE_PROTECTED_REGISTRY_VERSION_INVALID);
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

  const snapshots: readonly SecurityPermissionRoleStateSnapshot[] = [
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
  request: SecurityPermissionRoleStateReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];

  const authorizedById = indexByRoleId(request.authorizedRoleRegistry.records, (entry) => entry.roleId);
  const protectedById = indexByRoleId(request.protectedRoleRegistry.records, (entry) => entry.roleId);
  const currentRolesById = indexByRoleId(request.currentGuildRoleInventory, (entry) => entry.roleId);
  const runtimeRolesById = indexByRoleId(request.runtimeSnapshot.roleInventory, (entry) => entry.roleId);
  const recoveryRolesById = indexByRoleId(request.recoverySnapshot.roleInventory, (entry) => entry.roleId);
  const startupRolesById = indexByRoleId(request.startupInventory.roleInventory, (entry) => entry.roleId);

  const currentOverwritesByKey = indexByOverwriteKey(request.currentChannelPermissionOverwriteInventory);
  const runtimeOverwritesByKey = indexByOverwriteKey(request.runtimeSnapshot.channelPermissionOverwriteInventory);
  const recoveryOverwritesByKey = indexByOverwriteKey(request.recoverySnapshot.channelPermissionOverwriteInventory);
  const startupOverwritesByKey = indexByOverwriteKey(request.startupInventory.channelPermissionOverwriteInventory);

  const dangerousPermissions = toSortedSet(request.dangerousPermissionPolicy.dangerousPermissions);

  for (const currentRole of request.currentGuildRoleInventory) {
    const inAuthorizedRegistry = authorizedById.has(currentRole.roleId);
    const inProtectedRegistry = protectedById.has(currentRole.roleId);

    if (currentRole.privileged && !inAuthorizedRegistry && !inProtectedRegistry) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentRole.roleId,
          `Role ${currentRole.roleId} is privileged but not present in authorized/protected registries.`,
          Object.freeze({ category: 'UNAUTHORIZED_PRIVILEGED_ROLE' }),
        ),
      );
    }

    const protectedRecord = protectedById.get(currentRole.roleId);
    const roleBaseline = firstRoleBaseline(
      currentRole.roleId,
      runtimeRolesById,
      recoveryRolesById,
      startupRolesById,
    );

    if (protectedRecord) {
      const expectedPermissions = toSortedSet(protectedRecord.expectedPermissions);
      const currentPermissions = toSortedSet(currentRole.permissions);
      if (
        (protectedRecord.expectedName && currentRole.name !== protectedRecord.expectedName) ||
        !setEquals(currentPermissions, expectedPermissions)
      ) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.REGISTRY_MISMATCH,
            SecurityReconciliationFindingSeverity.HIGH,
            currentRole.roleId,
            `Protected role ${currentRole.roleId} differs from protected-role registry expectations.`,
            Object.freeze({ category: 'MODIFIED_PROTECTED_ROLE' }),
          ),
        );
      }

      if (currentRole.position < protectedRecord.expectedPosition) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
            SecurityReconciliationFindingSeverity.HIGH,
            currentRole.roleId,
            `Protected role ${currentRole.roleId} hierarchy position drifted below policy baseline.`,
            Object.freeze({ category: 'PROTECTED_ROLE_HIERARCHY_DRIFT' }),
          ),
        );
      }
    }

    const expectedPermissions = toSortedSet(
      roleBaseline?.permissions ??
        authorizedById.get(currentRole.roleId)?.expectedPermissions ??
        protectedById.get(currentRole.roleId)?.expectedPermissions ??
        Object.freeze([]),
    );
    const currentPermissions = toSortedSet(currentRole.permissions);

    const dangerousPermissionDiff = dangerousPermissions.filter(
      (permission) => currentPermissions.includes(permission) !== expectedPermissions.includes(permission),
    );
    if (dangerousPermissionDiff.length > 0) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentRole.roleId,
          `Role ${currentRole.roleId} has dangerous permission drift relative to baselines.`,
          Object.freeze({
            category: 'DANGEROUS_PERMISSION_DRIFT',
            dangerousPermissionDiff,
          }),
        ),
      );
    }

    const permissionDriftKeys: ReadonlyArray<readonly [string, string]> = [
      ['ADMINISTRATOR', 'ADMINISTRATOR_PERMISSION_DRIFT'],
      ['MANAGE_ROLES', 'MANAGE_ROLES_PERMISSION_DRIFT'],
      ['MANAGE_WEBHOOKS', 'MANAGE_WEBHOOKS_PERMISSION_DRIFT'],
      ['MANAGE_CHANNELS', 'MANAGE_CHANNELS_PERMISSION_DRIFT'],
    ];

    for (const [permissionKey, category] of permissionDriftKeys) {
      if (currentPermissions.includes(permissionKey) !== expectedPermissions.includes(permissionKey)) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.PERMISSION_DRIFT,
            SecurityReconciliationFindingSeverity.HIGH,
            currentRole.roleId,
            `Role ${currentRole.roleId} drifted on ${permissionKey}.`,
            Object.freeze({ category }),
          ),
        );
      }
    }
  }

  for (const protectedRecord of request.protectedRoleRegistry.records) {
    const currentRole = currentRolesById.get(protectedRecord.roleId);
    const runtimeRole = runtimeRolesById.get(protectedRecord.roleId);
    const recoveryRole = recoveryRolesById.get(protectedRecord.roleId);
    const startupRole = startupRolesById.get(protectedRecord.roleId);

    if (!currentRole) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          protectedRecord.roleId,
          `Protected role ${protectedRecord.roleId} is missing from current guild role inventory.`,
          Object.freeze({ category: 'MISSING_PROTECTED_ROLE' }),
        ),
      );
    }

    if (
      currentRole === undefined &&
      protectedRecord.required &&
      runtimeRole === undefined &&
      recoveryRole === undefined &&
      startupRole === undefined
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.CRITICAL,
          protectedRecord.roleId,
          `Protected role ${protectedRecord.roleId} is absent from current inventory and all baselines.`,
          Object.freeze({ category: 'ORPHANED_PROTECTED_ROLE' }),
        ),
      );
    }
  }

  for (const authorizedRecord of request.authorizedRoleRegistry.records) {
    const baseline = firstRoleBaseline(
      authorizedRecord.roleId,
      runtimeRolesById,
      recoveryRolesById,
      startupRolesById,
    );
    if (!baseline) {
      continue;
    }

    const registryMismatch =
      (authorizedRecord.expectedName && authorizedRecord.expectedName !== baseline.name) ||
      authorizedRecord.expectedPosition !== baseline.position ||
      !setEquals(toSortedSet(authorizedRecord.expectedPermissions), toSortedSet(baseline.permissions));

    if (registryMismatch) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          authorizedRecord.roleId,
          `Authorized role registry mismatches baseline state for role ${authorizedRecord.roleId}.`,
          Object.freeze({ category: 'REGISTRY_MISMATCH' }),
        ),
      );
    }
  }

  const allRoleIds = new Set<string>([
    ...request.runtimeSnapshot.roleInventory.map((entry) => entry.roleId),
    ...request.recoverySnapshot.roleInventory.map((entry) => entry.roleId),
    ...request.startupInventory.roleInventory.map((entry) => entry.roleId),
  ]);

  for (const roleId of allRoleIds) {
    const runtimeRole = runtimeRolesById.get(roleId);
    const recoveryRole = recoveryRolesById.get(roleId);
    const startupRole = startupRolesById.get(roleId);

    const presence = [runtimeRole, recoveryRole, startupRole].map((entry) => entry !== undefined);
    const hasPresenceInconsistency = presence.includes(true) && presence.includes(false);

    const rolePositions = [runtimeRole, recoveryRole, startupRole]
      .filter((entry): entry is SecurityRoleStateIdentity => entry !== undefined)
      .map((entry) => String(entry.position));
    const permissionSets = [runtimeRole, recoveryRole, startupRole]
      .filter((entry): entry is SecurityRoleStateIdentity => entry !== undefined)
      .map((entry) => toSortedSet(entry.permissions).join(','));

    const hasStateInconsistency = new Set(rolePositions).size > 1 || new Set(permissionSets).size > 1;

    if (hasPresenceInconsistency || hasStateInconsistency) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
          SecurityReconciliationFindingSeverity.HIGH,
          roleId,
          `Role ${roleId} has inconsistent runtime/recovery/startup baseline state.`,
          Object.freeze({ category: 'SNAPSHOT_INCONSISTENCY' }),
        ),
      );
    }
  }

  const allOverwriteKeys = new Set<string>([
    ...request.runtimeSnapshot.channelPermissionOverwriteInventory.map(
      (entry) => `${entry.channelId}:${entry.overwriteId}:${entry.targetType}:${entry.targetId}`,
    ),
    ...request.recoverySnapshot.channelPermissionOverwriteInventory.map(
      (entry) => `${entry.channelId}:${entry.overwriteId}:${entry.targetType}:${entry.targetId}`,
    ),
    ...request.startupInventory.channelPermissionOverwriteInventory.map(
      (entry) => `${entry.channelId}:${entry.overwriteId}:${entry.targetType}:${entry.targetId}`,
    ),
  ]);

  for (const key of allOverwriteKeys) {
    const currentOverwrite = currentOverwritesByKey.get(key);
    const runtimeOverwrite = runtimeOverwritesByKey.get(key);
    const recoveryOverwrite = recoveryOverwritesByKey.get(key);
    const startupOverwrite = startupOverwritesByKey.get(key);

    const baseline = runtimeOverwrite ?? recoveryOverwrite ?? startupOverwrite;
    if (!currentOverwrite && baseline) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.HIGH,
          key,
          `Channel overwrite ${key} is missing from current inventory relative to baseline.`,
          Object.freeze({ category: 'CHANNEL_OVERWRITE_DRIFT' }),
        ),
      );
      continue;
    }

    if (currentOverwrite && baseline) {
      const allowDrift = !setEquals(toSortedSet(currentOverwrite.allow), toSortedSet(baseline.allow));
      const denyDrift = !setEquals(toSortedSet(currentOverwrite.deny), toSortedSet(baseline.deny));
      if (allowDrift || denyDrift) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.PERMISSION_DRIFT,
            SecurityReconciliationFindingSeverity.HIGH,
            key,
            `Channel overwrite ${key} drifted from baseline permissions.`,
            Object.freeze({ category: 'CHANNEL_OVERWRITE_DRIFT' }),
          ),
        );
      }
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
  request: SecurityPermissionRoleStateReconciliationRequest,
  reconciliationId: string,
  stagesCompleted: readonly SecurityPermissionRoleStateReconciliationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityPermissionRoleStateReconciliationReport {
  return freezeReport({
    reconciliationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted,
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityPermissionRoleStateReconciliationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-permission-role-state-reconciliation' as const,
      deterministicReconciliationId: true as const,
      findingsOnly: true as const,
      authorizedRegistryId: request.authorizedRoleRegistry.registryId,
      protectedRegistryId: request.protectedRoleRegistry.registryId,
      runtimeSnapshotId: request.runtimeSnapshot.snapshotId,
      recoverySnapshotId: request.recoverySnapshot.snapshotId,
      startupSnapshotId: request.startupInventory.snapshotId,
    }),
  });
}

export class InMemorySecurityPermissionRoleStateReconciler
  implements SecurityPermissionRoleStateReconciler
{
  private readonly completedReports = new Map<string, SecurityPermissionRoleStateReconciliationReport>();

  async execute(
    request: SecurityPermissionRoleStateReconciliationRequest,
  ): Promise<SecurityPermissionRoleStateReconciliationReport> {
    const frozenRequest = freezeSecurityPermissionRoleStateReconciliationRequest(request);
    const reconciliationId = frozenRequest.reconciliationId ?? toDeterministicReconciliationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(reconciliationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityPermissionRoleStateReconciliationStage[] = [];
    stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.RECONCILIATION_VALIDATION);

    const validationFailures = validateInput(frozenRequest, reconciliationId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.REPORT_GENERATION);
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

    stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.SOURCE_EVALUATION);
    stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.DRIFT_DETECTION);
    const findings = detectDriftFindings(frozenRequest, reconciliationId);

    stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.VERIFICATION);
    const verificationSucceeded = findings.every(
      (finding) =>
        finding.correlationId === frozenRequest.correlationId &&
        finding.guildId === frozenRequest.guildId &&
        finding.runtimeId === frozenRequest.runtimeId,
    );

    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.REPORT_GENERATION);
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

    stagesCompleted.push(SecurityPermissionRoleStateReconciliationStage.REPORT_GENERATION);
    const report = freezeReport({
      reconciliationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      findings,
      reconciliationRequired: findings.length > 0,
      verificationOutcome: SecurityPermissionRoleStateReconciliationVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-permission-role-state-reconciliation' as const,
        deterministicReconciliationId: true as const,
        findingsOnly: true as const,
        authorizedRegistryId: frozenRequest.authorizedRoleRegistry.registryId,
        protectedRegistryId: frozenRequest.protectedRoleRegistry.registryId,
        runtimeSnapshotId: frozenRequest.runtimeSnapshot.snapshotId,
        recoverySnapshotId: frozenRequest.recoverySnapshot.snapshotId,
        startupSnapshotId: frozenRequest.startupInventory.snapshotId,
      }),
    });

    this.completedReports.set(reconciliationId, report);
    return report;
  }
}
