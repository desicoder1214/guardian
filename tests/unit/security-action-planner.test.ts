import fs from 'node:fs';
import path from 'node:path';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionSeverity,
} from '../../src/core/runtime/discord/detection-engine';
import {
  InMemorySecurityActionPlanner,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { RuntimeThreatOverrideType } from '../../src/core/runtime/discord/runtime-threat-interpretation';
import { ThreatAssessment } from '../../src/core/runtime/discord/runtime-threat-interpretation-engine';
import { SecurityDecisionModel, SecurityDecisionReason } from '../../src/core/runtime/discord/security-decision-types';
import { SecurityActionType as SecurityEventActionType, SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

function buildDecision(decision: SecurityDecision): SecurityDecisionModel {
  return {
    decision,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType: SecurityEventActionType.CHANNEL_DELETE,
    correlationId: 'corr-1',
    auditLogCorrelationId: 'audit-1',
    metadata: { source: 'test', threatAssessment: buildThreatAssessment(DetectionDisposition.CLEAN) },
  };
}

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

function readPlannerSource(): string {
  return fs.readFileSync(path.resolve(__dirname, '../../src/core/runtime/discord/security-action-planner.ts'), 'utf8');
}

test('ALLOW plans NONE', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.ALLOW));

  expect(plan.actions).toEqual([
    {
      type: SecurityActionType.NONE,
      priority: SecurityActionPriority.LOW,
      sequence: 1,
      metadata: {
        decision: SecurityDecision.ALLOW,
        reason: SecurityDecisionReason.POLICY_ALLOW,
      },
    },
  ]);
  expect(plan.metadata?.threatAssessment?.disposition).toBe(DetectionDisposition.CLEAN);
});

test('IGNORE plans NONE', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.IGNORE));

  expect(plan.actions.map((action) => action.type)).toEqual([SecurityActionType.NONE]);
});

test('INVESTIGATE plans CREATE_INCIDENT and NOTIFY_AUDIT', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.INVESTIGATE));

  expect(plan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(plan.actions.map((action) => action.priority)).toEqual([
    SecurityActionPriority.NORMAL,
    SecurityActionPriority.NORMAL,
  ]);
  expect(plan.actions.map((action) => action.sequence)).toEqual([1, 2]);
});

test('CONTAIN plans quarantine and audit actions', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.CONTAIN));

  expect(plan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(plan.actions.map((action) => action.priority)).toEqual([
    SecurityActionPriority.CRITICAL,
    SecurityActionPriority.NORMAL,
    SecurityActionPriority.NORMAL,
  ]);
  expect(plan.actions.map((action) => action.sequence)).toEqual([1, 2, 3]);
});

test('BLOCK plans bot removal, webhook freeze, and audit actions', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan({
    ...buildDecision(SecurityDecision.BLOCK),
    metadata: {
      source: 'test',
      threatAssessment: buildThreatAssessment(
        DetectionDisposition.MALICIOUS,
        DetectionSeverity.CRITICAL,
        DetectionConfidence.CERTAIN,
      ),
    },
  });

  expect(plan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    SecurityActionType.FREEZE_WEBHOOKS,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
  expect(plan.actions.map((action) => action.priority)).toEqual([
    SecurityActionPriority.CRITICAL,
    SecurityActionPriority.HIGH,
    SecurityActionPriority.NORMAL,
    SecurityActionPriority.NORMAL,
  ]);
  expect(plan.actions.map((action) => action.sequence)).toEqual([1, 2, 3, 4]);
  expect(plan.metadata?.threatAssessment?.disposition).toBe(DetectionDisposition.MALICIOUS);
  expect(plan.metadata?.threatAssessment?.severity).toBe(DetectionSeverity.CRITICAL);
});

test('no duplicate actions are produced', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.BLOCK));
  const types = plan.actions.map((action) => action.type);
  const uniqueTypes = [...new Set(types)];

  expect(uniqueTypes).toEqual(types);
});

test('stable action order is preserved', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.CONTAIN));

  expect(plan.actions.map((action) => action.sequence)).toEqual([1, 2, 3]);
  expect(plan.actions.map((action) => action.type)).toEqual([
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
});

test('identical input produces identical plan', () => {
  const planner = new InMemorySecurityActionPlanner();
  const decision = buildDecision(SecurityDecision.CONTAIN);

  const first = planner.plan(decision);
  const second = planner.plan(decision);

  expect(first).toEqual(second);
});

test('correlationId is preserved', () => {
  const planner = new InMemorySecurityActionPlanner();
  const first = planner.plan(buildDecision(SecurityDecision.CONTAIN));

  expect(first.correlationId).toBe('corr-1');
});

test('threatAssessment metadata is preserved into the action plan', () => {
  const planner = new InMemorySecurityActionPlanner();
  const threatAssessment = buildThreatAssessment(
    DetectionDisposition.SUSPICIOUS,
    DetectionSeverity.MEDIUM,
    DetectionConfidence.HIGH,
  );
  const plan = planner.plan({
    ...buildDecision(SecurityDecision.INVESTIGATE),
    metadata: {
      source: 'test',
      threatAssessment,
    },
  });

  expect(plan.metadata?.threatAssessment).toEqual(threatAssessment);
  expect(plan.metadata?.threatAssessment).not.toBe(threatAssessment);
  expect(plan.correlationId).toBe('corr-1');
});

test('plans are immutable at runtime', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.BLOCK));

  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(plan.actions)).toBe(true);
  expect(Object.isFrozen(plan.actions[0])).toBe(true);
  expect(Object.isFrozen(plan.actions[0].metadata as object)).toBe(true);
  expect(Object.isFrozen(plan.metadata as object)).toBe(true);
  expect(Object.isFrozen(plan.metadata?.threatAssessment as object)).toBe(true);
  expect(() => {
    (plan.actions as unknown as unknown[]).push(SecurityActionType.ESCALATE);
  }).toThrow();
});

test('planning is side-effect free for input decision model', () => {
  const planner = new InMemorySecurityActionPlanner();
  const decision = buildDecision(SecurityDecision.CONTAIN);
  const original = JSON.parse(JSON.stringify(decision));

  planner.plan(decision);

  expect(decision).toEqual(original);
});

test('priorities are typed enums, not numeric', () => {
  const planner = new InMemorySecurityActionPlanner();
  const plan = planner.plan(buildDecision(SecurityDecision.BLOCK));

  for (const action of plan.actions) {
    expect(typeof action.priority).toBe('string');
    expect(Object.values(SecurityActionPriority)).toContain(action.priority);
  }
});

test('planner source has no forbidden integration surfaces', () => {
  const source = readPlannerSource();

  expect(source).not.toMatch(/discord\.js/i);
  expect(source).not.toMatch(/fetch\s*\(/i);
  expect(source).not.toMatch(/node:fs|from\s+['"]fs['"]/i);
  expect(source).not.toMatch(/database|typeorm|prisma|mongoose|sequelize/i);
  expect(source).not.toMatch(/persist|save\s*\(|repository/i);
  expect(source).not.toMatch(/\.ban\s*\(|\.kick\s*\(|\.quarantine\s*\(/i);
  expect(source).not.toMatch(/WebhookClient|\.freezeWebhooks\s*\(|\.lockdown\s*\(|\.recover\s*\(|\.punish\s*\(/i);
});
