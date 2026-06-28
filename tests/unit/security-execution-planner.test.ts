import fs from 'node:fs';
import path from 'node:path';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';
import { InMemorySecurityActionPlanner, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { SecurityExecutionPlan } from '../../src/core/runtime/discord/security-execution-types';
import { RuntimeThreatOverrideType } from '../../src/core/runtime/discord/runtime-threat-interpretation';
import { ThreatAssessment } from '../../src/core/runtime/discord/runtime-threat-interpretation-engine';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

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
        reason: 'malicious unauthorized bot add detected',
      }),
    ]),
  });
}

function buildDecision(
  decision: SecurityDecision,
  threatAssessment: ThreatAssessment = buildThreatAssessment(DetectionDisposition.CLEAN),
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
      source: 'test',
      authorization: Object.freeze({
        required: true,
        scope: 'runtime-execution',
      }),
      threatAssessment,
    }),
  });
}

function buildExecutionPlan(decision: SecurityDecision, threatAssessment?: ThreatAssessment): SecurityExecutionPlan {
  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const decisionModel = buildDecision(
    decision,
    threatAssessment ?? buildThreatAssessment(DetectionDisposition.CLEAN),
  );
  const actionPlan = actionPlanner.plan(decisionModel);

  return executionPlanner.plan(actionPlan, decisionModel);
}

function readExecutionPlannerSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-execution-planner.ts'),
    'utf8',
  );
}

function asMutableArray<T>(value: readonly T[]): T[] {
  return value as unknown as T[];
}

test('execution plan preserves threatAssessment and authorization metadata', () => {
  const threatAssessment = buildThreatAssessment(
    DetectionDisposition.MALICIOUS,
    DetectionSeverity.CRITICAL,
    DetectionConfidence.CERTAIN,
  );
  const plan = buildExecutionPlan(SecurityDecision.BLOCK, threatAssessment);

  expect(plan.threatAssessment).toEqual(threatAssessment);
  expect(plan.threatAssessment).not.toBe(threatAssessment);
  expect(plan.securityDecision.metadata).toMatchObject({
    authorization: {
      required: true,
      scope: 'runtime-execution',
    },
  });
  expect(
    plan.authorizationRequirements.map((requirement: { actionType: SecurityActionType }) => requirement.actionType),
  ).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(
    plan.authorizationRequirements.every((requirement: { decision: SecurityDecision }) => requirement.decision === SecurityDecision.BLOCK),
  ).toBe(true);
});

test('malicious assessment preserves existing block planning without adding execution behavior', () => {
  const plan = buildExecutionPlan(
    SecurityDecision.BLOCK,
    buildThreatAssessment(DetectionDisposition.MALICIOUS, DetectionSeverity.CRITICAL, DetectionConfidence.CERTAIN),
  );

  expect(plan.plannedActions.map((action: { type: SecurityActionType }) => action.type)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(plan.executionMetadata.plannedActionCount).toBe(4);
  expect(plan.executionMetadata.plannedActionTypes).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(plan.auditMetadata.threatDisposition).toBe(DetectionDisposition.MALICIOUS);
  expect(plan.auditMetadata.threatSeverity).toBe(DetectionSeverity.CRITICAL);
  expect(plan.auditMetadata.threatConfidence).toBe(DetectionConfidence.CERTAIN);
});

test('empty plans remain valid', () => {
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const emptyActionPlan = Object.freeze({
    decision: SecurityDecision.ALLOW,
    actions: Object.freeze([]),
    correlationId: 'corr-empty',
    metadata: Object.freeze({
      threatAssessment: buildThreatAssessment(DetectionDisposition.CLEAN),
    }),
  });
  const decisionModel = buildDecision(SecurityDecision.ALLOW);

  const plan = executionPlanner.plan(emptyActionPlan, decisionModel);

  expect(plan.plannedActions).toEqual([]);
  expect(plan.authorizationRequirements).toEqual([]);
  expect(plan.executionMetadata.plannedActionCount).toBe(0);
  expect(plan.correlationId).toBe('corr-empty');
});

test('execution plan is immutable and deterministic', () => {
  const first = buildExecutionPlan(SecurityDecision.CONTAIN);
  const second = buildExecutionPlan(SecurityDecision.CONTAIN);

  expect(first).toEqual(second);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.plannedActions)).toBe(true);
  expect(Object.isFrozen(first.authorizationRequirements)).toBe(true);
  expect(Object.isFrozen(first.executionMetadata)).toBe(true);
  expect(Object.isFrozen(first.auditMetadata)).toBe(true);
  expect(Object.isFrozen(first.rollbackMetadata)).toBe(true);
  expect(first.planId).toBe('execution-plan:corr-1:CONTAIN:1:QUARANTINE_ACTOR|2:CREATE_INCIDENT|3:NOTIFY_AUDIT');
  expect(first.correlationId).toBe('corr-1');

  expect(() => {
    (first as { planId: string }).planId = 'mutated';
  }).toThrow(TypeError);

  expect(() => {
    asMutableArray(first.plannedActions).push({
      type: SecurityActionType.ESCALATE,
      priority: 'CRITICAL' as never,
      sequence: 99,
    });
  }).toThrow(TypeError);
});

test('execution plan source has no forbidden integration surfaces', () => {
  const source = readExecutionPlannerSource();

  expect(source).not.toMatch(/discord\.js/i);
  expect(source).not.toMatch(/fetch\s*\(/i);
  expect(source).not.toMatch(/node:fs|from\s+['"]fs['"]/i);
  expect(source).not.toMatch(/writeFile|appendFile|mkdir|unlink/i);
  expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize/i);
  expect(source).not.toMatch(/persist|save\s*\(|repository/i);
  expect(source).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(/i);
  expect(source).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
});
