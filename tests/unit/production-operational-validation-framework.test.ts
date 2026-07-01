import {
  DEFAULT_OPERATIONAL_VALIDATION_SCENARIOS,
  InMemoryProductionOperationalValidationFramework,
  OperationalValidationRequest,
  OperationalValidationScenario,
} from '../../src/core/runtime/discord/production-operational-validation-framework';

class FixedClock {
  constructor(private readonly ticks: readonly number[], private index = 0) {}

  now(): number {
    const value = this.ticks[Math.min(this.index, this.ticks.length - 1)];
    this.index += 1;
    return value;
  }
}

function createRequest(
  overrides: Partial<OperationalValidationRequest> = {},
): OperationalValidationRequest {
  return Object.freeze({
    correlationId: 'corr-operational-1',
    transactionId: 'txn-operational-1',
    runtimeId: 'runtime-operational-1',
    guildId: 'guild-operational-1',
    ...overrides,
  });
}

describe('InMemoryProductionOperationalValidationFramework', () => {
  test('covers every representative scenario with operational readiness checks', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000000, 1700000000010]),
    });

    const report = await framework.validate(createRequest());

    expect(report.success).toBe(true);
    expect(report.overallOperationalReadiness).toBe(true);
    expect(report.scenarioResults).toHaveLength(10);
    expect(report.failureAnalysis).toEqual([]);
    expect(report.unsupportedRoutesFailClosed).toBe(true);
    expect(report.duplicateExecutionPrevented).toBe(true);
    expect(report.replaySafe).toBe(true);
    expect(
      new Set(report.scenarioResults.map((result) => result.scenario)),
    ).toEqual(new Set(DEFAULT_OPERATIONAL_VALIDATION_SCENARIOS.map((scenario) => scenario.scenario)));
    expect(report.scenarioResults.every((result) => result.overallOperationalReadiness)).toBe(true);
    expect(
      report.scenarioResults.every(
        (result) =>
          result.detectionResult.detected &&
          result.executionPlan.created &&
          result.authorizationResult.enforced &&
          result.metadataVerification.preserved &&
          result.replayVerification.duplicatePrevented,
      ),
    ).toBe(true);
  });

  test('preserves correlation/runtime/transaction/execution/route metadata per scenario', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000100, 1700000000110]),
    });

    const request = createRequest();
    const report = await framework.validate(request);

    for (const scenario of report.scenarioResults) {
      expect(scenario.metadataVerification.preserved).toBe(true);
      expect(scenario.metadataVerification.correlationId).toBe(request.correlationId);
      expect(scenario.metadataVerification.runtimeId).toBe(request.runtimeId);
      expect(scenario.metadataVerification.transactionId).toBe(request.transactionId);
      expect(scenario.metadataVerification.executionPlanId).toContain(request.correlationId);
      expect(scenario.metadataVerification.routeId).toContain(scenario.executionPlan.executionPlanId);
    }
  });

  test('selects expected adapter and route for every scenario', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000200, 1700000000210]),
    });

    const report = await framework.validate(createRequest());

    const expectedByScenario = new Map(
      DEFAULT_OPERATIONAL_VALIDATION_SCENARIOS.map((scenario) => [scenario.scenario, scenario]),
    );

    for (const scenarioResult of report.scenarioResults) {
      const expected = expectedByScenario.get(scenarioResult.scenario);
      expect(expected).toBeDefined();
      expect(scenarioResult.adapterSelected).toBe(expected?.expectedAdapterBinding);
      expect(scenarioResult.routeSelected.actionType).toBe(expected?.expectedActionType);
    }
  });

  test('enforces authorization success and reports authorization failure deterministically', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000300, 1700000000310]),
    });

    const success = await framework.validate(createRequest());
    expect(success.scenarioResults.every((entry) => entry.authorizationResult.enforced)).toBe(true);

    const failed = await framework.validate(
      createRequest({
        validationId: 'forced-authorization-failure',
        forceAuthorizationFailureFor: Object.freeze([
          OperationalValidationScenario.DANGEROUS_ROLE_GRANT,
        ]),
      }),
    );

    const roleScenario = failed.scenarioResults.find(
      (entry) => entry.scenario === OperationalValidationScenario.DANGEROUS_ROLE_GRANT,
    );
    expect(roleScenario).toBeDefined();
    expect(roleScenario?.authorizationResult.enforced).toBe(false);
    expect(failed.success).toBe(false);
  });

  test('maintains replay safety and marks idempotent replay', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000400, 1700000000410, 1700000000420]),
    });

    const request = createRequest();
    const first = await framework.validate(request);
    const second = await framework.validate(request);

    expect(first.validationId).toBe(second.validationId);
    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.replaySafe).toBe(true);
  });

  test('prevents duplicate execution for each scenario', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000500, 1700000000510]),
    });

    const report = await framework.validate(createRequest());

    expect(report.duplicateExecutionPrevented).toBe(true);
    expect(report.scenarioResults.every((entry) => entry.replayVerification.duplicatePrevented)).toBe(true);
  });

  test('unsupported routes fail closed and detect unsafe fail-open probes', async () => {
    const failClosedFramework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000600, 1700000000610]),
    });
    const failClosedReport = await failClosedFramework.validate(createRequest());
    expect(failClosedReport.unsupportedRoutesFailClosed).toBe(true);

    const failOpenFramework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000700, 1700000000710]),
      enableUnsafeUnsupportedProbeExecutor: true,
    });
    const failOpenReport = await failOpenFramework.validate(
      createRequest({ validationId: 'unsafe-probe-case' }),
    );
    expect(failOpenReport.unsupportedRoutesFailClosed).toBe(false);
    expect(failOpenReport.success).toBe(false);
  });

  test('report is deeply immutable', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000800, 1700000000810]),
    });

    const report = await framework.validate(createRequest());

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.scenarioResults)).toBe(true);
    expect(Object.isFrozen(report.failureAnalysis)).toBe(true);
    expect(Object.isFrozen(report.metadata)).toBe(true);

    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('validation identifiers are deterministic across framework instances', async () => {
    const request = createRequest();

    const firstFramework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000900, 1700000000910]),
    });
    const secondFramework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000000900, 1700000000910]),
    });

    const first = await firstFramework.validate(request);
    const second = await secondFramework.validate(request);

    expect(first.validationId).toBe(second.validationId);
    expect(
      first.scenarioResults.map((scenario) => scenario.executionPlan.executionPlanId),
    ).toEqual(second.scenarioResults.map((scenario) => scenario.executionPlan.executionPlanId));
    expect(first.scenarioResults.map((scenario) => scenario.routeSelected.routeId)).toEqual(
      second.scenarioResults.map((scenario) => scenario.routeSelected.routeId),
    );
  });

  test('records a deterministic performance baseline for the operational chain', async () => {
    const framework = new InMemoryProductionOperationalValidationFramework({
      clock: new FixedClock([1700000001000, 1700000001037]),
    });

    const report = await framework.validate(createRequest({ validationId: 'baseline-operational-1' }));

    const baseline = {
      validationDurationMs: report.durationMs,
      scenarioCount: report.scenarioResults.length,
      detectedScenarios: report.scenarioResults.filter((scenario) => scenario.detectionResult.detected).length,
      planningReadyScenarios: report.scenarioResults.filter((scenario) => scenario.executionPlan.created).length,
      dispatchReadyScenarios: report.scenarioResults.filter((scenario) => scenario.routeSelected.decision === 'EXECUTABLE').length,
    };

    console.info('operational-certification-performance-baseline', baseline);

    expect(baseline).toMatchObject({
      scenarioCount: 10,
      detectedScenarios: 10,
      planningReadyScenarios: 10,
    });
    expect(baseline.validationDurationMs).toBeGreaterThanOrEqual(0);
    expect(baseline.dispatchReadyScenarios).toBeGreaterThan(0);
  });
});