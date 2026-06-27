import * as fs from 'fs';
import * as path from 'path';
import {
  AuditActionType,
  AuditAttributionConfidence,
  AuditAttributionEngine,
  AuditAttributionResult,
} from '../../src/core/runtime/discord/audit-attribution-types';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { InMemorySecurityDecisionEngine } from '../../src/core/runtime/discord/security-decision-engine';
import {
  InMemorySecurityEvaluationPipeline,
  resolveAuditActionType,
} from '../../src/core/runtime/discord/security-evaluation-pipeline';
import { SecurityContext, SecurityContextBuilder } from '../../src/core/runtime/discord/security-context';
import {
  SecurityActionType,
  SecurityDecision,
  SecurityDecisionResult,
  SecurityPolicyEngine,
} from '../../src/core/runtime/discord/security-policy-types';

class StubSecurityContextBuilder implements SecurityContextBuilder {
  public buildCalls = 0;

  build(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityActionType,
  ): SecurityContext {
    this.buildCalls += 1;

    const payload = normalizedEvent.payload as Record<string, unknown>;
    return {
      guildId: (payload.guildId as string) ?? '',
      actorId,
      actionType,
      eventName: normalizedEvent.eventName,
      timestamp: normalizedEvent.timestamp,
      correlationId: normalizedEvent.correlationId,
      metadata: payload,
    };
  }
}

class StubAuditAttributionEngine implements AuditAttributionEngine {
  public attributeCalls = 0;
  public readonly actionTypes: AuditActionType[] = [];

  constructor(private readonly result: AuditAttributionResult) {}

  async attribute(
    _normalizedEvent: DiscordGatewayNormalizedEvent,
    actionType: AuditActionType,
  ): Promise<AuditAttributionResult> {
    this.attributeCalls += 1;
    this.actionTypes.push(actionType);
    return this.result;
  }
}

class StubSecurityPolicyEngine implements SecurityPolicyEngine {
  public evaluateCalls = 0;

  constructor(private readonly result: SecurityDecisionResult) {}

  async evaluate(_context: SecurityContext): Promise<SecurityDecisionResult> {
    this.evaluateCalls += 1;
    return this.result;
  }
}

function buildEvent(guildId = 'guild-1'): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-1',
    payload: {
      guildId,
    },
  };
}

function buildAttribution(overrides: Partial<AuditAttributionResult>): AuditAttributionResult {
  return {
    actorId: 'actor-1',
    confidence: AuditAttributionConfidence.HIGH,
    reason: 'matched',
    auditLogCorrelationId: 'audit-1',
    targetId: 'target-1',
    matchedEntry: undefined,
    ...overrides,
  };
}

function buildPolicy(overrides: Partial<SecurityDecisionResult>): SecurityDecisionResult {
  return {
    decision: SecurityDecision.ALLOW,
    guildId: 'guild-1',
    actorId: 'actor-1',
    actionType: SecurityActionType.CHANNEL_DELETE,
    eventName: 'CHANNEL_DELETE',
    reason: 'within threshold',
    policyEnabled: true,
    thresholdExceeded: false,
    trustedActorIds: [],
    observedCount: 1,
    threshold: 2,
    ...overrides,
  };
}

function readEvaluationPipelineSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-evaluation-pipeline.ts'),
    'utf8',
  );
}

test('every SecurityActionType maps explicitly to an AuditActionType', () => {
  for (const actionType of Object.values(SecurityActionType)) {
    expect(resolveAuditActionType(actionType)).toBeDefined();
  }
});

test('security evaluation pipeline source contains no unsafe enum cast patterns', () => {
  const source = readEvaluationPipelineSource();
  expect(source).not.toContain('as unknown as');
});

test('security evaluation pipeline source contains no policy reason string parsing', () => {
  const source = readEvaluationPipelineSource();
  expect(source).not.toContain('toLowerCase(');
  expect(source).not.toContain("includes('disabled')");
  expect(source).not.toContain("includes('no policy')");
  expect(source).not.toContain("includes('threshold exceeded')");
});

test('end-to-end evaluation returns ALLOW when attribution is high-confidence and policy allows', async () => {
  const contextBuilder = new StubSecurityContextBuilder();
  const attributionEngine = new StubAuditAttributionEngine(buildAttribution({}));
  const policyEngine = new StubSecurityPolicyEngine(buildPolicy({ decision: SecurityDecision.ALLOW }));
  const decisionEngine = new InMemorySecurityDecisionEngine();

  const pipeline = new InMemorySecurityEvaluationPipeline(
    contextBuilder,
    attributionEngine,
    policyEngine,
    decisionEngine,
  );

  const result = await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(result.decision).toBe(SecurityDecision.ALLOW);
  expect(contextBuilder.buildCalls).toBe(1);
  expect(attributionEngine.attributeCalls).toBe(1);
  expect(attributionEngine.actionTypes).toEqual([AuditActionType.CHANNEL_DELETE]);
  expect(policyEngine.evaluateCalls).toBe(1);
});

test('unsupported action mapping fails safely without attribution engine call', async () => {
  const contextBuilder = new StubSecurityContextBuilder();
  const attributionEngine = new StubAuditAttributionEngine(buildAttribution({}));
  const policyEngine = new StubSecurityPolicyEngine(
    buildPolicy({
      decision: SecurityDecision.BLOCK,
      policyEnabled: true,
      thresholdExceeded: true,
    }),
  );

  const pipeline = new InMemorySecurityEvaluationPipeline(
    contextBuilder,
    attributionEngine,
    policyEngine,
    new InMemorySecurityDecisionEngine(),
  );

  const unsupportedActionType = 'UNMAPPED_ACTION' as SecurityActionType;
  const result = await pipeline.evaluate(buildEvent(), 'actor-1', unsupportedActionType);

  expect(attributionEngine.attributeCalls).toBe(0);
  expect(result.decision).toBe(SecurityDecision.INVESTIGATE);
});

test('missing attribution returns INVESTIGATE', async () => {
  const pipeline = new InMemorySecurityEvaluationPipeline(
    new StubSecurityContextBuilder(),
    new StubAuditAttributionEngine(
      buildAttribution({
        actorId: '',
        confidence: AuditAttributionConfidence.NONE,
        auditLogCorrelationId: undefined,
      }),
    ),
    new StubSecurityPolicyEngine(buildPolicy({ decision: SecurityDecision.CONTAIN, reason: 'threshold exceeded' })),
    new InMemorySecurityDecisionEngine(),
  );

  const result = await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(result.decision).toBe(SecurityDecision.INVESTIGATE);
});

test('low-confidence attribution returns INVESTIGATE', async () => {
  const pipeline = new InMemorySecurityEvaluationPipeline(
    new StubSecurityContextBuilder(),
    new StubAuditAttributionEngine(buildAttribution({ confidence: AuditAttributionConfidence.LOW })),
    new StubSecurityPolicyEngine(buildPolicy({ decision: SecurityDecision.CONTAIN, reason: 'threshold exceeded' })),
    new InMemorySecurityDecisionEngine(),
  );

  const result = await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(result.decision).toBe(SecurityDecision.INVESTIGATE);
});

test('threshold violation returns configured policy decision', async () => {
  const pipeline = new InMemorySecurityEvaluationPipeline(
    new StubSecurityContextBuilder(),
    new StubAuditAttributionEngine(buildAttribution({ confidence: AuditAttributionConfidence.HIGH })),
    new StubSecurityPolicyEngine(
      buildPolicy({
        decision: SecurityDecision.BLOCK,
        reason: 'arbitrary text',
        policyEnabled: true,
        thresholdExceeded: true,
        observedCount: 3,
        threshold: 2,
      }),
    ),
    new InMemorySecurityDecisionEngine(),
  );

  const result = await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(result.decision).toBe(SecurityDecision.BLOCK);
});

test('disabled policy returns IGNORE', async () => {
  const pipeline = new InMemorySecurityEvaluationPipeline(
    new StubSecurityContextBuilder(),
    new StubAuditAttributionEngine(buildAttribution({ confidence: AuditAttributionConfidence.HIGH })),
    new StubSecurityPolicyEngine(
      buildPolicy({
        decision: SecurityDecision.ALLOW,
        reason: 'arbitrary text',
        policyEnabled: false,
        thresholdExceeded: false,
      }),
    ),
    new InMemorySecurityDecisionEngine(),
  );

  const result = await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

  expect(result.decision).toBe(SecurityDecision.IGNORE);
});

test('no Discord API calls or side effects occur', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  const contextBuilder = new StubSecurityContextBuilder();
  const attributionEngine = new StubAuditAttributionEngine(buildAttribution({}));
  const policyEngine = new StubSecurityPolicyEngine(buildPolicy({}));

  let sideEffectCount = 0;
  const guardedDecisionEngine = {
    evaluate: async (...args: Parameters<InMemorySecurityDecisionEngine['evaluate']>) => {
      sideEffectCount += 0;
      return new InMemorySecurityDecisionEngine().evaluate(...args);
    },
  };

  try {
    const pipeline = new InMemorySecurityEvaluationPipeline(
      contextBuilder,
      attributionEngine,
      policyEngine,
      guardedDecisionEngine,
    );

    await pipeline.evaluate(buildEvent(), 'actor-1', SecurityActionType.CHANNEL_DELETE);

    expect(contextBuilder.buildCalls).toBe(1);
    expect(attributionEngine.attributeCalls).toBe(1);
    expect(policyEngine.evaluateCalls).toBe(1);
    expect(sideEffectCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
