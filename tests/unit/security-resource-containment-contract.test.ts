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
import { SecurityAction, SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import {
  ExecutionAuthorizationRequirement,
  SecurityContainmentPlan,
  SecurityContainmentStrategy,
  SecurityExecutionPlan,
  SecurityResourceType,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

function buildThreatAssessment(): ThreatAssessment {
  return Object.freeze({
    severity: DetectionSeverity.CRITICAL,
    confidence: DetectionConfidence.CERTAIN,
    disposition: DetectionDisposition.MALICIOUS,
    rationale: 'resource containment contract test',
    correlationIds: Object.freeze(['corr-resource']),
    overrides: Object.freeze([
      Object.freeze({
        type: RuntimeThreatOverrideType.FORCE_BLOCK,
        applicableEventTypes: Object.freeze(['BOT_ADD', 'ROLE_UPDATE']),
        reason: 'containment policy override',
      }),
    ]),
  });
}

function buildDecision(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-resource',
    guildId: 'guild-resource',
    actionType: SecurityEventActionType.CHANNEL_DELETE,
    correlationId: 'corr-resource',
    auditLogCorrelationId: 'audit-resource',
    metadata: Object.freeze({
      source: 'resource-containment-test',
      threatAssessment: buildThreatAssessment(),
    }),
  });
}

function buildExecutionPlanForContainment(): SecurityExecutionPlan {
  const decision = buildDecision();
  const plannedActions = Object.freeze<readonly SecurityAction[]>([
    Object.freeze({ type: SecurityActionType.REMOVE_UNAUTHORIZED_BOT, priority: SecurityActionPriority.CRITICAL, sequence: 1 }),
    Object.freeze({ type: SecurityActionType.FREEZE_WEBHOOKS, priority: SecurityActionPriority.HIGH, sequence: 2 }),
    Object.freeze({ type: SecurityActionType.REMOVE_DANGEROUS_ROLE, priority: SecurityActionPriority.CRITICAL, sequence: 3 }),
    Object.freeze({ type: SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER, priority: SecurityActionPriority.HIGH, sequence: 4 }),
    Object.freeze({ type: SecurityActionType.REVOKE_ESCALATION_SOURCE, priority: SecurityActionPriority.HIGH, sequence: 5 }),
    Object.freeze({ type: SecurityActionType.LOCK_CHANNELS, priority: SecurityActionPriority.HIGH, sequence: 6 }),
    Object.freeze({ type: SecurityActionType.RESTORE_RESOURCE, priority: SecurityActionPriority.HIGH, sequence: 7 }),
    Object.freeze({ type: SecurityActionType.CREATE_INCIDENT, priority: SecurityActionPriority.NORMAL, sequence: 8 }),
    Object.freeze({ type: SecurityActionType.NOTIFY_AUDIT, priority: SecurityActionPriority.NORMAL, sequence: 9 }),
    Object.freeze({ type: SecurityActionType.ESCALATE, priority: SecurityActionPriority.CRITICAL, sequence: 10 }),
  ]);

  const authorizationRequirements = Object.freeze(
    plannedActions.map((action) =>
      Object.freeze({
        actionType: action.type,
        sequence: action.sequence,
        requiresAuthorization: action.type !== SecurityActionType.NONE,
        decision: SecurityDecision.BLOCK,
        correlationId: 'corr-resource',
      }),
    ),
  );

  return Object.freeze({
    planId: 'execution-plan:corr-resource:BLOCK:containment',
    correlationId: 'corr-resource',
    threatAssessment: buildThreatAssessment(),
    securityDecision: decision,
    plannedActions,
    authorizationRequirements,
    executionMetadata: Object.freeze({
      source: 'in-memory-security-execution-planner' as const,
      planId: 'execution-plan:corr-resource:BLOCK:containment',
      plannedActionCount: plannedActions.length,
      plannedActionTypes: Object.freeze(plannedActions.map((action) => action.type)),
    }),
    auditMetadata: Object.freeze({
      planId: 'execution-plan:corr-resource:BLOCK:containment',
      correlationId: 'corr-resource',
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

function readHotPathPlannerSource(): string {
  return fs.readFileSync(path.resolve(__dirname, '../../src/core/runtime/discord/security-hot-path-planner.ts'), 'utf8');
}

function readExecutionTypesSource(): string {
  return fs.readFileSync(path.resolve(__dirname, '../../src/core/runtime/discord/security-execution-types.ts'), 'utf8');
}

test('containment plan is immutable', () => {
  const plan = new InMemorySecurityHotPathPlanner().plan(buildExecutionPlanForContainment());
  const containmentPlan = plan.containmentPlan;

  expect(Object.isFrozen(containmentPlan)).toBe(true);
  expect(Object.isFrozen(containmentPlan.actions)).toBe(true);
  expect(Object.isFrozen(containmentPlan.metadata)).toBe(true);
  expect(Object.isFrozen(containmentPlan.actions[0])).toBe(true);
  expect(Object.isFrozen(containmentPlan.actions[0].target)).toBe(true);

  expect(() => {
    (containmentPlan as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);
});

test('resource mapping is deterministic and preserves correlation and threat metadata', () => {
  const planner = new InMemorySecurityHotPathPlanner();
  const first = planner.plan(buildExecutionPlanForContainment());
  const second = planner.plan(buildExecutionPlanForContainment());

  expect(first.containmentPlan).toEqual(second.containmentPlan);
  expect(first.containmentPlan.correlationId).toBe('corr-resource');
  expect(first.containmentPlan.threatAssessment?.disposition).toBe(DetectionDisposition.MALICIOUS);
  expect(first.containmentPlan.threatAssessment?.severity).toBe(DetectionSeverity.CRITICAL);
  expect(first.containmentPlan.threatAssessment?.confidence).toBe(DetectionConfidence.CERTAIN);
});

test('resource metadata and strategy are preserved per action mapping', () => {
  const plan = new InMemorySecurityHotPathPlanner().plan(buildExecutionPlanForContainment());
  const containmentPlan: SecurityContainmentPlan = plan.containmentPlan;

  const byType = new Map(containmentPlan.actions.map((action) => [action.actionType, action]));

  expect(byType.get(SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.strategy).toBe(SecurityContainmentStrategy.REMOVE);
  expect(byType.get(SecurityActionType.REMOVE_UNAUTHORIZED_BOT)?.target.resourceType).toBe(SecurityResourceType.BOT);

  expect(byType.get(SecurityActionType.FREEZE_WEBHOOKS)?.strategy).toBe(SecurityContainmentStrategy.FREEZE);
  expect(byType.get(SecurityActionType.FREEZE_WEBHOOKS)?.target.resourceType).toBe(SecurityResourceType.WEBHOOK);

  expect(byType.get(SecurityActionType.REMOVE_DANGEROUS_ROLE)?.strategy).toBe(SecurityContainmentStrategy.REMOVE);
  expect(byType.get(SecurityActionType.REMOVE_DANGEROUS_ROLE)?.target.resourceType).toBe(SecurityResourceType.ROLE);

  expect(byType.get(SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER)?.strategy).toBe(SecurityContainmentStrategy.NEUTRALIZE);
  expect(byType.get(SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER)?.target.resourceType).toBe(SecurityResourceType.MEMBER);

  expect(byType.get(SecurityActionType.REVOKE_ESCALATION_SOURCE)?.strategy).toBe(SecurityContainmentStrategy.REVOKE);
  expect(byType.get(SecurityActionType.REVOKE_ESCALATION_SOURCE)?.target.resourceType).toBe(SecurityResourceType.ROLE_ASSIGNMENT);

  expect(byType.get(SecurityActionType.LOCK_CHANNELS)?.strategy).toBe(SecurityContainmentStrategy.LOCK);
  expect(byType.get(SecurityActionType.LOCK_CHANNELS)?.target.resourceType).toBe(SecurityResourceType.CHANNEL);

  expect(byType.get(SecurityActionType.RESTORE_RESOURCE)?.strategy).toBe(SecurityContainmentStrategy.RESTORE);
  expect(byType.get(SecurityActionType.RESTORE_RESOURCE)?.target.resourceType).toBe(SecurityResourceType.GUILD_CONFIGURATION);

  expect(byType.get(SecurityActionType.ESCALATE)?.strategy).toBe(SecurityContainmentStrategy.OBSERVE);
  expect(byType.get(SecurityActionType.ESCALATE)?.target.resourceType).toBe(SecurityResourceType.GUILD_CONFIGURATION);

  for (const action of containmentPlan.actions) {
    expect(action.target.correlationId).toBe('corr-resource');
    expect(action.target.metadata?.sourceActionType).toBe(action.actionType);
  }
});

test('authorization requirements are preserved in hot path plan', () => {
  const plan = new InMemorySecurityHotPathPlanner().plan(buildExecutionPlanForContainment());

  expect(plan.authorizationRequirements.map((req: ExecutionAuthorizationRequirement) => req.actionType)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.REMOVE_DANGEROUS_ROLE,
    SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
    SecurityActionType.REVOKE_ESCALATION_SOURCE,
    SecurityActionType.LOCK_CHANNELS,
    SecurityActionType.RESTORE_RESOURCE,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
    SecurityActionType.ESCALATE,
  ]);
});

test('contract enums include full initial resource and strategy sets', () => {
  expect(Object.values(SecurityResourceType)).toEqual([
    'BOT',
    'MEMBER',
    'ROLE',
    'ROLE_ASSIGNMENT',
    'CHANNEL',
    'WEBHOOK',
    'GUILD_CONFIGURATION',
    'INVITE',
  ]);

  expect(Object.values(SecurityContainmentStrategy)).toEqual([
    'REMOVE',
    'REVOKE',
    'FREEZE',
    'LOCK',
    'RESTORE',
    'NEUTRALIZE',
    'OBSERVE',
  ]);
});

test('containment contract source has no forbidden integration surfaces', () => {
  const plannerSource = readHotPathPlannerSource();
  const typesSource = readExecutionTypesSource();

  expect(plannerSource).not.toMatch(/discord\.js/i);
  expect(plannerSource).not.toMatch(/fetch\s*\(/i);
  expect(plannerSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(plannerSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(plannerSource).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.timeout\s*\(|\.quarantine\s*\(/i);
  expect(plannerSource).not.toMatch(/roles\.add\s*\(|roles\.remove\s*\(|setRoles\s*\(|\.setName\s*\(/i);
  expect(plannerSource).not.toMatch(/WebhookClient|\.deleteWebhook\s*\(|\.editWebhook\s*\(/i);
  expect(plannerSource).not.toMatch(/detector|runtime side effect|execute\s*\(|production/i);

  expect(typesSource).not.toMatch(/discord\.js|fetch\s*\(|database|persist\s*\(|save\s*\(|repository\s*\./i);
});


