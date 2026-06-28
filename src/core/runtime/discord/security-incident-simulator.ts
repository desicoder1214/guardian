import {
  DetectionContext,
  DetectionEngine,
  DetectionResult,
} from './detection-engine';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import {
  InMemoryRuntimeThreatInterpretationEngine,
  RuntimeThreatInterpretationEngine,
} from './runtime-threat-interpretation-engine';
import {
  InMemorySecurityEvaluationPipeline,
} from './security-evaluation-pipeline';
import { SecurityDecisionEngine, SecurityDecisionModel } from './security-decision-types';
import { SecurityPolicyEngine } from './security-policy-types';
import { SecurityContextBuilder } from './security-context';
import { AuditAttributionEngine } from './audit-attribution-types';
import {
  SecurityActionPlan,
  SecurityActionPlanner,
} from './security-action-planner';
import {
  AuthorizationEvaluationContext,
  SecurityExecutionAuthorizationEngine,
  SecurityExecutionAuthorizationResult,
  SecurityExecutionDispatchResult,
  SecurityExecutionDispatcher,
  SecurityExecutionPlan,
  SecurityExecutionPlanner,
  SecurityExecutionRouter,
  SecurityExecutionRoutingResult,
  SecurityHotPathPlan,
  SecurityHotPathPlanner,
  SecurityHotPathLatencyEnvelope,
  SecurityLatencyBudgetProfile,
  SecurityLatencyStage,
} from './security-execution-types';
import {
  CoordinatedContainmentExecutionDependencies,
  CoordinatedContainmentExecutionResult,
  InMemorySecurityExecutionOrchestrator,
  SecurityExecutionOrchestrationResult,
} from './security-execution-orchestrator';
import {
  InMemorySecurityLatencyBudgetEvaluator,
  SecurityLatencyBudgetEvaluator,
} from './security-latency-budget-evaluator';
import { InMemorySecurityExecutorRegistry } from './executor-registry';

export enum IncidentSimulationStage {
  DETECTION = 'DETECTION',
  THREAT_INTERPRETATION = 'THREAT_INTERPRETATION',
  DECISION = 'DECISION',
  ACTION_PLANNING = 'ACTION_PLANNING',
  EXECUTION_PLANNING = 'EXECUTION_PLANNING',
  HOT_PATH_PLANNING = 'HOT_PATH_PLANNING',
  AUTHORIZATION = 'AUTHORIZATION',
  ROUTING = 'ROUTING',
  DISPATCH = 'DISPATCH',
  EXECUTION = 'EXECUTION',
}

const INCIDENT_SIMULATION_STAGE_ORDER: readonly IncidentSimulationStage[] = Object.freeze([
  IncidentSimulationStage.DETECTION,
  IncidentSimulationStage.THREAT_INTERPRETATION,
  IncidentSimulationStage.DECISION,
  IncidentSimulationStage.ACTION_PLANNING,
  IncidentSimulationStage.EXECUTION_PLANNING,
  IncidentSimulationStage.HOT_PATH_PLANNING,
  IncidentSimulationStage.AUTHORIZATION,
  IncidentSimulationStage.ROUTING,
  IncidentSimulationStage.DISPATCH,
  IncidentSimulationStage.EXECUTION,
]);

export interface IncidentSimulationTimelineEntry {
  readonly sequence: number;
  readonly stage: IncidentSimulationStage;
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export interface IncidentSimulationClock {
  nowMs(): number;
}

class SystemIncidentSimulationClock implements IncidentSimulationClock {
  nowMs(): number {
    return Date.now();
  }
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepClone(nested);
    }
    return result as T;
  }

  return value;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value) as T;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

export class IncidentSimulationTimelineCollector {
  private readonly entries: IncidentSimulationTimelineEntry[] = [];

  push(stage: IncidentSimulationStage, startedAtMs: number, finishedAtMs: number): void {
    this.entries.push(
      Object.freeze({
        sequence: this.entries.length + 1,
        stage,
        startedAtMs,
        finishedAtMs,
        startedAt: toIso(startedAtMs),
        finishedAt: toIso(finishedAtMs),
        durationMs: Math.max(0, finishedAtMs - startedAtMs),
      }),
    );
  }

  toTimeline(): readonly IncidentSimulationTimelineEntry[] {
    return Object.freeze(this.entries.map((entry) => Object.freeze({ ...entry })));
  }
}

export class IncidentSimulationLatencyRecorder {
  private readonly durationByStage = new Map<IncidentSimulationStage, number>();

  constructor(
    private readonly clock: IncidentSimulationClock,
    private readonly timelineCollector: IncidentSimulationTimelineCollector,
  ) {}

  measureSync<T>(stage: IncidentSimulationStage, operation: () => T): T {
    const startedAtMs = this.clock.nowMs();
    const result = operation();
    const finishedAtMs = this.clock.nowMs();
    this.durationByStage.set(stage, Math.max(0, finishedAtMs - startedAtMs));
    this.timelineCollector.push(stage, startedAtMs, finishedAtMs);
    return result;
  }

  async measureAsync<T>(stage: IncidentSimulationStage, operation: () => Promise<T>): Promise<T> {
    const startedAtMs = this.clock.nowMs();
    const result = await operation();
    const finishedAtMs = this.clock.nowMs();
    this.durationByStage.set(stage, Math.max(0, finishedAtMs - startedAtMs));
    this.timelineCollector.push(stage, startedAtMs, finishedAtMs);
    return result;
  }

  toStageDurations(): Readonly<Record<IncidentSimulationStage, number>> {
    return Object.freeze({
      [IncidentSimulationStage.DETECTION]: this.durationByStage.get(IncidentSimulationStage.DETECTION) ?? 0,
      [IncidentSimulationStage.THREAT_INTERPRETATION]:
        this.durationByStage.get(IncidentSimulationStage.THREAT_INTERPRETATION) ?? 0,
      [IncidentSimulationStage.DECISION]: this.durationByStage.get(IncidentSimulationStage.DECISION) ?? 0,
      [IncidentSimulationStage.ACTION_PLANNING]: this.durationByStage.get(IncidentSimulationStage.ACTION_PLANNING) ?? 0,
      [IncidentSimulationStage.EXECUTION_PLANNING]: this.durationByStage.get(IncidentSimulationStage.EXECUTION_PLANNING) ?? 0,
      [IncidentSimulationStage.HOT_PATH_PLANNING]: this.durationByStage.get(IncidentSimulationStage.HOT_PATH_PLANNING) ?? 0,
      [IncidentSimulationStage.AUTHORIZATION]: this.durationByStage.get(IncidentSimulationStage.AUTHORIZATION) ?? 0,
      [IncidentSimulationStage.ROUTING]: this.durationByStage.get(IncidentSimulationStage.ROUTING) ?? 0,
      [IncidentSimulationStage.DISPATCH]: this.durationByStage.get(IncidentSimulationStage.DISPATCH) ?? 0,
      [IncidentSimulationStage.EXECUTION]: this.durationByStage.get(IncidentSimulationStage.EXECUTION) ?? 0,
    });
  }
}

class TimedRuntimeThreatInterpretationEngine implements RuntimeThreatInterpretationEngine {
  constructor(
    private readonly inner: RuntimeThreatInterpretationEngine,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  assess(detectionResults: readonly DetectionResult[]) {
    return this.recorder.measureSync(IncidentSimulationStage.THREAT_INTERPRETATION, () =>
      this.inner.assess(detectionResults),
    );
  }
}

class TimedSecurityDecisionEngine implements SecurityDecisionEngine {
  constructor(
    private readonly inner: SecurityDecisionEngine,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  evaluate = async (...args: Parameters<SecurityDecisionEngine['evaluate']>) =>
    this.recorder.measureAsync(IncidentSimulationStage.DECISION, () => this.inner.evaluate(...args));
}

class TimedSecurityHotPathPlanner implements SecurityHotPathPlanner {
  constructor(
    private readonly inner: SecurityHotPathPlanner,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  plan(executionPlan: SecurityExecutionPlan): SecurityHotPathPlan {
    return this.recorder.measureSync(IncidentSimulationStage.HOT_PATH_PLANNING, () => this.inner.plan(executionPlan));
  }
}

class TimedSecurityExecutionAuthorizationEngine implements SecurityExecutionAuthorizationEngine {
  constructor(
    private readonly inner: SecurityExecutionAuthorizationEngine,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  authorize(context: AuthorizationEvaluationContext): SecurityExecutionAuthorizationResult {
    return this.recorder.measureSync(IncidentSimulationStage.AUTHORIZATION, () => this.inner.authorize(context));
  }
}

class TimedSecurityExecutionRouter implements SecurityExecutionRouter {
  constructor(
    private readonly inner: SecurityExecutionRouter,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  route(context: Parameters<SecurityExecutionRouter['route']>[0]): SecurityExecutionRoutingResult {
    return this.recorder.measureSync(IncidentSimulationStage.ROUTING, () => this.inner.route(context));
  }
}

class TimedSecurityExecutionDispatcher implements SecurityExecutionDispatcher {
  constructor(
    private readonly inner: SecurityExecutionDispatcher,
    private readonly recorder: IncidentSimulationLatencyRecorder,
  ) {}

  dispatch(routingResult: SecurityExecutionRoutingResult): SecurityExecutionDispatchResult {
    return this.recorder.measureSync(IncidentSimulationStage.DISPATCH, () => this.inner.dispatch(routingResult));
  }
}

function toLatencyStageDurations(
  stageDurationsMs: Readonly<Record<IncidentSimulationStage, number>>,
): Readonly<Record<SecurityLatencyStage, number>> {
  return Object.freeze({
    [SecurityLatencyStage.DETECTION]: stageDurationsMs[IncidentSimulationStage.DETECTION],
    [SecurityLatencyStage.THREAT_INTERPRETATION]: stageDurationsMs[IncidentSimulationStage.THREAT_INTERPRETATION],
    [SecurityLatencyStage.DECISION]: stageDurationsMs[IncidentSimulationStage.DECISION],
    [SecurityLatencyStage.ACTION_PLANNING]: stageDurationsMs[IncidentSimulationStage.ACTION_PLANNING],
    [SecurityLatencyStage.EXECUTION_PLANNING]: stageDurationsMs[IncidentSimulationStage.EXECUTION_PLANNING],
    [SecurityLatencyStage.HOT_PATH_PLANNING]: stageDurationsMs[IncidentSimulationStage.HOT_PATH_PLANNING],
    [SecurityLatencyStage.AUTHORIZATION]: stageDurationsMs[IncidentSimulationStage.AUTHORIZATION],
  });
}

export interface IncidentSimulationInput {
  readonly normalizedEvent: DiscordGatewayNormalizedEvent;
  readonly detectionContext: DetectionContext;
  readonly orchestrationMetadata?: Record<string, unknown>;
}

export interface IncidentSimulationDependencies {
  readonly detectionEngine: DetectionEngine;
  readonly contextBuilder: SecurityContextBuilder;
  readonly attributionEngine: AuditAttributionEngine;
  readonly policyEngine: SecurityPolicyEngine;
  readonly decisionEngine: SecurityDecisionEngine;
  readonly threatInterpretationEngine?: RuntimeThreatInterpretationEngine;
  readonly actionPlanner: SecurityActionPlanner;
  readonly executionPlanner: SecurityExecutionPlanner;
  readonly hotPathPlanner: SecurityHotPathPlanner;
  readonly authorizationEngine: SecurityExecutionAuthorizationEngine;
  readonly executionRouter: SecurityExecutionRouter;
  readonly executionDispatcher: SecurityExecutionDispatcher;
  readonly executorRegistry?: InMemorySecurityExecutorRegistry;
  readonly coordinatedContainment: CoordinatedContainmentExecutionDependencies;
  readonly latencyBudgetEvaluator?: SecurityLatencyBudgetEvaluator;
  readonly latencyBudgetProfile?: SecurityLatencyBudgetProfile;
}

export interface IncidentSimulationReport {
  readonly reportId: string;
  readonly correlationId: string;
  readonly timeline: readonly IncidentSimulationTimelineEntry[];
  readonly stageDurationsMs: Readonly<Record<IncidentSimulationStage, number>>;
  readonly latencyEnvelope: SecurityHotPathLatencyEnvelope;
  readonly detectionResults: readonly DetectionResult[];
  readonly securityDecision: SecurityDecisionModel;
  readonly actionPlan: SecurityActionPlan;
  readonly executionPlan: SecurityExecutionPlan;
  readonly orchestrationResult: SecurityExecutionOrchestrationResult;
  readonly coordinatedContainmentResult: CoordinatedContainmentExecutionResult;
  readonly metadata: {
    readonly source: 'in-memory-incident-simulator';
    readonly stageOrder: readonly IncidentSimulationStage[];
    readonly generatedAt: string;
  };
}

export interface IncidentSimulationReportInput {
  readonly correlationId: string;
  readonly timeline: readonly IncidentSimulationTimelineEntry[];
  readonly stageDurationsMs: Readonly<Record<IncidentSimulationStage, number>>;
  readonly latencyEnvelope: SecurityHotPathLatencyEnvelope;
  readonly detectionResults: readonly DetectionResult[];
  readonly securityDecision: SecurityDecisionModel;
  readonly actionPlan: SecurityActionPlan;
  readonly executionPlan: SecurityExecutionPlan;
  readonly orchestrationResult: SecurityExecutionOrchestrationResult;
  readonly coordinatedContainmentResult: CoordinatedContainmentExecutionResult;
}

export class IncidentSimulationReportGenerator {
  generate(input: IncidentSimulationReportInput): IncidentSimulationReport {
    const generatedAt = input.timeline[input.timeline.length - 1]?.finishedAt ?? new Date(0).toISOString();
    const report = deepClone({
      reportId: `incident-simulation:${input.correlationId}`,
      correlationId: input.correlationId,
      timeline: input.timeline,
      stageDurationsMs: input.stageDurationsMs,
      latencyEnvelope: input.latencyEnvelope,
      detectionResults: input.detectionResults,
      securityDecision: input.securityDecision,
      actionPlan: input.actionPlan,
      executionPlan: input.executionPlan,
      orchestrationResult: input.orchestrationResult,
      coordinatedContainmentResult: input.coordinatedContainmentResult,
      metadata: {
        source: 'in-memory-incident-simulator' as const,
        stageOrder: INCIDENT_SIMULATION_STAGE_ORDER,
        generatedAt,
      },
    });

    return deepFreeze(report);
  }
}

export interface IncidentSimulationRunner {
  simulate(input: IncidentSimulationInput): Promise<IncidentSimulationReport>;
}

export class InMemoryIncidentSimulationRunner implements IncidentSimulationRunner {
  private readonly timelineCollector = new IncidentSimulationTimelineCollector();
  private readonly latencyRecorder: IncidentSimulationLatencyRecorder;
  private readonly reportGenerator: IncidentSimulationReportGenerator;
  private readonly latencyBudgetEvaluator: SecurityLatencyBudgetEvaluator;
  private readonly threatInterpretationEngine: RuntimeThreatInterpretationEngine;
  private readonly clock: IncidentSimulationClock;

  constructor(
    private readonly dependencies: IncidentSimulationDependencies,
    clock?: IncidentSimulationClock,
    reportGenerator: IncidentSimulationReportGenerator = new IncidentSimulationReportGenerator(),
  ) {
    this.clock = clock ?? new SystemIncidentSimulationClock();
    this.latencyRecorder = new IncidentSimulationLatencyRecorder(this.clock, this.timelineCollector);
    this.reportGenerator = reportGenerator;
    this.latencyBudgetEvaluator = dependencies.latencyBudgetEvaluator ?? new InMemorySecurityLatencyBudgetEvaluator();
    this.threatInterpretationEngine = dependencies.threatInterpretationEngine ??
      new InMemoryRuntimeThreatInterpretationEngine();
  }

  async simulate(input: IncidentSimulationInput): Promise<IncidentSimulationReport> {
    const detectionResults = await this.latencyRecorder.measureAsync(IncidentSimulationStage.DETECTION, () =>
      this.dependencies.detectionEngine.evaluate(input.detectionContext),
    );

    const timedThreatInterpretation = new TimedRuntimeThreatInterpretationEngine(
      this.threatInterpretationEngine,
      this.latencyRecorder,
    );
    const timedDecisionEngine = new TimedSecurityDecisionEngine(this.dependencies.decisionEngine, this.latencyRecorder);
    const evaluationPipeline = new InMemorySecurityEvaluationPipeline(
      this.dependencies.contextBuilder,
      this.dependencies.attributionEngine,
      this.dependencies.policyEngine,
      timedDecisionEngine,
      timedThreatInterpretation,
    );

    evaluationPipeline.stageDetectionResults(detectionResults);
    const securityDecision = await evaluationPipeline.evaluate(
      input.normalizedEvent,
      input.detectionContext.actorId,
      input.detectionContext.actionType,
    );

    const actionPlan = this.latencyRecorder.measureSync(IncidentSimulationStage.ACTION_PLANNING, () =>
      this.dependencies.actionPlanner.plan(securityDecision),
    );
    const executionPlan = this.latencyRecorder.measureSync(IncidentSimulationStage.EXECUTION_PLANNING, () =>
      this.dependencies.executionPlanner.plan(actionPlan, securityDecision),
    );

    const orchestrator = new InMemorySecurityExecutionOrchestrator(
      new TimedSecurityHotPathPlanner(this.dependencies.hotPathPlanner, this.latencyRecorder),
      new TimedSecurityExecutionAuthorizationEngine(this.dependencies.authorizationEngine, this.latencyRecorder),
      this.dependencies.executorRegistry ?? new InMemorySecurityExecutorRegistry(),
      new TimedSecurityExecutionRouter(this.dependencies.executionRouter, this.latencyRecorder),
      new TimedSecurityExecutionDispatcher(this.dependencies.executionDispatcher, this.latencyRecorder),
    );

    const orchestrationResult = orchestrator.orchestrate(
      Object.freeze({
        executionPlan,
        metadata: input.orchestrationMetadata,
      }),
    );

    const coordinatedContainmentResult = await this.latencyRecorder.measureAsync(IncidentSimulationStage.EXECUTION, () =>
      orchestrator.executeCoordinatedContainment(
        Object.freeze({
          executionPlan,
          metadata: input.orchestrationMetadata,
        }),
        this.dependencies.coordinatedContainment,
      ),
    );

    const stageDurationsMs = this.latencyRecorder.toStageDurations();
    const latencyEnvelope = this.latencyBudgetEvaluator.evaluate(
      toLatencyStageDurations(stageDurationsMs),
      this.dependencies.latencyBudgetProfile,
    );

    return this.reportGenerator.generate({
      correlationId: executionPlan.correlationId,
      timeline: this.timelineCollector.toTimeline(),
      stageDurationsMs,
      latencyEnvelope,
      detectionResults,
      securityDecision,
      actionPlan,
      executionPlan,
      orchestrationResult,
      coordinatedContainmentResult,
    });
  }
}