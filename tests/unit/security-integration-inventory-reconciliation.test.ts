import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  freezeSecurityIntegrationInventoryReconciliationRequest,
  InMemorySecurityIntegrationInventoryReconciler,
  SecurityAuthorizedIntegrationRegistryState,
  SecurityIntegrationIdentity,
  SecurityIntegrationInventoryReconciliationRequest,
  SecurityIntegrationInventoryReconciliationStage,
  SecurityIntegrationInventoryReconciliationVerificationOutcome,
  SecurityIntegrationInventorySnapshot,
} from '../../src/core/runtime/security/security-integration-inventory-reconciliation';
import { SecurityReconciliationFinding, SecurityReconciliationFindingType } from '../../src/core/runtime/security/security-reconciliation-engine';

function buildIntegration(
  integrationId: string,
  overrides: Partial<SecurityIntegrationIdentity> = {},
): SecurityIntegrationIdentity {
  return Object.freeze({
    integrationId,
    applicationId: `app-${integrationId}`,
    name: `Integration ${integrationId}`,
    enabled: true,
    ownerBotUserId: `bot-${integrationId}`,
    privileged: false,
    suspicious: false,
    highRisk: false,
    ownedWebhookIds: Object.freeze([]),
    permissions: Object.freeze(['SEND_MESSAGES']),
    ...overrides,
  });
}

function buildSnapshot(
  snapshotId: string,
  entries: readonly SecurityIntegrationIdentity[],
  overrides: Partial<SecurityIntegrationInventorySnapshot> = {},
): SecurityIntegrationInventorySnapshot {
  return Object.freeze({
    snapshotId,
    snapshotVersion: 1,
    guildId: 'guild-int-reconcile-1',
    runtimeId: 'runtime-int-reconcile-1',
    integrationInventory: Object.freeze([...entries]),
    ...overrides,
  });
}

function buildRegistry(
  overrides: Partial<SecurityAuthorizedIntegrationRegistryState> = {},
): SecurityAuthorizedIntegrationRegistryState {
  return Object.freeze({
    registryId: 'registry-int-1',
    registryVersion: 7,
    records: Object.freeze([
      Object.freeze({
        integrationId: 'int-safe-1',
        applicationId: 'app-int-safe-1',
        expectedEnabled: true,
        ownerBotUserId: 'bot-int-safe-1',
        privileged: false,
        required: true,
        ownedWebhookIds: Object.freeze([]),
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
      Object.freeze({
        integrationId: 'int-safe-2',
        applicationId: 'app-int-safe-2',
        expectedEnabled: true,
        ownerBotUserId: 'bot-int-safe-2',
        privileged: false,
        required: true,
        ownedWebhookIds: Object.freeze([]),
        permissions: Object.freeze(['SEND_MESSAGES']),
      }),
    ]),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityIntegrationInventoryReconciliationRequest> = {},
): SecurityIntegrationInventoryReconciliationRequest {
  const baseline = Object.freeze([
    buildIntegration('int-safe-1', {
      applicationId: 'app-int-safe-1',
      ownerBotUserId: 'bot-int-safe-1',
    }),
    buildIntegration('int-safe-2', {
      applicationId: 'app-int-safe-2',
      ownerBotUserId: 'bot-int-safe-2',
    }),
  ]);

  return Object.freeze({
    correlationId: 'corr-int-reconcile-1',
    transactionId: 'txn-int-reconcile-1',
    guildId: 'guild-int-reconcile-1',
    runtimeId: 'runtime-int-reconcile-1',
    authorizedIntegrationRegistry: buildRegistry(),
    currentGuildIntegrationInventory: baseline,
    runtimeSnapshot: buildSnapshot('runtime-int-snapshot-1', baseline),
    recoverySnapshot: buildSnapshot('recovery-int-snapshot-1', baseline),
    startupInventory: buildSnapshot('startup-int-snapshot-1', baseline),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

function hasCategory(
  findings: readonly SecurityReconciliationFinding[],
  category: string,
): boolean {
  return findings.some((finding) => (finding.metadata as { category?: string } | undefined)?.category === category);
}

describe('SecurityIntegrationInventoryReconciliation', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityIntegrationInventoryReconciliationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.authorizedIntegrationRegistry)).toBe(true);
    expect(Object.isFrozen(request.currentGuildIntegrationInventory)).toBe(true);
    expect(Object.isFrozen(request.runtimeSnapshot)).toBe(true);
    expect(Object.isFrozen(request.recoverySnapshot)).toBe(true);
    expect(Object.isFrozen(request.startupInventory)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
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
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.reconciliationId).toBe(second.reconciliationId);
  });

  test('idempotent execution returns replay report for repeated requests', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.reconciliationId).toBe(first.reconciliationId);
  });

  test('detects unknown integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          ...buildRequest().currentGuildIntegrationInventory,
          buildIntegration('int-unknown-1', {
            applicationId: 'app-int-unknown-1',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'UNKNOWN_INTEGRATION')).toBe(true);
  });

  test('detects missing authorized integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'MISSING_AUTHORIZED_INTEGRATION')).toBe(true);
  });

  test('detects newly added integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedIntegrationRegistry: buildRegistry({
          records: Object.freeze([
            ...buildRegistry().records,
            Object.freeze({
              integrationId: 'int-new-1',
              applicationId: 'app-int-new-1',
              expectedEnabled: true,
              ownerBotUserId: 'bot-int-new-1',
              privileged: false,
              required: false,
              ownedWebhookIds: Object.freeze([]),
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildIntegrationInventory: Object.freeze([
          ...buildRequest().currentGuildIntegrationInventory,
          buildIntegration('int-new-1', {
            applicationId: 'app-int-new-1',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'NEWLY_ADDED_INTEGRATION')).toBe(true);
  });

  test('detects modified integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            enabled: false,
          }),
          buildIntegration('int-safe-2', {
            applicationId: 'app-int-safe-2',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'MODIFIED_INTEGRATION')).toBe(true);
  });

  test('detects deleted integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([]),
      }),
    );

    expect(hasCategory(report.findings, 'DELETED_INTEGRATION')).toBe(true);
  });

  test('detects orphaned integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedIntegrationRegistry: buildRegistry({
          records: Object.freeze([
            Object.freeze({
              integrationId: 'int-orphan-1',
              applicationId: 'app-int-orphan-1',
              expectedEnabled: true,
              ownerBotUserId: 'bot-int-orphan-1',
              privileged: false,
              required: true,
              ownedWebhookIds: Object.freeze([]),
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildIntegrationInventory: Object.freeze([]),
        runtimeSnapshot: buildSnapshot('runtime-int-orphan-1', Object.freeze([])),
        recoverySnapshot: buildSnapshot('recovery-int-orphan-1', Object.freeze([])),
        startupInventory: buildSnapshot('startup-int-orphan-1', Object.freeze([])),
      }),
    );

    expect(hasCategory(report.findings, 'ORPHANED_INTEGRATION')).toBe(true);
  });

  test('detects suspicious and high-risk integration', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            suspicious: true,
          }),
          buildIntegration('int-safe-2', {
            applicationId: 'app-int-safe-2',
            highRisk: true,
            privileged: true,
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'SUSPICIOUS_INTEGRATION')).toBe(true);
    expect(hasCategory(report.findings, 'HIGH_RISK_INTEGRATION')).toBe(true);
  });

  test('detects registry mismatch', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedIntegrationRegistry: buildRegistry({
          records: Object.freeze([
            Object.freeze({
              integrationId: 'int-safe-1',
              applicationId: 'app-registry-drift',
              expectedEnabled: false,
              ownerBotUserId: 'bot-int-safe-1',
              privileged: false,
              required: true,
              ownedWebhookIds: Object.freeze([]),
              permissions: Object.freeze(['SEND_MESSAGES']),
            }),
          ]),
        }),
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            enabled: true,
          }),
        ]),
        runtimeSnapshot: buildSnapshot('runtime-int-registry-1', Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            enabled: true,
          }),
        ])),
        recoverySnapshot: buildSnapshot('recovery-int-registry-1', Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            enabled: true,
          }),
        ])),
        startupInventory: buildSnapshot('startup-int-registry-1', Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            enabled: true,
          }),
        ])),
      }),
    );

    expect(hasCategory(report.findings, 'REGISTRY_MISMATCH')).toBe(true);
  });

  test('detects snapshot inconsistency', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-int-drift-1', Object.freeze([
          buildIntegration('int-safe-1', { applicationId: 'app-a' }),
        ])),
        recoverySnapshot: buildSnapshot('recovery-int-drift-1', Object.freeze([
          buildIntegration('int-safe-1', { applicationId: 'app-b' }),
        ])),
        startupInventory: buildSnapshot('startup-int-drift-1', Object.freeze([
          buildIntegration('int-safe-1', { applicationId: 'app-a' }),
        ])),
      }),
    );

    expect(hasCategory(report.findings, 'SNAPSHOT_INCONSISTENCY')).toBe(true);
  });

  test('detects permission-sensitive drift', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_GUILD']),
          }),
          buildIntegration('int-safe-2', {
            applicationId: 'app-int-safe-2',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'PERMISSION_SENSITIVE_INTEGRATION_DRIFT')).toBe(true);
  });

  test('detects integration-owned webhook risk', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            highRisk: true,
            ownedWebhookIds: Object.freeze(['wh-1']),
          }),
          buildIntegration('int-safe-2', {
            applicationId: 'app-int-safe-2',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'INTEGRATION_OWNED_WEBHOOK_RISK')).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK)).toBe(true);
  });

  test('detects integration-owned bot risk', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-safe-1', {
            applicationId: 'app-int-safe-1',
            privileged: true,
            ownerBotUserId: 'bot-risk-1',
          }),
          buildIntegration('int-safe-2', {
            applicationId: 'app-int-safe-2',
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'INTEGRATION_OWNED_BOT_RISK')).toBe(true);
    expect(report.findings.some((finding) => finding.type === SecurityReconciliationFindingType.UNAUTHORIZED_BOT)).toBe(true);
  });

  test('stage ordering is deterministic for successful reconciliation', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityIntegrationInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityIntegrationInventoryReconciliationStage.SOURCE_EVALUATION,
      SecurityIntegrationInventoryReconciliationStage.DRIFT_DETECTION,
      SecurityIntegrationInventoryReconciliationStage.VERIFICATION,
      SecurityIntegrationInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('fail-closed validation rejects inconsistent snapshot identity', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-int-bad-1', Object.freeze([]), {
          guildId: 'guild-mismatch-1',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityIntegrationInventoryReconciliationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(report.failureReason).toContain('SNAPSHOT_GUILD_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      SecurityIntegrationInventoryReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityIntegrationInventoryReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('preserves correlation transaction runtime guild identifiers in findings', async () => {
    const reconciler = new InMemorySecurityIntegrationInventoryReconciler();
    const report = await reconciler.execute(
      buildRequest({
        correlationId: 'corr-preserve-int-1',
        transactionId: 'txn-preserve-int-1',
        runtimeId: 'runtime-preserve-int-1',
        guildId: 'guild-preserve-int-1',
        currentGuildIntegrationInventory: Object.freeze([
          buildIntegration('int-unknown-preserve-1', {
            applicationId: 'app-int-unknown-preserve-1',
          }),
        ]),
        runtimeSnapshot: buildSnapshot('runtime-int-preserve-1', Object.freeze([]), {
          guildId: 'guild-preserve-int-1',
          runtimeId: 'runtime-preserve-int-1',
        }),
        recoverySnapshot: buildSnapshot('recovery-int-preserve-1', Object.freeze([]), {
          guildId: 'guild-preserve-int-1',
          runtimeId: 'runtime-preserve-int-1',
        }),
        startupInventory: buildSnapshot('startup-int-preserve-1', Object.freeze([]), {
          guildId: 'guild-preserve-int-1',
          runtimeId: 'runtime-preserve-int-1',
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-int-1');
    expect(report.transactionId).toBe('txn-preserve-int-1');
    expect(report.runtimeId).toBe('runtime-preserve-int-1');
    expect(report.guildId).toBe('guild-preserve-int-1');
    expect(report.findings.every((finding) => finding.correlationId === 'corr-preserve-int-1')).toBe(true);
    expect(report.findings.every((finding) => finding.runtimeId === 'runtime-preserve-int-1')).toBe(true);
    expect(report.findings.every((finding) => finding.guildId === 'guild-preserve-int-1')).toBe(true);
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-integration-inventory-reconciliation.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/\bremoveIntegration\b|\bremoveBot\b|\bdeleteWebhook\b|\bfreezeWebhook\b/i);
    expect(source).not.toMatch(/\bcontainment\b|\bexecuteContainment\b|\bdispatchExecution\b|\bexecutionEngine\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
