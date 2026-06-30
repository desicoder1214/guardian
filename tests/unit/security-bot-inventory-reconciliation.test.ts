import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  InMemorySecurityBotInventoryReconciler,
  SecurityAuthorizedBotRegistryState,
  SecurityBotIdentity,
  SecurityBotInventoryReconciliationRequest,
  SecurityBotInventoryReconciliationStage,
  SecurityBotInventoryReconciliationVerificationOutcome,
  SecurityBotInventorySnapshot,
  freezeSecurityBotInventoryReconciliationRequest,
} from '../../src/core/runtime/security/security-bot-inventory-reconciliation';
import { SecurityReconciliationFindingType } from '../../src/core/runtime/security/security-reconciliation-engine';

function buildBot(
  botUserId: string,
  overrides: Partial<SecurityBotIdentity> = {},
): SecurityBotIdentity {
  return Object.freeze({
    botUserId,
    displayName: `Bot ${botUserId}`,
    trusted: true,
    privileged: false,
    permissions: Object.freeze(['SEND_MESSAGES']),
    ...overrides,
  });
}

function buildSnapshot(
  snapshotId: string,
  bots: readonly SecurityBotIdentity[],
  overrides: Partial<SecurityBotInventorySnapshot> = {},
): SecurityBotInventorySnapshot {
  return Object.freeze({
    snapshotId,
    snapshotVersion: 1,
    guildId: 'guild-bot-reconcile-1',
    runtimeId: 'runtime-bot-reconcile-1',
    botInventory: Object.freeze([...bots]),
    ...overrides,
  });
}

function buildRegistry(
  overrides: Partial<SecurityAuthorizedBotRegistryState> = {},
): SecurityAuthorizedBotRegistryState {
  return Object.freeze({
    registryId: 'registry-bot-1',
    registryVersion: 3,
    records: Object.freeze([
      Object.freeze({
        botUserId: 'bot-safe-1',
        trusted: true,
        privileged: false,
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
      Object.freeze({
        botUserId: 'bot-safe-2',
        trusted: true,
        privileged: false,
        permissions: Object.freeze(['SEND_MESSAGES', 'EMBED_LINKS']),
      }),
      Object.freeze({
        botUserId: 'bot-orphan-1',
        trusted: true,
        privileged: false,
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
    ]),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityBotInventoryReconciliationRequest> = {},
): SecurityBotInventoryReconciliationRequest {
  const runtimeBots = Object.freeze([
    buildBot('bot-safe-1', { trusted: true, privileged: false, permissions: Object.freeze(['SEND_MESSAGES']) }),
    buildBot('bot-safe-2', {
      trusted: true,
      privileged: false,
      permissions: Object.freeze(['SEND_MESSAGES', 'EMBED_LINKS']),
    }),
    buildBot('bot-rogue-1', {
      trusted: false,
      privileged: true,
      permissions: Object.freeze(['ADMINISTRATOR']),
    }),
  ]);

  return Object.freeze({
    correlationId: 'corr-bot-reconcile-1',
    transactionId: 'txn-bot-reconcile-1',
    guildId: 'guild-bot-reconcile-1',
    runtimeId: 'runtime-bot-reconcile-1',
    authorizedBotRegistry: buildRegistry(),
    currentGuildBotInventory: runtimeBots,
    runtimeSnapshot: buildSnapshot('runtime-snapshot-1',
      Object.freeze([
        buildBot('bot-safe-1'),
        buildBot('bot-safe-2', {
          permissions: Object.freeze(['SEND_MESSAGES', 'EMBED_LINKS']),
        }),
      ]),
    ),
    recoverySnapshot: buildSnapshot('recovery-snapshot-1',
      Object.freeze([
        buildBot('bot-safe-1'),
        buildBot('bot-safe-2', {
          permissions: Object.freeze(['SEND_MESSAGES', 'EMBED_LINKS']),
        }),
      ]),
    ),
    startupInventory: buildSnapshot('startup-snapshot-1',
      Object.freeze([
        buildBot('bot-safe-1'),
        buildBot('bot-safe-2', {
          permissions: Object.freeze(['SEND_MESSAGES', 'EMBED_LINKS']),
        }),
      ]),
    ),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

describe('SecurityBotInventoryReconciliation', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityBotInventoryReconciliationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.authorizedBotRegistry)).toBe(true);
    expect(Object.isFrozen(request.currentGuildBotInventory)).toBe(true);
    expect(Object.isFrozen(request.runtimeSnapshot)).toBe(true);
    expect(Object.isFrozen(request.recoverySnapshot)).toBe(true);
    expect(Object.isFrozen(request.startupInventory)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic reconciliation ids are stable for identical requests', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.reconciliationId).toBe(second.reconciliationId);
  });

  test('idempotent execution returns replay report for repeated requests', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.reconciliationId).toBe(first.reconciliationId);
  });

  test('fails closed on invalid snapshot identity mismatch', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-snapshot-bad', Object.freeze([]), {
          guildId: 'guild-mismatch-1',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityBotInventoryReconciliationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(report.failureReason).toContain('SNAPSHOT_GUILD_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      SecurityBotInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityBotInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('produces deterministic bot reconciliation findings only', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(report.success).toBe(true);
    expect(report.reconciliationRequired).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.UNAUTHORIZED_BOT)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.MISSING_AUTHORIZED_BOT)).toBe(true);
    expect(report.findings.every((finding) => finding.correlationId === 'corr-bot-reconcile-1')).toBe(true);
  });

  test('detects duplicate bot identities', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const duplicateBot = buildBot('bot-safe-1');
    const report = await reconciler.execute(
      buildRequest({
        currentGuildBotInventory: Object.freeze([
          duplicateBot,
          duplicateBot,
        ]),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.DUPLICATE_BOT_IDENTITY)).toBe(true);
  });

  test('detects privilege escalation and permission drift', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildBotInventory: Object.freeze([
          buildBot('bot-safe-1', {
            privileged: true,
            permissions: Object.freeze(['ADMINISTRATOR']),
          }),
        ]),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.PRIVILEGE_ESCALATION)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.PERMISSION_DRIFT)).toBe(true);
  });

  test('detects registry mismatch and orphaned trusted bot', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedBotRegistry: buildRegistry({
          records: Object.freeze([
            Object.freeze({
              botUserId: 'bot-safe-1',
              trusted: false,
              privileged: false,
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
            Object.freeze({
              botUserId: 'bot-orphan-1',
              trusted: true,
              privileged: false,
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildBotInventory: Object.freeze([buildBot('bot-safe-1')]),
        runtimeSnapshot: buildSnapshot('runtime-snapshot-2', Object.freeze([buildBot('bot-safe-1', { trusted: true })])),
        recoverySnapshot: buildSnapshot('recovery-snapshot-2', Object.freeze([buildBot('bot-safe-1', { trusted: true })])),
        startupInventory: buildSnapshot('startup-snapshot-2', Object.freeze([buildBot('bot-safe-1', { trusted: true })])),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.REGISTRY_MISMATCH)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.ORPHANED_TRUSTED_BOT)).toBe(true);
  });

  test('detects snapshot inconsistency across runtime recovery startup', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot(
          'runtime-snapshot-3',
          Object.freeze([buildBot('bot-safe-1', { permissions: Object.freeze(['SEND_MESSAGES']) })]),
        ),
        recoverySnapshot: buildSnapshot(
          'recovery-snapshot-3',
          Object.freeze([buildBot('bot-safe-1', { permissions: Object.freeze(['MANAGE_WEBHOOKS']) })]),
        ),
        startupInventory: buildSnapshot(
          'startup-snapshot-3',
          Object.freeze([buildBot('bot-safe-1', { permissions: Object.freeze(['SEND_MESSAGES']) })]),
        ),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY)).toBe(true);
  });

  test('stage ordering is deterministic for successful reconciliation', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityBotInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityBotInventoryReconciliationStage.SOURCE_EVALUATION,
      SecurityBotInventoryReconciliationStage.DRIFT_DETECTION,
      SecurityBotInventoryReconciliationStage.VERIFICATION,
      SecurityBotInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('preserves correlation transaction runtime guild identifiers in every finding', async () => {
    const reconciler = new InMemorySecurityBotInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        correlationId: 'corr-preserve-bot-1',
        transactionId: 'txn-preserve-bot-1',
        runtimeId: 'runtime-preserve-bot-1',
        guildId: 'guild-preserve-bot-1',
        runtimeSnapshot: buildSnapshot('runtime-snapshot-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-bot-1',
          guildId: 'guild-preserve-bot-1',
        }),
        recoverySnapshot: buildSnapshot('recovery-snapshot-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-bot-1',
          guildId: 'guild-preserve-bot-1',
        }),
        startupInventory: buildSnapshot('startup-snapshot-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-bot-1',
          guildId: 'guild-preserve-bot-1',
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-bot-1');
    expect(report.transactionId).toBe('txn-preserve-bot-1');
    expect(report.runtimeId).toBe('runtime-preserve-bot-1');
    expect(report.guildId).toBe('guild-preserve-bot-1');
    expect(report.findings.every((finding) => finding.correlationId === 'corr-preserve-bot-1')).toBe(true);
    expect(report.findings.every((finding) => finding.runtimeId === 'runtime-preserve-bot-1')).toBe(true);
    expect(report.findings.every((finding) => finding.guildId === 'guild-preserve-bot-1')).toBe(true);
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-bot-inventory-reconciliation.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|REST/i);
    expect(source).not.toMatch(/removeBot|removeUnauthorizedBot|banMember|kickMember|deleteWebhook/i);
    expect(source).not.toMatch(/containment|executeContainment|dispatchExecution|executionEngine/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
