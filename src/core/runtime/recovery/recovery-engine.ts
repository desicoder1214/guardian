// Recovery Engine — coordinates restoration workflows after successful containment.
// This module does NOT restore Discord state, access the database, or call the Discord API.
// It implements staged recovery coordination only.

export enum RecoveryStage {
  REQUEST_VALIDATION = 'REQUEST_VALIDATION',
  RECOVERY_PLANNING = 'RECOVERY_PLANNING',
  AUTHORIZATION_CHECK = 'AUTHORIZATION_CHECK',
  RECOVERY_EXECUTION_COORDINATION = 'RECOVERY_EXECUTION_COORDINATION',
  VERIFICATION = 'VERIFICATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum RecoveryOperationType {
  UNAUTHORIZED_BOT_REMOVAL_RECOVERY = 'UNAUTHORIZED_BOT_REMOVAL_RECOVERY',
}

export enum RecoveryVerificationOutcome {
  VERIFIED = 'VERIFIED',
  UNVERIFIABLE = 'UNVERIFIABLE',
  FAILED = 'FAILED',
}

export enum RecoveryAuthorizationDecision {
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED',
}

export interface RecoveryRequest {
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly operationType: RecoveryOperationType;
  readonly guildId: string;
  readonly initiatedBy: string;
  readonly requestedAt: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryPlan {
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly operationType: RecoveryOperationType;
  readonly plannedStages: readonly RecoveryStage[];
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryAuthorizationResult {
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly decision: RecoveryAuthorizationDecision;
  readonly reason: string;
}

export interface RecoveryCoordinationResult {
  readonly recoveryId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly operationType: RecoveryOperationType;
  readonly coordinationSucceeded: boolean;
  readonly message: string;
}

export interface RecoveryReport {
  readonly transactionId: string;
  readonly correlationId: string;
  readonly recoveryId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly stagesCompleted: readonly RecoveryStage[];
  readonly verificationOutcome: RecoveryVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
}

export interface RecoveryRequestValidator {
  validate(request: RecoveryRequest): { readonly valid: boolean; readonly reason?: string };
}

export interface RecoveryPlanner {
  plan(request: RecoveryRequest): RecoveryPlan;
}

export interface RecoveryAuthorizationEngine {
  authorize(plan: RecoveryPlan): RecoveryAuthorizationResult;
}

export interface RecoveryCoordinator {
  coordinate(plan: RecoveryPlan): RecoveryCoordinationResult;
}

export interface RecoveryVerifier {
  verify(coordination: RecoveryCoordinationResult): RecoveryVerificationOutcome;
}

export interface RecoveryEngine {
  execute(request: RecoveryRequest): Promise<RecoveryReport>;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value) as T;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

function freezeReport(report: RecoveryReport): RecoveryReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
  });
}

export function freezeRecoveryRequest(request: RecoveryRequest): RecoveryRequest {
  return deepFreeze({
    ...request,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

// ── Default implementations ────────────────────────────────────────────────────

export class InMemoryRecoveryRequestValidator implements RecoveryRequestValidator {
  validate(request: RecoveryRequest): { readonly valid: boolean; readonly reason?: string } {
    if (!request.recoveryId || request.recoveryId.trim().length === 0) {
      return Object.freeze({ valid: false, reason: 'recoveryId is required' });
    }
    if (!request.correlationId || request.correlationId.trim().length === 0) {
      return Object.freeze({ valid: false, reason: 'correlationId is required' });
    }
    if (!request.transactionId || request.transactionId.trim().length === 0) {
      return Object.freeze({ valid: false, reason: 'transactionId is required' });
    }
    if (!request.guildId || request.guildId.trim().length === 0) {
      return Object.freeze({ valid: false, reason: 'guildId is required' });
    }
    if (!request.initiatedBy || request.initiatedBy.trim().length === 0) {
      return Object.freeze({ valid: false, reason: 'initiatedBy is required' });
    }
    if (request.operationType !== RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY) {
      return Object.freeze({ valid: false, reason: `unsupported operationType: ${request.operationType}` });
    }
    return Object.freeze({ valid: true });
  }
}

export class InMemoryRecoveryPlanner implements RecoveryPlanner {
  plan(request: RecoveryRequest): RecoveryPlan {
    return deepFreeze({
      recoveryId: request.recoveryId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      operationType: request.operationType,
      plannedStages: Object.freeze([
        RecoveryStage.REQUEST_VALIDATION,
        RecoveryStage.RECOVERY_PLANNING,
        RecoveryStage.AUTHORIZATION_CHECK,
        RecoveryStage.RECOVERY_EXECUTION_COORDINATION,
        RecoveryStage.VERIFICATION,
        RecoveryStage.REPORT_GENERATION,
      ]),
    });
  }
}

export class InMemoryRecoveryAuthorizationEngine implements RecoveryAuthorizationEngine {
  authorize(plan: RecoveryPlan): RecoveryAuthorizationResult {
    return Object.freeze({
      recoveryId: plan.recoveryId,
      correlationId: plan.correlationId,
      decision: RecoveryAuthorizationDecision.AUTHORIZED,
      reason: 'recovery-authorized-by-policy',
    });
  }
}

export class InMemoryRecoveryCoordinator implements RecoveryCoordinator {
  coordinate(plan: RecoveryPlan): RecoveryCoordinationResult {
    return Object.freeze({
      recoveryId: plan.recoveryId,
      correlationId: plan.correlationId,
      transactionId: plan.transactionId,
      operationType: plan.operationType,
      coordinationSucceeded: true,
      message: 'recovery-coordination-completed',
    });
  }
}

export class InMemoryRecoveryVerifier implements RecoveryVerifier {
  verify(coordination: RecoveryCoordinationResult): RecoveryVerificationOutcome {
    return coordination.coordinationSucceeded
      ? RecoveryVerificationOutcome.VERIFIED
      : RecoveryVerificationOutcome.FAILED;
  }
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class InMemoryRecoveryEngine implements RecoveryEngine {
  private readonly completedTransactions = new Map<string, RecoveryReport>();

  constructor(
    private readonly validator: RecoveryRequestValidator = new InMemoryRecoveryRequestValidator(),
    private readonly planner: RecoveryPlanner = new InMemoryRecoveryPlanner(),
    private readonly authorizationEngine: RecoveryAuthorizationEngine = new InMemoryRecoveryAuthorizationEngine(),
    private readonly coordinator: RecoveryCoordinator = new InMemoryRecoveryCoordinator(),
    private readonly verifier: RecoveryVerifier = new InMemoryRecoveryVerifier(),
  ) {}

  async execute(request: RecoveryRequest): Promise<RecoveryReport> {
    const frozenRequest = freezeRecoveryRequest(request);
    const startedAtMs = Date.now();
    const stagesCompleted: RecoveryStage[] = [];

    // Idempotency: return the same report for a repeated transaction.
    const existing = this.completedTransactions.get(frozenRequest.transactionId);
    if (existing) {
      return freezeReport({ ...existing, idempotentReplay: true });
    }

    // Stage 1 — Request Validation
    const validationResult = this.validator.validate(frozenRequest);
    stagesCompleted.push(RecoveryStage.REQUEST_VALIDATION);

    if (!validationResult.valid) {
      const report = freezeReport({
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        recoveryId: frozenRequest.recoveryId,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
        stagesCompleted: Object.freeze([...stagesCompleted]),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason: validationResult.reason ?? 'request-validation-failed',
        idempotentReplay: false,
      });
      this.completedTransactions.set(frozenRequest.transactionId, report);
      return report;
    }

    // Stage 2 — Recovery Planning
    const plan = this.planner.plan(frozenRequest);
    stagesCompleted.push(RecoveryStage.RECOVERY_PLANNING);

    // Stage 3 — Authorization Check
    const authResult = this.authorizationEngine.authorize(plan);
    stagesCompleted.push(RecoveryStage.AUTHORIZATION_CHECK);

    if (authResult.decision === RecoveryAuthorizationDecision.DENIED) {
      const report = freezeReport({
        transactionId: frozenRequest.transactionId,
        correlationId: frozenRequest.correlationId,
        recoveryId: frozenRequest.recoveryId,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
        stagesCompleted: Object.freeze([...stagesCompleted]),
        verificationOutcome: RecoveryVerificationOutcome.FAILED,
        success: false,
        failureReason: `authorization-denied: ${authResult.reason}`,
        idempotentReplay: false,
      });
      this.completedTransactions.set(frozenRequest.transactionId, report);
      return report;
    }

    // Stage 4 — Recovery Execution Coordination
    const coordination = this.coordinator.coordinate(plan);
    stagesCompleted.push(RecoveryStage.RECOVERY_EXECUTION_COORDINATION);

    // Stage 5 — Verification
    const verificationOutcome = this.verifier.verify(coordination);
    stagesCompleted.push(RecoveryStage.VERIFICATION);

    // Stage 6 — Report Generation
    stagesCompleted.push(RecoveryStage.REPORT_GENERATION);

    const success = verificationOutcome === RecoveryVerificationOutcome.VERIFIED;
    const report = freezeReport({
      transactionId: frozenRequest.transactionId,
      correlationId: frozenRequest.correlationId,
      recoveryId: frozenRequest.recoveryId,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      stagesCompleted: Object.freeze([...stagesCompleted]),
      verificationOutcome,
      success,
      failureReason: success ? undefined : 'verification-failed',
      idempotentReplay: false,
    });

    this.completedTransactions.set(frozenRequest.transactionId, report);
    return report;
  }
}
