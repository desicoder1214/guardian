import {
  DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE,
  SecurityHotPathLatencyEnvelope,
  SecurityLatencyBudget,
  SecurityLatencyBudgetProfile,
  SecurityLatencyStage,
  SecurityLatencyViolation,
} from './security-execution-types';

export interface SecurityLatencyBudgetEvaluator {
  evaluate(
    measuredStageDurationsMs: Readonly<Record<SecurityLatencyStage, number>>,
    profile?: SecurityLatencyBudgetProfile,
  ): SecurityHotPathLatencyEnvelope;
}

function freezeBudget(budget: SecurityLatencyBudget): SecurityLatencyBudget {
  return Object.freeze({
    stage: budget.stage,
    targetMs: budget.targetMs,
  });
}

function freezeProfile(profile: SecurityLatencyBudgetProfile): SecurityLatencyBudgetProfile {
  return Object.freeze({
    name: profile.name,
    budgets: Object.freeze(profile.budgets.map((budget) => freezeBudget(budget))),
    guardrails: Object.freeze({
      prohibitPersistence: profile.guardrails.prohibitPersistence,
      prohibitFilesystemWrites: profile.guardrails.prohibitFilesystemWrites,
      prohibitDashboardUpdates: profile.guardrails.prohibitDashboardUpdates,
      prohibitAuditLogPollingBeforeImmediateContainment:
        profile.guardrails.prohibitAuditLogPollingBeforeImmediateContainment,
      allowBackgroundDeferredOperations: profile.guardrails.allowBackgroundDeferredOperations,
    }),
  });
}

function freezeViolation(violation: SecurityLatencyViolation): SecurityLatencyViolation {
  return Object.freeze({
    stage: violation.stage,
    targetMs: violation.targetMs,
    observedMs: violation.observedMs,
    exceededByMs: violation.exceededByMs,
  });
}

function buildMeasuredDurations(
  measuredStageDurationsMs: Readonly<Record<SecurityLatencyStage, number>>,
): Readonly<Record<SecurityLatencyStage, number>> {
  return Object.freeze({
    [SecurityLatencyStage.DETECTION]: measuredStageDurationsMs[SecurityLatencyStage.DETECTION],
    [SecurityLatencyStage.THREAT_INTERPRETATION]: measuredStageDurationsMs[SecurityLatencyStage.THREAT_INTERPRETATION],
    [SecurityLatencyStage.DECISION]: measuredStageDurationsMs[SecurityLatencyStage.DECISION],
    [SecurityLatencyStage.ACTION_PLANNING]: measuredStageDurationsMs[SecurityLatencyStage.ACTION_PLANNING],
    [SecurityLatencyStage.EXECUTION_PLANNING]: measuredStageDurationsMs[SecurityLatencyStage.EXECUTION_PLANNING],
    [SecurityLatencyStage.HOT_PATH_PLANNING]: measuredStageDurationsMs[SecurityLatencyStage.HOT_PATH_PLANNING],
    [SecurityLatencyStage.AUTHORIZATION]: measuredStageDurationsMs[SecurityLatencyStage.AUTHORIZATION],
  });
}

export class InMemorySecurityLatencyBudgetEvaluator implements SecurityLatencyBudgetEvaluator {
  evaluate(
    measuredStageDurationsMs: Readonly<Record<SecurityLatencyStage, number>>,
    profile: SecurityLatencyBudgetProfile = DEFAULT_SECURITY_HOT_PATH_LATENCY_BUDGET_PROFILE,
  ): SecurityHotPathLatencyEnvelope {
    const frozenProfile = freezeProfile(profile);
    const frozenMeasuredDurations = buildMeasuredDurations(measuredStageDurationsMs);

    const violations = frozenProfile.budgets
      .map((budget) => {
        const observedMs = frozenMeasuredDurations[budget.stage];
        const exceededByMs = observedMs - budget.targetMs;

        if (exceededByMs <= 0) {
          return undefined;
        }

        return freezeViolation({
          stage: budget.stage,
          targetMs: budget.targetMs,
          observedMs,
          exceededByMs,
        });
      })
      .filter((violation): violation is SecurityLatencyViolation => violation !== undefined);

    return Object.freeze({
      profile: frozenProfile,
      measuredStageDurationsMs: frozenMeasuredDurations,
      violations: Object.freeze(violations),
      withinBudget: violations.length === 0,
    });
  }
}
