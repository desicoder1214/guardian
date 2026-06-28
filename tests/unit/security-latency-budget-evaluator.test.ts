import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE,
  SecurityLatencyStage,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityLatencyBudgetEvaluator } from '../../src/core/runtime/discord/security-latency-budget-evaluator';

function buildMeasuredDurations(value: number): Readonly<Record<SecurityLatencyStage, number>> {
  return Object.freeze({
    [SecurityLatencyStage.DETECTION]: value,
    [SecurityLatencyStage.THREAT_INTERPRETATION]: value,
    [SecurityLatencyStage.DECISION]: value,
    [SecurityLatencyStage.ACTION_PLANNING]: value,
    [SecurityLatencyStage.EXECUTION_PLANNING]: value,
    [SecurityLatencyStage.HOT_PATH_PLANNING]: value,
    [SecurityLatencyStage.AUTHORIZATION]: value,
  });
}

function readEvaluatorSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-latency-budget-evaluator.ts'),
    'utf8',
  );
}

function readExecutionTypesSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../src/core/runtime/discord/security-execution-types.ts'),
    'utf8',
  );
}

test('latency budget profile is immutable', () => {
  const profile = DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE;

  expect(Object.isFrozen(profile)).toBe(true);
  expect(Object.isFrozen(profile.budgets)).toBe(true);
  expect(Object.isFrozen(profile.guardrails)).toBe(true);

  expect(() => {
    (profile as { name: string }).name = 'mutated';
  }).toThrow(TypeError);
});

test('evaluator is deterministic', () => {
  const evaluator = new InMemorySecurityLatencyBudgetEvaluator();
  const measured = buildMeasuredDurations(1);

  const first = evaluator.evaluate(measured);
  const second = evaluator.evaluate(measured);

  expect(first).toEqual(second);
});

test('violation is reported when stage exceeds budget', () => {
  const evaluator = new InMemorySecurityLatencyBudgetEvaluator();
  const measured = Object.freeze({
    ...buildMeasuredDurations(1),
    [SecurityLatencyStage.HOT_PATH_PLANNING]: 2,
  });

  const envelope = evaluator.evaluate(measured);

  expect(envelope.withinBudget).toBe(false);
  expect(envelope.violations).toHaveLength(1);
  expect(envelope.violations[0]?.stage).toBe(SecurityLatencyStage.HOT_PATH_PLANNING);
  expect(envelope.violations[0]?.targetMs).toBe(1);
  expect(envelope.violations[0]?.observedMs).toBe(2);
});

test('no violations when all stages are within budget', () => {
  const evaluator = new InMemorySecurityLatencyBudgetEvaluator();
  const envelope = evaluator.evaluate(buildMeasuredDurations(1));

  expect(envelope.withinBudget).toBe(true);
  expect(envelope.violations).toEqual([]);
});

test('guardrails prohibit persistence/filesystem/dashboard/audit polling and allow deferred work', () => {
  const guardrails = DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE.guardrails;

  expect(guardrails.prohibitPersistence).toBe(true);
  expect(guardrails.prohibitFilesystemWrites).toBe(true);
  expect(guardrails.prohibitDashboardUpdates).toBe(true);
  expect(guardrails.prohibitAuditLogPollingBeforeImmediateContainment).toBe(true);
  expect(guardrails.allowBackgroundDeferredOperations).toBe(true);
});

test('latency contracts and evaluator source have no forbidden integration surfaces', () => {
  const evaluatorSource = readEvaluatorSource();
  const executionTypesSource = readExecutionTypesSource();

  expect(evaluatorSource).not.toMatch(/discord\.js/i);
  expect(evaluatorSource).not.toMatch(/fetch\s*\(/i);
  expect(evaluatorSource).not.toMatch(/node:fs|writeFile|appendFile|mkdir|unlink/i);
  expect(evaluatorSource).not.toMatch(/database|typeorm|prisma|mongoose|sequelize|persist\s*\(|save\s*\(|repository\s*\./i);
  expect(evaluatorSource).not.toMatch(/dashboard\s*[:.(]|command\s*\(/i);
  expect(evaluatorSource).not.toMatch(/detector/i);
  expect(evaluatorSource).not.toMatch(/execute\s*\(/i);

  expect(executionTypesSource).not.toMatch(/discord\.js|fetch\s*\(|database|persist\s*\(|save\s*\(|repository\s*\./i);
}
);



