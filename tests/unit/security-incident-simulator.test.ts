import fs from 'node:fs';
import path from 'node:path';
import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditAttributionEngine,
  AuditAttributionResult,
} from '../../src/core/runtime/discord/audit-attribution-types';
import {
  DetectionConfidence,
  DetectionContext,
  DetectionDisposition,
  DetectionEngine,
  DetectionResult,
  DetectionSeverity,
} from '../../src/core/runtime/discord/detection-engine';
import { InMemoryDiscordExecutionService } from '../../src/core/runtime/discord/discord-execution-service';
import { InMemoryRuntimeThreatInterpretationEngine } from '../../src/core/runtime/discord/runtime-threat-interpretation-engine';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  InMemorySecurityActionPlanner,
  SecurityAction,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import { InMemorySecurityContextBuilder } from '../../src/core/runtime/discord/security-context';
import { InMemorySecurityDecisionEngine } from '../../src/core/runtime/discord/security-decision-engine';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  IncidentSimulationClock,
  IncidentSimulationStage,
  InMemoryIncidentSimulationRunner,
} from '../../src/core/runtime/discord/security-incident-simulator';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
  SecurityPolicyEngine,
  SecurityDecisionResult,
} from '../../src/core/runtime/discord/security-policy-types';

class DeterministicClock implements IncidentSimulationClock {
  private readonly samples: readonly number[];
  private index = 0;

  constructor(samples: readonly number[]) {
    this.samples = samples;
  }

  nowMs(): number {
    const sample = this.samples[Math.min(this.index, this.samples.length - 1)];
    this.index += 1;
    return sample;
  }
}

class StubDetectionEngine implements DetectionEngine {
  constructor(private readonly detections: readonly DetectionResult[]) {}

  async evaluate(_context: DetectionContext): Promise<readonly DetectionResult[]> {
    return this.detections;
  }
}

class StubAttributionEngine implements AuditAttributionEngine {
  async attribute(
    _normalizedEvent: Parameters<AuditAttributionEngine['attribute']>[0],
    _actionType: Parameters<AuditAttributionEngine['attribute']>[1],
  ): Promise<AuditAttributionResult> {
    return Object.freeze({
      actorId: 'actor-sim-1',
      targetId: 'bot-sim-1',
      auditLogCorrelationId: 'audit-sim-1',
      confidence: AuditAttributionConfidence.HIGH,
      reason: 'stub attribution',
      matchedEntry: Object.freeze({
        id: 'audit-entry-sim-1',
        guildId: 'guild-sim-1',
        actorId: 'actor-sim-1',
        targetId: 'bot-sim-1',
        actionType: AuditActionType.BOT_ADD,
        resourceId: 'bot-sim-1',
        timestamp: '2026-04-01T00:00:00.000Z',
      }),
    });
  }
}

class StubPolicyEngine implements SecurityPolicyEngine {
  async evaluate(
    _context: Parameters<SecurityPolicyEngine['evaluate']>[0],
  ): Promise<SecurityDecisionResult> {
    return Object.freeze({
      decision: SecurityDecision.BLOCK,
      guildId: 'guild-sim-1',
      actorId: 'actor-sim-1',
      actionType: SecurityPolicyActionType.BOT_ADD,
      eventName: 'BOT_ADD',
      reason: 'stub policy decision',
      policyEnabled: true,
      thresholdExceeded: true,
      trustedActorIds: Object.freeze([]),
      observedCount: 1,
      threshold: 0,
      metadata: Object.freeze({ source: 'stub-policy-engine' }),
    });
  }
}

class StubRouterActionExecutor implements SecurityActionExecutor {
  constructor(private readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'stub-router-action-executor' }),
    });
  }
}

function buildDetectionResult(): DetectionResult {
  return {
    detectorId: 'unauthorized-bot-add-detector',
    matched: true,
    findings: [
      {
        detectorId: 'unauthorized-bot-add-detector',
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.CERTAIN,
        disposition: DetectionDisposition.MALICIOUS,
        reason: 'unauthorized bot add detected',
        correlationId: 'corr-sim-1',
        metadata: { source: 'sim-test' },
      },
    ],
    correlationId: 'corr-sim-1',
    metadata: { source: 'sim-test' },
  };
}

function buildDetectionContext(): DetectionContext {
  return Object.freeze({
    normalizedEvent: Object.freeze({
      eventName: 'BOT_ADD',
      source: 'discord-gateway',
      timestamp: '2026-04-01T00:00:00.000Z',
      correlationId: 'corr-sim-1',
      payload: Object.freeze({
        guildId: 'guild-sim-1',
        actorId: 'actor-sim-1',
        botId: 'bot-sim-1',
      }),
    }),
    actorId: 'actor-sim-1',
    guildId: 'guild-sim-1',
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: 'corr-sim-1',
    timestamp: '2026-04-01T00:00:00.000Z',
    metadata: Object.freeze({ source: 'sim-test' }),
  });
}

function stageDurationsFixture(): Readonly<Record<IncidentSimulationStage, number>> {
  return Object.freeze({
    [IncidentSimulationStage.DETECTION]: 2,
    [IncidentSimulationStage.THREAT_INTERPRETATION]: 3,
    [IncidentSimulationStage.DECISION]: 4,
    [IncidentSimulationStage.ACTION_PLANNING]: 5,
    [IncidentSimulationStage.EXECUTION_PLANNING]: 6,
    [IncidentSimulationStage.HOT_PATH_PLANNING]: 7,
    [IncidentSimulationStage.AUTHORIZATION]: 8,
    [IncidentSimulationStage.ROUTING]: 9,
    [IncidentSimulationStage.DISPATCH]: 10,
    [IncidentSimulationStage.EXECUTION]: 11,
  });
}

function buildClockSamples(durations: Readonly<Record<IncidentSimulationStage, number>>): readonly number[] {
  const orderedStages: readonly IncidentSimulationStage[] = [
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
  ];

  const samples: number[] = [];
  let now = 10_000;

  for (const stage of orderedStages) {
    samples.push(now);
    now += durations[stage];
    samples.push(now);
    now += 1;
  }

  return Object.freeze(samples);
}

function createRunner(clock: IncidentSimulationClock, detectionResults: readonly DetectionResult[]) {
  const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
  actionExecutorRegistry.register(new StubRouterActionExecutor(SecurityActionType.REMOVE_UNAUTHORIZED_BOT));
  actionExecutorRegistry.register(new StubRouterActionExecutor(SecurityActionType.FREEZE_WEBHOOKS));

  return new InMemoryIncidentSimulationRunner(
    {
      detectionEngine: new StubDetectionEngine(detectionResults),
      contextBuilder: new InMemorySecurityContextBuilder(),
      attributionEngine: new StubAttributionEngine(),
      policyEngine: new StubPolicyEngine(),
      decisionEngine: new InMemorySecurityDecisionEngine(),
      threatInterpretationEngine: new InMemoryRuntimeThreatInterpretationEngine(),
      actionPlanner: new InMemorySecurityActionPlanner(),
      executionPlanner: new InMemorySecurityExecutionPlanner(),
      hotPathPlanner: new InMemorySecurityHotPathPlanner(),
      authorizationEngine: new InMemorySecurityExecutionAuthorizationEngine(),
      executionRouter: new InMemorySecurityExecutionRouter(actionExecutorRegistry),
      executionDispatcher: new InMemorySecurityExecutionDispatcher(),
      coordinatedContainment: Object.freeze({
        discordExecutionService: new InMemoryDiscordExecutionService(),
      }),
    },
    clock,
  );
}

describe('InMemoryIncidentSimulationRunner', () => {
  it('captures deterministic stage order and expected durations', async () => {
    const durations = stageDurationsFixture();
    const clock = new DeterministicClock(buildClockSamples(durations));
    const detectionResult = buildDetectionResult();
    const runner = createRunner(clock, [detectionResult]);
    const detectionContext = buildDetectionContext();

    const report = await runner.simulate({
      normalizedEvent: detectionContext.normalizedEvent,
      detectionContext,
    });

    expect(report.timeline.map((entry) => entry.stage)).toEqual([
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
    expect(report.stageDurationsMs).toEqual(durations);
  });

  it('produces repeatable timing capture across runs', async () => {
    const durations = stageDurationsFixture();
    const detectionContext = buildDetectionContext();

    const runOne = await createRunner(
      new DeterministicClock(buildClockSamples(durations)),
      [buildDetectionResult()],
    ).simulate({
      normalizedEvent: detectionContext.normalizedEvent,
      detectionContext,
    });

    const runTwo = await createRunner(
      new DeterministicClock(buildClockSamples(durations)),
      [buildDetectionResult()],
    ).simulate({
      normalizedEvent: detectionContext.normalizedEvent,
      detectionContext,
    });

    expect(runOne.stageDurationsMs).toEqual(runTwo.stageDurationsMs);
    expect(runOne.timeline.map((entry) => entry.durationMs)).toEqual(
      runTwo.timeline.map((entry) => entry.durationMs),
    );
  });

  it('returns immutable reports and does not mutate source detection results', async () => {
    const durations = stageDurationsFixture();
    const detectionResult = buildDetectionResult();
    const detectionContext = buildDetectionContext();
    const report = await createRunner(
      new DeterministicClock(buildClockSamples(durations)),
      [detectionResult],
    ).simulate({
      normalizedEvent: detectionContext.normalizedEvent,
      detectionContext,
    });

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.timeline)).toBe(true);
    expect(Object.isFrozen(report.stageDurationsMs)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(detectionResult.findings[0].reason).toBe('unauthorized bot add detected');
    (detectionResult.findings as unknown as Array<{ reason: string }>)[0].reason =
      'mutated externally after simulation';
    expect(report.detectionResults[0].findings[0].reason).toBe('unauthorized bot add detected');

    expect(() => {
      (report.timeline as unknown as Array<unknown>).push('illegal');
    }).toThrow(TypeError);
  });

  it('does not introduce prohibited persistence or dashboard surfaces', () => {
    const filePath = path.join(
      process.cwd(),
      'src/core/runtime/discord/security-incident-simulator.ts',
    );
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toMatch(/typeorm|prisma|mongoose|sequelize/i);
    expect(source).not.toMatch(/writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/dashboard|grafana|prometheus/i);
    expect(source).not.toMatch(/registerCommand|slash command/i);
  });
});