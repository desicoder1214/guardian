import { IncidentContext, IncidentSeverity } from './incident-correlation-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionPlanner } from './security-action-planner';
import { SecurityEvaluationPipeline } from './security-evaluation-pipeline';
import { SecurityExecutionEngine } from './security-execution-types';
import {
  SecurityRuntimeCoordinator,
  SecurityRuntimeCoordinatorInput,
  SecurityRuntimeResult,
} from './security-runtime-coordinator-types';
import { SecurityDecision } from './security-policy-types';
import { SecurityDecisionModel } from './security-decision-types';

interface SecurityRuntimeCoordinatorOptions {
  readonly now?: () => number;
  readonly incidentContextFactory?: (
    decision: SecurityDecisionModel,
    normalizedEvent: DiscordGatewayNormalizedEvent,
    input: SecurityRuntimeCoordinatorInput,
  ) => IncidentContext;
}

export class InMemorySecurityRuntimeCoordinator implements SecurityRuntimeCoordinator {
  private readonly now: () => number;
  private readonly incidentContextFactory: (
    decision: SecurityDecisionModel,
    normalizedEvent: DiscordGatewayNormalizedEvent,
    input: SecurityRuntimeCoordinatorInput,
  ) => IncidentContext;

  constructor(
    private readonly evaluationPipeline: SecurityEvaluationPipeline,
    private readonly actionPlanner: SecurityActionPlanner,
    private readonly executionEngine: SecurityExecutionEngine,
    options: SecurityRuntimeCoordinatorOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.incidentContextFactory =
      options.incidentContextFactory ?? this.buildFallbackIncidentContext.bind(this);
  }

  async coordinate(input: SecurityRuntimeCoordinatorInput): Promise<SecurityRuntimeResult> {
    const startedAtMs = this.now();
    const decision = await this.evaluationPipeline.evaluate(
      input.normalizedEvent,
      input.actorId,
      input.actionType,
    );
    const actionPlan = this.actionPlanner.plan(decision);
    const incidentContext = input.incidentContext ?? this.incidentContextFactory(decision, input.normalizedEvent, input);
    const executionResult = await this.executionEngine.execute(actionPlan, incidentContext);
    const finishedAtMs = this.now();

    return {
      decision,
      actionPlan,
      executionResult,
      correlationId: decision.correlationId,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
    };
  }

  private buildFallbackIncidentContext(
    decision: SecurityDecisionModel,
    normalizedEvent: DiscordGatewayNormalizedEvent,
  ): IncidentContext {
    const severity = this.resolveFallbackSeverity(decision.decision);

    return {
      incidentId: `incident-${decision.correlationId}`,
      guildId: decision.guildId,
      actorId: decision.actorId,
      correlationIds: [decision.correlationId],
      firstSeen: normalizedEvent.timestamp,
      lastSeen: normalizedEvent.timestamp,
      severity,
      detections: [],
      metadata: {
        escalationLevel: severity,
        source: 'security-runtime-coordinator-fallback',
        fallbackIncidentContext: true,
      },
    };
  }

  private resolveFallbackSeverity(decision: SecurityDecision): IncidentSeverity {
    if (decision === SecurityDecision.BLOCK || decision === SecurityDecision.CONTAIN) {
      return IncidentSeverity.HIGH;
    }

    if (decision === SecurityDecision.INVESTIGATE) {
      return IncidentSeverity.MEDIUM;
    }

    return IncidentSeverity.LOW;
  }
}
