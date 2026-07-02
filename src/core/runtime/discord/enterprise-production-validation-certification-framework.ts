import {
  InMemoryRecoveryEngine,
  RecoveryOperationType,
} from '../recovery/recovery-engine';

export enum EnterpriseCertificationVerdict {
  CERTIFIED = 'CERTIFIED',
  CERTIFIED_WITH_OBSERVATIONS = 'CERTIFIED WITH OBSERVATIONS',
  CONDITIONALLY_CERTIFIED = 'CONDITIONALLY CERTIFIED',
  NOT_CERTIFIABLE = 'NOT CERTIFIABLE',
}

export enum EnterpriseChaosInjection {
  DISCORD_403 = 'DISCORD_403',
  DISCORD_404 = 'DISCORD_404',
  DISCORD_429 = 'DISCORD_429',
  DISCORD_500 = 'DISCORD_500',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  DELAYED_AUDIT_LOGS = 'DELAYED_AUDIT_LOGS',
  DUPLICATE_GATEWAY_EVENTS = 'DUPLICATE_GATEWAY_EVENTS',
  MISSING_AUDIT_LOGS = 'MISSING_AUDIT_LOGS',
  CONCURRENT_ATTACKS = 'CONCURRENT_ATTACKS',
  PARTIAL_EXECUTION = 'PARTIAL_EXECUTION',
  EXECUTION_RETRIES = 'EXECUTION_RETRIES',
  EVENT_BURST = 'EVENT_BURST',
  SUSTAINED_EVENT_STREAM = 'SUSTAINED_EVENT_STREAM',
  EXECUTOR_SATURATION = 'EXECUTOR_SATURATION',
  RECOVERY_QUEUE_GROWTH = 'RECOVERY_QUEUE_GROWTH',
  RATE_LIMIT_BACKPRESSURE = 'RATE_LIMIT_BACKPRESSURE',
  SLOW_DOWNSTREAM_EXECUTION = 'SLOW_DOWNSTREAM_EXECUTION',
}

export enum EnterpriseDrill {
  UNAUTHORIZED_BOT_ADDITION = 'UNAUTHORIZED_BOT_ADDITION',
  DANGEROUS_ROLE_GRANT = 'DANGEROUS_ROLE_GRANT',
  CHANNEL_DELETION = 'CHANNEL_DELETION',
  CHANNEL_CREATION = 'CHANNEL_CREATION',
  ROLE_DELETION = 'ROLE_DELETION',
  ROLE_CREATION = 'ROLE_CREATION',
  PERMISSION_OVERWRITE = 'PERMISSION_OVERWRITE',
  MEMBER_MODERATION = 'MEMBER_MODERATION',
  WEBHOOK_CREATION = 'WEBHOOK_CREATION',
  WEBHOOK_MUTATION = 'WEBHOOK_MUTATION',
  GUILD_CONFIGURATION = 'GUILD_CONFIGURATION',
  INTEGRATION_MANAGEMENT = 'INTEGRATION_MANAGEMENT',
}

interface DrillDefinition {
  readonly drill: EnterpriseDrill;
  readonly eventName: string;
}

export interface EnterpriseRecordedEvent {
  readonly drill: EnterpriseDrill;
  readonly eventName: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

export interface EnterpriseDrillLatenciesMs {
  readonly gatewayEventReceive: number;
  readonly detection: number;
  readonly attribution: number;
  readonly evaluation: number;
  readonly planning: number;
  readonly dispatch: number;
  readonly execution: number;
  readonly recovery: number;
  readonly endToEnd: number;
}

export interface EnterpriseDrillOperationalSignals {
  readonly queueDepth: number;
  readonly dispatchQueueDepth: number;
  readonly recoveryQueueDepth: number;
  readonly backpressureDetected: boolean;
}

export interface EnterpriseDrillRecoveryOutcome {
  readonly required: boolean;
  readonly executed: boolean;
  readonly success: boolean;
}

export interface EnterpriseDrillReplayOutcome {
  readonly eventsReplayed: number;
  readonly eventsSuppressed: number;
  readonly effectiveness: number;
}

export interface EnterpriseDrillReport {
  readonly drill: EnterpriseDrill;
  readonly pass: boolean;
  readonly chaos: readonly EnterpriseChaosInjection[];
  readonly usedRecordedReplay: boolean;
  readonly concurrencyLevel: number;
  readonly retryCount: number;
  readonly latenciesMs: EnterpriseDrillLatenciesMs;
  readonly operationalSignals: EnterpriseDrillOperationalSignals;
  readonly recoveryOutcome: EnterpriseDrillRecoveryOutcome;
  readonly replayOutcome: EnterpriseDrillReplayOutcome;
  readonly failures: readonly string[];
  readonly observations: readonly string[];
}

export interface EnterpriseLatencySummaryStage {
  readonly averageMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
}

export interface EnterpriseLatencySummary {
  readonly gatewayEventReceive: EnterpriseLatencySummaryStage;
  readonly detection: EnterpriseLatencySummaryStage;
  readonly attribution: EnterpriseLatencySummaryStage;
  readonly evaluation: EnterpriseLatencySummaryStage;
  readonly planning: EnterpriseLatencySummaryStage;
  readonly dispatch: EnterpriseLatencySummaryStage;
  readonly execution: EnterpriseLatencySummaryStage;
  readonly recovery: EnterpriseLatencySummaryStage;
  readonly endToEnd: EnterpriseLatencySummaryStage;
}

export interface EnterpriseHealthIndicator {
  readonly healthy: boolean;
  readonly details: string;
}

export interface EnterpriseHealthSummary {
  readonly runtimeStatus: EnterpriseHealthIndicator;
  readonly eventPipeline: EnterpriseHealthIndicator;
  readonly detectionPipeline: EnterpriseHealthIndicator;
  readonly dispatcher: EnterpriseHealthIndicator;
  readonly recoveryEngine: EnterpriseHealthIndicator;
  readonly discordRestConnectivity: EnterpriseHealthIndicator;
  readonly gatewayConnectivity: EnterpriseHealthIndicator;
  readonly executorRegistry: EnterpriseHealthIndicator;
}

export interface EnterpriseReadinessChecks {
  readonly runtimeReady: boolean;
  readonly pipelineReady: boolean;
  readonly dispatcherReady: boolean;
  readonly recoveryReady: boolean;
  readonly connectivityReady: boolean;
  readonly diagnosticsReady: boolean;
  readonly allChecksPassing: boolean;
}

export interface EnterpriseBottleneck {
  readonly stage:
    | 'gatewayEventReceive'
    | 'detection'
    | 'attribution'
    | 'evaluation'
    | 'planning'
    | 'dispatch'
    | 'execution'
    | 'recovery'
    | 'endToEnd';
  readonly averageMs: number;
}

export interface EnterpriseRecoveryStatistics {
  readonly requiredCount: number;
  readonly executedCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly successRate: number;
  readonly averageLatencyMs: number;
  readonly maxQueueDepth: number;
}

export interface EnterpriseRuntimeDiagnostics {
  readonly backpressureDetected: boolean;
  readonly backpressureIncidents: number;
  readonly averageQueueDepth: number;
  readonly maxQueueDepth: number;
  readonly averageDispatchQueueDepth: number;
  readonly averageRecoveryQueueDepth: number;
  readonly slowDownstreamIncidents: number;
}

export interface EnterpriseCertificationMetrics {
  readonly gatewayEventReceiveLatencyMs: number;
  readonly detectionLatencyMs: number;
  readonly attributionLatencyMs: number;
  readonly evaluationLatencyMs: number;
  readonly planningLatencyMs: number;
  readonly dispatchLatencyMs: number;
  readonly executionLatencyMs: number;
  readonly recoveryLatencyMs: number;
  readonly endToEndLatencyMs: number;
  readonly replaySuppressionEffectiveness: number;
  readonly retryCount: number;
  readonly recoverySuccessRate: number;
}

export interface EnterpriseCoverageSummary {
  readonly totalDrills: number;
  readonly passedDrills: number;
  readonly failedDrills: number;
  readonly chaosInjectionsCovered: readonly EnterpriseChaosInjection[];
}

export interface EnterpriseCertificationRequest {
  readonly certificationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly drills?: readonly EnterpriseDrill[];
  readonly globalChaos?: readonly EnterpriseChaosInjection[];
  readonly chaosByDrill?: Partial<Record<EnterpriseDrill, readonly EnterpriseChaosInjection[]>>;
  readonly recordedEvents?: readonly EnterpriseRecordedEvent[];
  readonly concurrentAttackBurst?: number;
}

export interface EnterpriseCertificationReport {
  readonly reportVersion: 'v0.5.1';
  readonly certificationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly drillReports: readonly EnterpriseDrillReport[];
  readonly metrics: EnterpriseCertificationMetrics;
  readonly healthSummary: EnterpriseHealthSummary;
  readonly latencySummary: EnterpriseLatencySummary;
  readonly bottlenecks: readonly EnterpriseBottleneck[];
  readonly recoveryStatistics: EnterpriseRecoveryStatistics;
  readonly runtimeDiagnostics: EnterpriseRuntimeDiagnostics;
  readonly readinessChecks: EnterpriseReadinessChecks;
  readonly coverage: EnterpriseCoverageSummary;
  readonly outstandingFailures: readonly string[];
  readonly verdict: EnterpriseCertificationVerdict;
  readonly success: boolean;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface EnterpriseCertificationClock {
  now(): number;
}

export interface EnterpriseCertificationDependencies {
  readonly clock?: EnterpriseCertificationClock;
}

class SystemClock implements EnterpriseCertificationClock {
  now(): number {
    return Date.now();
  }
}

const DEFAULT_DRILLS: readonly DrillDefinition[] = Object.freeze([
  Object.freeze({ drill: EnterpriseDrill.UNAUTHORIZED_BOT_ADDITION, eventName: 'GUILD_MEMBER_ADD' }),
  Object.freeze({ drill: EnterpriseDrill.DANGEROUS_ROLE_GRANT, eventName: 'GUILD_MEMBER_UPDATE' }),
  Object.freeze({ drill: EnterpriseDrill.CHANNEL_DELETION, eventName: 'CHANNEL_DELETE' }),
  Object.freeze({ drill: EnterpriseDrill.CHANNEL_CREATION, eventName: 'CHANNEL_CREATE' }),
  Object.freeze({ drill: EnterpriseDrill.ROLE_DELETION, eventName: 'ROLE_DELETE' }),
  Object.freeze({ drill: EnterpriseDrill.ROLE_CREATION, eventName: 'ROLE_CREATE' }),
  Object.freeze({ drill: EnterpriseDrill.PERMISSION_OVERWRITE, eventName: 'PERMISSION_OVERWRITE_UPDATE' }),
  Object.freeze({ drill: EnterpriseDrill.MEMBER_MODERATION, eventName: 'GUILD_BAN_ADD' }),
  Object.freeze({ drill: EnterpriseDrill.WEBHOOK_CREATION, eventName: 'WEBHOOK_CREATE' }),
  Object.freeze({ drill: EnterpriseDrill.WEBHOOK_MUTATION, eventName: 'WEBHOOK_UPDATE' }),
  Object.freeze({ drill: EnterpriseDrill.GUILD_CONFIGURATION, eventName: 'GUILD_UPDATE' }),
  Object.freeze({ drill: EnterpriseDrill.INTEGRATION_MANAGEMENT, eventName: 'INTEGRATION_UPDATE' }),
]);

const BASE_STAGE_LATENCY_MS = Object.freeze({
  gatewayEventReceive: 2,
  detection: 3,
  attribution: 4,
  evaluation: 3,
  planning: 2,
  dispatch: 2,
  execution: 5,
  recovery: 6,
});

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values: readonly number[], percentileRank: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

function toDeterministicCertificationId(request: EnterpriseCertificationRequest): string {
  const drillSignature = (request.drills ?? DEFAULT_DRILLS.map((entry) => entry.drill)).join('|');
  const chaosSignature = (request.globalChaos ?? []).join('|');
  return [
    'guardian-enterprise-production-certification',
    request.correlationId,
    request.transactionId,
    request.runtimeId,
    request.guildId,
    drillSignature,
    chaosSignature,
  ].join(':');
}

function normalizeRequest(request: EnterpriseCertificationRequest): EnterpriseCertificationRequest {
  return deepFreeze({
    ...request,
    drills: Object.freeze([...(request.drills ?? DEFAULT_DRILLS.map((entry) => entry.drill))]),
    globalChaos: Object.freeze([...(request.globalChaos ?? [])]),
    chaosByDrill: request.chaosByDrill
      ? Object.freeze({ ...request.chaosByDrill })
      : undefined,
    recordedEvents: Object.freeze([...(request.recordedEvents ?? [])]),
    concurrentAttackBurst: Math.max(2, request.concurrentAttackBurst ?? 4),
  });
}

function computeVerdict(
  failed: number,
  observations: number,
): EnterpriseCertificationVerdict {
  if (failed === 0 && observations === 0) {
    return EnterpriseCertificationVerdict.CERTIFIED;
  }

  if (failed === 0) {
    return EnterpriseCertificationVerdict.CERTIFIED_WITH_OBSERVATIONS;
  }

  if (failed <= 2) {
    return EnterpriseCertificationVerdict.CONDITIONALLY_CERTIFIED;
  }

  return EnterpriseCertificationVerdict.NOT_CERTIFIABLE;
}

export class InMemoryEnterpriseProductionValidationCertificationFramework {
  private readonly completedReports = new Map<string, EnterpriseCertificationReport>();
  private readonly processedReplayKeys = new Set<string>();
  private readonly recoveryEngine = new InMemoryRecoveryEngine();
  private readonly clock: EnterpriseCertificationClock;

  constructor(dependencies: EnterpriseCertificationDependencies = {}) {
    this.clock = dependencies.clock ?? new SystemClock();
  }

  async certify(request: EnterpriseCertificationRequest): Promise<EnterpriseCertificationReport> {
    const frozenRequest = normalizeRequest(request);
    const certificationId =
      frozenRequest.certificationId ?? toDeterministicCertificationId(frozenRequest);
    const startedAtMs = this.clock.now();

    const replay = this.completedReports.get(certificationId);
    if (replay) {
      return deepFreeze({
        ...replay,
        idempotentReplay: true,
      });
    }

    const drillReports: EnterpriseDrillReport[] = [];
    const outstandingFailures: string[] = [];

    for (const drill of frozenRequest.drills ?? []) {
      const report = await this.executeDrill(frozenRequest, drill);
      drillReports.push(report);
      outstandingFailures.push(...report.failures.map((failure) => `${drill}:${failure}`));
    }

    const metrics = this.buildMetrics(drillReports);
    const latencySummary = this.buildLatencySummary(drillReports);
    const runtimeDiagnostics = this.buildRuntimeDiagnostics(drillReports);
    const recoveryStatistics = this.buildRecoveryStatistics(drillReports);
    const healthSummary = this.buildHealthSummary(drillReports, runtimeDiagnostics, recoveryStatistics);
    const readinessChecks = this.buildReadinessChecks(healthSummary, runtimeDiagnostics);
    const bottlenecks = this.buildBottlenecks(latencySummary);
    const chaosCovered = new Set<EnterpriseChaosInjection>();
    let observationCount = 0;

    for (const drillReport of drillReports) {
      for (const chaos of drillReport.chaos) {
        chaosCovered.add(chaos);
      }
      observationCount += drillReport.observations.length;
    }

    const failedDrills = drillReports.filter((entry) => !entry.pass).length;
    const verdict = computeVerdict(failedDrills, observationCount);
    const finishedAtMs = this.clock.now();

    const report = deepFreeze({
      reportVersion: 'v0.5.1' as const,
      certificationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      runtimeId: frozenRequest.runtimeId,
      guildId: frozenRequest.guildId,
      drillReports: Object.freeze(drillReports),
      metrics,
      healthSummary,
      latencySummary,
      bottlenecks,
      recoveryStatistics,
      runtimeDiagnostics,
      readinessChecks,
      coverage: Object.freeze({
        totalDrills: drillReports.length,
        passedDrills: drillReports.length - failedDrills,
        failedDrills,
        chaosInjectionsCovered: Object.freeze([...chaosCovered.values()].sort()),
      }),
      outstandingFailures: Object.freeze(outstandingFailures),
      verdict,
      success: failedDrills === 0,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
    });

    this.completedReports.set(certificationId, report);
    return report;
  }

  private async executeDrill(
    request: EnterpriseCertificationRequest,
    drill: EnterpriseDrill,
  ): Promise<EnterpriseDrillReport> {
    const failures: string[] = [];
    const observations: string[] = [];
    const chaos = this.resolveChaos(request, drill);
    const chaosSet = new Set(chaos);
    const definition = DEFAULT_DRILLS.find((entry) => entry.drill === drill);
    const eventName = definition?.eventName ?? 'UNKNOWN_EVENT';

    let gatewayEventReceiveLatency = BASE_STAGE_LATENCY_MS.gatewayEventReceive;
    let detectionLatency = BASE_STAGE_LATENCY_MS.detection;
    const attributionLatency =
      BASE_STAGE_LATENCY_MS.attribution +
      (chaosSet.has(EnterpriseChaosInjection.DELAYED_AUDIT_LOGS) ? 25 : 0);
    let evaluationLatency = BASE_STAGE_LATENCY_MS.evaluation;
    let planningLatency = BASE_STAGE_LATENCY_MS.planning;
    let dispatchLatency = BASE_STAGE_LATENCY_MS.dispatch;

    let executionLatency = BASE_STAGE_LATENCY_MS.execution;
    let recoveryLatency = 0;
    let retryCount = 0;
    let executionFailed = false;
    let queueDepth = 1;
    let dispatchQueueDepth = 1;
    let recoveryQueueDepth = 0;
    let backpressureDetected = false;

    if (chaosSet.has(EnterpriseChaosInjection.MISSING_AUDIT_LOGS)) {
      observations.push('audit-attribution-fell-back-to-fail-closed-path');
    }

    if (chaosSet.has(EnterpriseChaosInjection.EVENT_BURST)) {
      gatewayEventReceiveLatency += 5;
      detectionLatency += 3;
      evaluationLatency += 2;
      queueDepth += 8;
      observations.push('event-burst-simulated');
    }

    if (chaosSet.has(EnterpriseChaosInjection.SUSTAINED_EVENT_STREAM)) {
      gatewayEventReceiveLatency += 3;
      detectionLatency += 2;
      evaluationLatency += 2;
      planningLatency += 1;
      queueDepth += 5;
      observations.push('sustained-stream-simulated');
    }

    if (chaosSet.has(EnterpriseChaosInjection.DISCORD_403)) {
      executionFailed = true;
      failures.push('discord-403-forbidden');
      observations.push('fail-closed-enforced');
    }

    if (chaosSet.has(EnterpriseChaosInjection.DISCORD_404)) {
      observations.push('discord-404-treated-as-already-contained');
    }

    if (chaosSet.has(EnterpriseChaosInjection.DISCORD_429)) {
      retryCount += 1;
      executionLatency += 6;
      backpressureDetected = true;
      dispatchQueueDepth += 2;
      if (!chaosSet.has(EnterpriseChaosInjection.EXECUTION_RETRIES)) {
        executionFailed = true;
        failures.push('discord-429-retry-budget-exhausted');
      }
    }

    if (chaosSet.has(EnterpriseChaosInjection.RATE_LIMIT_BACKPRESSURE)) {
      retryCount += 1;
      executionLatency += 7;
      dispatchLatency += 3;
      backpressureDetected = true;
      dispatchQueueDepth += 4;
      observations.push('rate-limit-backpressure-observed');
    }

    if (chaosSet.has(EnterpriseChaosInjection.DISCORD_500)) {
      retryCount += 1;
      executionLatency += 8;
      if (!chaosSet.has(EnterpriseChaosInjection.EXECUTION_RETRIES)) {
        executionFailed = true;
        failures.push('discord-500-retry-budget-exhausted');
      }
    }

    if (chaosSet.has(EnterpriseChaosInjection.NETWORK_TIMEOUT)) {
      retryCount += 1;
      executionLatency += 12;
      if (!chaosSet.has(EnterpriseChaosInjection.EXECUTION_RETRIES)) {
        executionFailed = true;
        failures.push('network-timeout-retry-budget-exhausted');
      }
    }

    if (chaosSet.has(EnterpriseChaosInjection.PARTIAL_EXECUTION)) {
      executionFailed = true;
      failures.push('partial-execution-detected');
      observations.push('recovery-orchestration-required');
    }

    if (chaosSet.has(EnterpriseChaosInjection.EXECUTOR_SATURATION)) {
      dispatchLatency += 6;
      executionLatency += 10;
      dispatchQueueDepth += 6;
      observations.push('executor-saturation-simulated');
    }

    if (chaosSet.has(EnterpriseChaosInjection.SLOW_DOWNSTREAM_EXECUTION)) {
      executionLatency += 20;
      observations.push('slow-downstream-execution-observed');
    }

    if (chaosSet.has(EnterpriseChaosInjection.EXECUTION_RETRIES)) {
      retryCount += 1;
      executionFailed = false;
      observations.push('bounded-retry-succeeded');
    }

    const replayEvents = this.resolveReplayEvents(request, drill, eventName);
    let eventsSuppressed = 0;
    for (const replayEvent of replayEvents) {
      const replayKey = `${drill}:${replayEvent.eventName}:${replayEvent.correlationId}`;
      if (this.processedReplayKeys.has(replayKey)) {
        eventsSuppressed += 1;
        continue;
      }
      this.processedReplayKeys.add(replayKey);
    }

    const concurrencyLevel = chaosSet.has(EnterpriseChaosInjection.CONCURRENT_ATTACKS)
      ? Math.max(2, request.concurrentAttackBurst ?? 4)
      : 1;

    if (concurrencyLevel > 1) {
      observations.push(`concurrency-stress-tested:${concurrencyLevel}`);
      queueDepth += concurrencyLevel - 1;
      dispatchQueueDepth += Math.ceil(concurrencyLevel / 2);
    }

    const needsRecovery = executionFailed || chaosSet.has(EnterpriseChaosInjection.PARTIAL_EXECUTION);
    let recoveryExecuted = false;
    let recoverySuccess = true;

    if (needsRecovery) {
      recoveryExecuted = true;
      const recoveryStart = this.clock.now();
      const recoveryReport = await this.recoveryEngine.execute(
        Object.freeze({
          recoveryId: `recovery:${drill}:${request.transactionId}`,
          correlationId: request.correlationId,
          transactionId: `txn:${drill}:${request.transactionId}`,
          operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
          guildId: request.guildId,
          initiatedBy: 'enterprise-production-validation-certification-framework',
          requestedAt: new Date(this.clock.now()).toISOString(),
          metadata: Object.freeze({
            runtimeId: request.runtimeId,
            drill,
          }),
        }),
      );
      const recoveryEnd = this.clock.now();
      recoveryLatency = Math.max(BASE_STAGE_LATENCY_MS.recovery, recoveryEnd - recoveryStart);

      if (chaosSet.has(EnterpriseChaosInjection.RECOVERY_QUEUE_GROWTH)) {
        recoveryLatency += 9;
        recoveryQueueDepth += 4;
        observations.push('recovery-queue-growth-simulated');
      }

      recoverySuccess = recoveryReport.success;
      if (!recoverySuccess) {
        failures.push('recovery-failed');
      }
    }

    const eventsReplayed = replayEvents.length;
    const replayEffectiveness =
      eventsReplayed > 0 ? round2(eventsSuppressed / eventsReplayed) : 0;
    if (
      chaosSet.has(EnterpriseChaosInjection.DUPLICATE_GATEWAY_EVENTS) &&
      eventsReplayed > 1 &&
      eventsSuppressed === 0
    ) {
      failures.push('replay-suppression-missed-duplicates');
    }

    const endToEndLatency =
      gatewayEventReceiveLatency +
      detectionLatency +
      attributionLatency +
      evaluationLatency +
      planningLatency +
      dispatchLatency +
      executionLatency +
      recoveryLatency;

    const pass = failures.length === 0;

    return deepFreeze({
      drill,
      pass,
      chaos: Object.freeze([...chaos]),
      usedRecordedReplay: request.recordedEvents !== undefined && request.recordedEvents.length > 0,
      concurrencyLevel,
      retryCount,
      latenciesMs: Object.freeze({
        gatewayEventReceive: gatewayEventReceiveLatency,
        detection: detectionLatency,
        attribution: attributionLatency,
        evaluation: evaluationLatency,
        planning: planningLatency,
        dispatch: dispatchLatency,
        execution: executionLatency,
        recovery: recoveryLatency,
        endToEnd: endToEndLatency,
      }),
      operationalSignals: Object.freeze({
        queueDepth,
        dispatchQueueDepth,
        recoveryQueueDepth,
        backpressureDetected,
      }),
      recoveryOutcome: Object.freeze({
        required: needsRecovery,
        executed: recoveryExecuted,
        success: recoverySuccess,
      }),
      replayOutcome: Object.freeze({
        eventsReplayed,
        eventsSuppressed,
        effectiveness: replayEffectiveness,
      }),
      failures: Object.freeze(failures),
      observations: Object.freeze(observations),
    });
  }

  private resolveChaos(
    request: EnterpriseCertificationRequest,
    drill: EnterpriseDrill,
  ): readonly EnterpriseChaosInjection[] {
    const globalChaos = request.globalChaos ?? [];
    const perDrillChaos = request.chaosByDrill?.[drill] ?? [];
    return Object.freeze([...new Set([...globalChaos, ...perDrillChaos])]);
  }

  private resolveReplayEvents(
    request: EnterpriseCertificationRequest,
    drill: EnterpriseDrill,
    eventName: string,
  ): readonly EnterpriseRecordedEvent[] {
    const fromRecording = (request.recordedEvents ?? []).filter((entry) => entry.drill === drill);
    if (fromRecording.length > 0) {
      return Object.freeze([...fromRecording]);
    }

    return Object.freeze([
      Object.freeze({
        drill,
        eventName,
        correlationId: `${request.correlationId}:${drill}`,
        timestamp: new Date(this.clock.now()).toISOString(),
        payload: Object.freeze({
          guildId: request.guildId,
          runtimeId: request.runtimeId,
        }),
      }),
    ]);
  }

  private buildMetrics(drillReports: readonly EnterpriseDrillReport[]): EnterpriseCertificationMetrics {
    const recoveryRequired = drillReports.filter((entry) => entry.recoveryOutcome.required);
    const recoverySucceeded = recoveryRequired.filter((entry) => entry.recoveryOutcome.success);
    const totalRetries = drillReports.reduce((sum, entry) => sum + entry.retryCount, 0);

    return deepFreeze({
      gatewayEventReceiveLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.gatewayEventReceive)),
      detectionLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.detection)),
      attributionLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.attribution)),
      evaluationLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.evaluation)),
      planningLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.planning)),
      dispatchLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.dispatch)),
      executionLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.execution)),
      recoveryLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.recovery)),
      endToEndLatencyMs: avg(drillReports.map((entry) => entry.latenciesMs.endToEnd)),
      replaySuppressionEffectiveness: avg(drillReports.map((entry) => entry.replayOutcome.effectiveness)),
      retryCount: totalRetries,
      recoverySuccessRate:
        recoveryRequired.length === 0
          ? 1
          : round2(recoverySucceeded.length / recoveryRequired.length),
    });
  }

  private buildLatencySummary(
    drillReports: readonly EnterpriseDrillReport[],
  ): EnterpriseLatencySummary {
    const buildStage = (values: readonly number[]): EnterpriseLatencySummaryStage =>
      Object.freeze({
        averageMs: avg(values),
        p95Ms: percentile(values, 95),
        maxMs: values.length === 0 ? 0 : Math.max(...values),
      });

    return deepFreeze({
      gatewayEventReceive: buildStage(drillReports.map((entry) => entry.latenciesMs.gatewayEventReceive)),
      detection: buildStage(drillReports.map((entry) => entry.latenciesMs.detection)),
      attribution: buildStage(drillReports.map((entry) => entry.latenciesMs.attribution)),
      evaluation: buildStage(drillReports.map((entry) => entry.latenciesMs.evaluation)),
      planning: buildStage(drillReports.map((entry) => entry.latenciesMs.planning)),
      dispatch: buildStage(drillReports.map((entry) => entry.latenciesMs.dispatch)),
      execution: buildStage(drillReports.map((entry) => entry.latenciesMs.execution)),
      recovery: buildStage(drillReports.map((entry) => entry.latenciesMs.recovery)),
      endToEnd: buildStage(drillReports.map((entry) => entry.latenciesMs.endToEnd)),
    });
  }

  private buildRuntimeDiagnostics(
    drillReports: readonly EnterpriseDrillReport[],
  ): EnterpriseRuntimeDiagnostics {
    const backpressureIncidents = drillReports.filter(
      (entry) => entry.operationalSignals.backpressureDetected,
    ).length;
    const slowDownstreamIncidents = drillReports.reduce(
      (count, entry) =>
        count +
        (entry.observations.some((observation) => observation === 'slow-downstream-execution-observed')
          ? 1
          : 0),
      0,
    );

    return deepFreeze({
      backpressureDetected: backpressureIncidents > 0,
      backpressureIncidents,
      averageQueueDepth: avg(drillReports.map((entry) => entry.operationalSignals.queueDepth)),
      maxQueueDepth:
        drillReports.length === 0
          ? 0
          : Math.max(...drillReports.map((entry) => entry.operationalSignals.queueDepth)),
      averageDispatchQueueDepth: avg(
        drillReports.map((entry) => entry.operationalSignals.dispatchQueueDepth),
      ),
      averageRecoveryQueueDepth: avg(
        drillReports.map((entry) => entry.operationalSignals.recoveryQueueDepth),
      ),
      slowDownstreamIncidents,
    });
  }

  private buildRecoveryStatistics(
    drillReports: readonly EnterpriseDrillReport[],
  ): EnterpriseRecoveryStatistics {
    const required = drillReports.filter((entry) => entry.recoveryOutcome.required);
    const executed = required.filter((entry) => entry.recoveryOutcome.executed);
    const succeeded = executed.filter((entry) => entry.recoveryOutcome.success);

    return deepFreeze({
      requiredCount: required.length,
      executedCount: executed.length,
      successCount: succeeded.length,
      failureCount: executed.length - succeeded.length,
      successRate: required.length === 0 ? 1 : round2(succeeded.length / required.length),
      averageLatencyMs: avg(executed.map((entry) => entry.latenciesMs.recovery)),
      maxQueueDepth:
        drillReports.length === 0
          ? 0
          : Math.max(...drillReports.map((entry) => entry.operationalSignals.recoveryQueueDepth)),
    });
  }

  private buildHealthSummary(
    drillReports: readonly EnterpriseDrillReport[],
    diagnostics: EnterpriseRuntimeDiagnostics,
    recoveryStatistics: EnterpriseRecoveryStatistics,
  ): EnterpriseHealthSummary {
    const totalFailures = drillReports.reduce((count, entry) => count + entry.failures.length, 0);
    const dispatcherHealthy =
      drillReports.every((entry) => entry.latenciesMs.dispatch <= 15) && totalFailures === 0;
    const detectionHealthy = drillReports.every((entry) => entry.latenciesMs.detection <= 12);
    const eventPipelineHealthy = diagnostics.maxQueueDepth <= 20;
    const gatewayHealthy = drillReports.every((entry) => entry.latenciesMs.gatewayEventReceive <= 15);
    const discordConnectivityHealthy =
      drillReports.every((entry) => !entry.failures.some((failure) => failure.includes('discord-403')));
    const recoveryHealthy = recoveryStatistics.failureCount === 0;

    return deepFreeze({
      runtimeStatus: Object.freeze({
        healthy: totalFailures === 0,
        details: totalFailures === 0 ? 'runtime stable under certification load' : 'runtime failures detected',
      }),
      eventPipeline: Object.freeze({
        healthy: eventPipelineHealthy,
        details: eventPipelineHealthy
          ? 'event pipeline queue depth within bounds'
          : 'event pipeline queue depth exceeded threshold',
      }),
      detectionPipeline: Object.freeze({
        healthy: detectionHealthy,
        details: detectionHealthy ? 'detection latency within threshold' : 'detection latency regression detected',
      }),
      dispatcher: Object.freeze({
        healthy: dispatcherHealthy,
        details: dispatcherHealthy ? 'dispatch remains deterministic' : 'dispatch instability detected',
      }),
      recoveryEngine: Object.freeze({
        healthy: recoveryHealthy,
        details: recoveryHealthy ? 'recovery execution healthy' : 'recovery failures observed',
      }),
      discordRestConnectivity: Object.freeze({
        healthy: discordConnectivityHealthy,
        details: discordConnectivityHealthy ? 'discord REST retries bounded' : 'discord REST hard failures observed',
      }),
      gatewayConnectivity: Object.freeze({
        healthy: gatewayHealthy,
        details: gatewayHealthy ? 'gateway receive latency healthy' : 'gateway receive latency degraded',
      }),
      executorRegistry: Object.freeze({
        healthy: drillReports.every((entry) => entry.latenciesMs.execution <= 40),
        details: drillReports.every((entry) => entry.latenciesMs.execution <= 40)
          ? 'executor registry remained responsive'
          : 'executor saturation detected',
      }),
    });
  }

  private buildReadinessChecks(
    healthSummary: EnterpriseHealthSummary,
    diagnostics: EnterpriseRuntimeDiagnostics,
  ): EnterpriseReadinessChecks {
    const runtimeReady = healthSummary.runtimeStatus.healthy;
    const pipelineReady = healthSummary.eventPipeline.healthy && healthSummary.detectionPipeline.healthy;
    const dispatcherReady = healthSummary.dispatcher.healthy && healthSummary.executorRegistry.healthy;
    const recoveryReady = healthSummary.recoveryEngine.healthy;
    const connectivityReady =
      healthSummary.discordRestConnectivity.healthy && healthSummary.gatewayConnectivity.healthy;
    const diagnosticsReady = diagnostics.maxQueueDepth <= 25;
    const allChecksPassing =
      runtimeReady && pipelineReady && dispatcherReady && recoveryReady && connectivityReady && diagnosticsReady;

    return deepFreeze({
      runtimeReady,
      pipelineReady,
      dispatcherReady,
      recoveryReady,
      connectivityReady,
      diagnosticsReady,
      allChecksPassing,
    });
  }

  private buildBottlenecks(
    latencySummary: EnterpriseLatencySummary,
  ): readonly EnterpriseBottleneck[] {
    const entries: EnterpriseBottleneck[] = [
      Object.freeze({ stage: 'gatewayEventReceive', averageMs: latencySummary.gatewayEventReceive.averageMs }),
      Object.freeze({ stage: 'detection', averageMs: latencySummary.detection.averageMs }),
      Object.freeze({ stage: 'attribution', averageMs: latencySummary.attribution.averageMs }),
      Object.freeze({ stage: 'evaluation', averageMs: latencySummary.evaluation.averageMs }),
      Object.freeze({ stage: 'planning', averageMs: latencySummary.planning.averageMs }),
      Object.freeze({ stage: 'dispatch', averageMs: latencySummary.dispatch.averageMs }),
      Object.freeze({ stage: 'execution', averageMs: latencySummary.execution.averageMs }),
      Object.freeze({ stage: 'recovery', averageMs: latencySummary.recovery.averageMs }),
      Object.freeze({ stage: 'endToEnd', averageMs: latencySummary.endToEnd.averageMs }),
    ];

    return deepFreeze(entries.sort((left, right) => right.averageMs - left.averageMs).slice(0, 3));
  }
}

export const DEFAULT_ENTERPRISE_PRODUCTION_DRILLS = Object.freeze(
  DEFAULT_DRILLS.map((entry) => entry.drill),
);
