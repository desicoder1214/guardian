import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  freezeSecurityWebhookInventoryReconciliationRequest,
  InMemorySecurityWebhookInventoryReconciler,
  SecurityAuthorizedWebhookRegistryState,
  SecurityWebhookIdentity,
  SecurityWebhookInventoryReconciliationRequest,
  SecurityWebhookInventoryReconciliationStage,
  SecurityWebhookInventoryReconciliationVerificationOutcome,
  SecurityWebhookInventorySnapshot,
} from '../../src/core/runtime/security/security-webhook-inventory-reconciliation';
import { SecurityReconciliationFindingType } from '../../src/core/runtime/security/security-reconciliation-engine';

function buildWebhook(
  webhookId: string,
  overrides: Partial<SecurityWebhookIdentity> = {},
): SecurityWebhookIdentity {
  return Object.freeze({
    webhookId,
    channelId: 'channel-safe-1',
    name: `Webhook ${webhookId}`,
    ownerBotUserId: 'bot-owner-1',
    privileged: false,
    suspicious: false,
    highRisk: false,
    permissions: Object.freeze(['SEND_MESSAGES']),
    ...overrides,
  });
}

function buildSnapshot(
  snapshotId: string,
  entries: readonly SecurityWebhookIdentity[],
  overrides: Partial<SecurityWebhookInventorySnapshot> = {},
): SecurityWebhookInventorySnapshot {
  return Object.freeze({
    snapshotId,
    snapshotVersion: 1,
    guildId: 'guild-webhook-reconcile-1',
    runtimeId: 'runtime-webhook-reconcile-1',
    webhookInventory: Object.freeze([...entries]),
    ...overrides,
  });
}

function buildRegistry(
  overrides: Partial<SecurityAuthorizedWebhookRegistryState> = {},
): SecurityAuthorizedWebhookRegistryState {
  return Object.freeze({
    registryId: 'registry-webhook-1',
    registryVersion: 4,
    records: Object.freeze([
      Object.freeze({
        webhookId: 'wh-safe-1',
        channelId: 'channel-safe-1',
        ownerBotUserId: 'bot-owner-1',
        privileged: false,
        required: true,
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
      Object.freeze({
        webhookId: 'wh-safe-2',
        channelId: 'channel-safe-2',
        ownerBotUserId: 'bot-owner-2',
        privileged: false,
        required: true,
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
    ]),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityWebhookInventoryReconciliationRequest> = {},
): SecurityWebhookInventoryReconciliationRequest {
  const baseline = Object.freeze([
    buildWebhook('wh-safe-1', {
      channelId: 'channel-safe-1',
      ownerBotUserId: 'bot-owner-1',
      permissions: Object.freeze(['SEND_MESSAGES']),
    }),
    buildWebhook('wh-safe-2', {
      channelId: 'channel-safe-2',
      ownerBotUserId: 'bot-owner-2',
      permissions: Object.freeze(['SEND_MESSAGES']),
    }),
  ]);

  return Object.freeze({
    correlationId: 'corr-webhook-reconcile-1',
    transactionId: 'txn-webhook-reconcile-1',
    guildId: 'guild-webhook-reconcile-1',
    runtimeId: 'runtime-webhook-reconcile-1',
    authorizedWebhookRegistry: buildRegistry(),
    currentGuildWebhookInventory: baseline,
    runtimeSnapshot: buildSnapshot('runtime-webhook-snapshot-1', baseline),
    recoverySnapshot: buildSnapshot('recovery-webhook-snapshot-1', baseline),
    startupInventory: buildSnapshot('startup-webhook-snapshot-1', baseline),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

describe('SecurityWebhookInventoryReconciliation', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityWebhookInventoryReconciliationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.authorizedWebhookRegistry)).toBe(true);
    expect(Object.isFrozen(request.currentGuildWebhookInventory)).toBe(true);
    expect(Object.isFrozen(request.runtimeSnapshot)).toBe(true);
    expect(Object.isFrozen(request.recoverySnapshot)).toBe(true);
    expect(Object.isFrozen(request.startupInventory)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
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
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.reconciliationId).toBe(second.reconciliationId);
  });

  test('idempotent execution returns replay report for repeated requests', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.reconciliationId).toBe(first.reconciliationId);
  });

  test('fails closed on invalid snapshot identity mismatch', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-webhook-snapshot-bad', Object.freeze([]), {
          guildId: 'guild-mismatch-1',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityWebhookInventoryReconciliationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(report.failureReason).toContain('SNAPSHOT_GUILD_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      SecurityWebhookInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityWebhookInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('detects unknown webhook as suspicious', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          ...buildRequest().currentGuildWebhookInventory,
          buildWebhook('wh-unknown-1', {
            channelId: 'channel-rogue-1',
          }),
        ]),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS &&
          finding.targetId === 'wh-unknown-1',
      ),
    ).toBe(true);
  });

  test('detects missing authorized webhook', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-safe-1', { channelId: 'channel-safe-1' }),
        ]),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === SecurityReconciliationFindingType.WEBHOOK_DELETED &&
          finding.targetId === 'wh-safe-2',
      ),
    ).toBe(true);
  });

  test('detects newly created webhook', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          ...buildRequest().currentGuildWebhookInventory,
          buildWebhook('wh-new-1', {
            channelId: 'channel-new-1',
          }),
        ]),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === SecurityReconciliationFindingType.WEBHOOK_NEW &&
          finding.targetId === 'wh-new-1',
      ),
    ).toBe(true);
  });

  test('detects modified webhook', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-safe-1', {
            channelId: 'channel-modified-1',
          }),
          buildWebhook('wh-safe-2', {
            channelId: 'channel-safe-2',
          }),
        ]),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === SecurityReconciliationFindingType.WEBHOOK_MODIFIED &&
          finding.targetId === 'wh-safe-1',
      ),
    ).toBe(true);
  });

  test('detects deleted webhook from baselines', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([]),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.WEBHOOK_DELETED)).toBe(true);
  });

  test('detects orphaned required webhook', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedWebhookRegistry: buildRegistry({
          records: Object.freeze([
            Object.freeze({
              webhookId: 'wh-orphan-1',
              channelId: 'channel-orphan-1',
              ownerBotUserId: 'bot-orphan-1',
              privileged: false,
              required: true,
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildWebhookInventory: Object.freeze([]),
        runtimeSnapshot: buildSnapshot('runtime-webhook-snapshot-orphan', Object.freeze([])),
        recoverySnapshot: buildSnapshot('recovery-webhook-snapshot-orphan', Object.freeze([])),
        startupInventory: buildSnapshot('startup-webhook-snapshot-orphan', Object.freeze([])),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === SecurityReconciliationFindingType.WEBHOOK_ORPHANED &&
          finding.targetId === 'wh-orphan-1',
      ),
    ).toBe(true);
  });

  test('detects suspicious and high-risk webhooks', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-safe-1', {
            suspicious: true,
          }),
          buildWebhook('wh-safe-2', {
            highRisk: true,
            privileged: true,
          }),
        ]),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.WEBHOOK_SUSPICIOUS)).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK)).toBe(true);
  });

  test('detects registry mismatch', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedWebhookRegistry: buildRegistry({
          records: Object.freeze([
            Object.freeze({
              webhookId: 'wh-safe-1',
              channelId: 'channel-registry-drift',
              ownerBotUserId: 'bot-owner-1',
              privileged: true,
              required: true,
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-safe-1', {
            channelId: 'channel-safe-1',
            privileged: false,
          }),
        ]),
        runtimeSnapshot: buildSnapshot('runtime-webhook-snapshot-registry', Object.freeze([
          buildWebhook('wh-safe-1', {
            channelId: 'channel-safe-1',
            privileged: false,
          }),
        ])),
        recoverySnapshot: buildSnapshot('recovery-webhook-snapshot-registry', Object.freeze([
          buildWebhook('wh-safe-1', {
            channelId: 'channel-safe-1',
            privileged: false,
          }),
        ])),
        startupInventory: buildSnapshot('startup-webhook-snapshot-registry', Object.freeze([
          buildWebhook('wh-safe-1', {
            channelId: 'channel-safe-1',
            privileged: false,
          }),
        ])),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.REGISTRY_MISMATCH)).toBe(true);
  });

  test('detects snapshot inconsistency', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-webhook-snapshot-drift', Object.freeze([
          buildWebhook('wh-safe-1', { channelId: 'channel-a' }),
        ])),
        recoverySnapshot: buildSnapshot('recovery-webhook-snapshot-drift', Object.freeze([
          buildWebhook('wh-safe-1', { channelId: 'channel-b' }),
        ])),
        startupInventory: buildSnapshot('startup-webhook-snapshot-drift', Object.freeze([
          buildWebhook('wh-safe-1', { channelId: 'channel-a' }),
        ])),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.SNAPSHOT_INCONSISTENCY)).toBe(true);
  });

  test('detects permission-sensitive webhook drift', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-safe-1', {
            permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_WEBHOOKS']),
          }),
          buildWebhook('wh-safe-2', {
            permissions: Object.freeze(['SEND_MESSAGES']),
          }),
        ]),
      }),
    );

    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.PERMISSION_DRIFT)).toBe(true);
  });

  test('stage ordering is deterministic for successful reconciliation', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityWebhookInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityWebhookInventoryReconciliationStage.SOURCE_EVALUATION,
      SecurityWebhookInventoryReconciliationStage.DRIFT_DETECTION,
      SecurityWebhookInventoryReconciliationStage.VERIFICATION,
      SecurityWebhookInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('preserves correlation transaction runtime guild identifiers in every finding', async () => {
    const reconciler = new InMemorySecurityWebhookInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        correlationId: 'corr-preserve-webhook-1',
        transactionId: 'txn-preserve-webhook-1',
        runtimeId: 'runtime-preserve-webhook-1',
        guildId: 'guild-preserve-webhook-1',
        currentGuildWebhookInventory: Object.freeze([
          buildWebhook('wh-preserve-unknown-1', { channelId: 'channel-preserve-1' }),
        ]),
        runtimeSnapshot: buildSnapshot('runtime-webhook-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-webhook-1',
          guildId: 'guild-preserve-webhook-1',
        }),
        recoverySnapshot: buildSnapshot('recovery-webhook-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-webhook-1',
          guildId: 'guild-preserve-webhook-1',
        }),
        startupInventory: buildSnapshot('startup-webhook-preserve-1', Object.freeze([]), {
          runtimeId: 'runtime-preserve-webhook-1',
          guildId: 'guild-preserve-webhook-1',
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-webhook-1');
    expect(report.transactionId).toBe('txn-preserve-webhook-1');
    expect(report.runtimeId).toBe('runtime-preserve-webhook-1');
    expect(report.guildId).toBe('guild-preserve-webhook-1');
    expect(report.findings.every((finding) => finding.correlationId === 'corr-preserve-webhook-1')).toBe(true);
    expect(report.findings.every((finding) => finding.runtimeId === 'runtime-preserve-webhook-1')).toBe(true);
    expect(report.findings.every((finding) => finding.guildId === 'guild-preserve-webhook-1')).toBe(true);
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-webhook-inventory-reconciliation.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|REST|HTTP/i);
    expect(source).not.toMatch(/\bdeleteWebhook\b|\bfreezeWebhook\b|\bremoveWebhook\b|\bcontainment\b|\bexecuteContainment\b|\bdispatchExecution\b|\bexecutionEngine\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
