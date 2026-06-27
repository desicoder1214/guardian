import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { InMemoryDetectorPipeline } from '../../src/core/runtime/discord/generic-detector-pipeline';
import { InMemoryDetectorRegistry } from '../../src/core/runtime/discord/generic-detector-registry';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionDispatcher } from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  SecurityActionPlan,
  SecurityActionPlanner,
  SecurityActionPriority,
  SecurityActionType as PlannedActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionReason, SecurityDecisionModel } from '../../src/core/runtime/discord/security-decision-types';
import { InMemorySecurityDetectionForwarder } from '../../src/core/runtime/discord/security-detection-forwarder';
import { SecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { SecurityActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';
import { UnauthorizedBotAddDetector } from '../../src/core/runtime/discord/unauthorized-bot-add-detector';

class RecordingSecurityEvaluationPipeline implements SecurityEvaluationPipeline {
  readonly calls: Array<{ normalizedEvent: DiscordGatewayNormalizedEvent; actorId: string; actionType: SecurityActionType }> = [];

  async evaluate(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): Promise<SecurityDecisionModel> {
    this.calls.push({ normalizedEvent, actorId, actionType });

    return {
      decision: SecurityDecision.INVESTIGATE,
      reason: SecurityDecisionReason.ATTRIBUTION_LOW_CONFIDENCE,
      confidence: AuditAttributionConfidence.MEDIUM,
      actorId,
      guildId: 'guild-1',
      actionType,
      correlationId: normalizedEvent.correlationId,
    };
  }
}

class RecordingSecurityActionPlanner implements SecurityActionPlanner {
  readonly calls: SecurityDecisionModel[] = [];

  plan(decisionModel: SecurityDecisionModel): SecurityActionPlan {
    this.calls.push(decisionModel);

    return {
      decision: decisionModel.decision,
      correlationId: decisionModel.correlationId,
      actions: [
        {
          type: PlannedActionType.CREATE_INCIDENT,
          priority: SecurityActionPriority.NORMAL,
          sequence: 1,
          metadata: { test: true },
        },
      ],
    };
  }
}

class RecordingSecurityActionDispatcher implements SecurityActionDispatcher {
  readonly calls: SecurityActionPlan[] = [];

  async dispatch(plan: SecurityActionPlan) {
    this.calls.push(plan);

    return {
      correlationId: plan.correlationId,
      results: [],
    };
  }
}

function buildEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'BOT_ADD',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-bot-add-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      botId: 'bot-1',
      authorized: false,
    },
    ...overrides,
  };
}

function buildGuildMemberAddEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_MEMBER_ADD',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-member-add-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      user: {
        id: 'bot-1',
        bot: true,
      },
    },
    ...overrides,
  };
}

test('supported BOT_ADD event is recognized and emits DetectionResult', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.detect(buildEvent());

  expect(detector.supports('BOT_ADD')).toBe(true);
  expect(result.detectorId).toBe('unauthorized-bot-add-detector');
  expect(result.detectorName).toBe('UnauthorizedBotAddDetector');
  expect(result.eventType).toBe('BOT_ADD');
  expect(result.detected).toBe(true);
  expect(result.correlationId).toBe('corr-bot-add-1');
});

test('GUILD_MEMBER_ADD with bot payload maps to unauthorized bot detection', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.detect(buildGuildMemberAddEvent());

  expect(detector.supports('GUILD_MEMBER_ADD')).toBe(true);
  expect(result.eventType).toBe('GUILD_MEMBER_ADD');
  expect(result.detected).toBe(true);
});

test('non-bot GUILD_MEMBER_ADD is ignored', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.detect(
    buildGuildMemberAddEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        user: {
          id: 'user-1',
          bot: false,
        },
      },
    }),
  );

  expect(result.detected).toBe(false);
});

test('authorized or trusted or allowlisted bot add is ignored', async () => {
  const detector = new UnauthorizedBotAddDetector();

  const authorizedResult = await detector.detect(
    buildEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        botId: 'bot-1',
        authorized: true,
      },
    }),
  );

  const trustedResult = await detector.detect(
    buildGuildMemberAddEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        user: {
          id: 'bot-2',
          bot: true,
        },
        trusted: true,
      },
    }),
  );

  const allowlistedResult = await detector.detect(
    buildGuildMemberAddEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        user: {
          id: 'bot-3',
          bot: true,
        },
        allowlisted: true,
      },
    }),
  );

  expect(authorizedResult.detected).toBe(false);
  expect(trustedResult.detected).toBe(false);
  expect(allowlistedResult.detected).toBe(false);
});

test('missing authorization signal defaults to detection for bot add events', async () => {
  const detector = new UnauthorizedBotAddDetector();
  const result = await detector.detect(
    buildGuildMemberAddEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        user: {
          id: 'bot-4',
          bot: true,
        },
      },
    }),
  );

  expect(result.detected).toBe(true);
});

test('unsupported events are ignored by the detector pipeline', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new UnauthorizedBotAddDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(buildEvent({ eventName: 'CHANNEL_DELETE' }));

  expect(results).toEqual([]);
  expect(evaluationPipeline.calls).toEqual([]);
  expect(planner.calls).toEqual([]);
  expect(dispatcher.calls).toEqual([]);
});

test('positive BOT_ADD detection invokes security evaluation pipeline and preserves correlationId', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new UnauthorizedBotAddDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(buildEvent({ correlationId: 'corr-bot-add-9' }));

  expect(results).toHaveLength(1);
  expect(results[0].detected).toBe(true);
  expect(results[0].correlationId).toBe('corr-bot-add-9');

  expect(evaluationPipeline.calls).toHaveLength(1);
  expect(evaluationPipeline.calls[0].actionType).toBe(SecurityActionType.BOT_ADD);
  expect(evaluationPipeline.calls[0].actorId).toBe('actor-1');
  expect(evaluationPipeline.calls[0].normalizedEvent.correlationId).toBe('corr-bot-add-9');

  expect(planner.calls).toHaveLength(1);
  expect(planner.calls[0].correlationId).toBe('corr-bot-add-9');

  expect(dispatcher.calls).toHaveLength(1);
  expect(dispatcher.calls[0].correlationId).toBe('corr-bot-add-9');
});

test('GUILD_MEMBER_ADD bot detection forwards to evaluation, planner, and dispatcher with correlationId preserved end-to-end', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new UnauthorizedBotAddDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(buildGuildMemberAddEvent({ correlationId: 'corr-member-add-9' }));

  expect(results).toHaveLength(1);
  expect(results[0].detected).toBe(true);
  expect(results[0].correlationId).toBe('corr-member-add-9');

  expect(evaluationPipeline.calls).toHaveLength(1);
  expect(evaluationPipeline.calls[0].actionType).toBe(SecurityActionType.BOT_ADD);
  expect(evaluationPipeline.calls[0].normalizedEvent.correlationId).toBe('corr-member-add-9');

  expect(planner.calls).toHaveLength(1);
  expect(planner.calls[0].correlationId).toBe('corr-member-add-9');

  expect(dispatcher.calls).toHaveLength(1);
  expect(dispatcher.calls[0].correlationId).toBe('corr-member-add-9');
});

test('detector and forwarding path perform no side effects or HTTP calls', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const registry = new InMemoryDetectorRegistry();
    const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
    const planner = new RecordingSecurityActionPlanner();
    const dispatcher = new RecordingSecurityActionDispatcher();
    const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

    registry.register(new UnauthorizedBotAddDetector());

    const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
    await pipeline.execute(buildEvent());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
