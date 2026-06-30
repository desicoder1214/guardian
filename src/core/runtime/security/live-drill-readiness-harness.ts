import { SecurityActionType } from '../discord/security-action-planner';
import {
  InMemorySecurityExecutionTopologyResolver,
} from '../discord/security-execution-topology';
import {
  SecurityExecutionTopologyResolver,
  SecurityExecutorCapability,
} from '../discord/security-execution-types';
import { DiscordExecutionService } from '../discord/discord-execution-service';
import {
  SecurityStartupRuntimeCoordinationReport,
  SecurityStartupRuntimeCoordinationVerificationOutcome,
} from './security-startup-runtime-coordinator';
import {
  SecurityStartupReconciliationExecutionIntegrationReport,
  SecurityStartupReconciliationExecutionIntegrationVerificationOutcome,
} from './security-startup-reconciliation-execution-integration';
import {
  SecurityStartupExecutionDispatchVerificationOutcome,
} from './security-startup-execution-dispatcher';
import {
  StartupReentrySecurityStage,
  StartupReentryVerificationOutcome,
} from './startup-reentry-security-coordinator';
import { SecurityExecutionRouteDecision } from '../discord/security-execution-types';

export enum LiveDrillReadinessScenario {
  GUARDIAN_OFFLINE_REENTRY_UNAUTHORIZED_BOT = 'GUARDIAN_OFFLINE_REENTRY_UNAUTHORIZED_BOT',
  UNAUTHORIZED_BOT_ALREADY_PRESENT_ON_STARTUP = 'UNAUTHORIZED_BOT_ALREADY_PRESENT_ON_STARTUP',
  SUSPICIOUS_WEBHOOK_INVENTORY_ON_STARTUP = 'SUSPICIOUS_WEBHOOK_INVENTORY_ON_STARTUP',
  DANGEROUS_ROLE_PERMISSION_DRIFT_ON_STARTUP = 'DANGEROUS_ROLE_PERMISSION_DRIFT_ON_STARTUP',
  CHANNEL_PERMISSION_DRIFT_ON_STARTUP = 'CHANNEL_PERMISSION_DRIFT_ON_STARTUP',
  RECOVERY_SNAPSHOT_AVAILABILITY_BEFORE_EXECUTION =
    'RECOVERY_SNAPSHOT_AVAILABILITY_BEFORE_EXECUTION',
}

export enum LiveDrillReadinessStage {
  READINESS_VALIDATION = 'READINESS_VALIDATION',
  STARTUP_GATE_VERIFICATION = 'STARTUP_GATE_VERIFICATION',
  ADAPTER_REGISTRATION_VERIFICATION = 'ADAPTER_REGISTRATION_VERIFICATION',
  ROUTE_VERIFICATION = 'ROUTE_VERIFICATION',
  STARTUP_INTEGRATION_REACHABILITY = 'STARTUP_INTEGRATION_REACHABILITY',
  METADATA_INTEGRITY_VERIFICATION = 'METADATA_INTEGRITY_VERIFICATION',
  SCENARIO_VERIFICATION = 'SCENARIO_VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum LiveDrillReadinessVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface LiveDrillReadinessHarnessRequest {
  readonly readinessId?: string;
  readonly startupLifecycleGateEnabled: boolean;
  readonly startupRuntimeCoordinationReport: SecurityStartupRuntimeCoordinationReport;
  readonly startupReconciliationExecutionIntegrationReport: SecurityStartupReconciliationExecutionIntegrationReport;
  readonly productionExecutionAdapter: DiscordExecutionService;
  readonly metadata?: Record<string, unknown>;
}

export interface LiveDrillReadinessHarnessReport {
  readonly readinessId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly executionPlanId: string;
  readonly verifiedRoutes: readonly SecurityActionType[];
  readonly verifiedAdapterBindings: readonly string[];
  readonly verifiedScenarios: readonly LiveDrillReadinessScenario[];
  readonly startupLifecycleGateEnabled: boolean;
  readonly startupReconciliationExecutionIntegrationReachable: boolean;
  readonly noLiveDiscordCallMade: true;
  readonly stagesCompleted: readonly LiveDrillReadinessStage[];
  readonly verificationOutcome: LiveDrillReadinessVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-live-drill-readiness-harness';
    readonly deterministicReadinessId: true;
    readonly failClosed: true;
    readonly startupGateVerified: boolean;
    readonly adaptersVerified: boolean;
    readonly routesVerified: boolean;
    readonly metadataPreserved: boolean;
    readonly scenariosVerified: boolean;
  };
}

export interface LiveDrillReadinessHarness {
  evaluate(request: LiveDrillReadinessHarnessRequest): Promise<LiveDrillReadinessHarnessReport>;
}

const REQUIRED_ROUTE_CAPABILITIES: ReadonlyArray<{
  readonly actionType: SecurityActionType;
  readonly capability: SecurityExecutorCapability;
}> = Object.freeze([
  {
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  },
  {
    actionType: SecurityActionType.FREEZE_WEBHOOKS,
    capability: SecurityExecutorCapability.FREEZE_WEBHOOKS,
  },
  {
    actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
    capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
  },
  {
    actionType: SecurityActionType.LOCK_CHANNELS,
    capability: SecurityExecutorCapability.LOCK_CHANNELS,
  },
  {
    actionType: SecurityActionType.RESTORE_RESOURCE,
    capability: SecurityExecutorCapability.RESTORE_RESOURCE,
  },
  {
    actionType: SecurityActionType.CREATE_INCIDENT,
    capability: SecurityExecutorCapability.CREATE_INCIDENT,
  },
  {
    actionType: SecurityActionType.NOTIFY_AUDIT,
    capability: SecurityExecutorCapability.NOTIFY_AUDIT,
  },
]);

const REQUIRED_ADAPTER_BINDINGS = Object.freeze([
  'bot.removeUnauthorizedBot',
  'webhook.deleteWebhook',
  'role.removeDangerousRole',
  'channel.lockChannel',
  'channel.restoreChannel',
  'guild.createIncident',
  'guild.notifyAudit',
]);

const REQUIRED_REENTRY_STAGES = Object.freeze([
  StartupReentrySecurityStage.BOT_INVENTORY_RECONCILIATION,
  StartupReentrySecurityStage.WEBHOOK_INVENTORY_RECONCILIATION,
  StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION,
  StartupReentrySecurityStage.RECOVERY_SNAPSHOT_VALIDATION,
]);

const FAILURE_STARTUP_GATE_DISABLED = 'STARTUP_LIFECYCLE_GATE_DISABLED';
const FAILURE_RUNTIME_COORDINATION_UNVERIFIED = 'STARTUP_RUNTIME_COORDINATION_UNVERIFIED';
const FAILURE_INTEGRATION_UNREACHABLE = 'STARTUP_RECONCILIATION_EXECUTION_INTEGRATION_UNREACHABLE';
const FAILURE_ADAPTER_MISSING = 'REQUIRED_PRODUCTION_ADAPTER_BINDING_MISSING';
const FAILURE_ROUTE_MISSING = 'REQUIRED_EXECUTION_ROUTE_MISSING';
const FAILURE_METADATA_MISSING = 'REQUIRED_METADATA_MISSING';
const FAILURE_SCENARIO_UNVERIFIED = 'REQUIRED_SCENARIO_UNVERIFIED';

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function freezeRequest(request: LiveDrillReadinessHarnessRequest): LiveDrillReadinessHarnessRequest {
  return deepFreeze({
    ...request,
    startupRuntimeCoordinationReport: deepFreeze({ ...request.startupRuntimeCoordinationReport }),
    startupReconciliationExecutionIntegrationReport: deepFreeze({
      ...request.startupReconciliationExecutionIntegrationReport,
    }),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(report: LiveDrillReadinessHarnessReport): LiveDrillReadinessHarnessReport {
  return deepFreeze({
    ...report,
    verifiedRoutes: Object.freeze([...report.verifiedRoutes]),
    verifiedAdapterBindings: Object.freeze([...report.verifiedAdapterBindings]),
    verifiedScenarios: Object.freeze([...report.verifiedScenarios]),
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicReadinessId(request: LiveDrillReadinessHarnessRequest): string {
  const runtime = request.startupRuntimeCoordinationReport;
  const integration = request.startupReconciliationExecutionIntegrationReport;
  return [
    'live-drill-readiness-harness',
    runtime.coordinatorId,
    runtime.pipelineId,
    runtime.planningId,
    runtime.dispatchId,
    integration.integrationId,
    integration.pipelineId,
    integration.planningId,
    integration.startupExecutionPlanningReport.executionPlan.planId,
    runtime.correlationId,
    runtime.transactionId,
    runtime.runtimeId,
    runtime.guildId,
  ].join(':');
}

function hasAdapterBinding(adapter: DiscordExecutionService, binding: string): boolean {
  const [service, method] = binding.split('.');
  const serviceValue = (adapter as unknown as Record<string, unknown>)[service];
  if (!serviceValue || typeof serviceValue !== 'object') {
    return false;
  }

  const methodValue = (serviceValue as Record<string, unknown>)[method];
  return typeof methodValue === 'function';
}

function verifyAdapterBindings(adapter: DiscordExecutionService): readonly string[] {
  const failures: string[] = [];
  for (const binding of REQUIRED_ADAPTER_BINDINGS) {
    if (!hasAdapterBinding(adapter, binding)) {
      failures.push(`${FAILURE_ADAPTER_MISSING}:${binding}`);
    }
  }
  return Object.freeze(failures);
}

function verifyRoutes(topologyResolver: SecurityExecutionTopologyResolver): readonly string[] {
  const failures: string[] = [];
  for (const route of REQUIRED_ROUTE_CAPABILITIES) {
    const resolution = topologyResolver.resolve(route.actionType);
    if (!resolution.resolved || resolution.entry?.capability !== route.capability) {
      failures.push(`${FAILURE_ROUTE_MISSING}:${route.actionType}`);
    }
  }
  return Object.freeze(failures);
}

function verifyIntegrationReachability(
  runtimeReport: SecurityStartupRuntimeCoordinationReport,
  integrationReport: SecurityStartupReconciliationExecutionIntegrationReport,
): readonly string[] {
  const failures: string[] = [];
  if (
    !runtimeReport.success ||
    runtimeReport.verificationOutcome !== SecurityStartupRuntimeCoordinationVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_RUNTIME_COORDINATION_UNVERIFIED);
  }

  if (
    !integrationReport.success ||
    integrationReport.verificationOutcome !==
      SecurityStartupReconciliationExecutionIntegrationVerificationOutcome.VERIFIED ||
    !integrationReport.startupExecutionDispatchReport ||
    !integrationReport.startupExecutionDispatchReport.success ||
    integrationReport.startupExecutionDispatchReport.verificationOutcome !==
      SecurityStartupExecutionDispatchVerificationOutcome.VERIFIED
  ) {
    failures.push(FAILURE_INTEGRATION_UNREACHABLE);
  }

  return Object.freeze(failures);
}

function verifyMetadataIntegrity(
  runtimeReport: SecurityStartupRuntimeCoordinationReport,
  integrationReport: SecurityStartupReconciliationExecutionIntegrationReport,
): readonly string[] {
  const failures: string[] = [];
  const planning = integrationReport.startupExecutionPlanningReport;
  const dispatch = integrationReport.startupExecutionDispatchReport;
  const findings = integrationReport.startupReconciliationReport.findings;

  if (
    !isNonEmptyString(runtimeReport.correlationId) ||
    !isNonEmptyString(runtimeReport.transactionId) ||
    !isNonEmptyString(runtimeReport.runtimeId) ||
    !isNonEmptyString(runtimeReport.guildId) ||
    !isNonEmptyString(planning.executionPlan.planId)
  ) {
    failures.push(`${FAILURE_METADATA_MISSING}:identity`);
  }

  if (
    runtimeReport.correlationId !== integrationReport.correlationId ||
    runtimeReport.transactionId !== integrationReport.transactionId ||
    runtimeReport.runtimeId !== integrationReport.runtimeId ||
    runtimeReport.guildId !== integrationReport.guildId ||
    runtimeReport.pipelineId !== integrationReport.pipelineId ||
    runtimeReport.planningId !== integrationReport.planningId
  ) {
    failures.push(`${FAILURE_METADATA_MISSING}:identity-preservation`);
  }

  for (const finding of findings) {
    if (
      !isNonEmptyString(finding.targetId) ||
      !isNonEmptyString(finding.correlationId) ||
      !isNonEmptyString(finding.runtimeId) ||
      !isNonEmptyString(finding.guildId)
    ) {
      failures.push(`${FAILURE_METADATA_MISSING}:finding:${finding.findingId}`);
    }
  }

  for (const batch of planning.executionBatches) {
    if (!isNonEmptyString(batch.actionType)) {
      failures.push(`${FAILURE_METADATA_MISSING}:batch-action:${batch.batchId}`);
    }

    if (batch.targetIds.length === 0 || batch.findingIds.length === 0) {
      failures.push(`${FAILURE_METADATA_MISSING}:batch-targets:${batch.batchId}`);
      continue;
    }

    for (const targetId of batch.targetIds) {
      if (!isNonEmptyString(targetId)) {
        failures.push(`${FAILURE_METADATA_MISSING}:target-id:${batch.batchId}`);
      }
    }
  }

  if (!dispatch?.orchestrationResult) {
    failures.push(`${FAILURE_METADATA_MISSING}:dispatch-orchestration`);
    return Object.freeze(failures);
  }

  for (const intent of dispatch.orchestrationResult.dispatchResult.intents) {
    if (intent.dispatchDecision !== SecurityExecutionRouteDecision.EXECUTABLE || !intent.executionRequest) {
      continue;
    }

    if (!isNonEmptyString(intent.route.actionType)) {
      failures.push(`${FAILURE_METADATA_MISSING}:intent-action-type`);
    }

    if (
      !isNonEmptyString(intent.executionRequest.correlationId) ||
      intent.executionRequest.correlationId !== runtimeReport.correlationId
    ) {
      failures.push(`${FAILURE_METADATA_MISSING}:intent-correlation`);
    }

    if (
      !isNonEmptyString(intent.executionRequest.executionPlanId) ||
      intent.executionRequest.executionPlanId !== planning.executionPlan.planId
    ) {
      failures.push(`${FAILURE_METADATA_MISSING}:intent-execution-plan`);
    }
  }

  return Object.freeze(failures);
}

function verifyScenarioCoverage(
  runtimeReport: SecurityStartupRuntimeCoordinationReport,
  verifiedRoutes: readonly SecurityActionType[],
): {
  readonly failures: readonly string[];
  readonly verifiedScenarios: readonly LiveDrillReadinessScenario[];
} {
  const failures: string[] = [];
  const verifiedScenarios: LiveDrillReadinessScenario[] = [];
  const routeSet = new Set(verifiedRoutes);

  const startupReentry = runtimeReport.startupReentrySecurityReport;
  const reentryStageSet = new Set(startupReentry?.stagesCompleted ?? []);

  if (
    reentryStageSet.has(StartupReentrySecurityStage.BOT_INVENTORY_RECONCILIATION) &&
    routeSet.has(SecurityActionType.REMOVE_UNAUTHORIZED_BOT)
  ) {
    verifiedScenarios.push(LiveDrillReadinessScenario.GUARDIAN_OFFLINE_REENTRY_UNAUTHORIZED_BOT);
    verifiedScenarios.push(LiveDrillReadinessScenario.UNAUTHORIZED_BOT_ALREADY_PRESENT_ON_STARTUP);
  } else {
    failures.push(`${FAILURE_SCENARIO_UNVERIFIED}:bot-reentry`);
  }

  if (
    reentryStageSet.has(StartupReentrySecurityStage.WEBHOOK_INVENTORY_RECONCILIATION) &&
    routeSet.has(SecurityActionType.FREEZE_WEBHOOKS)
  ) {
    verifiedScenarios.push(LiveDrillReadinessScenario.SUSPICIOUS_WEBHOOK_INVENTORY_ON_STARTUP);
  } else {
    failures.push(`${FAILURE_SCENARIO_UNVERIFIED}:webhook`);
  }

  if (
    reentryStageSet.has(StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION) &&
    routeSet.has(SecurityActionType.REMOVE_DANGEROUS_ROLE)
  ) {
    verifiedScenarios.push(LiveDrillReadinessScenario.DANGEROUS_ROLE_PERMISSION_DRIFT_ON_STARTUP);
  } else {
    failures.push(`${FAILURE_SCENARIO_UNVERIFIED}:role-permission`);
  }

  if (
    reentryStageSet.has(StartupReentrySecurityStage.PERMISSION_DRIFT_RECONCILIATION) &&
    routeSet.has(SecurityActionType.LOCK_CHANNELS)
  ) {
    verifiedScenarios.push(LiveDrillReadinessScenario.CHANNEL_PERMISSION_DRIFT_ON_STARTUP);
  } else {
    failures.push(`${FAILURE_SCENARIO_UNVERIFIED}:channel-permission`);
  }

  if (
    startupReentry?.verificationOutcome === StartupReentryVerificationOutcome.VERIFIED &&
    reentryStageSet.has(StartupReentrySecurityStage.RECOVERY_SNAPSHOT_VALIDATION)
  ) {
    verifiedScenarios.push(
      LiveDrillReadinessScenario.RECOVERY_SNAPSHOT_AVAILABILITY_BEFORE_EXECUTION,
    );
  } else {
    failures.push(`${FAILURE_SCENARIO_UNVERIFIED}:recovery-snapshot`);
  }

  return Object.freeze({
    failures: Object.freeze(failures),
    verifiedScenarios: Object.freeze(verifiedScenarios),
  });
}

function buildReport(
  request: LiveDrillReadinessHarnessRequest,
  readinessId: string,
  stagesCompleted: readonly LiveDrillReadinessStage[],
  verifiedRoutes: readonly SecurityActionType[],
  verifiedAdapterBindings: readonly string[],
  verifiedScenarios: readonly LiveDrillReadinessScenario[],
  startedAtMs: number,
  success: boolean,
  failureReason?: string,
  idempotentReplay = false,
): LiveDrillReadinessHarnessReport {
  const runtimeReport = request.startupRuntimeCoordinationReport;
  const planning = request.startupReconciliationExecutionIntegrationReport.startupExecutionPlanningReport;

  return freezeReport({
    readinessId,
    correlationId: runtimeReport.correlationId,
    transactionId: runtimeReport.transactionId,
    runtimeId: runtimeReport.runtimeId,
    guildId: runtimeReport.guildId,
    executionPlanId: planning.executionPlan.planId,
    verifiedRoutes,
    verifiedAdapterBindings,
    verifiedScenarios,
    startupLifecycleGateEnabled: request.startupLifecycleGateEnabled,
    startupReconciliationExecutionIntegrationReachable: success,
    noLiveDiscordCallMade: true,
    stagesCompleted,
    verificationOutcome: success
      ? LiveDrillReadinessVerificationOutcome.VERIFIED
      : LiveDrillReadinessVerificationOutcome.FAILED,
    success,
    failureReason,
    idempotentReplay,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-live-drill-readiness-harness' as const,
      deterministicReadinessId: true as const,
      failClosed: true as const,
      startupGateVerified: request.startupLifecycleGateEnabled,
      adaptersVerified: verifiedAdapterBindings.length === REQUIRED_ADAPTER_BINDINGS.length,
      routesVerified: verifiedRoutes.length === REQUIRED_ROUTE_CAPABILITIES.length,
      metadataPreserved: success,
      scenariosVerified: verifiedScenarios.length === Object.keys(LiveDrillReadinessScenario).length,
    }),
  });
}

export class InMemoryLiveDrillReadinessHarness implements LiveDrillReadinessHarness {
  private readonly completedReports = new Map<string, LiveDrillReadinessHarnessReport>();

  constructor(
    private readonly topologyResolver: SecurityExecutionTopologyResolver =
      new InMemorySecurityExecutionTopologyResolver(),
  ) {}

  async evaluate(request: LiveDrillReadinessHarnessRequest): Promise<LiveDrillReadinessHarnessReport> {
    const frozenRequest = freezeRequest(request);
    const readinessId = frozenRequest.readinessId ?? toDeterministicReadinessId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(readinessId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stagesCompleted: LiveDrillReadinessStage[] = [];
    stagesCompleted.push(LiveDrillReadinessStage.READINESS_VALIDATION);

    const failures: string[] = [];
    if (!frozenRequest.startupLifecycleGateEnabled) {
      failures.push(FAILURE_STARTUP_GATE_DISABLED);
    }

    stagesCompleted.push(LiveDrillReadinessStage.STARTUP_GATE_VERIFICATION);

    const adapterFailures = verifyAdapterBindings(frozenRequest.productionExecutionAdapter);
    failures.push(...adapterFailures);
    stagesCompleted.push(LiveDrillReadinessStage.ADAPTER_REGISTRATION_VERIFICATION);

    const routeFailures = verifyRoutes(this.topologyResolver);
    failures.push(...routeFailures);
    stagesCompleted.push(LiveDrillReadinessStage.ROUTE_VERIFICATION);

    const integrationFailures = verifyIntegrationReachability(
      frozenRequest.startupRuntimeCoordinationReport,
      frozenRequest.startupReconciliationExecutionIntegrationReport,
    );
    failures.push(...integrationFailures);
    stagesCompleted.push(LiveDrillReadinessStage.STARTUP_INTEGRATION_REACHABILITY);

    const metadataFailures = verifyMetadataIntegrity(
      frozenRequest.startupRuntimeCoordinationReport,
      frozenRequest.startupReconciliationExecutionIntegrationReport,
    );
    failures.push(...metadataFailures);
    stagesCompleted.push(LiveDrillReadinessStage.METADATA_INTEGRITY_VERIFICATION);

    const verifiedRoutes = Object.freeze(
      REQUIRED_ROUTE_CAPABILITIES.map((entry) => entry.actionType),
    );
    const scenarioCoverage = verifyScenarioCoverage(
      frozenRequest.startupRuntimeCoordinationReport,
      verifiedRoutes,
    );
    failures.push(...scenarioCoverage.failures);
    stagesCompleted.push(LiveDrillReadinessStage.SCENARIO_VERIFICATION);

    stagesCompleted.push(LiveDrillReadinessStage.REPORT_GENERATION);
    const report = buildReport(
      frozenRequest,
      readinessId,
      Object.freeze(stagesCompleted),
      failures.length === 0 ? verifiedRoutes : Object.freeze([]),
      failures.length === 0 ? REQUIRED_ADAPTER_BINDINGS : Object.freeze([]),
      failures.length === 0 ? scenarioCoverage.verifiedScenarios : Object.freeze([]),
      startedAtMs,
      failures.length === 0,
      failures.length === 0 ? undefined : failures.join(','),
    );

    this.completedReports.set(readinessId, report);
    return report;
  }
}

export function freezeLiveDrillReadinessHarnessRequest(
  request: LiveDrillReadinessHarnessRequest,
): LiveDrillReadinessHarnessRequest {
  return freezeRequest(request);
}
