export enum SecurityReconciliationTrigger {
  STARTUP = 'STARTUP',
  RECONNECT = 'RECONNECT',
}

export enum SecurityReconciliationStage {
  SECURITY_INITIALIZATION = 'SECURITY_INITIALIZATION',
  INVENTORY_EVALUATION = 'INVENTORY_EVALUATION',
  DRIFT_EVALUATION = 'DRIFT_EVALUATION',
  RECONCILIATION_DECISION = 'RECONCILIATION_DECISION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityReconciliationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum SecurityReconciliationFindingSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SecurityReconciliationFindingType {
  SNAPSHOT_MISMATCH = 'SNAPSHOT_MISMATCH',
  UNAUTHORIZED_BOT = 'UNAUTHORIZED_BOT',
  MISSING_AUTHORIZED_BOT = 'MISSING_AUTHORIZED_BOT',
  DUPLICATE_BOT_IDENTITY = 'DUPLICATE_BOT_IDENTITY',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  REGISTRY_MISMATCH = 'REGISTRY_MISMATCH',
  ORPHANED_TRUSTED_BOT = 'ORPHANED_TRUSTED_BOT',
  SNAPSHOT_INCONSISTENCY = 'SNAPSHOT_INCONSISTENCY',
  WEBHOOK_NEW = 'WEBHOOK_NEW',
  WEBHOOK_MODIFIED = 'WEBHOOK_MODIFIED',
  WEBHOOK_DELETED = 'WEBHOOK_DELETED',
  WEBHOOK_ORPHANED = 'WEBHOOK_ORPHANED',
  WEBHOOK_SUSPICIOUS = 'WEBHOOK_SUSPICIOUS',
  WEBHOOK_HIGH_RISK = 'WEBHOOK_HIGH_RISK',
  PRIVILEGED_ROLE_DRIFT = 'PRIVILEGED_ROLE_DRIFT',
  PERMISSION_DRIFT = 'PERMISSION_DRIFT',
}

export interface SecurityBotInventoryEntry {
  readonly botUserId: string;
  readonly displayName?: string;
}

export interface SecurityWebhookInventoryEntry {
  readonly webhookId: string;
  readonly channelId: string;
  readonly name?: string;
  readonly ownerBotUserId?: string;
  readonly privileged?: boolean;
}

export interface SecurityRoleInventoryEntry {
  readonly roleId: string;
  readonly name?: string;
  readonly privileged: boolean;
}

export interface SecurityPermissionInventoryEntry {
  readonly permissionTargetId: string;
  readonly permissionKey: string;
  readonly allowed: boolean;
}

export interface SecurityRuntimeInventoryState {
  readonly botInventory: readonly SecurityBotInventoryEntry[];
  readonly webhookInventory: readonly SecurityWebhookInventoryEntry[];
  readonly roleInventory: readonly SecurityRoleInventoryEntry[];
  readonly permissionInventory: readonly SecurityPermissionInventoryEntry[];
}

export interface SecuritySafeSnapshot {
  readonly snapshotId: string;
  readonly snapshotVersion: number;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly inventory: SecurityRuntimeInventoryState;
}

export interface SecurityAuthorizedBotRegistry {
  readonly authorizedBotUserIds: readonly string[];
}

export interface SecurityReconciliationFinding {
  readonly findingId: string;
  readonly type: SecurityReconciliationFindingType;
  readonly severity: SecurityReconciliationFindingSeverity;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly correlationId: string;
  readonly targetId: string;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityReconciliationRequest {
  readonly reconciliationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly trigger: SecurityReconciliationTrigger;
  readonly runtimeInitialized?: boolean;
  readonly currentRuntimeState: SecurityRuntimeInventoryState;
  readonly safeSnapshot: SecuritySafeSnapshot;
  readonly authorizedBotRegistry: SecurityAuthorizedBotRegistry;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityReconciliationInventoryEvaluation {
  readonly botInventoryCount: number;
  readonly webhookInventoryCount: number;
  readonly roleInventoryCount: number;
  readonly permissionInventoryCount: number;
  readonly snapshotBotInventoryCount: number;
  readonly snapshotWebhookInventoryCount: number;
  readonly snapshotRoleInventoryCount: number;
  readonly snapshotPermissionInventoryCount: number;
}

export interface SecurityReconciliationReport {
  readonly reconciliationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly guildId: string;
  readonly runtimeId: string;
  readonly trigger: SecurityReconciliationTrigger;
  readonly stagesCompleted: readonly SecurityReconciliationStage[];
  readonly inventoryEvaluation?: SecurityReconciliationInventoryEvaluation;
  readonly findings: readonly SecurityReconciliationFinding[];
  readonly reconciliationRequired: boolean;
  readonly verificationOutcome: SecurityReconciliationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-reconciliation-engine';
    readonly deterministicReconciliationId: true;
    readonly triggerRouting: 'FULL';
    readonly snapshotId: string;
    readonly snapshotVersion: number;
  };
}

export interface SecurityReconciliationEngine {
  execute(request: SecurityReconciliationRequest): Promise<SecurityReconciliationReport>;
}

const FAILURE_RECONCILIATION_ID_REQUIRED = 'RECONCILIATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_TRIGGER_REQUIRED = 'TRIGGER_REQUIRED';
const FAILURE_SECURITY_INITIALIZATION_FAILED = 'SECURITY_INITIALIZATION_FAILED';
const FAILURE_SNAPSHOT_ID_REQUIRED = 'SNAPSHOT_ID_REQUIRED';
const FAILURE_SNAPSHOT_VERSION_INVALID = 'SNAPSHOT_VERSION_INVALID';
const FAILURE_SNAPSHOT_GUILD_MISMATCH = 'SNAPSHOT_GUILD_MISMATCH';
const FAILURE_SNAPSHOT_RUNTIME_MISMATCH = 'SNAPSHOT_RUNTIME_MISMATCH';
const FAILURE_DUPLICATE_LIVE_BOT_ID = 'DUPLICATE_LIVE_BOT_ID';
const FAILURE_DUPLICATE_SNAPSHOT_BOT_ID = 'DUPLICATE_SNAPSHOT_BOT_ID';
const FAILURE_DUPLICATE_LIVE_WEBHOOK_ID = 'DUPLICATE_LIVE_WEBHOOK_ID';
const FAILURE_DUPLICATE_SNAPSHOT_WEBHOOK_ID = 'DUPLICATE_SNAPSHOT_WEBHOOK_ID';
const FAILURE_DUPLICATE_LIVE_ROLE_ID = 'DUPLICATE_LIVE_ROLE_ID';
const FAILURE_DUPLICATE_SNAPSHOT_ROLE_ID = 'DUPLICATE_SNAPSHOT_ROLE_ID';
const FAILURE_DUPLICATE_LIVE_PERMISSION_ID = 'DUPLICATE_LIVE_PERMISSION_ID';
const FAILURE_DUPLICATE_SNAPSHOT_PERMISSION_ID = 'DUPLICATE_SNAPSHOT_PERMISSION_ID';
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

function freezeBotInventoryEntry(entry: SecurityBotInventoryEntry): SecurityBotInventoryEntry {
  return deepFreeze({ ...entry });
}

function freezeWebhookInventoryEntry(entry: SecurityWebhookInventoryEntry): SecurityWebhookInventoryEntry {
  return deepFreeze({ ...entry });
}

function freezeRoleInventoryEntry(entry: SecurityRoleInventoryEntry): SecurityRoleInventoryEntry {
  return deepFreeze({ ...entry });
}

function freezePermissionInventoryEntry(entry: SecurityPermissionInventoryEntry): SecurityPermissionInventoryEntry {
  return deepFreeze({ ...entry });
}

function freezeRuntimeInventoryState(state: SecurityRuntimeInventoryState): SecurityRuntimeInventoryState {
  return deepFreeze({
    botInventory: Object.freeze(state.botInventory.map((entry) => freezeBotInventoryEntry(entry))),
    webhookInventory: Object.freeze(state.webhookInventory.map((entry) => freezeWebhookInventoryEntry(entry))),
    roleInventory: Object.freeze(state.roleInventory.map((entry) => freezeRoleInventoryEntry(entry))),
    permissionInventory: Object.freeze(
      state.permissionInventory.map((entry) => freezePermissionInventoryEntry(entry)),
    ),
  });
}

function freezeSafeSnapshot(snapshot: SecuritySafeSnapshot): SecuritySafeSnapshot {
  return deepFreeze({
    ...snapshot,
    inventory: freezeRuntimeInventoryState(snapshot.inventory),
  });
}

function freezeAuthorizedBotRegistry(registry: SecurityAuthorizedBotRegistry): SecurityAuthorizedBotRegistry {
  return deepFreeze({
    authorizedBotUserIds: Object.freeze([...registry.authorizedBotUserIds]),
  });
}

export function freezeSecurityReconciliationRequest(
  request: SecurityReconciliationRequest,
): SecurityReconciliationRequest {
  return deepFreeze({
    ...request,
    currentRuntimeState: freezeRuntimeInventoryState(request.currentRuntimeState),
    safeSnapshot: freezeSafeSnapshot(request.safeSnapshot),
    authorizedBotRegistry: freezeAuthorizedBotRegistry(request.authorizedBotRegistry),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeFinding(finding: SecurityReconciliationFinding): SecurityReconciliationFinding {
  return deepFreeze({
    ...finding,
    metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
  });
}

function freezeReport(report: SecurityReconciliationReport): SecurityReconciliationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    inventoryEvaluation: report.inventoryEvaluation ? Object.freeze({ ...report.inventoryEvaluation }) : undefined,
    findings: Object.freeze(report.findings.map((finding) => freezeFinding(finding))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReconciliationId(request: SecurityReconciliationRequest): string {
  return [
    'security-reconciliation',
    request.trigger,
    request.runtimeId,
    request.guildId,
    request.transactionId,
    request.correlationId,
    request.safeSnapshot.snapshotId,
    String(request.safeSnapshot.snapshotVersion),
  ].join(':');
}

function toInventoryEvaluation(request: SecurityReconciliationRequest): SecurityReconciliationInventoryEvaluation {
  return Object.freeze({
    botInventoryCount: request.currentRuntimeState.botInventory.length,
    webhookInventoryCount: request.currentRuntimeState.webhookInventory.length,
    roleInventoryCount: request.currentRuntimeState.roleInventory.length,
    permissionInventoryCount: request.currentRuntimeState.permissionInventory.length,
    snapshotBotInventoryCount: request.safeSnapshot.inventory.botInventory.length,
    snapshotWebhookInventoryCount: request.safeSnapshot.inventory.webhookInventory.length,
    snapshotRoleInventoryCount: request.safeSnapshot.inventory.roleInventory.length,
    snapshotPermissionInventoryCount: request.safeSnapshot.inventory.permissionInventory.length,
  });
}

function buildFindingId(
  reconciliationId: string,
  type: SecurityReconciliationFindingType,
  targetId: string,
): string {
  return `${reconciliationId}:finding:${type}:${targetId}`;
}

function createFinding(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  targetId: string,
  summary: string,
  metadata?: Record<string, unknown>,
): SecurityReconciliationFinding {
  return freezeFinding({
    findingId: buildFindingId(reconciliationId, type, targetId),
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

function buildPermissionKey(entry: SecurityPermissionInventoryEntry): string {
  return `${entry.permissionTargetId}:${entry.permissionKey}`;
}

function validateUniqueKeys<T>(
  entries: readonly T[],
  selectKey: (entry: T) => string,
  duplicateFailure: string,
): string | undefined {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = selectKey(entry);
    if (seen.has(key)) {
      return `${duplicateFailure}:${key}`;
    }
    seen.add(key);
  }

  return undefined;
}

function resolveValidationFailures(request: SecurityReconciliationRequest, reconciliationId: string): readonly string[] {
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
  if (!request.trigger) {
    failures.push(FAILURE_TRIGGER_REQUIRED);
  }
  if (!isNonEmptyString(request.safeSnapshot.snapshotId)) {
    failures.push(FAILURE_SNAPSHOT_ID_REQUIRED);
  }
  if (request.safeSnapshot.snapshotVersion < 0) {
    failures.push(FAILURE_SNAPSHOT_VERSION_INVALID);
  }
  const duplicateChecks = [
    validateUniqueKeys(
      request.currentRuntimeState.botInventory,
      (entry) => entry.botUserId,
      FAILURE_DUPLICATE_LIVE_BOT_ID,
    ),
    validateUniqueKeys(
      request.safeSnapshot.inventory.botInventory,
      (entry) => entry.botUserId,
      FAILURE_DUPLICATE_SNAPSHOT_BOT_ID,
    ),
    validateUniqueKeys(
      request.currentRuntimeState.webhookInventory,
      (entry) => entry.webhookId,
      FAILURE_DUPLICATE_LIVE_WEBHOOK_ID,
    ),
    validateUniqueKeys(
      request.safeSnapshot.inventory.webhookInventory,
      (entry) => entry.webhookId,
      FAILURE_DUPLICATE_SNAPSHOT_WEBHOOK_ID,
    ),
    validateUniqueKeys(
      request.currentRuntimeState.roleInventory,
      (entry) => entry.roleId,
      FAILURE_DUPLICATE_LIVE_ROLE_ID,
    ),
    validateUniqueKeys(
      request.safeSnapshot.inventory.roleInventory,
      (entry) => entry.roleId,
      FAILURE_DUPLICATE_SNAPSHOT_ROLE_ID,
    ),
    validateUniqueKeys(
      request.currentRuntimeState.permissionInventory,
      (entry) => buildPermissionKey(entry),
      FAILURE_DUPLICATE_LIVE_PERMISSION_ID,
    ),
    validateUniqueKeys(
      request.safeSnapshot.inventory.permissionInventory,
      (entry) => buildPermissionKey(entry),
      FAILURE_DUPLICATE_SNAPSHOT_PERMISSION_ID,
    ),
  ];

  for (const failure of duplicateChecks) {
    if (failure) {
      failures.push(failure);
    }
  }

  return Object.freeze(failures);
}

function indexBy<T>(entries: readonly T[], selectKey: (entry: T) => string): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    result.set(selectKey(entry), entry);
  }
  return result;
}

function reconcileUnauthorizedBots(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];
  const authorizedBotIds = new Set(request.authorizedBotRegistry.authorizedBotUserIds);

  for (const bot of request.currentRuntimeState.botInventory) {
    if (!authorizedBotIds.has(bot.botUserId)) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          bot.botUserId,
          `Bot ${bot.botUserId} is present in live inventory but missing from the authorized registry.`,
          Object.freeze({ displayName: bot.displayName }),
        ),
      );
    }
  }

  return Object.freeze(findings);
}

function reconcileWebhookInventory(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];
  const liveWebhooks = indexBy(request.currentRuntimeState.webhookInventory, (entry) => entry.webhookId);
  const snapshotWebhooks = indexBy(request.safeSnapshot.inventory.webhookInventory, (entry) => entry.webhookId);
  const liveBotIds = new Set(request.currentRuntimeState.botInventory.map((entry) => entry.botUserId));

  for (const webhook of request.currentRuntimeState.webhookInventory) {
    const snapshotWebhook = snapshotWebhooks.get(webhook.webhookId);
    if (!snapshotWebhook) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_NEW,
          SecurityReconciliationFindingSeverity.HIGH,
          webhook.webhookId,
          `Webhook ${webhook.webhookId} exists in live inventory but not in the safe snapshot.`,
          Object.freeze({
            channelId: webhook.channelId,
            ownerBotUserId: webhook.ownerBotUserId,
            name: webhook.name,
          }),
        ),
      );
    } else if (
      snapshotWebhook.channelId !== webhook.channelId ||
      snapshotWebhook.name !== webhook.name ||
      snapshotWebhook.ownerBotUserId !== webhook.ownerBotUserId ||
      snapshotWebhook.privileged !== webhook.privileged
    ) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_MODIFIED,
          SecurityReconciliationFindingSeverity.HIGH,
          webhook.webhookId,
          `Webhook ${webhook.webhookId} differs from the safe snapshot.`,
          Object.freeze({
            liveChannelId: webhook.channelId,
            snapshotChannelId: snapshotWebhook.channelId,
            liveOwnerBotUserId: webhook.ownerBotUserId,
            snapshotOwnerBotUserId: snapshotWebhook.ownerBotUserId,
          }),
        ),
      );
    }

    if (webhook.ownerBotUserId && !liveBotIds.has(webhook.ownerBotUserId)) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_ORPHANED,
          SecurityReconciliationFindingSeverity.HIGH,
          webhook.webhookId,
          `Webhook ${webhook.webhookId} is owned by bot ${webhook.ownerBotUserId}, which is absent from live bot inventory.`,
          Object.freeze({ ownerBotUserId: webhook.ownerBotUserId }),
        ),
      );
    }

    if (!webhook.ownerBotUserId || !isNonEmptyString(webhook.channelId)) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS,
          SecurityReconciliationFindingSeverity.MEDIUM,
          webhook.webhookId,
          `Webhook ${webhook.webhookId} is missing ownership or channel metadata required for trust evaluation.`,
          Object.freeze({ channelId: webhook.channelId, ownerBotUserId: webhook.ownerBotUserId }),
        ),
      );
    }

    if (webhook.privileged === true) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK,
          SecurityReconciliationFindingSeverity.CRITICAL,
          webhook.webhookId,
          `Webhook ${webhook.webhookId} is marked as privileged or high-risk in live inventory.`,
          Object.freeze({ channelId: webhook.channelId, ownerBotUserId: webhook.ownerBotUserId }),
        ),
      );
    }
  }

  for (const snapshotWebhook of request.safeSnapshot.inventory.webhookInventory) {
    if (!liveWebhooks.has(snapshotWebhook.webhookId)) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.WEBHOOK_DELETED,
          SecurityReconciliationFindingSeverity.HIGH,
          snapshotWebhook.webhookId,
          `Webhook ${snapshotWebhook.webhookId} exists in the safe snapshot but is absent from live inventory.`,
          Object.freeze({ channelId: snapshotWebhook.channelId, ownerBotUserId: snapshotWebhook.ownerBotUserId }),
        ),
      );
    }
  }

  return Object.freeze(findings);
}

function reconcilePrivilegedRoleDrift(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];
  const snapshotRoles = indexBy(request.safeSnapshot.inventory.roleInventory, (entry) => entry.roleId);
  const liveRoles = indexBy(request.currentRuntimeState.roleInventory, (entry) => entry.roleId);

  for (const liveRole of request.currentRuntimeState.roleInventory) {
    const snapshotRole = snapshotRoles.get(liveRole.roleId);
    if (snapshotRole && snapshotRole.privileged !== liveRole.privileged) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
          SecurityReconciliationFindingSeverity.CRITICAL,
          liveRole.roleId,
          `Role ${liveRole.roleId} privileged state drifted from the safe snapshot.`,
          Object.freeze({
            livePrivileged: liveRole.privileged,
            snapshotPrivileged: snapshotRole.privileged,
          }),
        ),
      );
    }
  }

  for (const snapshotRole of request.safeSnapshot.inventory.roleInventory) {
    if (!liveRoles.has(snapshotRole.roleId) && snapshotRole.privileged) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PRIVILEGED_ROLE_DRIFT,
          SecurityReconciliationFindingSeverity.HIGH,
          snapshotRole.roleId,
          `Privileged role ${snapshotRole.roleId} exists in the safe snapshot but is absent from live inventory.`,
          Object.freeze({ snapshotPrivileged: snapshotRole.privileged }),
        ),
      );
    }
  }

  return Object.freeze(findings);
}

function reconcilePermissionDrift(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  const findings: SecurityReconciliationFinding[] = [];
  const livePermissions = indexBy(
    request.currentRuntimeState.permissionInventory,
    (entry) => buildPermissionKey(entry),
  );
  const snapshotPermissions = indexBy(
    request.safeSnapshot.inventory.permissionInventory,
    (entry) => buildPermissionKey(entry),
  );

  for (const livePermission of request.currentRuntimeState.permissionInventory) {
    const permissionKey = buildPermissionKey(livePermission);
    const snapshotPermission = snapshotPermissions.get(permissionKey);
    if (!snapshotPermission || snapshotPermission.allowed !== livePermission.allowed) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.HIGH,
          permissionKey,
          `Permission ${permissionKey} differs from the safe snapshot.`,
          Object.freeze({
            liveAllowed: livePermission.allowed,
            snapshotAllowed: snapshotPermission?.allowed,
          }),
        ),
      );
    }
  }

  for (const snapshotPermission of request.safeSnapshot.inventory.permissionInventory) {
    const permissionKey = buildPermissionKey(snapshotPermission);
    if (!livePermissions.has(permissionKey)) {
      findings.push(
        createFinding(
          request,
          reconciliationId,
          SecurityReconciliationFindingType.PERMISSION_DRIFT,
          SecurityReconciliationFindingSeverity.MEDIUM,
          permissionKey,
          `Permission ${permissionKey} exists in the safe snapshot but is absent from live inventory.`,
          Object.freeze({ snapshotAllowed: snapshotPermission.allowed }),
        ),
      );
    }
  }

  return Object.freeze(findings);
}

function collectFindings(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
): readonly SecurityReconciliationFinding[] {
  return Object.freeze([
    ...reconcileUnauthorizedBots(request, reconciliationId),
    ...reconcileWebhookInventory(request, reconciliationId),
    ...reconcilePrivilegedRoleDrift(request, reconciliationId),
    ...reconcilePermissionDrift(request, reconciliationId),
  ]);
}

function buildFailureReport(
  request: SecurityReconciliationRequest,
  reconciliationId: string,
  stagesCompleted: readonly SecurityReconciliationStage[],
  startedAtMs: number,
  failureReason: string,
  inventoryEvaluation?: SecurityReconciliationInventoryEvaluation,
  findings: readonly SecurityReconciliationFinding[] = Object.freeze([]),
): SecurityReconciliationReport {
  return freezeReport({
    reconciliationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    trigger: request.trigger,
    stagesCompleted,
    inventoryEvaluation,
    findings,
    reconciliationRequired: false,
    verificationOutcome: SecurityReconciliationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-reconciliation-engine' as const,
      deterministicReconciliationId: true as const,
      triggerRouting: 'FULL' as const,
      snapshotId: request.safeSnapshot.snapshotId,
      snapshotVersion: request.safeSnapshot.snapshotVersion,
    }),
  });
}

export class InMemorySecurityReconciliationEngine implements SecurityReconciliationEngine {
  private readonly completedReports = new Map<string, SecurityReconciliationReport>();

  async execute(request: SecurityReconciliationRequest): Promise<SecurityReconciliationReport> {
    const frozenRequest = freezeSecurityReconciliationRequest(request);
    const reconciliationId = frozenRequest.reconciliationId ?? toDeterministicReconciliationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(reconciliationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: SecurityReconciliationStage[] = [];
    const validationFailures = resolveValidationFailures(frozenRequest, reconciliationId);
    if (validationFailures.length > 0) {
      stagesCompleted.push(SecurityReconciliationStage.REPORT_GENERATION);
      const failedValidation = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        validationFailures.join(','),
      );
      this.completedReports.set(reconciliationId, failedValidation);
      return failedValidation;
    }

    stagesCompleted.push(SecurityReconciliationStage.SECURITY_INITIALIZATION);
    if (frozenRequest.runtimeInitialized === false) {
      stagesCompleted.push(SecurityReconciliationStage.REPORT_GENERATION);
      const failedInitialization = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        FAILURE_SECURITY_INITIALIZATION_FAILED,
      );
      this.completedReports.set(reconciliationId, failedInitialization);
      return failedInitialization;
    }

    stagesCompleted.push(SecurityReconciliationStage.INVENTORY_EVALUATION);
    const inventoryEvaluation = toInventoryEvaluation(frozenRequest);

    stagesCompleted.push(SecurityReconciliationStage.DRIFT_EVALUATION);
    const snapshotMismatchFindings: SecurityReconciliationFinding[] = [];
    if (frozenRequest.safeSnapshot.guildId !== frozenRequest.guildId) {
      snapshotMismatchFindings.push(
        createFinding(
          frozenRequest,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
          SecurityReconciliationFindingSeverity.CRITICAL,
          frozenRequest.safeSnapshot.snapshotId,
          `Safe snapshot guild ${frozenRequest.safeSnapshot.guildId} does not match request guild ${frozenRequest.guildId}.`,
          Object.freeze({
            snapshotGuildId: frozenRequest.safeSnapshot.guildId,
            requestGuildId: frozenRequest.guildId,
          }),
        ),
      );
    }
    if (frozenRequest.safeSnapshot.runtimeId !== frozenRequest.runtimeId) {
      snapshotMismatchFindings.push(
        createFinding(
          frozenRequest,
          reconciliationId,
          SecurityReconciliationFindingType.SNAPSHOT_MISMATCH,
          SecurityReconciliationFindingSeverity.CRITICAL,
          frozenRequest.safeSnapshot.snapshotId,
          `Safe snapshot runtime ${frozenRequest.safeSnapshot.runtimeId} does not match request runtime ${frozenRequest.runtimeId}.`,
          Object.freeze({
            snapshotRuntimeId: frozenRequest.safeSnapshot.runtimeId,
            requestRuntimeId: frozenRequest.runtimeId,
          }),
        ),
      );
    }

    if (snapshotMismatchFindings.length > 0) {
      const mismatchReasons: string[] = [];
      if (frozenRequest.safeSnapshot.guildId !== frozenRequest.guildId) {
        mismatchReasons.push(FAILURE_SNAPSHOT_GUILD_MISMATCH);
      }
      if (frozenRequest.safeSnapshot.runtimeId !== frozenRequest.runtimeId) {
        mismatchReasons.push(FAILURE_SNAPSHOT_RUNTIME_MISMATCH);
      }
      stagesCompleted.push(SecurityReconciliationStage.REPORT_GENERATION);
      const failedMismatch = buildFailureReport(
        frozenRequest,
        reconciliationId,
        Object.freeze(stagesCompleted),
        startedAtMs,
        `${FAILURE_INCONSISTENT_STATE}:${mismatchReasons.join(',')}`,
        inventoryEvaluation,
        Object.freeze(snapshotMismatchFindings),
      );
      this.completedReports.set(reconciliationId, failedMismatch);
      return failedMismatch;
    }

    const findings = collectFindings(frozenRequest, reconciliationId);

    stagesCompleted.push(SecurityReconciliationStage.RECONCILIATION_DECISION);
    const reconciliationRequired = findings.length > 0;

    stagesCompleted.push(SecurityReconciliationStage.VERIFICATION);
    const verificationSucceeded =
      reconciliationId.length > 0 &&
      frozenRequest.correlationId.length > 0 &&
      frozenRequest.transactionId.length > 0 &&
      frozenRequest.guildId.length > 0 &&
      frozenRequest.runtimeId.length > 0;

    stagesCompleted.push(SecurityReconciliationStage.REPORT_GENERATION);

    const report = freezeReport({
      reconciliationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      guildId: frozenRequest.guildId,
      runtimeId: frozenRequest.runtimeId,
      trigger: frozenRequest.trigger,
      stagesCompleted: Object.freeze(stagesCompleted),
      inventoryEvaluation,
      findings,
      reconciliationRequired,
      verificationOutcome: verificationSucceeded
        ? SecurityReconciliationVerificationOutcome.VERIFIED
        : SecurityReconciliationVerificationOutcome.FAILED,
      success: verificationSucceeded,
      failureReason: verificationSucceeded ? undefined : FAILURE_VERIFICATION_FAILED,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-reconciliation-engine' as const,
        deterministicReconciliationId: true as const,
        triggerRouting: 'FULL' as const,
        snapshotId: frozenRequest.safeSnapshot.snapshotId,
        snapshotVersion: frozenRequest.safeSnapshot.snapshotVersion,
      }),
    });

    this.completedReports.set(reconciliationId, report);
    return report;
  }
}
