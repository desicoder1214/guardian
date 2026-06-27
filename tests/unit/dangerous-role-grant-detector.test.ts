import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { DangerousRoleGrantDetector } from '../../src/core/runtime/discord/dangerous-role-grant-detector';
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
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { InMemorySecurityDetectionForwarder } from '../../src/core/runtime/discord/security-detection-forwarder';
import { SecurityEvaluationPipeline } from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { SecurityActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

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
          metadata: { detector: 'dangerous-role-grant' },
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

function buildRoleUpdateEvent(overrides: Partial<DiscordGatewayNormalizedEvent> = {}): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'GUILD_ROLE_UPDATE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-role-update-1',
    payload: {
      guildId: 'guild-1',
      actorId: 'actor-1',
      beforePermissions: ['VIEW_CHANNEL'],
      afterPermissions: ['VIEW_CHANNEL', 'ADMINISTRATOR'],
    },
    ...overrides,
  };
}

test('dangerous permission grant is detected', async () => {
  const detector = new DangerousRoleGrantDetector();
  const result = await detector.detect(buildRoleUpdateEvent());

  expect(detector.supports('GUILD_ROLE_UPDATE')).toBe(true);
  expect(result.detected).toBe(true);
  expect(result.detectorId).toBe('dangerous-role-grant-detector');
  expect(result.detectorName).toBe('DangerousRoleGrantDetector');
  expect(result.correlationId).toBe('corr-role-update-1');
  expect((result.metadata as { grantedDangerousPermissions?: unknown }).grantedDangerousPermissions).toEqual([
    'ADMINISTRATOR',
  ]);
});

test('safe role update is ignored', async () => {
  const detector = new DangerousRoleGrantDetector();
  const result = await detector.detect(
    buildRoleUpdateEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        beforePermissions: ['VIEW_CHANNEL'],
        afterPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
      },
    }),
  );

  expect(result.detected).toBe(false);
});

test('dangerous role added to member is detected', async () => {
  const detector = new DangerousRoleGrantDetector();
  const result = await detector.detect(
    buildRoleUpdateEvent({
      eventName: 'GUILD_MEMBER_UPDATE',
      correlationId: 'corr-member-update-1',
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        beforePermissions: ['VIEW_CHANNEL'],
        afterPermissions: ['VIEW_CHANNEL', 'MODERATE_MEMBERS'],
      },
    }),
  );

  expect(result.detected).toBe(true);
  expect(result.correlationId).toBe('corr-member-update-1');
});

test('no permission increase is ignored', async () => {
  const detector = new DangerousRoleGrantDetector();
  const result = await detector.detect(
    buildRoleUpdateEvent({
      eventName: 'GUILD_ROLE_UPDATE',
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-1',
        beforePermissions: ['VIEW_CHANNEL', 'BAN_MEMBERS'],
        afterPermissions: ['VIEW_CHANNEL', 'BAN_MEMBERS'],
      },
    }),
  );

  expect(result.detected).toBe(false);
});

test('unsupported events are ignored', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new DangerousRoleGrantDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(
    buildRoleUpdateEvent({
      eventName: 'MESSAGE_CREATE',
      correlationId: 'corr-unsupported-1',
    }),
  );

  expect(results).toEqual([]);
  expect(evaluationPipeline.calls).toEqual([]);
  expect(planner.calls).toEqual([]);
  expect(dispatcher.calls).toEqual([]);
});

test('trusted placeholder actor still flows into evaluation pipeline', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new DangerousRoleGrantDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(
    buildRoleUpdateEvent({
      payload: {
        guildId: 'guild-1',
        actorId: 'trusted-user',
        beforePermissions: ['VIEW_CHANNEL'],
        afterPermissions: ['VIEW_CHANNEL', 'MANAGE_ROLES'],
      },
    }),
  );

  expect(results).toHaveLength(1);
  expect(results[0].detected).toBe(true);
  expect(evaluationPipeline.calls).toHaveLength(1);
  expect(evaluationPipeline.calls[0].actorId).toBe('trusted-user');
  expect(evaluationPipeline.calls[0].actionType).toBe(SecurityActionType.ROLE_CREATE);
});

test('correlationId is preserved end-to-end and security evaluation is invoked', async () => {
  const registry = new InMemoryDetectorRegistry();
  const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
  const planner = new RecordingSecurityActionPlanner();
  const dispatcher = new RecordingSecurityActionDispatcher();
  const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

  registry.register(new DangerousRoleGrantDetector());

  const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
  const results = await pipeline.execute(
    buildRoleUpdateEvent({
      eventName: 'MEMBER_ROLE_ADD',
      correlationId: 'corr-member-role-add-9',
      payload: {
        guildId: 'guild-1',
        actorId: 'actor-2',
        rolePermissions: ['VIEW_CHANNEL', 'BAN_MEMBERS'],
      },
    }),
  );

  expect(results).toHaveLength(1);
  expect(results[0].detected).toBe(true);
  expect(results[0].correlationId).toBe('corr-member-role-add-9');

  expect(evaluationPipeline.calls).toHaveLength(1);
  expect(evaluationPipeline.calls[0].actionType).toBe(SecurityActionType.ROLE_CREATE);
  expect(evaluationPipeline.calls[0].normalizedEvent.correlationId).toBe('corr-member-role-add-9');

  expect(planner.calls).toHaveLength(1);
  expect(planner.calls[0].correlationId).toBe('corr-member-role-add-9');

  expect(dispatcher.calls).toHaveLength(1);
  expect(dispatcher.calls[0].correlationId).toBe('corr-member-role-add-9');
});

test('dangerous role grant detector path has no side effects or HTTP calls', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const registry = new InMemoryDetectorRegistry();
    const evaluationPipeline = new RecordingSecurityEvaluationPipeline();
    const planner = new RecordingSecurityActionPlanner();
    const dispatcher = new RecordingSecurityActionDispatcher();
    const forwarder = new InMemorySecurityDetectionForwarder(evaluationPipeline, planner, dispatcher);

    registry.register(new DangerousRoleGrantDetector());

    const pipeline = new InMemoryDetectorPipeline(registry, forwarder);
    await pipeline.execute(buildRoleUpdateEvent());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
