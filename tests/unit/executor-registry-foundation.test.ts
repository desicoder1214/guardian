import {
  InMemorySecurityExecutorRegistry,
  SecurityExecutionProvider,
  SecurityExecutorResolutionReason,
} from '../../src/core/runtime/discord/executor-registry';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';
import { RuntimeThreatOverrideType } from '../../src/core/runtime/discord/runtime-threat-interpretation';
import { InMemorySecurityActionPlanner, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

class StubProvider implements SecurityExecutionProvider {
  constructor(
    readonly providerId: string,
    readonly supportedActionTypes: readonly SecurityActionType[],
  ) {}

  supports(actionType: SecurityActionType): boolean {
    return this.supportedActionTypes.includes(actionType);
  }
}

function buildDecisionModel(decision: SecurityDecision) {
  return Object.freeze({
    decision,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-registry-1',
    guildId: 'guild-registry-1',
    actionType: SecurityEventActionType.BOT_ADD,
    correlationId: 'corr-registry-1',
    auditLogCorrelationId: 'audit-registry-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: 'registry foundation threat assessment',
        correlationIds: Object.freeze(['corr-registry-1']),
        overrides: Object.freeze([
          Object.freeze({
            type: RuntimeThreatOverrideType.FORCE_BLOCK,
            applicableEventTypes: Object.freeze(['BOT_ADD']),
            reason: 'registry foundation override',
          }),
        ]),
      }),
    }),
  });
}

function buildRoutingInputs(decision: SecurityDecision) {
  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const hotPathPlanner = new InMemorySecurityHotPathPlanner();
  const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();

  const decisionModel = buildDecisionModel(decision);
  const actionPlan = actionPlanner.plan(decisionModel);
  const executionPlan = executionPlanner.plan(actionPlan, decisionModel);
  const hotPathPlan = hotPathPlanner.plan(executionPlan);
  const authorizationResult = authorizationEngine.authorize(Object.freeze({ executionPlan }));

  return { executionPlan, hotPathPlan, authorizationResult };
}

test('deterministic executor resolution uses first registered provider', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  const first = new StubProvider('provider-first', Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]));
  const second = new StubProvider('provider-second', Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]));

  registry.register(first);
  registry.register(second);

  expect(registry.resolve(SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.providerId).toBe('provider-first');
  expect(registry.list().map((provider) => provider.providerId)).toEqual(['provider-first', 'provider-second']);
});

test('duplicate registration is rejected', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  const provider = new StubProvider('provider-dup', Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]));

  registry.register(provider);

  expect(() => registry.register(provider)).toThrow('executor provider provider-dup is already registered');
});

test('registry snapshot is immutable and deterministic', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  registry.register(new StubProvider('provider-a', Object.freeze([SecurityActionType.CREATE_INCIDENT])));
  registry.register(new StubProvider('provider-b', Object.freeze([SecurityActionType.NOTIFY_AUDIT])));

  const snapshot = registry.getSnapshot();

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.providers)).toBe(true);
  expect(snapshot.providers.map((provider) => provider.providerId)).toEqual(['provider-a', 'provider-b']);

  expect(() => {
    ((snapshot as unknown) as { providers: unknown[] }).providers = [];
  }).toThrow(TypeError);
});

test('unsupported action handling returns deterministic unresolved reason', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  const { executionPlan, hotPathPlan, authorizationResult } = buildRoutingInputs(SecurityDecision.ALLOW);

  const result = registry.route(Object.freeze({ executionPlan, hotPathPlan, authorizationResult }));

  expect(result.actionResolutions).toHaveLength(1);
  expect(result.actionResolutions[0].actionType).toBe(SecurityActionType.NONE);
  expect(result.actionResolutions[0].resolved).toBe(false);
  expect(result.actionResolutions[0].reason).toBe(SecurityExecutorResolutionReason.UNSUPPORTED_ACTION);
});

test('unknown executor handling returns no-provider reason deterministically', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  const { executionPlan, hotPathPlan, authorizationResult } = buildRoutingInputs(SecurityDecision.BLOCK);

  const result = registry.route(Object.freeze({ executionPlan, hotPathPlan, authorizationResult }));
  const botAction = result.actionResolutions.find(
    (resolution) => resolution.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
  );

  expect(botAction?.resolved).toBe(false);
  expect(botAction?.reason).toBe(SecurityExecutorResolutionReason.NO_PROVIDER_REGISTERED);
  expect(botAction?.providerId).toBeUndefined();
});

test('capability isolation only resolves providers that support the action type', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  registry.register(new StubProvider('provider-incident-only', Object.freeze([SecurityActionType.CREATE_INCIDENT])));
  const { executionPlan, hotPathPlan, authorizationResult } = buildRoutingInputs(SecurityDecision.BLOCK);

  const result = registry.route(Object.freeze({ executionPlan, hotPathPlan, authorizationResult }));
  const botAction = result.actionResolutions.find(
    (resolution) => resolution.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
  );

  expect(botAction?.resolved).toBe(false);
  expect(botAction?.reason).toBe(SecurityExecutorResolutionReason.NO_PROVIDER_REGISTERED);
});

test('route preserves correlationId, threat assessment, and authorization metadata', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  registry.register(new StubProvider('provider-bot', Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT])));
  registry.register(new StubProvider('provider-audit', Object.freeze([SecurityActionType.CREATE_INCIDENT, SecurityActionType.NOTIFY_AUDIT])));

  const { executionPlan, hotPathPlan, authorizationResult } = buildRoutingInputs(SecurityDecision.BLOCK);
  const result = registry.route(Object.freeze({ executionPlan, hotPathPlan, authorizationResult }));

  expect(result.correlationId).toBe('corr-registry-1');
  expect(result.threatAssessmentPreserved).toBe(true);
  expect(result.securityDecisionPreserved).toBe(true);
  expect(result.authorizationMetadata).toMatchObject({ source: 'in-memory-security-execution-authorization-engine' });
  expect(result.actionResolutions.every((resolution) => resolution.correlationId === 'corr-registry-1')).toBe(true);
});

test('registry route does not perform execution side effects', () => {
  const registry = new InMemorySecurityExecutorRegistry();
  let executeCalls = 0;

  const provider = {
    providerId: 'provider-side-effect-free',
    supportedActionTypes: Object.freeze([SecurityActionType.REMOVE_UNAUTHORIZED_BOT]),
    supports(actionType: SecurityActionType): boolean {
      return actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT;
    },
    execute(): void {
      executeCalls += 1;
    },
  };

  registry.register(provider);

  const { executionPlan, hotPathPlan, authorizationResult } = buildRoutingInputs(SecurityDecision.BLOCK);
  const result = registry.route(Object.freeze({ executionPlan, hotPathPlan, authorizationResult }));

  expect(result.actionResolutions.find((resolution) => resolution.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.resolved).toBe(true);
  expect(executeCalls).toBe(0);
});

test('registry foundation remains free of Discord.js and network dependencies', () => {
  const filePath = path.resolve(__dirname, '../../src/core/runtime/discord/executor-registry.ts');
  const source = fs.readFileSync(filePath, 'utf8');

  expect(source).not.toMatch(/discord\.js/i);
  expect(source).not.toMatch(/\bhttps?:\/\//i);
  expect(source).not.toMatch(/\bfetch\(/i);
  expect(source).not.toMatch(/\baxios\b/i);
  expect(source).not.toMatch(/\bundici\b/i);
  expect(source).not.toMatch(/\bnet\b|\btls\b|\bwebsocket\b|\bsocket\b/i);
});
