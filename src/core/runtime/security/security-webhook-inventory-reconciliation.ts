import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from './security-reconciliation-engine';

export enum SecurityWebhookInventoryReconciliationStage {
  RECONCILIATION_VALIDATION = 'RECONCILIATION_VALIDATION',
  SOURCE_EVALUATION = 'SOURCE_EVALUATION',
  DRIFT_DETECTION = 'DRIFT_DETECTION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityWebhookInventoryReconciliationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface SecurityWebhookIdentity {
  readonly webhookId: string;
  readonly channelId: string;
  readonly name?: string;
  readonly ownerBotUserId?: string;
  readonly privileged: boolean;
  readonly suspicious: boolean;
  readonly highRisk: boolean;
  readonly permissions: readonly string[];
}

export interface SecurityWebhookInventorySnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly webhookInventory: readonly SecurityWebhookIdentity[];
}

export interface SecurityAuthorizedWebhookRegistryRecord {
  readonly webhookId: string;
  readonly channelId: string;
  readonly ownerBotUserId?: string;
  readonly privileged: boolean;
  readonly required: boolean;
  readonly permissions: readonly string[];
}

export interface SecurityAuthorizedWebhookRegistryState {
  readonly registryId: string;
  readonly registryVersion: number;
  readonly records: readonly SecurityAuthorizedWebhookRegistryRecord[];
}

export interface SecurityWebhookInventoryReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly authorizedWebhookRegistry: SecurityAuthorizedWebhookRegistryState;
  readonly currentGuildWebhookInventory: readonly SecurityWebhookIdentity[];
  readonly runtimeSnapshot: SecurityWebhookInventorySnapshot;
  readonly recoverySnapshot: SecurityWebhookInventorySnapshot;
  readonly startupInventory: SecurityWebhookInventorySnapshot;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityWebhookInventoryReconciliationReport {
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly stagesCompleted: readonly SecurityWebhookInventoryReconciliationStage[];
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly reconciliationRequired: boolean;
  readonly verificationOutcome: SecurityWebhookInventoryReconciliationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-webhook-inventory-reconciliation';
    readonly deterministicReconciliationId: true;
    readonly findingsOnly: true;
    readonly registryId: string;
    readonly registryVersion: number;
    readonly runtimeSnapshotId: string;
    readonly recoverySnapshotId: string;
    readonly startupSnapshotId: string;
  };
}

export interface SecurityWebhookInventoryReconciler {
  execute(
    request: SecurityWebhookInventoryReconciliationRequest,
  ): Promise<SecurityWebhookInventoryReconciliationReport>;
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
  'MANAGE_WEBHOOKS',
  'MANAGE_GUILD',
  'MANAGE_CHANNELS',
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

function toPermissionSet(values: readonly string[]): readonly string[] {
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

function hasPermissionSensitiveDrift(
  currentPermissions: readonly string[],
  expectedPermissions: readonly string[],
): boolean {
  const currentSet = new Set(currentPermissions);
  const expectedSet = new Set(expectedPermissions);
  for (const key of PERMISSION_SENSITIVE_KEYS) {
    if (currentSet.has(key) !== expectedSet.has(key)) {
      return true;
    }
  }
  return false;
}

function freezeWebhookIdentity(webhook: SecurityWebhookIdentity): SecurityWebhookIdentity {
  return deepFreeze({
    ...webhook,
    permissions: toPermissionSet(webhook.permissions),
  });
}

function freezeSnapshot(snapshot: SecurityWebhookInventorySnapshot): SecurityWebhookInventorySnapshot {
  return deepFreeze({
    ...snapshot,
    webhookInventory: Object.freeze(snapshot.webhookInventory.map((entry) => freezeWebhookIdentity(entry))),
  });
}

function freezeRegistryRecord(
  record: SecurityAuthorizedWebhookRegistryRecord,
): SecurityAuthorizedWebhookRegistryRecord {
  return deepFreeze({
    ...record,
    permissions: toPermissionSet(record.permissions),
  });
}

function freezeRegistry(
  registry: SecurityAuthorizedWebhookRegistryState,
): SecurityAuthorizedWebhookRegistryState {
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

export function freezeSecurityWebhookInventoryReconciliationRequest(
  request: SecurityWebhookInventoryReconciliationRequest,
): SecurityWebhookInventoryReconciliationRequest {
  return deepFreeze({
    ...request,
    authorizedWebhookRegistry: freezeRegistry(request.authorizedWebhookRegistry),
    currentGuildWebhookInventory: Object.freeze(
      request.currentGuildWebhookInventory.map((entry) => freezeWebhookIdentity(entry)),
    ),
    runtimeSnapshot: freezeSnapshot(request.runtimeSnapshot),
    recoverySnapshot: freezeSnapshot(request.recoverySnapshot),
    startupInventory: freezeSnapshot(request.startupInventory),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(
  report: SecurityWebhookInventoryReconciliationReport,
): SecurityWebhookInventoryReconciliationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    findings: Object.freeze(report.findings.map((entry) => freezeFinding(entry))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReconciliationId(
  request: SecurityWebhookInventoryReconciliationRequest,
): string {
  return [
    'security-webhook-inventory-reconciliation',
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.authorizedWebhookRegistry.registryId,
    String(request.authorizedWebhookRegistry.registryVersion),
    request.runtimeSnapshot.snapshotId,
    request.recoverySnapshot.snapshotId,
    request.startupInventory.snapshotId,
  ].join(':');
}

function buildFinding(
  request: SecurityWebhookInventoryReconciliationRequest,
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

function indexByWebhookId<T>(
  entries: readonly T[],
  selectWebhookId: (entry: T) => string,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    result.set(selectWebhookId(entry), entry);
  }
  return result;
}

function firstDefinedBaseline(
  webhookId: string,
  runtimeById: ReadonlyMap<string, SecurityWebhookIdentity>,
  recoveryById: ReadonlyMap<string, SecurityWebhookIdentity>,
  startupById: ReadonlyMap<string, SecurityWebhookIdentity>,
): SecurityWebhookIdentity | undefined {
  return runtimeById.get(webhookId) ?? recoveryById.get(webhookId) ?? startupById.get(webhookId);
}

function validateInput(
  request: SecurityWebhookInventoryReconciliationRequest,
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
  if (!isNonEmptyString(request.authorizedWebhookRegistry.registryId)) {
    failures.push(FAILURE_REGISTRY_ID_REQUIRED);
  }
  if (request.authorizedWebhookRegistry.registryVersion < 0) {
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

  const snapshotSources: readonly SecurityWebhookInventorySnapshot[] = [
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
  request: SecurityWebhookInventoryReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];

  const registryById = indexByWebhookId(
    request.authorizedWebhookRegistry.records,
    (entry) => entry.webhookId,
  );
  const currentById = indexByWebhookId(request.currentGuildWebhookInventory, (entry) => entry.webhookId);
  const runtimeById = indexByWebhookId(request.runtimeSnapshot.webhookInventory, (entry) => entry.webhookId);
  const recoveryById = indexByWebhookId(request.recoverySnapshot.webhookInventory, (entry) => entry.webhookId);
  const startupById = indexByWebhookId(request.startupInventory.webhookInventory, (entry) => entry.webhookId);

  for (const currentWebhook of request.currentGuildWebhookInventory) {
    const registryRecord = registryById.get(currentWebhook.webhookId);
    const baseline = firstDefinedBaseline(currentWebhook.webhookId, runtimeById, recoveryById, startupById);

    if (!registryRecord) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS,
          SecurityReconciliationFindingSeverity.HIGH,
          currentWebhook.webhookId,
          `Unknown webhook ${currentWebhook.webhookId} exists in current guild inventory but is missing from the authorized webhook registry.`,
          Object.freeze({ category: 'UNKNOWN_WEBHOOK' }),
        ),
      );
    }

    if (!baseline) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_NEW,
          SecurityReconciliationFindingSeverity.MEDIUM,
          currentWebhook.webhookId,
          `Webhook ${currentWebhook.webhookId} appears in current inventory but not in runtime, recovery, or startup baselines.`,
        ),
      );
    }

    if (baseline) {
      const modified =
        currentWebhook.channelId !== baseline.channelId ||
        currentWebhook.name !== baseline.name ||
        currentWebhook.ownerBotUserId !== baseline.ownerBotUserId ||
        currentWebhook.privileged !== baseline.privileged;

      if (modified) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.WEBHOOK_MODIFIED,
            SecurityReconciliationFindingSeverity.MEDIUM,
            currentWebhook.webhookId,
            `Webhook ${currentWebhook.webhookId} metadata drifted from reconciliation baselines.`,
            Object.freeze({
              baselineChannelId: baseline.channelId,
              currentChannelId: currentWebhook.channelId,
              baselineOwnerBotUserId: baseline.ownerBotUserId,
              currentOwnerBotUserId: currentWebhook.ownerBotUserId,
            }),
          ),
        );
      }

      const currentPermissions = toPermissionSet(currentWebhook.permissions);
      const expectedPermissions = toPermissionSet(
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
            currentWebhook.webhookId,
            `Webhook ${currentWebhook.webhookId} has permission-sensitive drift from reconciliation baselines.`,
            Object.freeze({
              category: 'WEBHOOK_PERMISSION_SENSITIVE',
              currentPermissions,
              expectedPermissions,
            }),
          ),
        );
      }
    }

    if (currentWebhook.suspicious) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS,
          SecurityReconciliationFindingSeverity.HIGH,
          currentWebhook.webhookId,
          `Webhook ${currentWebhook.webhookId} is marked suspicious by inventory telemetry.`,
          Object.freeze({ category: 'SUSPICIOUS_WEBHOOK' }),
        ),
      );
    }

    if (currentWebhook.highRisk || currentWebhook.privileged) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
          SecurityReconciliationFindingSeverity.CRITICAL,
          currentWebhook.webhookId,
          `Webhook ${currentWebhook.webhookId} is high risk due to privileged behavior or risk heuristics.`,
          Object.freeze({
            highRisk: currentWebhook.highRisk,
            privileged: currentWebhook.privileged,
          }),
        ),
      );
    }
  }

  for (const record of request.authorizedWebhookRegistry.records) {
    const currentWebhook = currentById.get(record.webhookId);
    const runtimeWebhook = runtimeById.get(record.webhookId);
    const recoveryWebhook = recoveryById.get(record.webhookId);
    const startupWebhook = startupById.get(record.webhookId);

    if (!currentWebhook) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_DELETED,
          SecurityReconciliationFindingSeverity.HIGH,
          record.webhookId,
          `Authorized webhook ${record.webhookId} is missing from current guild inventory.`,
          Object.freeze({ category: 'MISSING_AUTHORIZED_WEBHOOK' }),
        ),
      );
    }

    if (
      currentWebhook === undefined &&
      record.required &&
      runtimeWebhook === undefined &&
      recoveryWebhook === undefined &&
      startupWebhook === undefined
    ) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_ORPHANED,
          SecurityReconciliationFindingSeverity.CRITICAL,
          record.webhookId,
          `Required webhook ${record.webhookId} is absent from current inventory and all reconciliation baselines.`,
        ),
      );
    }

    const baseline = runtimeWebhook ?? recoveryWebhook ?? startupWebhook;
    if (baseline) {
      if (record.channelId !== baseline.channelId || record.privileged !== baseline.privileged) {
        findings.push(
          buildFinding(
            request,
            reconciliationId,
            SecurityReconciliationFindingType.REGISTRY_MISMATCH,
            SecurityReconciliationFindingSeverity.HIGH,
            record.webhookId,
            `Authorized webhook registry entry for ${record.webhookId} mismatches snapshot/startup baselines.`,
            Object.freeze({
              registryChannelId: record.channelId,
              baselineChannelId: baseline.channelId,
              registryPrivileged: record.privileged,
              baselinePrivileged: baseline.privileged,
            }),
          ),
        );
      }
    }
  }

  const allBaselineWebhookIds = new Set<string>([
    ...request.runtimeSnapshot.webhookInventory.map((entry) => entry.webhookId),
    ...request.recoverySnapshot.webhookInventory.map((entry) => entry.webhookId),
    ...request.startupInventory.webhookInventory.map((entry) => entry.webhookId),
  ]);

  for (const webhookId of allBaselineWebhookIds) {
    const runtimeWebhook = runtimeById.get(webhookId);
    const recoveryWebhook = recoveryById.get(webhookId);
    const startupWebhook = startupById.get(webhookId);

    const presence = [runtimeWebhook, recoveryWebhook, startupWebhook].map((entry) => entry !== undefined);
    const presenceInconsistency = presence.includes(true) && presence.includes(false);

    const channelIds = [runtimeWebhook, recoveryWebhook, startupWebhook]
      .filter((entry): entry is SecurityWebhookIdentity => entry !== undefined)
      .map((entry) => entry.channelId);
    const ownerIds = [runtimeWebhook, recoveryWebhook, startupWebhook]
      .filter((entry): entry is SecurityWebhookIdentity => entry !== undefined)
      .map((entry) => entry.ownerBotUserId ?? '');
    const privilegedFlags = [runtimeWebhook, recoveryWebhook, startupWebhook]
      .filter((entry): entry is SecurityWebhookIdentity => entry !== undefined)
      .map((entry) => String(entry.privileged));
    const permissionSets = [runtimeWebhook, recoveryWebhook, startupWebhook]
      .filter((entry): entry is SecurityWebhookIdentity => entry !== undefined)
      .map((entry) => toPermissionSet(entry.permissions).join(','));

    const baselineInconsistency =
      new Set(channelIds).size > 1 ||
      new Set(ownerIds).size > 1 ||
      new Set(privilegedFlags).size > 1 ||
      new Set(permissionSets).size > 1;

    if (presenceInconsistency || baselineInconsistency) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY,
          SecurityReconciliationFindingSeverity.HIGH,
          webhookId,
          `Webhook ${webhookId} has inconsistent state across runtime, recovery, and startup baselines.`,
          Object.freeze({
            presenceInconsistency,
            baselineInconsistency,
          }),
        ),
      );
    }
  }

  for (const webhookId of allBaselineWebhookIds) {
    if (!currentById.has(webhookId)) {
      findings.push(
        buildFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_DELETED,
          SecurityReconciliationFindingSeverity.MEDIUM,
          webhookId,
          `Webhook ${webhookId} existed in reconciliation baselines but is absent from current guild inventory.`,
          Object.freeze({ category: 'DELETED_FROM_BASELINE' }),
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
  request: SecurityWebhookInventoryReconciliationRequest,
  reconciliationId: string,
  stagesCompleted: readonly SecurityWebhookInventoryReconciliationStage[],
  startedAtMs: number,
  failureReason: string,
): SecurityWebhookInventoryReconciliationReport {
  return freezeReport({
    reconciliationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted,
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityWebhookInventoryReconciliationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-webhook-inventory-reconciliation' as const,
      deterministicReconciliationId: true as const,
      findingsOnly: true as const,
      registryId: request.authorizedWebhookRegistry.registryId,
      registryVersion: request.authorizedWebhookRegistry.registryVersion,
      runtimeSnapshotId: request.runtimeSnapshot.snapshotId,
      recoverySnapshotId: request.recoverySnapshot.snapshotId,
      startupSnapshotId: request.startupInventory.snapshotId,
    }),
  });
}

export class InMemorySecurityWebhookInventoryReconciler implements SecurityWebhookInventoryReconciler {
  private readonly completedReports = new Map<string, SecurityWebhookInventoryReconciliationReport>();

  async execute(
    request: SecurityWebhookInventoryReconciliationRequest,
  ): Promise<SecurityWebhookInventoryReconciliationReport> {
    const frozenRequest = freezeSecurityWebhookInventoryReconciliationRequest(request);
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

    const stagesCompleted: SecurityWebhookInventoryReconciliationStage[] = [];
    stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.RECONCILIATION_VALIDATION);

    const validationFailures = validateInput(frozenRequest, reconciliationId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.REPORT_GENERATION);
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

    stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.SOURCE_EVALUATION);
    stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.DRIFT_DETECTION);
    const findings = detectDriftFindings(frozenRequest, reconciliationId);

    stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.VERIFICATION);
    const verificationSucceeded = findings.every(
      (finding) =>
        finding.correlationId === frozenRequest.correlationId &&
        finding.guildId === frozenRequest.guildId &&
        finding.runtimeId === frozenRequest.runtimeId,
    );

    if (!verificationSucceeded) {
      stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.REPORT_GENERATION);
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

    stagesCompleted.push(SecurityWebhookInventoryReconciliationStage.REPORT_GENERATION);
    const report = freezeReport({
      reconciliationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      stagesCompleted: Object.freeze(stagesCompleted),
      findings,
      reconciliationRequired: findings.length > 0,
      verificationOutcome: SecurityWebhookInventoryReconciliationVerificationOutcome.VERIFIED,
      success: true,
      failureReason: undefined,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-webhook-inventory-reconciliation' as const,
        deterministicReconciliationId: true as const,
        findingsOnly: true as const,
        registryId: frozenRequest.authorizedWebhookRegistry.registryId,
        registryVersion: frozenRequest.authorizedWebhookRegistry.registryVersion,
        runtimeSnapshotId: frozenRequest.runtimeSnapshot.snapshotId,
        recoverySnapshotId: frozenRequest.recoverySnapshot.snapshotId,
        startupSnapshotId: frozenRequest.startupInventory.snapshotId,
      }),
    });

    this.completedReports.set(reconciliationId, report);
    return report;
  }
}
