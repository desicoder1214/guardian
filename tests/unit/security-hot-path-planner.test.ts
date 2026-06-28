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
import {
  InMemorySecurityActionPlanner,
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import {
  ExecutionAuthorizationRequirement,
  SecurityExecutionPlan,
  SecurityHotPathExecutionLane,
  SecurityHotPathPlan,
  SecurityHotPathPriority,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import {
  SecurityActionType as SecurityEventActionType,
  SecurityDecision,
} from '../../src/core/runtime/discord/security-policy-types';

function buildThreatAssessment(
  disposition: DetectionDisposition,
  severity: DetectionSeverity = DetectionSeverity.INFO,
  confidence: DetectionConfidence = DetectionConfidence.LOW,
): ThreatAssessment {
  return Object.freeze({
    severity,
    confidence,
    disposition,
    rationale: `${disposition} assessment`,
    correlationIds: Object.freeze(['corr-1']),
    overrides: Object.freeze([
      Object.freeze({
        type: RuntimeThreatOverrideType.FORCE_BLOCK,
        applicableEventTypes: Object.freeze(['BOT_ADD']),
        reason: 'hot path ranking test override',
      }),
    ]),
  });
}

function buildDecision(
  decision: SecurityDecision,
  threatAssessment: ThreatAssessment,
): SecurityDecisionModel {
  return Object.freeze({
    decision,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityEventActionType.CHANNEL_DELETE,
    correlationId: 'corr-1',
    auditLogCorrelationId: 'audit-1',
    metadata: Object.freeze({
      source: 'security-hot-path-planner-test',
      threatAssessment,
    }),
  });
}

function buildHotPathPlan(
  decision: SecurityDecision,
  threatAssessment: ThreatAssessment = buildThreatAssessment(DetectionDisposition.CLEAN),
): SecurityHotPathPlan {
  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const hotPathPlanner = new InMemorySecurityHotPathPlanner();

  const decisionModel = buildDecision(decision, threatAssessment);
  const actionPlan = actionPlanner.plan(decisionModel);
  const executionPlan = executionPlanner.plan(actionPlan, decisionModel);

  return hotPathPlanner.plan(executionPlan);
}

function buildRoleEscalationHotPathPlan(): SecurityHotPathPlan {
  const decisionModel = buildDecision(
    SecurityDecision.BLOCK,
    buildThreatAssessment(DetectionDisposition.MALICIOUS, DetectionSeverity.CRITICAL, DetectionConfidence.CERTAIN),
  );

  const plannedActions = Object.freeze<readonly SecurityAction[]>([
    Object.freeze({
      type: SecurityActionType.REMOVE_DANGEROUS_ROLE,
      priority: SecurityActionPriority.CRITICAL,
      sequence: 1,
      metadata: Object.freeze({ source: 'role-escalation-contract-test' }),
    }),
    Object.freeze({
      type: SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
      priority: SecurityActionPriority.HIGH,
      sequence: 2,
      metadata: Object.freeze({ source: 'role-escalation-contract-test' }),
    }),
    Object.freeze({
      type: SecurityActionType.REVOKE_ESCALATION_SOURCE,
      priority: SecurityActionPriority.HIGH,
      sequence: 3,
      metadata: Object.freeze({ source: 'role-escalation-contract-test' }),
    }),
    Object.freeze({
      type: SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
      priority: SecurityActionPriority.NORMAL,
      sequence: 4,
      metadata: Object.freeze({ source: 'role-escalation-contract-test', policyControlled: true }),
    }),
    Object.freeze({
      type: SecurityActionType.CREATE_INCIDENT,
      priority: SecurityActionPriority.NORMAL,
      sequence: 5,
      metadata: Object.freeze({ source: 'role-escalation-contract-test' }),
    }),
    Object.freeze({
      type: SecurityActionType.NOTIFY_AUDIT,
      priority: SecurityActionPriority.NORMAL,
      sequence: 6,
      metadata: Object.freeze({ source: 'role-escalation-contract-test' }),
    }),
  ]);

  const executionPlan = Object.freeze({
    planId: 'execution-plan:corr-1:BLOCK:role-escalation',
    correlationId: 'corr-1',
    threatAssessment: buildThreatAssessment(
      DetectionDisposition.MALICIOUS,
      DetectionSeverity.CRITICAL,
      DetectionConfidence.CERTAIN,
    ),
    securityDecision: decisionModel,
    plannedActions,
    authorizationRequirements: Object.freeze(
      plannedActions.map((action) =>
        Object.freeze({
          actionType: action.type,
          sequence: action.sequence,
          requiresAuthorization: action.type !== SecurityActionType.NONE,
          decision: SecurityDecision.BLOCK,
          correlationId: 'corr-1',
        }),
      ),
    ),
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner' as const,
      planId: 'execution-plan:corr-1:BLOCK:role-escalation',
      plannedActionCount: plannedActions.length,
      plannedActionTypes: Object.freeze(plannedActions.map((action) => action.type)),
    }),
    auditMetadata: Object.freeze({
      planId: 'execution-plan:corr-1:BLOCK:role-escalation',
      correlationId: 'corr-1',
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
  }) as SecurityExecutionPlan;

  return new InMemorySecurityHotPathPlanner().plan(executionPlan);
}

function asMutableArray<T>(value: readonly T[]): T[] {
  return value as unknown as T[];
}

function readHotPathPlannerSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-hot-path-planner.ts'),
    'utf8',
  );
}

test('REMOVE_DANGEROUS_ROLE ranks in immediate critical lane', () => {
  const plan = buildRoleEscalationHotPathPlan();
  const removeRole = plan.actions.find((action) => action.actionType === SecurityActionType.REMOVE_DANGEROUS_ROLE);

  expect(removeRole?.lane).toBe(SecurityHotPathExecutionLane.IMMEDIATE);
  expect(removeRole?.priority).toBe(SecurityHotPathPriority.CRITICAL_CONTAINMENT);
});

test('REMOVE_DANGEROUS_ROLE is ordered before CREATE_INCIDENT and NOTIFY_AUDIT', () => {
  const plan = buildRoleEscalationHotPathPlan();
  const actionTypes = plan.actions.map((action) => action.actionType);

  expect(actionTypes.indexOf(SecurityActionType.REMOVE_DANGEROUS_ROLE)).toBeLessThan(
    actionTypes.indexOf(SecurityActionType.CREATE_INCIDENT),
  );
  expect(actionTypes.indexOf(SecurityActionType.REMOVE_DANGEROUS_ROLE)).toBeLessThan(
    actionTypes.indexOf(SecurityActionType.NOTIFY_AUDIT),
  );
});

test('NEUTRALIZE_ESCALATED_MEMBER is immediate lane', () => {
  const plan = buildRoleEscalationHotPathPlan();
  const neutralize = plan.actions.find((action) => action.actionType === SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER);

  expect(neutralize?.lane).toBe(SecurityHotPathExecutionLane.IMMEDIATE);
});

test('PUNISH_ROLE_ESCALATION_ACTOR does not rank before REMOVE_DANGEROUS_ROLE', () => {
  const plan = buildRoleEscalationHotPathPlan();
  const actionTypes = plan.actions.map((action) => action.actionType);

  expect(actionTypes.indexOf(SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR)).toBeGreaterThan(
    actionTypes.indexOf(SecurityActionType.REMOVE_DANGEROUS_ROLE),
  );
});

test('CREATE_INCIDENT and NOTIFY_AUDIT remain in deferred background lane', () => {
  const plan = buildRoleEscalationHotPathPlan();

  const incident = plan.actions.find((action) => action.actionType === SecurityActionType.CREATE_INCIDENT);
  const notify = plan.actions.find((action) => action.actionType === SecurityActionType.NOTIFY_AUDIT);

  expect(incident?.lane).toBe(SecurityHotPathExecutionLane.BACKGROUND);
  expect(notify?.lane).toBe(SecurityHotPathExecutionLane.BACKGROUND);
});

test('NONE decision produces empty hot path actions', () => {
  const plan = buildHotPathPlan(SecurityDecision.ALLOW);

  expect(plan.actions).toEqual([]);
  expect(plan.metadata.immediateActionCount).toBe(0);
  expect(plan.metadata.backgroundActionCount).toBe(0);
});

test('hot path plan remains immutable', () => {
  const plan = buildRoleEscalationHotPathPlan();

  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(plan.actions)).toBe(true);
  expect(Object.isFrozen(plan.authorizationRequirements)).toBe(true);

  expect(() => {
    (plan as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);

  expect(() => {
    asMutableArray(plan.actions).push({
      actionType: SecurityActionType.ESCALATE,
      sequence: 99,
      priority: SecurityHotPathPriority.NORMAL_CONTAINMENT,
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      action: Object.freeze({
        type: SecurityActionType.ESCALATE,
        priority: SecurityActionPriority.CRITICAL,
        sequence: 99,
      }),
    });
  }).toThrow(TypeError);
});

test('ordering is deterministic', () => {
  const first = buildRoleEscalationHotPathPlan();
  const second = buildRoleEscalationHotPathPlan();

  expect(first).toEqual(second);
});

test('correlationId is preserved', () => {
  const plan = buildRoleEscalationHotPathPlan();

  expect(plan.correlationId).toBe('corr-1');
});

test('authorization requirements are preserved', () => {
  const plan = buildRoleEscalationHotPathPlan();

  expect(plan.authorizationRequirements.map((requirement: ExecutionAuthorizationRequirement) => requirement.actionType)).toEqual([
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
    SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
});

test('hot path planner source has no forbidden integration surfaces', () => {
  const source = readHotPathPlannerSource();

  expect(source).not.toMatch(/discord\.js/i);
  expect(source).not.toMatch(/fetch\s*\(/i);
  expect(source).not.toMatch(/node:fs|from\s+['"]fs['"]/i);
  expect(source).not.toMatch(/writeFile|appendFile|mkdir|unlink/i);
  expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize/i);
  expect(source).not.toMatch(/persist|save\s*\(|repository/i);
  expect(source).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(|\.timeout\s*\(/i);
  expect(source).not.toMatch(/\.addRole\s*\(|\.removeRole\s*\(|roles\.add\s*\(|roles\.remove\s*\(|setRoles\s*\(/i);
  expect(source).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
  expect(source).not.toMatch(/moderation|dashboard|command|production/i);
});
