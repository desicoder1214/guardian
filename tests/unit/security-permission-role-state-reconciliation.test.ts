import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  freezeSecurityPermissionRoleStateReconciliationRequest,
  InMemorySecurityPermissionRoleStateReconciler,
  SecurityDangerousPermissionPolicy,
  SecurityPermissionRoleStateReconciliationRequest,
  SecurityPermissionRoleStateReconciliationStage,
  SecurityPermissionRoleStateReconciliationVerificationOutcome,
  SecurityPermissionRoleStateSnapshot,
  SecurityRoleRegistryState,
  SecurityRoleStateIdentity,
  SecurityChannelPermissionOverwriteIdentity,
} from '../../src/core/runtime/security/security-permission-role-state-reconciliation';
import { SecurityReconciliationFinding } from '../../src/core/runtime/security/security-reconciliation-engine';

function buildRole(roleId: string, overrides: Partial<SecurityRoleStateIdentity> = {}): SecurityRoleStateIdentity {
  return Object.freeze({
    roleId,
    name: `Role ${roleId}`,
    position: 10,
    privileged: false,
    permissions: Object.freeze(['SEND_MESSAGES']),
    ...overrides,
  });
}

function buildOverwrite(
  overwriteId: string,
  overrides: Partial<SecurityChannelPermissionOverwriteIdentity> = {},
): SecurityChannelPermissionOverwriteIdentity {
  return Object.freeze({
    channelId: 'channel-1',
    overwriteId,
    targetId: 'role-safe-1',
    targetType: 'ROLE' as const,
    allow: Object.freeze(['VIEW_CHANNEL']),
    deny: Object.freeze(['MANAGE_CHANNELS']),
    ...overrides,
  });
}

function buildSnapshot(
  snapshotId: string,
  roles: readonly SecurityRoleStateIdentity[],
  overwrites: readonly SecurityChannelPermissionOverwriteIdentity[],
  overrides: Partial<SecurityPermissionRoleStateSnapshot> = {},
): SecurityPermissionRoleStateSnapshot {
  return Object.freeze({
    snapshotId,
    snapshotVersion: 1,
    guildId: 'guild-role-reconcile-1',
    runtimeId: 'runtime-role-reconcile-1',
    roleInventory: Object.freeze([...roles]),
    channelPermissionOverwriteInventory: Object.freeze([...overwrites]),
    ...overrides,
  });
}

function buildRoleRegistry(overrides: Partial<SecurityRoleRegistryState> = {}): SecurityRoleRegistryState {
  return Object.freeze({
    registryId: 'registry-role-1',
    registryVersion: 3,
    records: Object.freeze([
      Object.freeze({
        roleId: 'role-safe-1',
        expectedName: 'Role role-safe-1',
        expectedPosition: 10,
        expectedPermissions: Object.freeze(['SEND_MESSAGES']),
        required: true,
        protected: false,
      }),
      Object.freeze({
        roleId: 'role-protected-1',
        expectedName: 'Role role-protected-1',
        expectedPosition: 50,
        expectedPermissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_CHANNELS']),
        required: true,
        protected: true,
      }),
    ]),
    ...overrides,
  });
}

function buildDangerousPolicy(
  overrides: Partial<SecurityDangerousPermissionPolicy> = {},
): SecurityDangerousPermissionPolicy {
  return Object.freeze({
    dangerousPermissions: Object.freeze([
      'ADMINISTRATOR',
      'MANAGE_ROLES',
      'MANAGE_WEBHOOKS',
      'MANAGE_CHANNELS',
    ]),
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityPermissionRoleStateReconciliationRequest> = {},
): SecurityPermissionRoleStateReconciliationRequest {
  const roles = Object.freeze([
    buildRole('role-safe-1', { position: 10 }),
    buildRole('role-protected-1', {
      position: 50,
      privileged: true,
      permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_CHANNELS']),
    }),
  ]);
  const overwrites = Object.freeze([buildOverwrite('ow-1')]);

  return Object.freeze({
    correlationId: 'corr-role-reconcile-1',
    transactionId: 'txn-role-reconcile-1',
    guildId: 'guild-role-reconcile-1',
    runtimeId: 'runtime-role-reconcile-1',
    authorizedRoleRegistry: buildRoleRegistry(),
    protectedRoleRegistry: buildRoleRegistry(),
    dangerousPermissionPolicy: buildDangerousPolicy(),
    currentGuildRoleInventory: roles,
    currentChannelPermissionOverwriteInventory: overwrites,
    runtimeSnapshot: buildSnapshot('runtime-role-snapshot-1', roles, overwrites),
    recoverySnapshot: buildSnapshot('recovery-role-snapshot-1', roles, overwrites),
    startupInventory: buildSnapshot('startup-role-snapshot-1', roles, overwrites),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

function hasCategory(findings: readonly SecurityReconciliationFinding[], category: string): boolean {
  return findings.some((finding) => (finding.metadata as { category?: string } | undefined)?.category === category);
}

describe('SecurityPermissionRoleStateReconciliation', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityPermissionRoleStateReconciliationRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.authorizedRoleRegistry)).toBe(true);
    expect(Object.isFrozen(request.protectedRoleRegistry)).toBe(true);
    expect(Object.isFrozen(request.currentGuildRoleInventory)).toBe(true);
    expect(Object.isFrozen(request.currentChannelPermissionOverwriteInventory)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic reconciliation ids are stable', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.reconciliationId).toBe(second.reconciliationId);
  });

  test('idempotent execution returns replay report', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const first = await reconciler.execute(buildRequest());
    const second = await reconciler.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
  });

  test('detects unauthorized privileged role', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([
          ...buildRequest().currentGuildRoleInventory,
          buildRole('role-rogue-1', { privileged: true, permissions: Object.freeze(['ADMINISTRATOR']) }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'UNAUTHORIZED_PRIVILEGED_ROLE')).toBe(true);
  });

  test('detects missing protected role', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([buildRole('role-safe-1')]),
      }),
    );

    expect(hasCategory(report.findings, 'MISSING_PROTECTED_ROLE')).toBe(true);
  });

  test('detects modified protected role', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([
          buildRole('role-safe-1'),
          buildRole('role-protected-1', {
            name: 'Role changed',
            permissions: Object.freeze(['SEND_MESSAGES']),
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'MODIFIED_PROTECTED_ROLE')).toBe(true);
  });

  test('detects dangerous permission drift', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([
          buildRole('role-safe-1', {
            permissions: Object.freeze(['SEND_MESSAGES', 'ADMINISTRATOR']),
          }),
          buildRole('role-protected-1', {
            position: 50,
            privileged: true,
            permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_CHANNELS']),
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'DANGEROUS_PERMISSION_DRIFT')).toBe(true);
  });

  test('detects admin manage_roles manage_webhooks manage_channels drift', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([
          buildRole('role-safe-1', {
            permissions: Object.freeze(['SEND_MESSAGES', 'ADMINISTRATOR', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS', 'MANAGE_CHANNELS']),
          }),
          buildRole('role-protected-1', {
            position: 50,
            privileged: true,
            permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_CHANNELS']),
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'ADMINISTRATOR_PERMISSION_DRIFT')).toBe(true);
    expect(hasCategory(report.findings, 'MANAGE_ROLES_PERMISSION_DRIFT')).toBe(true);
    expect(hasCategory(report.findings, 'MANAGE_WEBHOOKS_PERMISSION_DRIFT')).toBe(true);
    expect(hasCategory(report.findings, 'MANAGE_CHANNELS_PERMISSION_DRIFT')).toBe(true);
  });

  test('detects channel permission overwrite drift', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentChannelPermissionOverwriteInventory: Object.freeze([
          buildOverwrite('ow-1', {
            allow: Object.freeze(['VIEW_CHANNEL', 'MANAGE_CHANNELS']),
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'CHANNEL_OVERWRITE_DRIFT')).toBe(true);
  });

  test('detects hierarchy drift', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        currentGuildRoleInventory: Object.freeze([
          buildRole('role-safe-1'),
          buildRole('role-protected-1', {
            position: 5,
            privileged: true,
            permissions: Object.freeze(['SEND_MESSAGES', 'MANAGE_CHANNELS']),
          }),
        ]),
      }),
    );

    expect(hasCategory(report.findings, 'PROTECTED_ROLE_HIERARCHY_DRIFT')).toBe(true);
  });

  test('detects orphaned protected role', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const protectedOnly = buildRoleRegistry({
      records: Object.freeze([
        Object.freeze({
          roleId: 'role-orphan-1',
          expectedName: 'Role role-orphan-1',
          expectedPosition: 50,
          expectedPermissions: Object.freeze(['SEND_MESSAGES']),
          required: true,
          protected: true,
        }),
      ]),
    });

    const report = await reconciler.execute(
      buildRequest({
        protectedRoleRegistry: protectedOnly,
        currentGuildRoleInventory: Object.freeze([]),
        runtimeSnapshot: buildSnapshot('runtime-orphan', Object.freeze([]), Object.freeze([])),
        recoverySnapshot: buildSnapshot('recovery-orphan', Object.freeze([]), Object.freeze([])),
        startupInventory: buildSnapshot('startup-orphan', Object.freeze([]), Object.freeze([])),
      }),
    );

    expect(hasCategory(report.findings, 'ORPHANED_PROTECTED_ROLE')).toBe(true);
  });

  test('detects registry mismatch', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        authorizedRoleRegistry: buildRoleRegistry({
          records: Object.freeze([
            Object.freeze({
              roleId: 'role-safe-1',
              expectedName: 'Role role-safe-1',
              expectedPosition: 99,
              expectedPermissions: Object.freeze(['SEND_MESSAGES']),
              required: true,
              protected: false,
            }),
          ]),
        }),
      }),
    );

    expect(hasCategory(report.findings, 'REGISTRY_MISMATCH')).toBe(true);
  });

  test('detects snapshot inconsistency', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const runtimeRoles = Object.freeze([buildRole('role-safe-1', { position: 10 })]);
    const recoveryRoles = Object.freeze([buildRole('role-safe-1', { position: 20 })]);

    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-inc-1', runtimeRoles, Object.freeze([buildOverwrite('ow-1')])),
        recoverySnapshot: buildSnapshot('recovery-inc-1', recoveryRoles, Object.freeze([buildOverwrite('ow-1')])),
        startupInventory: buildSnapshot('startup-inc-1', runtimeRoles, Object.freeze([buildOverwrite('ow-1')])),
      }),
    );

    expect(hasCategory(report.findings, 'SNAPSHOT_INCONSISTENCY')).toBe(true);
  });

  test('stage ordering is deterministic', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityPermissionRoleStateReconciliationStage.RECONCILIATION_VALIDATION,
      SecurityPermissionRoleStateReconciliationStage.SOURCE_EVALUATION,
      SecurityPermissionRoleStateReconciliationStage.DRIFT_DETECTION,
      SecurityPermissionRoleStateReconciliationStage.VERIFICATION,
      SecurityPermissionRoleStateReconciliationStage.REPORT_GENERATION,
    ]);
  });

  test('fail-closed validation rejects inconsistent snapshot identity', async () => {
    const reconciler = new InMemorySecurityPermissionRoleStateReconciler();
    const report = await reconciler.execute(
      buildRequest({
        runtimeSnapshot: buildSnapshot('runtime-bad-1', Object.freeze([]), Object.freeze([]), {
          guildId: 'guild-mismatch',
        }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityPermissionRoleStateReconciliationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(report.failureReason).toContain('SNAPSHOT_GUILD_MISMATCH');
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-permission-role-state-reconciliation.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/\bmodifyRole\b|\bremoveRole\b|\brestoreRole\b|\beditChannel\b|\beditPermission\b/i);
    expect(source).not.toMatch(/\bpunish\b|\bcontainment\b|\bexecuteContainment\b|\bdispatchExecution\b|\bexecutionEngine\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
