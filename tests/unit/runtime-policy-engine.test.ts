import { SecurityActionType as SecurityPolicyActionType } from '../../src/core/runtime/discord/security-policy-types';
import {
  InMemoryRuntimePolicyEngine,
  RuntimePolicy,
  RuntimePolicyDecisionOutcome,
  RuntimePolicyDecisionReason,
} from '../../src/core/runtime/discord/runtime-policy-engine';

function createPolicy(overrides: Partial<RuntimePolicy> = {}): RuntimePolicy {
  return {
    maintenanceMode: false,
    dryRun: false,
    featureEnabled: true,
    trustedActorIds: [],
    trustedBotIds: [],
    actionEnabled: true,
    ...overrides,
  };
}

function createEngine(overrides: Partial<RuntimePolicy> = {}): InMemoryRuntimePolicyEngine {
  return new InMemoryRuntimePolicyEngine(createPolicy(overrides));
}

test('maintenance mode denies evaluation', () => {
  const engine = createEngine({ maintenanceMode: true });

  const decision = engine.evaluate({
    policy: createPolicy({ maintenanceMode: true }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.CHANNEL_DELETE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.DENY);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.MAINTENANCE_MODE);
});

test('dry-run evaluation is explicit', () => {
  const engine = createEngine({ dryRun: true });

  const decision = engine.evaluate({
    policy: createPolicy({ dryRun: true }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.ROLE_DELETE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.DRY_RUN);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.DRY_RUN_MODE);
});

test('trusted actor bypass is allowed', () => {
  const engine = createEngine({ trustedActorIds: ['actor-1'] });

  const decision = engine.evaluate({
    policy: createPolicy({ trustedActorIds: ['actor-1'] }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.BOT_ADD,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.ALLOW);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.TRUSTED_ACTOR);
  expect(decision.trustedActor).toBe(true);
});

test('trusted bot bypass is allowed', () => {
  const engine = createEngine({ trustedBotIds: ['bot-1'] });

  const decision = engine.evaluate({
    policy: createPolicy({ trustedBotIds: ['bot-1'] }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.WEBHOOK_DELETE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.ALLOW);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.TRUSTED_BOT);
  expect(decision.trustedBot).toBe(true);
});

test('disabled feature denies evaluation', () => {
  const engine = createEngine({ featureEnabled: false });

  const decision = engine.evaluate({
    policy: createPolicy({ featureEnabled: false }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.CHANNEL_CREATE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.DENY);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.FEATURE_DISABLED);
});

test('disabled action skips evaluation', () => {
  const engine = createEngine({ actionEnabled: false });

  const decision = engine.evaluate({
    policy: createPolicy({ actionEnabled: false }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.ROLE_CREATE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.SKIP);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.ACTION_DISABLED);
});

test('runtime policy decisions are immutable', () => {
  const engine = createEngine({ trustedActorIds: ['actor-1'] });

  const decision = engine.evaluate({
    policy: createPolicy({ trustedActorIds: ['actor-1'] }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.CHANNEL_DELETE,
  });

  expect(Object.isFrozen(decision)).toBe(true);

  expect(() => {
    (decision as { reason: RuntimePolicyDecisionReason }).reason = RuntimePolicyDecisionReason.UNKNOWN;
  }).toThrow(TypeError);
});

test('runtime policy evaluation is deterministic', () => {
  const engine = createEngine({ trustedActorIds: ['actor-1'] });
  const context = {
    policy: createPolicy({ trustedActorIds: ['actor-1'] }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.CHANNEL_DELETE,
  };

  const first = engine.evaluate(context);
  const second = engine.evaluate(context);

  expect(second).toEqual(first);
});

test('maintenance mode takes precedence over other flags', () => {
  const engine = createEngine({
    maintenanceMode: true,
    dryRun: true,
    featureEnabled: false,
    actionEnabled: false,
    trustedActorIds: ['actor-1'],
    trustedBotIds: ['bot-1'],
  });

  const decision = engine.evaluate({
    policy: createPolicy({
      maintenanceMode: true,
      dryRun: true,
      featureEnabled: false,
      actionEnabled: false,
      trustedActorIds: ['actor-1'],
      trustedBotIds: ['bot-1'],
    }),
    actorId: 'actor-1',
    botId: 'bot-1',
    actionType: SecurityPolicyActionType.WEBHOOK_CREATE,
  });

  expect(decision.decision).toBe(RuntimePolicyDecisionOutcome.DENY);
  expect(decision.reason).toBe(RuntimePolicyDecisionReason.MAINTENANCE_MODE);
});

test('runtime policy engine remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  const engine = createEngine();

  try {
    engine.evaluate({
      policy: createPolicy(),
      actorId: 'actor-1',
      botId: 'bot-1',
      actionType: SecurityPolicyActionType.CHANNEL_CREATE,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});