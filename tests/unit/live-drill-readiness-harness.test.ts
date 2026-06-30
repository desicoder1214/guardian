import {
  InMemoryLiveDrillReadinessHarness,
  LiveDrillReadinessScenario,
  LiveDrillReadinessVerificationOutcome,
} from '../../src/core/runtime/security/live-drill-readiness-harness';
import { DiscordExecutionService } from '../../src/core/runtime/discord/discord-execution-service';
import {
  SecurityStartupRuntimeCoordinationReport,
  SecurityStartupRuntimeCoordinationVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-runtime-coordinator';
import {
  SecurityStartupReconciliationExecutionIntegrationReport,
  SecurityStartupReconciliationExecutionIntegrationVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-reconciliation-execution-integration';
import {
  SecurityStartupExecutionDispatchVerificationOutcome,
} from '../../src/core/runtime/security/security-startup-execution-dispatcher';
import {
  StartupReentrySecurityStage,
  StartupReentryVerificationOutcome,
} from '../../src/core/runtime/security/startup-reentry-security-coordinator';
import {
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import {
  SecurityExecutionRouteDecision,
  SecurityExecutionTopology,
  SecurityExecutionTopologyResolution,
  SecurityExecutionTopologyResolutionReason,
  SecurityExecutionTopologyResolver,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityExecutionTopologyResolver } from '../../src/core/runtime/discord/security-execution-topology';

function buildRuntimeCoordinationReport(): SecurityStartupRuntimeCoordinationReport {
  return Object.freeze({
    coordinatorId: 'startup-runtime-coordinator-1',
    startupSecurityReportId: 'startup-security-report-1',
    pipelineId: 'startup-pipeline-1',
    planningId: 'startup-planning-1',
    dispatchId: 'startup-dispatch-1',
    correlationId: 'corr-live-drill-1',
    transactionId: 'txn-live-drill-1',
    runtimeId: 'runtime-live-drill-1',
    guildId: 'guild-live-drill-1',
    startupReentrySecurityReport: Object.freeze({
      verificationOutcome: StartupReentryVerificationOutcome.VERIFIED,
      stagesCompleted: Object.freeze([
        StartupReentrySecurityStage.BOT_INVENTORY_RECONCILIATION,
        StartupReentrySecurityStage.WEBHOOK_INVENTORY_RECONCILIATION,
        StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION,
        StartupReentrySecurityStage.RECOVERY_SNAPSHOT_VALIDATION,
      ]),
    }),
    stagesCompleted: Object.freeze([]),
    verificationOutcome:
      SecurityStartupRuntimeCoordinationVerificationOutcome.VERIFIED,
    success: true,
    failureReason: undefined,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.100Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-startup-runtime-coordinator',
      deterministicCoordinatorId: true,
      startupWorkflowOrderEnforced: true,
      stageVerificationEnforced: true,
      startupSecurityReportIdPreserved: true,
      pipelineIdPreserved: true,
      planningIdPreserved: true,
      dispatchIdPreserved: true,
    }),
  } as unknown as SecurityStartupRuntimeCoordinationReport);
}

function buildStartupIntegrationReport(): SecurityStartupReconciliationExecutionIntegrationReport {
  return Object.freeze({
    integrationId: 'startup-reconciliation-execution-integration-1',
    pipelineId: 'startup-pipeline-1',
    planningId: 'startup-planning-1',
    correlationId: 'corr-live-drill-1',
    transactionId: 'txn-live-drill-1',
    runtimeId: 'runtime-live-drill-1',
    guildId: 'guild-live-drill-1',
    startupReconciliationReport: Object.freeze({
      pipelineId: 'startup-pipeline-1',
      correlationId: 'corr-live-drill-1',
      transactionId: 'txn-live-drill-1',
      runtimeId: 'runtime-live-drill-1',
      guildId: 'guild-live-drill-1',
      findings: Object.freeze([
        Object.freeze({
          findingId: 'finding-bot-1',
          type: 'UNAUTHORIZED_BOT',
          targetId: 'target-bot-1',
          correlationId: 'corr-live-drill-1',
          runtimeId: 'runtime-live-drill-1',
          guildId: 'guild-live-drill-1',
        }),
        Object.freeze({
          findingId: 'finding-webhook-1',
          type: 'WEBHOOK_HIGH_RISK',
          targetId: 'target-webhook-1',
          correlationId: 'corr-live-drill-1',
          runtimeId: 'runtime-live-drill-1',
          guildId: 'guild-live-drill-1',
        }),
        Object.freeze({
          findingId: 'finding-role-1',
          type: 'PRIVILEGED_ROLE_DRIFT',
          targetId: 'target-role-1',
          correlationId: 'corr-live-drill-1',
          runtimeId: 'runtime-live-drill-1',
          guildId: 'guild-live-drill-1',
        }),
        Object.freeze({
          findingId: 'finding-perm-1',
          type: 'PERMISSION_DRIFT',
          targetId: 'target-channel-1',
          correlationId: 'corr-live-drill-1',
          runtimeId: 'runtime-live-drill-1',
          guildId: 'guild-live-drill-1',
        }),
      ]),
    }),
    startupExecutionPlanningReport: Object.freeze({
      planningId: 'startup-planning-1',
      pipelineId: 'startup-pipeline-1',
      correlationId: 'corr-live-drill-1',
      transactionId: 'txn-live-drill-1',
      runtimeId: 'runtime-live-drill-1',
      guildId: 'guild-live-drill-1',
      executionPlan: Object.freeze({
        planId: 'execution-plan-live-drill-1',
      }),
      executionBatches: Object.freeze([
        Object.freeze({
          batchId: 'batch-bot-1',
          actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
          findingIds: Object.freeze(['finding-bot-1']),
          targetIds: Object.freeze(['target-bot-1']),
        }),
        Object.freeze({
          batchId: 'batch-webhook-1',
          actionType: SecurityActionType.FREEZE_WEBHOOKS,
          findingIds: Object.freeze(['finding-webhook-1']),
          targetIds: Object.freeze(['target-webhook-1']),
        }),
        Object.freeze({
          batchId: 'batch-role-1',
          actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
          findingIds: Object.freeze(['finding-role-1']),
          targetIds: Object.freeze(['target-role-1']),
        }),
        Object.freeze({
          batchId: 'batch-channel-1',
          actionType: SecurityActionType.LOCK_CHANNELS,
          findingIds: Object.freeze(['finding-perm-1']),
          targetIds: Object.freeze(['target-channel-1']),
        }),
      ]),
    }),
    startupExecutionDispatchReport: Object.freeze({
      dispatchId: 'startup-dispatch-1',
      planningId: 'startup-planning-1',
      pipelineId: 'startup-pipeline-1',
      executionPlanId: 'execution-plan-live-drill-1',
      correlationId: 'corr-live-drill-1',
      transactionId: 'txn-live-drill-1',
      runtimeId: 'runtime-live-drill-1',
      guildId: 'guild-live-drill-1',
      success: true,
      verificationOutcome: SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED,
      orchestrationResult: Object.freeze({
        dispatchResult: Object.freeze({
          intents: Object.freeze([
            Object.freeze({
              dispatchDecision: SecurityExecutionRouteDecision.EXECUTABLE,
              route: Object.freeze({
                actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
                correlationId: 'corr-live-drill-1',
              }),
              executionRequest: Object.freeze({
                correlationId: 'corr-live-drill-1',
                planId: 'hot-path-plan-1',
                executionPlanId: 'execution-plan-live-drill-1',
              }),
            }),
          ]),
        }),
      }),
    }),
    verifiedFindingTypes: Object.freeze([]),
    stagesCompleted: Object.freeze([]),
    verificationOutcome:
      SecurityStartupReconciliationExecutionIntegrationVerificationOutcome.VERIFIED,
    success: true,
    idempotentReplay: false,
    startedAt: '2026-06-30T00:00:00.000Z',
    finishedAt: '2026-06-30T00:00:00.100Z',
    durationMs: 100,
    metadata: Object.freeze({
      source: 'in-memory-security-startup-reconciliation-execution-integration',
      deterministicIntegrationId: true,
      reconciliationReportVerified: true,
      planningReportVerified: true,
      dispatchReportVerified: true,
      reconciliationReportId: 'startup-pipeline-1',
      planningReportId: 'startup-planning-1',
      dispatchReportId: 'startup-dispatch-1',
      findingCount: 4,
      executionBatchCount: 4,
    }),
  } as unknown as SecurityStartupReconciliationExecutionIntegrationReport);
}

function buildAdapter(callCounter?: { count: number }): DiscordExecutionService {
  const noop = async () => {
    if (callCounter) {
      callCounter.count += 1;
    }
    return Object.freeze({
      status: 'SUCCESS',
      executionTimeMs: 1,
      correlationId: 'corr-live-drill-1',
    });
  };

  return Object.freeze({
    member: Object.freeze({}),
    role: Object.freeze({ removeDangerousRole: noop }),
    channel: Object.freeze({ lockChannel: noop, restoreChannel: noop }),
    webhook: Object.freeze({ deleteWebhook: noop }),
    guild: Object.freeze({ createIncident: noop, notifyAudit: noop }),
    emoji: Object.freeze({}),
    vanity: Object.freeze({}),
    integration: Object.freeze({}),
    bot: Object.freeze({ removeUnauthorizedBot: noop }),
  } as unknown as DiscordExecutionService);
}

function buildRequest(overrides: Partial<{
  startupLifecycleGateEnabled: boolean;
  startupRuntimeCoordinationReport: SecurityStartupRuntimeCoordinationReport;
  startupReconciliationExecutionIntegrationReport: SecurityStartupReconciliationExecutionIntegrationReport;
  productionExecutionAdapter: DiscordExecutionService;
}> = {}) {
  return Object.freeze({
    startupLifecycleGateEnabled: true,
    startupRuntimeCoordinationReport: buildRuntimeCoordinationReport(),
    startupReconciliationExecutionIntegrationReport: buildStartupIntegrationReport(),
    productionExecutionAdapter: buildAdapter(),
    ...overrides,
  });
}

class MissingRouteResolver implements SecurityExecutionTopologyResolver {
  constructor(private readonly missingAction: SecurityActionType) {}

  getTopology(): SecurityExecutionTopology {
    return new InMemorySecurityExecutionTopologyResolver().getTopology();
  }

  resolve(actionType: SecurityActionType): SecurityExecutionTopologyResolution {
    if (actionType === this.missingAction) {
      return Object.freeze({
        actionType,
        resolved: false,
        reason: SecurityExecutionTopologyResolutionReason.UNSUPPORTED_ACTION,
      });
    }
    return new InMemorySecurityExecutionTopologyResolver().resolve(actionType);
  }
}

test('successful readiness report verifies adapters, routes, scenarios, and metadata without live calls', async () => {
  const callCounter = { count: 0 };
  const harness = new InMemoryLiveDrillReadinessHarness();

  const report = await harness.evaluate(
    buildRequest({
      productionExecutionAdapter: buildAdapter(callCounter),
    }),
  );

  expect(report.success).toBe(true);
  expect(report.verificationOutcome).toBe(LiveDrillReadinessVerificationOutcome.VERIFIED);
  expect(report.noLiveDiscordCallMade).toBe(true);
  expect(callCounter.count).toBe(0);
  expect(report.startupLifecycleGateEnabled).toBe(true);
  expect(report.startupReconciliationExecutionIntegrationReachable).toBe(true);
  expect(report.verifiedRoutes).toEqual(expect.arrayContaining([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]));
  expect(report.verifiedScenarios).toEqual(expect.arrayContaining([
    LiveDrillReadinessScenario.GUARDIAN_OFFLINE_REENTRY_UNAUTHORIZED_BOT,
    LiveDrillReadinessScenario.UNAUTHORIZED_BOT_ALREADY_PRESENT_ON_STARTUP,
    LiveDrillReadinessScenario.SUSPICIOUS_WEBHOOK_INVENTORY_ON_STARTUP,
    LiveDrillReadinessScenario.DANGEROUS_ROLE_PERMISSION_DRIFT_ON_STARTUP,
    LiveDrillReadinessScenario.CHANNEL_PERMISSION_DRIFT_ON_STARTUP,
    LiveDrillReadinessScenario.RECOVERY_SNAPSHOT_AVAILABILITY_BEFORE_EXECUTION,
  ]));
  expect(report.correlationId).toBe('corr-live-drill-1');
  expect(report.transactionId).toBe('txn-live-drill-1');
  expect(report.runtimeId).toBe('runtime-live-drill-1');
  expect(report.guildId).toBe('guild-live-drill-1');
  expect(report.executionPlanId).toBe('execution-plan-live-drill-1');
});

test('missing adapter fails closed', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness();
  const incompleteAdapter = Object.freeze({
    bot: Object.freeze({ removeUnauthorizedBot: async () => Object.freeze({}) }),
  }) as unknown as DiscordExecutionService;

  const report = await harness.evaluate(
    buildRequest({
      productionExecutionAdapter: incompleteAdapter,
    }),
  );

  expect(report.success).toBe(false);
  expect(report.failureReason).toContain('REQUIRED_PRODUCTION_ADAPTER_BINDING_MISSING');
});

test('missing route fails closed', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness(
    new MissingRouteResolver(SecurityActionType.RESTORE_RESOURCE),
  );

  const report = await harness.evaluate(buildRequest());

  expect(report.success).toBe(false);
  expect(report.failureReason).toContain('REQUIRED_EXECUTION_ROUTE_MISSING:RESTORE_RESOURCE');
});

test('missing metadata fails closed', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness();
  const integration = buildStartupIntegrationReport();
  const corrupted = Object.freeze({
    ...integration,
    startupReconciliationReport: Object.freeze({
      ...integration.startupReconciliationReport,
      findings: Object.freeze([
        Object.freeze({
          ...integration.startupReconciliationReport.findings[0],
          targetId: '',
        }),
      ]),
    }),
  }) as unknown as SecurityStartupReconciliationExecutionIntegrationReport;

  const report = await harness.evaluate(
    buildRequest({
      startupReconciliationExecutionIntegrationReport: corrupted,
    }),
  );

  expect(report.success).toBe(false);
  expect(report.failureReason).toContain('REQUIRED_METADATA_MISSING');
});

test('startup gate disabled fails closed', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness();

  const report = await harness.evaluate(
    buildRequest({
      startupLifecycleGateEnabled: false,
    }),
  );

  expect(report.success).toBe(false);
  expect(report.failureReason).toContain('STARTUP_LIFECYCLE_GATE_DISABLED');
});

test('harness makes no live Discord REST or execution calls', async () => {
  const callCounter = { count: 0 };
  const harness = new InMemoryLiveDrillReadinessHarness();

  const report = await harness.evaluate(
    buildRequest({
      productionExecutionAdapter: buildAdapter(callCounter),
    }),
  );

  expect(report.success).toBe(true);
  expect(callCounter.count).toBe(0);
  expect(report.noLiveDiscordCallMade).toBe(true);
});

test('deterministic replay returns same readiness id and marks idempotent replay', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness();
  const request = buildRequest();

  const first = await harness.evaluate(request);
  const second = await harness.evaluate(request);

  expect(first.readinessId).toBe(second.readinessId);
  expect(first.idempotentReplay).toBe(false);
  expect(second.idempotentReplay).toBe(true);
});

test('immutable report is deeply frozen', async () => {
  const harness = new InMemoryLiveDrillReadinessHarness();
  const report = await harness.evaluate(buildRequest());

  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.verifiedRoutes)).toBe(true);
  expect(Object.isFrozen(report.verifiedAdapterBindings)).toBe(true);
  expect(Object.isFrozen(report.verifiedScenarios)).toBe(true);
  expect(Object.isFrozen(report.stagesCompleted)).toBe(true);
  expect(Object.isFrozen(report.metadata)).toBe(true);

  expect(() => {
    (report as { success: boolean }).success = false;
  }).toThrow(TypeError);
});
