import fs from 'node:fs';
import path from 'node:path';
import { RecoveryVerificationOutcome } from '../../src/core/runtime/recovery/recovery-engine';
import {
  freezeRuntimeRecoveryStateRegistryRequest,
  InMemoryRuntimeRecoveryStateRegistry,
  RuntimeRecoveryStateRegistryRequest,
  RuntimeRecoveryStateRegistryStage,
  RuntimeRecoveryStateRegistryVerifier,
  RuntimeRecoveryStateType,
} from '../../src/core/runtime/recovery/runtime-recovery-state-registry';

function buildRequest(
  overrides: Partial<RuntimeRecoveryStateRegistryRequest> = {},
): RuntimeRecoveryStateRegistryRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    correlationId: 'corr-001',
    transactionId: 'txn-001',
    guildId: 'guild-001',
    state: Object.freeze({
      guildConfiguration: Object.freeze({
        antiNukeEnabled: true,
        logChannelId: 'channel-logs',
      }),
      securityRuntimeStatus: Object.freeze({
        status: 'RUNNING',
        activeIncidents: 1,
      }),
      authorizedBotRegistry: Object.freeze({
        botIds: Object.freeze(['bot-1', 'bot-2']),
      }),
      detectionRuntimeMetadata: Object.freeze({
        loadedDetectors: 4,
        lastDetectorReloadAt: '2026-06-29T00:00:00.000Z',
      }),
      recoveryMetadata: Object.freeze({
        lastRecoveryOutcome: 'VERIFIED',
        recoveryWindowOpen: true,
      }),
    }),
    metadata: Object.freeze({ source: 'runtime-recovery-state-registry-test' }),
    ...overrides,
  });
}

describe('RuntimeRecoveryStateRegistry', () => {
  test('immutable requests', () => {
    const frozen = freezeRuntimeRecoveryStateRegistryRequest(buildRequest());

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.state)).toBe(true);

    expect(() => {
      (frozen as { recoveryId: string }).recoveryId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable registry entries', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest());

    expect(report.entries.length).toBe(5);
    expect(Object.isFrozen(report.entries[0])).toBe(true);
    expect(Object.isFrozen(report.entries[0].stateData)).toBe(true);

    expect(() => {
      (report.entries[0] as { stateType: RuntimeRecoveryStateType }).stateType =
        RuntimeRecoveryStateType.RECOVERY_METADATA;
    }).toThrow(TypeError);
  });

  test('immutable reports', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic registry IDs', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const request = buildRequest();

    const first = registry.register(request);
    const second = registry.register(request);

    expect(first.registryId).toBe(second.registryId);
  });

  test('idempotent repeated registration', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const request = buildRequest();

    const first = registry.register(request);
    const second = registry.register(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.registryId).toBe(first.registryId);
  });

  test('stage ordering', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest());

    expect(report.stagesCompleted).toEqual([
      RuntimeRecoveryStateRegistryStage.REQUEST_VALIDATION,
      RuntimeRecoveryStateRegistryStage.STATE_REGISTRATION,
      RuntimeRecoveryStateRegistryStage.REGISTRY_VERIFICATION,
      RuntimeRecoveryStateRegistryStage.REPORT_GENERATION,
    ]);
  });

  test('correlation preservation', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest({ correlationId: 'corr-preserved' }));

    expect(report.correlationId).toBe('corr-preserved');
    expect(report.entries.every((entry) => entry.correlationId === 'corr-preserved')).toBe(true);
  });

  test('transaction preservation', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest({ transactionId: 'txn-preserved' }));

    expect(report.transactionId).toBe('txn-preserved');
    expect(report.entries.every((entry) => entry.transactionId === 'txn-preserved')).toBe(true);
  });

  test('recoveryId preservation', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest({ recoveryId: 'recovery-preserved' }));

    expect(report.recoveryId).toBe('recovery-preserved');
    expect(report.entries.every((entry) => entry.recoveryId === 'recovery-preserved')).toBe(true);
  });

  test('guildId preservation', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest({ guildId: 'guild-preserved' }));

    expect(report.guildId).toBe('guild-preserved');
    expect(report.entries.every((entry) => entry.guildId === 'guild-preserved')).toBe(true);
  });

  test('verification propagation', () => {
    const verifier: RuntimeRecoveryStateRegistryVerifier = {
      verify(): RecoveryVerificationOutcome {
        return RecoveryVerificationOutcome.UNVERIFIABLE;
      },
    };

    const registry = new InMemoryRuntimeRecoveryStateRegistry(verifier);
    const report = registry.register(buildRequest());

    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.UNVERIFIABLE);
    expect(report.success).toBe(false);
    expect(report.failureReason).toBe('runtime-recovery-state-registry-verification-failed');
  });

  test('supported state categories are exactly the expected five', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest());
    const stateTypes = report.entries.map((entry) => entry.stateType);

    expect(stateTypes).toEqual([
      RuntimeRecoveryStateType.GUILD_CONFIGURATION,
      RuntimeRecoveryStateType.SECURITY_RUNTIME_STATUS,
      RuntimeRecoveryStateType.AUTHORIZED_BOT_REGISTRY,
      RuntimeRecoveryStateType.DETECTION_RUNTIME_METADATA,
      RuntimeRecoveryStateType.RECOVERY_METADATA,
    ]);
  });

  test('invalid request fails closed', () => {
    const registry = new InMemoryRuntimeRecoveryStateRegistry();
    const report = registry.register(buildRequest({ recoveryId: '', correlationId: '' }));

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('RECOVERY_ID_REQUIRED');
    expect(report.entries).toEqual([]);
  });

  test('no Discord.js, no REST/fetch, no filesystem writes, no persistence/database, no restoration, no dashboard, no commands in source', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/core/runtime/recovery/runtime-recovery-state-registry.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js|from\s+['"]discord\.js['"]/i);
    expect(source).not.toMatch(/\bfetch\b|axios|node-fetch|undici|\brest\b/i);
    expect(source).not.toMatch(/fs\.|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|sql|persist/i);
    expect(source).not.toMatch(/restore|restoration/i);
    expect(source).not.toMatch(/dashboard|command/i);
  });
});
