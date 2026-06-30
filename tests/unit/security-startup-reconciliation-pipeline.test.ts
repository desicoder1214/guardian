import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  InMemorySecurityStartupReconciliationPipeline,
  SecurityStartupReconciliationPipelineComponent,
  SecurityStartupReconciliationPipelineRequest,
  SecurityStartupReconciliationPipelineStage,
  SecurityStartupReconciliationPipelineVerificationOutcome,
  freezeSecurityStartupReconciliationPipelineRequest,
} from '../../src/core/runtime/security/security-startup-reconciliation-pipeline';
import {
  SecurityBotInventoryReconciliationReport,
  SecurityBotInventoryReconciliationRequest,
  SecurityBotInventoryReconciliationVerificationOutcome,
} from '../../src/core/runtime/security/security-bot-inventory-reconciliation';
import {
  SecurityWebhookInventoryReconciliationReport,
  SecurityWebhookInventoryReconciliationRequest,
  SecurityWebhookInventoryReconciliationVerificationOutcome,
} from '../../src/core/runtime/security/security-webhook-inventory-reconciliation';
import {
  SecurityIntegrationInventoryReconciliationReport,
  SecurityIntegrationInventoryReconciliationRequest,
  SecurityIntegrationInventoryReconciliationVerificationOutcome,
} from '../../src/core/runtime/security/security-integration-inventory-reconciliation';
import {
  SecurityPermissionRoleStateReconciliationReport,
  SecurityPermissionRoleStateReconciliationRequest,
  SecurityPermissionRoleStateReconciliationVerificationOutcome,
} from '../../src/core/runtime/security/security-permission-role-state-reconciliation';
import {
  SecurityReconciliationFinding,
  SecurityReconciliationFindingSeverity,
  SecurityReconciliationFindingType,
} from '../../src/core/runtime/security/security-reconciliation-engine';

class RecordingBotReconciler {
  readonly calls: SecurityBotInventoryReconciliationRequest[] = [];
  constructor(private readonly reportFactory: (request: SecurityBotInventoryReconciliationRequest) => SecurityBotInventoryReconciliationReport) {}
  async execute(request: SecurityBotInventoryReconciliationRequest): Promise<SecurityBotInventoryReconciliationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class RecordingWebhookReconciler {
  readonly calls: SecurityWebhookInventoryReconciliationRequest[] = [];
  constructor(private readonly reportFactory: (request: SecurityWebhookInventoryReconciliationRequest) => SecurityWebhookInventoryReconciliationReport) {}
  async execute(request: SecurityWebhookInventoryReconciliationRequest): Promise<SecurityWebhookInventoryReconciliationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class RecordingIntegrationReconciler {
  readonly calls: SecurityIntegrationInventoryReconciliationRequest[] = [];
  constructor(private readonly reportFactory: (request: SecurityIntegrationInventoryReconciliationRequest) => SecurityIntegrationInventoryReconciliationReport) {}
  async execute(request: SecurityIntegrationInventoryReconciliationRequest): Promise<SecurityIntegrationInventoryReconciliationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

class RecordingPermissionRoleReconciler {
  readonly calls: SecurityPermissionRoleStateReconciliationRequest[] = [];
  constructor(private readonly reportFactory: (request: SecurityPermissionRoleStateReconciliationRequest) => SecurityPermissionRoleStateReconciliationReport) {}
  async execute(request: SecurityPermissionRoleStateReconciliationRequest): Promise<SecurityPermissionRoleStateReconciliationReport> {
    this.calls.push(request);
    return this.reportFactory(request);
  }
}

function buildFinding(
  id: string,
  type: SecurityReconciliationFindingType,
  severity: SecurityReconciliationFindingSeverity,
  correlationId = 'corr-pipeline-1',
  runtimeId = 'runtime-pipeline-1',
  guildId = 'guild-pipeline-1',
): SecurityReconciliationFinding {
  return Object.freeze({
    findingId: id,
    type,
    severity,
    correlationId,
    runtimeId,
    guildId,
    targetId: id.split(':').pop() ?? id,
    summary: `Finding ${id}`,
    metadata: Object.freeze({ source: 'pipeline-test' }),
  });
}

function buildBotRequest(overrides: Partial<SecurityBotInventoryReconciliationRequest> = {}): SecurityBotInventoryReconciliationRequest {
  return Object.freeze({
    correlationId: 'corr-pipeline-1',
    transactionId: 'txn-pipeline-1',
    guildId: 'guild-pipeline-1',
    runtimeId: 'runtime-pipeline-1',
    authorizedBotRegistry: Object.freeze({
      registryId: 'bot-registry-1',
      registryVersion: 1,
      records: Object.freeze([]),
    }),
    currentGuildBotInventory: Object.freeze([]),
    runtimeSnapshot: Object.freeze({
      snapshotId: 'bot-runtime-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      botInventory: Object.freeze([]),
    }),
    recoverySnapshot: Object.freeze({
      snapshotId: 'bot-recovery-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      botInventory: Object.freeze([]),
    }),
    startupInventory: Object.freeze({
      snapshotId: 'bot-startup-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      botInventory: Object.freeze([]),
    }),
    metadata: Object.freeze({ source: 'pipeline-test' }),
    ...overrides,
  });
}

function buildWebhookRequest(overrides: Partial<SecurityWebhookInventoryReconciliationRequest> = {}): SecurityWebhookInventoryReconciliationRequest {
  return Object.freeze({
    correlationId: 'corr-pipeline-1',
    transactionId: 'txn-pipeline-1',
    guildId: 'guild-pipeline-1',
    runtimeId: 'runtime-pipeline-1',
    authorizedWebhookRegistry: Object.freeze({
      registryId: 'webhook-registry-1',
      registryVersion: 1,
      records: Object.freeze([]),
    }),
    currentGuildWebhookInventory: Object.freeze([]),
    runtimeSnapshot: Object.freeze({
      snapshotId: 'webhook-runtime-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      webhookInventory: Object.freeze([]),
    }),
    recoverySnapshot: Object.freeze({
      snapshotId: 'webhook-recovery-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      webhookInventory: Object.freeze([]),
    }),
    startupInventory: Object.freeze({
      snapshotId: 'webhook-startup-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      webhookInventory: Object.freeze([]),
    }),
    metadata: Object.freeze({ source: 'pipeline-test' }),
    ...overrides,
  });
}

function buildIntegrationRequest(overrides: Partial<SecurityIntegrationInventoryReconciliationRequest> = {}): SecurityIntegrationInventoryReconciliationRequest {
  return Object.freeze({
    correlationId: 'corr-pipeline-1',
    transactionId: 'txn-pipeline-1',
    guildId: 'guild-pipeline-1',
    runtimeId: 'runtime-pipeline-1',
    authorizedIntegrationRegistry: Object.freeze({
      registryId: 'integration-registry-1',
      registryVersion: 1,
      records: Object.freeze([]),
    }),
    currentGuildIntegrationInventory: Object.freeze([]),
    runtimeSnapshot: Object.freeze({
      snapshotId: 'integration-runtime-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      integrationInventory: Object.freeze([]),
    }),
    recoverySnapshot: Object.freeze({
      snapshotId: 'integration-recovery-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      integrationInventory: Object.freeze([]),
    }),
    startupInventory: Object.freeze({
      snapshotId: 'integration-startup-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      integrationInventory: Object.freeze([]),
    }),
    metadata: Object.freeze({ source: 'pipeline-test' }),
    ...overrides,
  });
}

function buildPermissionRequest(overrides: Partial<SecurityPermissionRoleStateReconciliationRequest> = {}): SecurityPermissionRoleStateReconciliationRequest {
  return Object.freeze({
    correlationId: 'corr-pipeline-1',
    transactionId: 'txn-pipeline-1',
    guildId: 'guild-pipeline-1',
    runtimeId: 'runtime-pipeline-1',
    authorizedRoleRegistry: Object.freeze({
      registryId: 'role-registry-1',
      registryVersion: 1,
      records: Object.freeze([]),
    }),
    protectedRoleRegistry: Object.freeze({
      registryId: 'protected-role-registry-1',
      registryVersion: 1,
      records: Object.freeze([]),
    }),
    dangerousPermissionPolicy: Object.freeze({
      dangerousPermissions: Object.freeze(['ADMINISTRATOR']),
    }),
    currentGuildRoleInventory: Object.freeze([]),
    currentChannelPermissionOverwriteInventory: Object.freeze([]),
    runtimeSnapshot: Object.freeze({
      snapshotId: 'permission-runtime-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      roleInventory: Object.freeze([]),
      channelPermissionOverwriteInventory: Object.freeze([]),
    }),
    recoverySnapshot: Object.freeze({
      snapshotId: 'permission-recovery-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      roleInventory: Object.freeze([]),
      channelPermissionOverwriteInventory: Object.freeze([]),
    }),
    startupInventory: Object.freeze({
      snapshotId: 'permission-startup-1',
      snapshotVersion: 1,
      guildId: 'guild-pipeline-1',
      runtimeId: 'runtime-pipeline-1',
      roleInventory: Object.freeze([]),
      channelPermissionOverwriteInventory: Object.freeze([]),
    }),
    metadata: Object.freeze({ source: 'pipeline-test' }),
    ...overrides,
  });
}

function buildBotReport(
  request: SecurityBotInventoryReconciliationRequest,
  overrides: Partial<SecurityBotInventoryReconciliationReport> = {},
): SecurityBotInventoryReconciliationReport {
  return Object.freeze({
    reconciliationId: 'bot-reconcile-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted: Object.freeze([]),
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityBotInventoryReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.000Z',
    durationMs: 0,
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
    ...overrides,
  });
}

function buildWebhookReport(
  request: SecurityWebhookInventoryReconciliationRequest,
  overrides: Partial<SecurityWebhookInventoryReconciliationReport> = {},
): SecurityWebhookInventoryReconciliationReport {
  return Object.freeze({
    reconciliationId: 'webhook-reconcile-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted: Object.freeze([]),
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityWebhookInventoryReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.000Z',
    durationMs: 0,
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
    ...overrides,
  });
}

function buildIntegrationReport(
  request: SecurityIntegrationInventoryReconciliationRequest,
  overrides: Partial<SecurityIntegrationInventoryReconciliationReport> = {},
): SecurityIntegrationInventoryReconciliationReport {
  return Object.freeze({
    reconciliationId: 'integration-reconcile-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted: Object.freeze([]),
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityIntegrationInventoryReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.000Z',
    durationMs: 0,
    metadata: Object.freeze({
      source: 'in-memory-security-integration-inventory-reconciliation' as const,
      deterministicReconciliationId: true as const,
      findingsOnly: true as const,
      registryId: request.authorizedIntegrationRegistry.registryId,
      registryVersion: request.authorizedIntegrationRegistry.registryVersion,
      runtimeSnapshotId: request.runtimeSnapshot.snapshotId,
      recoverySnapshotId: request.recoverySnapshot.snapshotId,
      startupSnapshotId: request.startupInventory.snapshotId,
    }),
    ...overrides,
  });
}

function buildPermissionReport(
  request: SecurityPermissionRoleStateReconciliationRequest,
  overrides: Partial<SecurityPermissionRoleStateReconciliationReport> = {},
): SecurityPermissionRoleStateReconciliationReport {
  return Object.freeze({
    reconciliationId: 'permission-reconcile-1',
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    guildId: request.guildId,
    runtimeId: request.runtimeId,
    stagesCompleted: Object.freeze([]),
    findings: Object.freeze([]),
    reconciliationRequired: false,
    verificationOutcome: SecurityPermissionRoleStateReconciliationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.000Z',
    durationMs: 0,
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
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<SecurityStartupReconciliationPipelineRequest> = {},
): SecurityStartupReconciliationPipelineRequest {
  return Object.freeze({
    correlationId: 'corr-pipeline-1',
    transactionId: 'txn-pipeline-1',
    guildId: 'guild-pipeline-1',
    runtimeId: 'runtime-pipeline-1',
    botInventoryRequest: buildBotRequest(),
    webhookInventoryRequest: buildWebhookRequest(),
    integrationInventoryRequest: buildIntegrationRequest(),
    permissionRoleStateRequest: buildPermissionRequest(),
    metadata: Object.freeze({ source: 'pipeline-test' }),
    ...overrides,
  });
}

function createPipeline(options?: {
  botReport?: Partial<SecurityBotInventoryReconciliationReport>;
  webhookReport?: Partial<SecurityWebhookInventoryReconciliationReport>;
  integrationReport?: Partial<SecurityIntegrationInventoryReconciliationReport>;
  permissionReport?: Partial<SecurityPermissionRoleStateReconciliationReport>;
}) {
  const botReconciler = new RecordingBotReconciler((request) => buildBotReport(request, options?.botReport));
  const webhookReconciler = new RecordingWebhookReconciler((request) => buildWebhookReport(request, options?.webhookReport));
  const integrationReconciler = new RecordingIntegrationReconciler((request) => buildIntegrationReport(request, options?.integrationReport));
  const permissionReconciler = new RecordingPermissionRoleReconciler((request) => buildPermissionReport(request, options?.permissionReport));
  const pipeline = new InMemorySecurityStartupReconciliationPipeline(
    botReconciler as never,
    webhookReconciler as never,
    integrationReconciler as never,
    permissionReconciler as never,
  );

  return {
    pipeline,
    botReconciler,
    webhookReconciler,
    integrationReconciler,
    permissionReconciler,
  };
}

describe('SecurityStartupReconciliationPipeline', () => {
  test('immutable requests are deeply frozen', () => {
    const request = freezeSecurityStartupReconciliationPipelineRequest(buildRequest());

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.botInventoryRequest)).toBe(true);
    expect(Object.isFrozen(request.webhookInventoryRequest)).toBe(true);
    expect(Object.isFrozen(request.integrationInventoryRequest)).toBe(true);
    expect(Object.isFrozen(request.permissionRoleStateRequest)).toBe(true);

    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);
  });

  test('immutable reports are deeply frozen', async () => {
    const duplicateFinding = buildFinding(
      'dup-1',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
    );
    const { pipeline } = createPipeline({
      botReport: { findings: Object.freeze([duplicateFinding]) },
      webhookReport: { findings: Object.freeze([duplicateFinding]) },
    });
    const report = await pipeline.execute(buildRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
    expect(Object.isFrozen(report.componentStatuses)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('deterministic pipeline ids are stable', async () => {
    const { pipeline } = createPipeline();
    const first = await pipeline.execute(buildRequest());
    const second = await pipeline.execute(buildRequest());

    expect(first.pipelineId).toBe(second.pipelineId);
  });

  test('idempotency returns replay report', async () => {
    const { pipeline } = createPipeline();
    const first = await pipeline.execute(buildRequest());
    const second = await pipeline.execute(buildRequest());

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
  });

  test('stage ordering is deterministic', async () => {
    const finding = buildFinding(
      'bot-1',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
    );
    const { pipeline } = createPipeline({
      botReport: { findings: Object.freeze([finding]) },
    });
    const report = await pipeline.execute(buildRequest());

    expect(report.stagesCompleted).toEqual([
      SecurityStartupReconciliationPipelineStage.PIPELINE_VALIDATION,
      SecurityStartupReconciliationPipelineStage.BOT_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.WEBHOOK_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.INTEGRATION_INVENTORY_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.PERMISSION_ROLE_RECONCILIATION,
      SecurityStartupReconciliationPipelineStage.FINDING_AGGREGATION,
      SecurityStartupReconciliationPipelineStage.FINDING_DEDUPLICATION,
      SecurityStartupReconciliationPipelineStage.FINDING_PRIORITIZATION,
      SecurityStartupReconciliationPipelineStage.VERIFICATION,
      SecurityStartupReconciliationPipelineStage.REPORT_GENERATION,
    ]);
  });

  test('successful full pipeline aggregates four component statuses and findings', async () => {
    const { pipeline } = createPipeline({
      botReport: {
        findings: Object.freeze([
          buildFinding('finding:bot', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL),
        ]),
      },
      webhookReport: {
        findings: Object.freeze([
          buildFinding('finding:webhook', SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK, SecurityReconciliationFindingSeverity.CRITICAL),
        ]),
      },
      integrationReport: {
        findings: Object.freeze([
          buildFinding('finding:integration', SecurityReconciliationFindingType.REGISTRY_MISMATCH, SecurityReconciliationFindingSeverity.HIGH),
        ]),
      },
      permissionReport: {
        findings: Object.freeze([
          buildFinding('finding:permission', SecurityReconciliationFindingType.PERMISSION_DRIFT, SecurityReconciliationFindingSeverity.HIGH),
        ]),
      },
    });

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(true);
    expect(report.verificationOutcome).toBe(SecurityStartupReconciliationPipelineVerificationOutcome.VERIFIED);
    expect(report.componentStatuses).toHaveLength(4);
    expect(report.componentStatuses.map((entry) => entry.component)).toEqual([
      SecurityStartupReconciliationPipelineComponent.BOT,
      SecurityStartupReconciliationPipelineComponent.WEBHOOK,
      SecurityStartupReconciliationPipelineComponent.INTEGRATION,
      SecurityStartupReconciliationPipelineComponent.PERMISSION_ROLE,
    ]);
    expect(report.findings).toHaveLength(4);
  });

  test('bot reconciliation failure fails closed', async () => {
    const { pipeline } = createPipeline({
      botReport: {
        success: false,
        verificationOutcome: SecurityBotInventoryReconciliationVerificationOutcome.FAILED,
        failureReason: 'BOT_FAIL',
      },
    });

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('BOT_RECONCILIATION_FAILED');
  });

  test('webhook reconciliation failure fails closed', async () => {
    const { pipeline } = createPipeline({
      webhookReport: {
        success: false,
        verificationOutcome: SecurityWebhookInventoryReconciliationVerificationOutcome.FAILED,
        failureReason: 'WEBHOOK_FAIL',
      },
    });

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('WEBHOOK_RECONCILIATION_FAILED');
  });

  test('integration reconciliation failure fails closed', async () => {
    const { pipeline } = createPipeline({
      integrationReport: {
        success: false,
        verificationOutcome: SecurityIntegrationInventoryReconciliationVerificationOutcome.FAILED,
        failureReason: 'INTEGRATION_FAIL',
      },
    });

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('INTEGRATION_RECONCILIATION_FAILED');
  });

  test('permission role reconciliation failure fails closed', async () => {
    const { pipeline } = createPipeline({
      permissionReport: {
        success: false,
        verificationOutcome: SecurityPermissionRoleStateReconciliationVerificationOutcome.FAILED,
        failureReason: 'PERMISSION_FAIL',
      },
    });

    const report = await pipeline.execute(buildRequest());

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('PERMISSION_ROLE_RECONCILIATION_FAILED');
  });

  test('finding aggregation combines all module findings', async () => {
    const { pipeline } = createPipeline({
      botReport: { findings: Object.freeze([buildFinding('agg-bot', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL)]) },
      webhookReport: { findings: Object.freeze([buildFinding('agg-webhook', SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK, SecurityReconciliationFindingSeverity.CRITICAL)]) },
      integrationReport: { findings: Object.freeze([buildFinding('agg-int', SecurityReconciliationFindingType.REGISTRY_MISMATCH, SecurityReconciliationFindingSeverity.HIGH)]) },
      permissionReport: { findings: Object.freeze([buildFinding('agg-perm', SecurityReconciliationFindingType.PERMISSION_DRIFT, SecurityReconciliationFindingSeverity.HIGH)]) },
    });

    const report = await pipeline.execute(buildRequest());
    expect(report.findings.map((entry) => entry.findingId)).toEqual([
      'agg-bot',
      'agg-webhook',
      'agg-int',
      'agg-perm',
    ]);
  });

  test('deterministic deduplication removes duplicate finding ids', async () => {
    const duplicate = buildFinding('dup-same', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL);
    const { pipeline } = createPipeline({
      botReport: { findings: Object.freeze([duplicate]) },
      webhookReport: { findings: Object.freeze([duplicate]) },
    });

    const report = await pipeline.execute(buildRequest());
    expect(report.findings.filter((entry) => entry.findingId === 'dup-same')).toHaveLength(1);
  });

  test('deterministic prioritization orders by severity and type', async () => {
    const { pipeline } = createPipeline({
      botReport: {
        findings: Object.freeze([
          buildFinding('perm', SecurityReconciliationFindingType.PERMISSION_DRIFT, SecurityReconciliationFindingSeverity.HIGH),
          buildFinding('bot', SecurityReconciliationFindingType.UNAUTHORIZED_BOT, SecurityReconciliationFindingSeverity.CRITICAL),
          buildFinding('webhook', SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK, SecurityReconciliationFindingSeverity.CRITICAL),
        ]),
      },
    });

    const report = await pipeline.execute(buildRequest());
    expect(report.findings[0]?.type).toBe(SecurityReconciliationFindingType.UNAUTHORIZED_BOT);
    expect(report.findings[1]?.type).toBe(SecurityReconciliationFindingType.WEBHOOK_HIGH_RISK);
  });

  test('preserves correlation transaction runtime and guild identifiers', async () => {
    const finding = buildFinding(
      'preserve-bot',
      SecurityReconciliationFindingType.UNAUTHORIZED_BOT,
      SecurityReconciliationFindingSeverity.CRITICAL,
      'corr-preserve-1',
      'runtime-preserve-1',
      'guild-preserve-1',
    );
    const { pipeline } = createPipeline({
      botReport: {
        findings: Object.freeze([finding]),
      },
    });

    const report = await pipeline.execute(
      buildRequest({
        correlationId: 'corr-preserve-1',
        transactionId: 'txn-preserve-1',
        runtimeId: 'runtime-preserve-1',
        guildId: 'guild-preserve-1',
        botInventoryRequest: buildBotRequest({
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
          runtimeId: 'runtime-preserve-1',
          guildId: 'guild-preserve-1',
          runtimeSnapshot: Object.freeze({
            snapshotId: 'bot-runtime-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            botInventory: Object.freeze([]),
          }),
          recoverySnapshot: Object.freeze({
            snapshotId: 'bot-recovery-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            botInventory: Object.freeze([]),
          }),
          startupInventory: Object.freeze({
            snapshotId: 'bot-startup-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            botInventory: Object.freeze([]),
          }),
        }),
        webhookInventoryRequest: buildWebhookRequest({
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
          runtimeId: 'runtime-preserve-1',
          guildId: 'guild-preserve-1',
          runtimeSnapshot: Object.freeze({
            snapshotId: 'webhook-runtime-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            webhookInventory: Object.freeze([]),
          }),
          recoverySnapshot: Object.freeze({
            snapshotId: 'webhook-recovery-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            webhookInventory: Object.freeze([]),
          }),
          startupInventory: Object.freeze({
            snapshotId: 'webhook-startup-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            webhookInventory: Object.freeze([]),
          }),
        }),
        integrationInventoryRequest: buildIntegrationRequest({
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
          runtimeId: 'runtime-preserve-1',
          guildId: 'guild-preserve-1',
          runtimeSnapshot: Object.freeze({
            snapshotId: 'integration-runtime-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            integrationInventory: Object.freeze([]),
          }),
          recoverySnapshot: Object.freeze({
            snapshotId: 'integration-recovery-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            integrationInventory: Object.freeze([]),
          }),
          startupInventory: Object.freeze({
            snapshotId: 'integration-startup-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            integrationInventory: Object.freeze([]),
          }),
        }),
        permissionRoleStateRequest: buildPermissionRequest({
          correlationId: 'corr-preserve-1',
          transactionId: 'txn-preserve-1',
          runtimeId: 'runtime-preserve-1',
          guildId: 'guild-preserve-1',
          runtimeSnapshot: Object.freeze({
            snapshotId: 'permission-runtime-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            roleInventory: Object.freeze([]),
            channelPermissionOverwriteInventory: Object.freeze([]),
          }),
          recoverySnapshot: Object.freeze({
            snapshotId: 'permission-recovery-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            roleInventory: Object.freeze([]),
            channelPermissionOverwriteInventory: Object.freeze([]),
          }),
          startupInventory: Object.freeze({
            snapshotId: 'permission-startup-preserve-1',
            snapshotVersion: 1,
            guildId: 'guild-preserve-1',
            runtimeId: 'runtime-preserve-1',
            roleInventory: Object.freeze([]),
            channelPermissionOverwriteInventory: Object.freeze([]),
          }),
        }),
      }),
    );

    expect(report.correlationId).toBe('corr-preserve-1');
    expect(report.transactionId).toBe('txn-preserve-1');
    expect(report.runtimeId).toBe('runtime-preserve-1');
    expect(report.guildId).toBe('guild-preserve-1');
    expect(report.findings.every((entry) => entry.correlationId === 'corr-preserve-1')).toBe(true);
    expect(report.findings.every((entry) => entry.runtimeId === 'runtime-preserve-1')).toBe(true);
    expect(report.findings.every((entry) => entry.guildId === 'guild-preserve-1')).toBe(true);
  });

  test('source has no prohibited integration surfaces and no execution logic', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-startup-reconciliation-pipeline.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/\baxios\b|discord\.com\/api|X-Audit-Log-Reason|\bREST\b|\bHTTP\b/i);
    expect(source).not.toMatch(/\bremoveBot\b|\bdeleteWebhook\b|\bmodifyRole\b|\beditPermission\b|\bpunish\b/i);
    expect(source).not.toMatch(/\bexecuteContainment\b|\bdispatchExecution\b|\bpunishment\b/i);
    expect(source).not.toMatch(/node:fs|writeFile|appendFile|createWriteStream|mkdir|unlink/i);
    expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|repository\./i);
    expect(source).not.toMatch(/slash\s*command|dashboard|react/i);
  });
});
