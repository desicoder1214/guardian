import fs from 'node:fs';
import path from 'node:path';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionSeverity,
} from '../../src/core/runtime/discord/detection-engine';
import { RuntimeThreatOverrideType } from '../../src/core/runtime/discord/runtime-threat-interpretation';
import { ThreatAssessment } from '../../src/core/runtime/discord/runtime-threat-interpretation-engine';
import { SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import {
  AuthorizationDecision,
  AuthorizationReason,
  ExecutionAuthorizationRequirement,
  SecurityExecutionPlan,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

function buildThreatAssessment(): ThreatAssessment {
  return Object.freeze({
    severity: DetectionSeverity.CRITICAL,
    confidence: DetectionConfidence.CERTAIN,
    disposition: DetectionDisposition.MALICIOUS,
    rationale: 'authorization-engine-contract-test',
    correlationIds: Object.freeze(['corr-authz']),
    overrides: Object.freeze([
      Object.freeze({
        type: RuntimeThreatOverrideType.FORCE_BLOCK,
        applicableEventTypes: Object.freeze(['BOT_ADD']),
        reason: 'authorization test override',
      }),
    ]),
  });
}

function buildDecision(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-authz',
    guildId: 'guild-authz',
    actionType: SecurityEventActionType.CHANNEL_DELETE,
    correlationId: 'corr-authz',
    auditLogCorrelationId: 'audit-authz',
    metadata: Object.freeze({ source: 'security-execution-authorization-engine-test' }),
  });
}

function buildExecutionPlan(): SecurityExecutionPlan {
  const decision = buildDecision();
  const threatAssessment = buildThreatAssessment();

  const plannedActions = Object.freeze([
    Object.freeze({ type: SecurityActionType.REMOVE_UNAUTHORIZED_BOT, priority: SecurityActionPriority.CRITICAL, sequence: 1 }),
    Object.freeze({ type: SecurityActionType.FREEZE_WEBHOOKS, priority: SecurityActionPriority.HIGH, sequence: 2 }),
    Object.freeze({ type: SecurityActionType.CREATE_INCIDENT, priority: SecurityActionPriority.NORMAL, sequence: 3 }),
  ]);

  const authorizationRequirements = Object.freeze([
    Object.freeze({
      actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      sequence: 1,
      requiresAuthorization: true,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-authz',
    }),
    Object.freeze({
      actionType: SecurityActionType.FREEZE_WEBHOOKS,
      sequence: 2,
      requiresAuthorization: true,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-authz',
    }),
    Object.freeze({
      actionType: SecurityActionType.CREATE_INCIDENT,
      sequence: 3,
      requiresAuthorization: false,
      decision: SecurityDecision.BLOCK,
      correlationId: 'corr-authz',
    }),
  ]) as readonly ExecutionAuthorizationRequirement[];

  return Object.freeze({
    planId: 'execution-plan:corr-authz:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT',
    correlationId: 'corr-authz',
    threatAssessment,
    securityDecision: decision,
    plannedActions,
    authorizationRequirements,
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner' as const,
      planId: 'execution-plan:corr-authz:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT',
      plannedActionCount: 3,
      plannedActionTypes: Object.freeze([
        SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
        SecurityActionType.FREEZE_WEBHOOKS,
        SecurityActionType.CREATE_INCIDENT,
      ]),
    }),
    auditMetadata: Object.freeze({
      planId: 'execution-plan:corr-authz:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT',
      correlationId: 'corr-authz',
      decision: SecurityDecision.BLOCK,
      decisionReason: SecurityDecisionReason.POLICY_ALLOW,
      threatDisposition: DetectionDisposition.MALICIOUS,
      threatSeverity: DetectionSeverity.CRITICAL,
      threatConfidence: DetectionConfidence.CERTAIN,
    }),
    rollbackMetadata: Object.freeze({
      supported: false,
      strategy: 'none' as const,
      reason: 'contract-only',
    }),
  });
}

function readSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-execution-authorization-engine.ts'),
    'utf8',
  );
}

test('deterministic authorization for same immutable plan', () => {
  const engine = new InMemorySecurityExecutionAuthorizationEngine();
  const plan = buildExecutionPlan();

  const first = engine.authorize(Object.freeze({ executionPlan: plan }));
  const second = engine.authorize(Object.freeze({ executionPlan: plan }));

  expect(first).toEqual(second);
  expect(first.decision).toBe(AuthorizationDecision.AUTHORIZED);
  expect(first.reason).toBe(AuthorizationReason.PLAN_AUTHORIZED);
});

test('result is immutable and preserves metadata', () => {
  const engine = new InMemorySecurityExecutionAuthorizationEngine();
  const plan = buildExecutionPlan();
  const result = engine.authorize(Object.freeze({ executionPlan: plan }));

  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.authorizationRequirements)).toBe(true);
  expect(result.metadata).toEqual({ source: 'in-memory-security-execution-authorization-engine' });

  expect(() => {
    (result as { decision: AuthorizationDecision }).decision = AuthorizationDecision.DENIED;
  }).toThrow(TypeError);
});

test('correlation and threat assessment are preserved', () => {
  const engine = new InMemorySecurityExecutionAuthorizationEngine();
  const plan = buildExecutionPlan();
  const result = engine.authorize(Object.freeze({ executionPlan: plan }));

  expect(result.correlationId).toBe('corr-authz');
  expect(result.executionPlanId).toBe(plan.planId);
  expect(result.threatAssessment).toEqual(plan.threatAssessment);
  expect(result.threatAssessment).not.toBe(plan.threatAssessment);
  expect(result.authorizationRequirements).toEqual(plan.authorizationRequirements);
});

test('empty plans authorize correctly', () => {
  const engine = new InMemorySecurityExecutionAuthorizationEngine();
  const plan = Object.freeze({
    ...buildExecutionPlan(),
    planId: 'execution-plan:corr-authz:ALLOW:none',
    plannedActions: Object.freeze([]),
    authorizationRequirements: Object.freeze([]),
  });

  const result = engine.authorize(Object.freeze({ executionPlan: plan }));

  expect(result.decision).toBe(AuthorizationDecision.AUTHORIZED);
  expect(result.reason).toBe(AuthorizationReason.EMPTY_PLAN);
});

test('engine source has no forbidden execution surfaces', () => {
  const source = readSource();

  expect(source).not.toMatch(/discord\.js/i);
  expect(source).not.toMatch(/fetch\s*\(/i);
  expect(source).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(source).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(|\.timeout\s*\(/i);
  expect(source).not.toMatch(/roles\.add\s*\(|roles\.remove\s*\(|setRoles\s*\(/i);
  expect(source).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
  expect(source).not.toMatch(/fakeperms|trust/i);
}
);
