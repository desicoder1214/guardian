import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';

export enum SecurityBotInventoryReconciliationStage {
  RECONCILIATION_VALIDATION = 'RECONCILIATION_VALIDATION',
  SOURCE_EVALUATION = 'SOURCE_EVALUATION',
  DRIFT_DETECTION = 'DRIFT_DETECTION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityBotInventoryReconciliationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityBotIdentity {
  readonly botUserId: string;
  readonly displayName?: string;
  readonly trusted: boolean;
  readonly privileged: boolean;
  readonly permissions: readonly string[];
}

export interface SecurityBotInventorySnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly botInventory: readonly SecurityBotIdentity[];
}

export interface SecurityAuthorizedBotRegistryRecord {
  readonly botUserId: string;
  readonly trusted: boolean;
  readonly privileged: boolean;
  readonly permissions: readonly string[];
}

export interface SecurityAuthorizedBotRegistryState {
  readonly registryId: string;
  readonly registryVersion: number;
  readonly records: readonly SecurityAuthorizedBotRegistryRecord[];
}

export interface SecurityBotInventoryReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly authorizedBotRegistry: SecurityAuthorizedBotRegistryState;
  readonly currentGuildBotInventory: readonly SecurityBotIdentity[];
  readonly runtimeSnapshot: SecurityBotInventorySnapshot;
  readonly recoverySnapshot: SecurityBotInventorySnapshot;
  readonly startupInventory: SecurityBotInventorySnapshot;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityBotInventoryReconciliationReport {
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityBotInventoryReconciliationStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly reconciliationRequired: boolean;
  readonly verificationOutcome: SecurityBotInventoryReconciliationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-bot-inventory-reconciliation';
    readonly deterministicReconciliationId: true;
    readonly findingsOnly: true;
    readonly registryId: string;
    readonly registryVersion: number;
    readonly runtimeSnapshotId: string;
    readonly recoverySnapshotId: string;
    readonly startupSnapshotId: string;
  };
}

export interface SecurityBotInventoryReconciler {
  execute(
    request: SecurityBotInventoryReconciliationRequest,
  ): Promise<SecurityBotInventoryReconciliationReport>;
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

function toPermissionSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function freezeBotIdentity(bot: SecurityBotIdentity): SecurityBotIdentity {
  return deepFreeze({
    ...bot,
    permissions: toPermissionSet(bot.permissions),
  });
}

function freezeSnapshot(snapshot: SecurityBotInventorySnapshot): SecurityBotInventorySnapshot {
  return deepFreeze({
    ...snapshot,
    botInventory: Object.freeze(snapshot.botInventory.map((entry) => freezeBotIdentity(entry))),
  });
}

function freezeRegistryRecord(
  record: SecurityAuthorizedBotRegistryRecord,
): SecurityAuthorizedBotRegistryRecord {
  return deepFreeze({
    ...record,
    permissions: toPermissionSet(record.permissions),
  });
}

function freezeRegistry(
  registry: SecurityAuthorizedBotRegistryState,
): SecurityAuthorizedBotRegistryState {
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

export function freezeSecurityBotInventoryReconciliationRequest(
  request: SecurityBotInventoryReconciliationRequest,
): SecurityBotInventoryReconciliationRequest {
  return deepFreeze({
    ...request,
    authorizedBotRegistry: freezeRegistry(request.authorizedBotRegistry),
    currentGuildBotInventory: Object.freeze(
      request.currentGuildBotInventory.map((entry) => freezeBotIdentity(entry)),
    ),
    runtimeSnapshot: freezeSnapshot(request.runtimeSnapshot),
    recoverySnapshot: freezeSnapshot(request.recoverySnapshot),
    startupInventory: freezeSnapshot(request.startupInventory),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityBotInventoryReconciliationReport,
): SecurityBotInventoryReconciliationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReconciliationId(
  request: SecurityBotInventoryReconciliationRequest,
): string {
  return [
    'security-bot-inventory-reconciliation',
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.authorizedBotRegistry.registryId,
    String(request.authorizedBotRegistry.registryVersion),
    request.runtimeSnapshot.snapshotId,
    request.recoverySnapshot.snapshotId,
    request.startupInventory.snapshotId,
  ].join(':');
}

function buildFinding(
  request: SecurityBotInventoryReconciliationRequest,
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

function indexByBotUserId<T>(
  entries: readonly T[],
  selectBotUserId: (entry: T) => string,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    result.set(selectBotUserId(entry), entry);
  }
  return result;
}

function detectDuplicateBotIds<T>(
  entries: readonly T[],
  selectBotUserId: (entry: T) => string,
): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    const botUserId = selectBotUserId(entry);
    if (seen.has(botUserId)) {
      duplicates.add(botUserId);
    }
    seen.add(botUserId);
  }
  return Object.freeze([...duplicates].sort((left, right) => left.localeCompare(right)));
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

function firstDefinedBaseline(
  botUserId: string,
  runtimeSnapshotBots: ReadonlyMap<string, SecurityBotIdentity>,
  recoverySnapshotBots: ReadonlyMap<string, SecurityBotIdentity>,
  startupSnapshotBots: ReadonlyMap<string, SecurityBotIdentity>,
): SecurityBotIdentity | undefined {
  return (
    runtimeSnapshotBots.get(botUserId) ??
    recoverySnapshotBots.get(botUserId) ??
    startupSnapshotBots.get(botUserId)
  );
}

function validateInput(
  request: SecurityBotInventoryReconciliationRequest,
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
  if (!isNonEmptyString(request.authorizedBotRegistry.registryId)) {
    failures.push(FAILURE_REGISTRY_ID_REQUIRED);
  }
  if (request.authorizedBotRegistry.registryVersion < 0) {
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

  const snapshotSources: readonly SecurityBotInventorySnapshot[] = [
    request.runtimeSnapshot,
    request.recoverySnapshot,
    request.startupInventory,
  ];
  for (const snapshot of snapshotSources) {
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
  request: SecurityBotInventoryReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];

  const registryById = indexByBotUserId(
    request.authorizedBotRegistry.records,
    (entry) => entry.botUserId,
  );
  const currentById = indexByBotUserId(request.currentGuildBotInventory, (entry) => entry.botUserId);
  const runtimeSnapshotById = indexByBotUserId(request.runtimeSnapshot.botInventory, (entry) => entry.botUserId);
  const recoverySnapshotById = indexByBotUserId(
    request.recoverySnapshot.botInventory,
    (entry) => entry.botUserId,
  );
  const startupSnapshotById = indexByBotUserId(
    request.startupInventory.botInventory,
    (entry) => entry.botUserId,
  );

  for (const liveBot of request.currentGuildBotInventory) {
    const registryRecord = registryById.get(liveBot.botUserId);
    if (!registryRecord) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          liveBot.botUserId,
          `Bot ${liveBot.botUserId} exists in current guild inventory but is missing from the authorized bot registry.`,
        ),
      );
      continue;
    }

    const baseline = firstDefinedBaseline(
      liveBot.botUserId,
      runtimeSnapshotById,
      recoverySnapshotById,
      startupSnapshotById,
    );
    const expectedPrivileged = baseline?.privileged ?? registryRecord.privileged;
    if (liveBot.privileged && !expectedPrivileged) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PRIVILEGE_ESCALATION,
          SecurityReconciliationFindingSeverity.CRITICAL,
          liveBot.botUserId,
          `Bot ${liveBot.botUserId} is privileged in current inventory but not privileged in reconciliation baselines.`,
          Object.freeze({
            currentPrivileged: liveBot.privileged,
            expectedPrivileged,
          }),
        ),
      );
    }

    const currentPermissions = toPermissionSet(liveBot.permissions);
    const expectedPermissions = toPermissionSet(baseline?.permissions ?? registryRecord.permissions);
    if (!setEquals(currentPermissions, expectedPermissions)) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.HIGH,
          liveBot.botUserId,
          `Bot ${liveBot.botUserId} permissions drifted from reconciliation baselines.`,
          Object.freeze({
            currentPermissions,
            expectedPermissions,
          }),
        ),
      );
    }
  }

  for (const registryRecord of request.authorizedBotRegistry.records) {
    const currentBot = currentById.get(registryRecord.botUserId);
    if (!currentBot) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.MISSING_AUTHORIZED_BOT,
          SecurityReconciliationFindingSeverity.HIGH,
          registryRecord.botUserId,
          `Authorized bot ${registryRecord.botUserId} is missing from current guild inventory.`,
        ),
      );
    }

    const runtimeBot = runtimeSnapshotById.get(registryRecord.botUserId);
    const recoveryBot = recoverySnapshotById.get(registryRecord.botUserId);
    const startupBot = startupSnapshotById.get(registryRecord.botUserId);

    const trustedBaselineCount = [runtimeBot, recoveryBot, startupBot].filter(
      (entry) => entry?.trusted === true,
    ).length;
    if (
      trustedBaselineCount > 0 &&
      registryRecord.trusted === false
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.REGISTRY_MISMATCH,
          SecurityReconciliationFindingSeverity.HIGH,
          registryRecord.botUserId,
          `Authorized registry trust state for bot ${registryRecord.botUserId} mismatches snapshots/startup baselines.`,
          Object.freeze({
            registryTrusted: registryRecord.trusted,
            trustedBaselineCount,
          }),
        ),
      );
    }

    const absentFromAllInventories =
      currentBot === undefined &&
      runtimeBot === undefined &&
      recoveryBot === undefined &&
      startupBot === undefined;
    if (registryRecord.trusted && absentFromAllInventories) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.ORPHANED_TRUSTED_BOT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          registryRecord.botUserId,
          `Trusted bot ${registryRecord.botUserId} is absent from current inventory, runtime snapshot, recovery snapshot, and startup inventory.`,
        ),
      );
    }
  }

  const duplicateMatrix: ReadonlyArray<readonly [readonly string[], string]> = [
    [
      detectDuplicateBotIds(request.currentGuildBotInventory, (entry) => entry.botUserId),
      'CURRENT_GUILD_INVENTORY',
    ],
    [
      detectDuplicateBotIds(request.runtimeSnapshot.botInventory, (entry) => entry.botUserId),
      'RUNTIME_SNAPSHOT',
    ],
    [
      detectDuplicateBotIds(request.recoverySnapshot.botInventory, (entry) => entry.botUserId),
      'RECOVERY_SNAPSHOT',
    ],
    [
      detectDuplicateBotIds(request.startupInventory.botInventory, (entry) => entry.botUserId),
      'STARTUP_INVENTORY',
    ],
  ];

  for (const [duplicates, sourceName] of duplicateMatrix) {
    for (const botUserId of duplicates) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.DUPLICATE_BOT_IDENTITY,
          SecurityReconciliationFindingSeverity.CRITICAL,
          botUserId,
          `Bot ${botUserId} appears multiple times in ${sourceName}.`,
          Object.freeze({ source: sourceName }),
        ),
      );
    }
  }

  const allSnapshotBotIds = new Set<string>([
    ...request.runtimeSnapshot.botInventory.map((entry) => entry.botUserId),
    ...request.recoverySnapshot.botInventory.map((entry) => entry.botUserId),
    ...request.startupInventory.botInventory.map((entry) => entry.botUserId),
  ]);

  for (const botUserId of allSnapshotBotIds) {
    const runtimeBot = runtimeSnapshotById.get(botUserId);
    const recoveryBot = recoverySnapshotById.get(botUserId);
    const startupBot = startupSnapshotById.get(botUserId);

    const presenceSet = Object.freeze([
      runtimeBot !== undefined,
      recoveryBot !== undefined,
      startupBot !== undefined,
    ]);
    const hasPresenceInconsistency =
      presenceSet.some((value) => value === true) && presenceSet.some((value) => value === false);

    const privilegedFlags = [runtimeBot, recoveryBot, startupBot]
      .filter((entry): entry is SecurityBotIdentity => entry !== undefined)
      .map((entry) => entry.privileged);
    const hasPrivilegeInconsistency = new Set(privilegedFlags).size > 1;

    const permissionSets = [runtimeBot, recoveryBot, startupBot]
      .filter((entry): entry is SecurityBotIdentity => entry !== undefined)
      .map((entry) => toPermissionSet(entry.permissions).join(','));
    const hasPermissionInconsistency = new Set(permissionSets).size > 1;

    if (hasPresenceInconsistency || hasPrivilegeInconsistency || hasPermissionInconsistency) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
          SecurityReconciliationFindingSeverity.HIGH,
          botUserId,
          `Bot ${botUserId} has inconsistent snapshot/startup baseline state across runtime, recovery, and startup inventories.`,
          Object.freeze({
            hasPresenceInconsistency,
            hasPrivilegeInconsistency,
            hasPermissionInconsistency,
          }),
        ),
      );
    }
  }

  const sortedFindings = findings.sort((left, right) => {
    const severityRank = (() => {
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
      return leftRank - rightRank;
    })();

    if (severityRank !== 0) {
      return severityRank;
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
  request: SecurityBotInventoryReconciliationRequest,
  reconciliationId: string,
  stagesCompleted: readonly SecurityBotInventoryReconciliationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityBotInventoryReconciliationReport {
  return freezeReport({
    reconciliationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted,
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityBotInventoryReconciliationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-bot-inventory-reconciliation' as const,
      deterministicReconciliationId: true as const,
      findingsOnly: true as const,
      registryId: request.authorizedBotRegistry.registryId,
      registryVersion: request.authorizedBotRegistry.registryVersion,
      runtimeSnapshotId: request.runtimeSnapshot.snapshotId,
      recoverySnapshotId: request.recoverySnapshot.snapshotId,
      startupSnapshotId: request.startupInventory.snapshotId,
    }),
  });
}

export class InMemorySecurityBotInventoryReconciler implements SecurityBotInventoryReconciler {
  private readonly completedReports = new Map<string, SecurityBotInventoryReconciliationReport>();

  async execute(
    request: SecurityBotInventoryReconciliationRequest,
  ): Promise<SecurityBotInventoryReconciliationReport> {
    const frozenRequest = freezeSecurityBotInventoryReconciliationRequest(request);
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

    const stagesCompleted: SecurityBotInventoryReconciliationStage[] = [];
    stagesCompleted.push(SecurityBotInventoryReconciliationStage.RECONCILIATION_VALIDATION);
    const validationFailures = validateInput(frozenRequest, reconciliationId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityBotInventoryReconciliationStage.REPORT_GENERATION);
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

    stagesCompleted.push(SecurityBotInventoryReconciliationStage.SOURCE_EVALUATION);
    stagesCompleted.push(SecurityBotInventoryReconciliationStage.DRIFT_DETECTION);
    const findings = detectDriftFindings(frozenRequest, reconciliationId);

    stagesCompleted.push(SecurityBotInventoryReconciliationStage.VERIFICATION);
    const verificationSucceeded = findings.every(
      (finding) =>
        finding.correlationId === frozenRequest.correlationId &&
        finding.guildId === frozenRequest.guildId &&
        finding.runtimeId === frozenRequest.runtimeId,
    );

    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityBotInventoryReconciliationStage.REPORT_GENERATION);
      const verificationFailure = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        FAILURE_VERIFICATION_FAILED,
      );
      this.completedReports.set(reconciliationId, verificationFailure);
      return verificationFailure;
    }

    stagesCompleted.push(SecurityBotInventoryReconciliationStage.REPORT_GENERATION);
    const report = freezeReport({
      reconciliationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      findings,
      reconciliationRequired: findings.length > 0,
      verificationOutcome: SecurityBotInventoryReconciliationVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-bot-inventory-reconciliation' as const,
        deterministicReconciliationId: true as const,
        findingsOnly: true as const,
        registryId: frozenRequest.authorizedBotRegistry.registryId,
        registryVersion: frozenRequest.authorizedBotRegistry.registryVersion,
        runtimeSnapshotId: frozenRequest.runtimeSnapshot.snapshotId,
        recoverySnapshotId: frozenRequest.recoverySnapshot.snapshotId,
        startupSnapshotId: frozenRequest.startupInventory.snapshotId,
      }),
    });

    this.completedReports.set(reconciliationId, report);
    return report;
  }
}
