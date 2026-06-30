import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  freezeSecurityReconciliationRequest,
  InMemorySecurityReconciliationEngine,
  SecurityAuthorizedBotRegistry,
  SecurityPermissionInventoryEntry,
  SecurityReconciliationRequest,
  SecurityReconciliationStage,
  SecurityReconciliationTrigger,
  SecurityReconciliationVerificationOutcome,
  SecurityRuntimeInventoryState,
  SecuritySafeSnapshot,
} from '../../src/core/runtime/security/security-reconciliation-engine';

function buildRuntimeState(
  overrides: Partial<SecurityRuntimeInventoryState> = {},
): SecurityRuntimeInventoryState {
  return Object.freeze({
    botInventory: Object.freeze([
      Object.freeze({ botUserId: 'bot-safe-1', displayName: 'Safe Bot' }),
      Object.freeze({ botUserId: 'bot-rogue-1', displayName: 'Rogue Bot' }),
    ]),
    webhookInventory: Object.freeze([
      Object.freeze({
        webhookId: 'webhook-safe-1',
        channelId: 'channel-safe-1',
        name: 'Safe Webhook',
        ownerBotUserId: 'bot-safe-1',
        privileged: false,
      }),
      Object.freeze({
        webhookId: 'webhook-rogue-1',
        channelId: 'channel-rogue-1',
        name: 'Rogue Webhook',
        ownerBotUserId: 'bot-rogue-1',
        privileged: true,
      }),
    ]),
    roleInventory: Object.freeze([
      Object.freeze({ roleId: 'role-safe-1', name: 'Safe Role', privileged: false }),
      Object.freeze({ roleId: 'role-admin-1', name: 'Admin Role', privileged: true }),
    ]),
    permissionInventory: Object.freeze([
      Object.freeze({ permissionTargetId: 'role-safe-1', permissionKey: 'SEND_MESSAGES', allowed: true }),
      Object.freeze({ permissionTargetId: 'role-admin-1', permissionKey: 'MANAGE_WEBHOOKS', allowed: true }),
    ]),
    ...overrides,
  });
}

function buildSnapshot(
  overrides: Partial<SecuritySafeSnapshot> = {},
): SecuritySafeSnapshot {
  return Object.freeze({
    snapshotId: 'snapshot-safe-001',
    snapshotVersion: 3,
    guildId: 'guild-reconcile-001',
    runtimeId: 'runtime-reconcile-001',
    inventory: Object.freeze({
      botInventory: Object.freeze([Object.freeze({ botUserId: 'bot-safe-1', displayName: 'Safe Bot' })]),
      webhookInventory: Object.freeze([
        Object.freeze({
          webhookId: 'webhook-safe-1',
          channelId: 'channel-safe-1',
          name: 'Safe Webhook',
          ownerBotUserId: 'bot-safe-1',
          privileged: false,
        }),
      ]),
      roleInventory: Object.freeze([
        Object.freeze({ roleId: 'role-safe-1', name: 'Safe Role', privileged: false }),
        Object.freeze({ roleId: 'role-admin-1', name: 'Admin Role', privileged: false }),
      ]),
      permissionInventory: Object.freeze([
        Object.freeze({ permissionTargetId: 'role-safe-1', permissionKey: 'SEND_MESSAGES', allowed: true }),
        Object.freeze({ permissionTargetId: 'role-admin-1', permissionKey: 'MANAGE_WEBHOOKS', allowed: false }),
      ]),
    }),
    ...overrides,
  });
}

function buildAuthorizedBotRegistry(
  overrides: Partial<SecurityAuthorizedBotRegistry> = {},
): SecurityAuthorizedBotRegistry {
  return Object.freeze({
    authorizedBotUserIds: Object.freeze(['bot-safe-1']),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityReconciliationRequest> = {},
): SecurityReconciliationRequest {
  return Object.freeze({
    correlationId: 'corr-reconcile-001',
    transactionId: 'txn-reconcile-001',
    guildId: 'guild-reconcile-001',
    runtimeId: 'runtime-reconcile-001',
    trigger: SecurityReconciliationTrigger.STARTUP,
    runtimeInitialized: true,
    currentRuntimeState: buildRuntimeState(),
    safeSnapshot: buildSnapshot(),
    authorizedBotRegistry: buildAuthorizedBotRegistry(),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

describe('SecurityReconciliationEngine', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityReconciliationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.currentRuntimeState)).toBe(true);
    expect(Object.isFrozen(request.safeSnapshot)).toBe(true);
    expect(Object.isFrozen(request.authorizedBotRegistry.authorizedBotUserIds)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic reconciliation IDs are stable for identical requests', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const first = await engine.execute(buildRequest());
    const second = await engine.execute(buildRequest());

    expect(first.reconciliationId).toBe(second.reconciliationId);
  });

  test('idempotent reconciliation returns replay report for repeated execution', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const first = await engine.execute(buildRequest());
    const second = await engine.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.reconciliationId).toBe(first.reconciliationId);
  });

  test('supports startup and reconnect reconciliation triggers', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const startup = await engine.execute(buildRequest({ trigger: SecurityReconciliationTrigger.STARTUP }));
    const reconnect = await engine.execute(
      buildRequest({
        trigger: SecurityReconciliationTrigger.RECONNECT,
        correlationId: 'corr-reconnect-001',
        transactionId: 'txn-reconnect-001',
      }),
    );

    expect(startup.trigger).toBe(SecurityReconciliationTrigger.STARTUP);
    expect(reconnect.trigger).toBe(SecurityReconciliationTrigger.RECONNECT);
    expect(startup.metadata.triggerRouting).toBe('FULL');
    expect(reconnect.metadata.triggerRouting).toBe('FULL');
  });

  test('detects snapshot mismatch and fails closed on inconsistent state', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(
      buildRequest({
        safeSnapshot: buildSnapshot({ guildId: 'guild-other-999' }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityReconciliationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('SNAPSHOT_GUILD_MISMATCH');
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(report.findings.some((finding) => finding.type === 'SNAPSHOT_MISMATCH')).toBe(true);
    expect(report.stagesCompleted).toEqual([
      SecurityReconciliationStage.SECURITY_INITIALIZATION,
      SecurityReconciliationStage.INVENTORY_EVALUATION,
      SecurityReconciliationStage.DRIFT_EVALUATION,
      SecurityReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('detects unauthorized bots introduced during downtime', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(buildRequest());

    const unauthorizedBotFinding = report.findings.find((finding) => finding.type === 'UNAUTHORIZED_BOT');
    expect(unauthorizedBotFinding).toBeDefined();
    expect(unauthorizedBotFinding?.targetId).toBe('bot-rogue-1');
  });

  test('detects webhook inventory drift', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(buildRequest());

    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_NEW')).toBe(true);
    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_HIGH_RISK')).toBe(true);
  });

  test('detects modified, deleted, and suspicious webhooks', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const runtimeState = buildRuntimeState({
      botInventory: Object.freeze([Object.freeze({ botUserId: 'bot-safe-1', displayName: 'Safe Bot' })]),
      webhookInventory: Object.freeze([
        Object.freeze({
          webhookId: 'webhook-safe-1',
          channelId: 'channel-modified-1',
          name: 'Safe Webhook Renamed',
          ownerBotUserId: undefined,
          privileged: false,
        }),
      ]),
    });
    const snapshot = buildSnapshot({
      inventory: Object.freeze({
        ...buildSnapshot().inventory,
        webhookInventory: Object.freeze([
          Object.freeze({
            webhookId: 'webhook-safe-1',
            channelId: 'channel-safe-1',
            name: 'Safe Webhook',
            ownerBotUserId: 'bot-safe-1',
            privileged: false,
          }),
          Object.freeze({
            webhookId: 'webhook-deleted-1',
            channelId: 'channel-deleted-1',
            name: 'Deleted Webhook',
            ownerBotUserId: 'bot-safe-1',
            privileged: false,
          }),
        ]),
      }),
    });

    const report = await engine.execute(
      buildRequest({
        currentRuntimeState: runtimeState,
        safeSnapshot: snapshot,
        authorizedBotRegistry: buildAuthorizedBotRegistry({
          authorizedBotUserIds: Object.freeze(['bot-safe-1']),
        }),
      }),
    );

    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_MODIFIED')).toBe(true);
    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_DELETED')).toBe(true);
    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_SUSPICIOUS')).toBe(true);
  });

  test('detects orphaned webhooks', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const runtimeState = buildRuntimeState({
      botInventory: Object.freeze([Object.freeze({ botUserId: 'bot-safe-1', displayName: 'Safe Bot' })]),
      webhookInventory: Object.freeze([
        Object.freeze({
          webhookId: 'webhook-orphan-1',
          channelId: 'channel-orphan-1',
          name: 'Orphan Webhook',
          ownerBotUserId: 'bot-missing-1',
          privileged: false,
        }),
      ]),
    });

    const report = await engine.execute(
      buildRequest({
        currentRuntimeState: runtimeState,
        safeSnapshot: buildSnapshot({
          inventory: Object.freeze({
            ...buildSnapshot().inventory,
            webhookInventory: Object.freeze([]),
          }),
        }),
      }),
    );

    expect(report.findings.some((finding) => finding.type === 'WEBHOOK_ORPHANED')).toBe(true);
  });

  test('detects privileged role and permission drift', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(buildRequest());

    expect(report.findings.some((finding) => finding.type === 'PRIVILEGED_ROLE_DRIFT')).toBe(true);
    expect(report.findings.some((finding) => finding.type === 'PERMISSION_DRIFT')).toBe(true);
  });

  test('stage ordering is deterministic for successful reconciliation', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const runtimeState = buildRuntimeState({
      botInventory: Object.freeze([Object.freeze({ botUserId: 'bot-safe-1', displayName: 'Safe Bot' })]),
      webhookInventory: Object.freeze([
        Object.freeze({
          webhookId: 'webhook-safe-1',
          channelId: 'channel-safe-1',
          name: 'Safe Webhook',
          ownerBotUserId: 'bot-safe-1',
          privileged: false,
        }),
      ]),
      roleInventory: Object.freeze([
        Object.freeze({ roleId: 'role-safe-1', name: 'Safe Role', privileged: false }),
        Object.freeze({ roleId: 'role-admin-1', name: 'Admin Role', privileged: false }),
      ]),
      permissionInventory: Object.freeze([
        Object.freeze({ permissionTargetId: 'role-safe-1', permissionKey: 'SEND_MESSAGES', allowed: true }),
        Object.freeze({ permissionTargetId: 'role-admin-1', permissionKey: 'MANAGE_WEBHOOKS', allowed: false }),
      ]),
    });

    const report = await engine.execute(
      buildRequest({
        currentRuntimeState: runtimeState,
        safeSnapshot: buildSnapshot({ inventory: runtimeState }),
        authorizedBotRegistry: buildAuthorizedBotRegistry({
          authorizedBotUserIds: Object.freeze(['bot-safe-1']),
        }),
      }),
    );

    expect(report.success).toBe(true);
    expect(report.reconciliationRequired).toBe(false);
    expect(report.findings).toEqual([]);
    expect(report.stagesCompleted).toEqual([
      SecurityReconciliationStage.SECURITY_INITIALIZATION,
      SecurityReconciliationStage.INVENTORY_EVALUATION,
      SecurityReconciliationStage.DRIFT_EVALUATION,
      SecurityReconciliationStage.RECONCILIATION_DECISION,
      SecurityReconciliationStage.VERIFICATION,
      SecurityReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('fail-closed validation stops before inventory evaluation on duplicate live webhook ids', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const duplicateWebhook = Object.freeze({
      webhookId: 'webhook-safe-1',
      channelId: 'channel-safe-1',
      name: 'Safe Webhook',
      ownerBotUserId: 'bot-safe-1',
      privileged: false,
    });

    const report = await engine.execute(
      buildRequest({
        currentRuntimeState: buildRuntimeState({
          webhookInventory: Object.freeze([duplicateWebhook, duplicateWebhook]),
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('DUPLICATE_LIVE_WEBHOOK_ID');
    expect(report.stagesCompleted).toEqual([SecurityReconciliationStage.REPORT_GENERATION]);
  });

  test('preserves correlation, transaction, runtime, and verification status', async () => {
    const engine = new InMemorySecurityReconciliationEngine();
    const report = await engine.execute(
      buildRequest({
        correlationId: 'corr-preserve-123',
        transactionId: 'txn-preserve-123',
        runtimeId: 'runtime-preserve-123',
        safeSnapshot: buildSnapshot({ runtimeId: 'runtime-preserve-123' }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-123');
    expect(report.transactionId).toBe('txn-preserve-123');
    expect(report.runtimeId).toBe('runtime-preserve-123');
    expect(report.verificationOutcome).toBe(SecurityReconciliationVerificationOutcome.VERIFIED);
  });

  test('source has no prohibited integration surfaces', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-reconciliation-engine.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/axios|httpClient|X-Audit-Log-Reason|discord\.com\/api/i);
    expect(source).not.toMatch(/removeDangerousWebhook|deleteWebhook|removeUnauthorizedBot|banMember|kickMember/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/command|slash\s*command|dashboard|react/i);
  });

  test('permission inventory fixtures remain immutable', () => {
    const permission = Object.freeze<SecurityPermissionInventoryEntry>({
      permissionTargetId: 'role-safe-1',
      permissionKey: 'SEND_MESSAGES',
      allowed: true,
    });

    expect(Object.isFrozen(permission)).toBe(true);
  });
});
