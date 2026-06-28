import {
  freezeRecoveryRequest,
  InMemoryRecoveryAuthorizationEngine,
  InMemoryRecoveryCoordinator,
  InMemoryRecoveryEngine,
  InMemoryRecoveryPlanner,
  InMemoryRecoveryRequestValidator,
  InMemoryRecoveryVerifier,
  RecoveryAuthorizationDecision,
  RecoveryCoordinationResult,
  RecoveryOperationType,
  RecoveryPlan,
  RecoveryReport,
  RecoveryRequest,
  RecoveryStage,
  RecoveryVerificationOutcome,
  RecoveryAuthorizationResult,
  RecoveryAuthorizationEngine,
  RecoveryCoordinator,
} from '../../src/core/runtime/recovery/recovery-engine';

function buildRequest(overrides: Partial<RecoveryRequest> = {}): RecoveryRequest {
  return Object.freeze({
    recoveryId: 'recovery-001',
    correlationId: 'corr-001',
    transactionId: 'txn-001',
    operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
    guildId: 'guild-001',
    initiatedBy: 'guardian-recovery',
    requestedAt: '2026-06-28T00:00:00.000Z',
    ...overrides,
  });
}

describe('RecoveryEngine', () => {
  describe('immutable requests', () => {
    test('freezeRecoveryRequest returns a frozen object', () => {
      const req = buildRequest({ metadata: { reason: 'test' } });
      const frozen = freezeRecoveryRequest(req);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.metadata)).toBe(true);

      expect(() => {
        (frozen as { correlationId: string }).correlationId = 'mutated';
      }).toThrow(TypeError);
    });

    test('request with no metadata freezes cleanly', () => {
      const frozen = freezeRecoveryRequest(buildRequest());
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.metadata).toBeUndefined();
    });
  });

  describe('immutable reports', () => {
    test('returned report is deeply frozen', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest());

      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.stagesCompleted)).toBe(true);

      expect(() => {
        (report as { success: boolean }).success = false;
      }).toThrow(TypeError);

      expect(() => {
        (report.stagesCompleted as RecoveryStage[]).push(RecoveryStage.REPORT_GENERATION);
      }).toThrow(TypeError);
    });
  });

  describe('happy path execution', () => {
    test('returns a successful report for a valid unauthorized bot removal recovery', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest());

      expect(report.success).toBe(true);
      expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
      expect(report.correlationId).toBe('corr-001');
      expect(report.recoveryId).toBe('recovery-001');
      expect(report.transactionId).toBe('txn-001');
      expect(report.failureReason).toBeUndefined();
      expect(report.idempotentReplay).toBe(false);
    });
  });

  describe('stage ordering', () => {
    test('all six stages are completed in order for a valid request', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest());

      expect(report.stagesCompleted).toEqual([
        RecoveryStage.REQUEST_VALIDATION,
        RecoveryStage.RECOVERY_PLANNING,
        RecoveryStage.AUTHORIZATION_CHECK,
        RecoveryStage.RECOVERY_EXECUTION_COORDINATION,
        RecoveryStage.VERIFICATION,
        RecoveryStage.REPORT_GENERATION,
      ]);
    });

    test('only REQUEST_VALIDATION stage is present when validation fails', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest({ recoveryId: '' }));

      expect(report.stagesCompleted).toEqual([RecoveryStage.REQUEST_VALIDATION]);
      expect(report.success).toBe(false);
    });

    test('only up to AUTHORIZATION_CHECK when authorization is denied', async () => {
      const denyingAuth: RecoveryAuthorizationEngine = {
        authorize(): RecoveryAuthorizationResult {
          return Object.freeze({
            recoveryId: 'recovery-001',
            correlationId: 'corr-001',
            decision: RecoveryAuthorizationDecision.DENIED,
            reason: 'not-permitted',
          });
        },
      };
      const engine = new InMemoryRecoveryEngine(
        new InMemoryRecoveryRequestValidator(),
        new InMemoryRecoveryPlanner(),
        denyingAuth,
      );
      const report = await engine.execute(buildRequest());

      expect(report.stagesCompleted).toEqual([
        RecoveryStage.REQUEST_VALIDATION,
        RecoveryStage.RECOVERY_PLANNING,
        RecoveryStage.AUTHORIZATION_CHECK,
      ]);
      expect(report.success).toBe(false);
      expect(report.failureReason).toContain('authorization-denied');
    });
  });

  describe('correlation preservation', () => {
    test('correlationId propagates through to the report', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest({ correlationId: 'corr-explicit-999' }));

      expect(report.correlationId).toBe('corr-explicit-999');
    });
  });

  describe('transaction tracking', () => {
    test('transactionId is present in the report', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest({ transactionId: 'txn-explicit-abc' }));

      expect(report.transactionId).toBe('txn-explicit-abc');
    });
  });

  describe('idempotent recovery requests', () => {
    test('second execution with same transactionId returns idempotent replay report', async () => {
      const engine = new InMemoryRecoveryEngine();
      const first = await engine.execute(buildRequest());
      const second = await engine.execute(buildRequest());

      expect(first.idempotentReplay).toBe(false);
      expect(second.idempotentReplay).toBe(true);
      expect(second.transactionId).toBe(first.transactionId);
      expect(second.success).toBe(first.success);
      expect(second.verificationOutcome).toBe(first.verificationOutcome);
    });

    test('different transactionId executes independently without replay', async () => {
      const engine = new InMemoryRecoveryEngine();
      const first = await engine.execute(buildRequest({ transactionId: 'txn-a' }));
      const second = await engine.execute(buildRequest({ transactionId: 'txn-b' }));

      expect(first.idempotentReplay).toBe(false);
      expect(second.idempotentReplay).toBe(false);
      expect(first.transactionId).toBe('txn-a');
      expect(second.transactionId).toBe('txn-b');
    });
  });

  describe('duplicate recovery suppression', () => {
    test('third call with same transactionId still returns replay without re-executing', async () => {
      const engine = new InMemoryRecoveryEngine();
      await engine.execute(buildRequest());
      await engine.execute(buildRequest());
      const third = await engine.execute(buildRequest());

      expect(third.idempotentReplay).toBe(true);
    });

    test('idempotent replay report is itself frozen', async () => {
      const engine = new InMemoryRecoveryEngine();
      await engine.execute(buildRequest());
      const replay = await engine.execute(buildRequest());

      expect(Object.isFrozen(replay)).toBe(true);
      expect(Object.isFrozen(replay.stagesCompleted)).toBe(true);
    });
  });

  describe('verification result propagation', () => {
    test('UNVERIFIABLE coordination propagates UNVERIFIABLE outcome', async () => {
      const unverifiableCoordinator: RecoveryCoordinator = {
        coordinate(plan: RecoveryPlan): RecoveryCoordinationResult {
          return Object.freeze({
            recoveryId: plan.recoveryId,
            correlationId: plan.correlationId,
            transactionId: plan.transactionId,
            operationType: plan.operationType,
            coordinationSucceeded: false,
            message: 'coordination-unavailable',
          });
        },
      };
      const engine = new InMemoryRecoveryEngine(
        new InMemoryRecoveryRequestValidator(),
        new InMemoryRecoveryPlanner(),
        new InMemoryRecoveryAuthorizationEngine(),
        unverifiableCoordinator,
        new InMemoryRecoveryVerifier(),
      );
      const report = await engine.execute(buildRequest());

      expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.FAILED);
      expect(report.success).toBe(false);
      expect(report.failureReason).toBe('verification-failed');
    });

    test('VERIFIED coordination marks report as successful', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest());

      expect(report.verificationOutcome).toBe(RecoveryVerificationOutcome.VERIFIED);
      expect(report.success).toBe(true);
    });
  });

  describe('request validation failures', () => {
    test.each([
      ['empty recoveryId', { recoveryId: '' }],
      ['empty correlationId', { correlationId: '' }],
      ['empty transactionId', { transactionId: '' }],
      ['empty guildId', { guildId: '' }],
      ['empty initiatedBy', { initiatedBy: '' }],
    ])('fails closed when %s', async (_label, partial) => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest(partial));

      expect(report.success).toBe(false);
      expect(report.failureReason).toBeTruthy();
      expect(report.stagesCompleted).toContain(RecoveryStage.REQUEST_VALIDATION);
      expect(report.stagesCompleted).not.toContain(RecoveryStage.RECOVERY_PLANNING);
    });
  });

  describe('timing fields', () => {
    test('report contains startedAt, finishedAt, and non-negative durationMs', async () => {
      const engine = new InMemoryRecoveryEngine();
      const report = await engine.execute(buildRequest());

      expect(typeof report.startedAt).toBe('string');
      expect(typeof report.finishedAt).toBe('string');
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('InMemoryRecoveryRequestValidator', () => {
    const validator = new InMemoryRecoveryRequestValidator();

    test('rejects unsupported operationType', () => {
      const result = validator.validate(buildRequest({ operationType: 'UNKNOWN_OP' as RecoveryOperationType }));
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('unsupported operationType');
    });

    test('accepts valid request', () => {
      const result = validator.validate(buildRequest());
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('InMemoryRecoveryPlanner', () => {
    test('plan includes all six recovery stages', () => {
      const planner = new InMemoryRecoveryPlanner();
      const plan = planner.plan(buildRequest());

      expect(plan.plannedStages).toEqual([
        RecoveryStage.REQUEST_VALIDATION,
        RecoveryStage.RECOVERY_PLANNING,
        RecoveryStage.AUTHORIZATION_CHECK,
        RecoveryStage.RECOVERY_EXECUTION_COORDINATION,
        RecoveryStage.VERIFICATION,
        RecoveryStage.REPORT_GENERATION,
      ]);
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.plannedStages)).toBe(true);
    });
  });

  describe('InMemoryRecoveryAuthorizationEngine', () => {
    test('default engine authorizes valid plans', () => {
      const planner = new InMemoryRecoveryPlanner();
      const authEngine = new InMemoryRecoveryAuthorizationEngine();
      const plan = planner.plan(buildRequest());
      const result = authEngine.authorize(plan);

      expect(result.decision).toBe(RecoveryAuthorizationDecision.AUTHORIZED);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('InMemoryRecoveryCoordinator', () => {
    test('default coordinator reports coordination succeeded', () => {
      const planner = new InMemoryRecoveryPlanner();
      const coordinator = new InMemoryRecoveryCoordinator();
      const plan = planner.plan(buildRequest());
      const result = coordinator.coordinate(plan);

      expect(result.coordinationSucceeded).toBe(true);
      expect(result.correlationId).toBe('corr-001');
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('InMemoryRecoveryVerifier', () => {
    test('returns VERIFIED for successful coordination', () => {
      const verifier = new InMemoryRecoveryVerifier();
      const coordinator = new InMemoryRecoveryCoordinator();
      const plan = new InMemoryRecoveryPlanner().plan(buildRequest());
      const outcome = verifier.verify(coordinator.coordinate(plan));

      expect(outcome).toBe(RecoveryVerificationOutcome.VERIFIED);
    });

    test('returns FAILED for failed coordination', () => {
      const verifier = new InMemoryRecoveryVerifier();
      const failedCoordination: RecoveryCoordinationResult = Object.freeze({
        recoveryId: 'r-1',
        correlationId: 'c-1',
        transactionId: 't-1',
        operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
        coordinationSucceeded: false,
        message: 'failed',
      });
      expect(verifier.verify(failedCoordination)).toBe(RecoveryVerificationOutcome.FAILED);
    });
  });
});
