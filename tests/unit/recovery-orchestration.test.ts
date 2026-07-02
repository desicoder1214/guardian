import {
  CoordinatedContainmentActionStatus,
  CoordinatedContainmentExecutionResult,
} from '../../src/core/runtime/discord/coordinated-containment-execution';
import { SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import {
  buildRecoveryOrchestrationMetadata,
  classifyRecoveryFailure,
} from '../../src/core/runtime/recovery/recovery-orchestration';

function buildContainmentResult(
  overrides: Partial<CoordinatedContainmentExecutionResult> = {},
): CoordinatedContainmentExecutionResult {
  return Object.freeze({
    planId: 'plan-1',
    executionPlanId: 'exec-plan-1',
    correlationId: 'incident-1',
    succeededActions: Object.freeze([SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER]),
    failedActions: Object.freeze([SecurityActionType.FREEZE_WEBHOOKS]),
    skippedDuplicateActions: Object.freeze([]),
    unsupportedActions: Object.freeze([]),
    actionResults: Object.freeze([
      Object.freeze({
        actionType: SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
        sequence: 1,
        correlationId: 'incident-1',
        status: CoordinatedContainmentActionStatus.SUCCEEDED,
        executionTimeMs: 4,
        metadata: Object.freeze({
          metadata: Object.freeze({
            authorizationMetadata: Object.freeze({ actorId: 'actor-1' }),
          }),
        }),
      }),
      Object.freeze({
        actionType: SecurityActionType.FREEZE_WEBHOOKS,
        sequence: 2,
        correlationId: 'incident-1',
        status: CoordinatedContainmentActionStatus.FAILED,
        executionTimeMs: 7,
        metadata: Object.freeze({
          httpStatus: 500,
          error: Object.freeze({ code: 'NETWORK_ERROR', message: 'upstream failure' }),
        }),
      }),
    ]),
    totalExecutionTimeMs: 11,
    metadata: Object.freeze({
      source: 'in-memory-security-execution-orchestrator' as const,
      idempotencyKey: 'idem-1',
      securityDecisionPreserved: true,
      threatAssessmentPreserved: true,
    }),
    ...overrides,
  });
}

describe('Recovery orchestration classification', () => {
  test.each([
    [403, 'API_ERROR', false],
    [404, 'API_ERROR', false],
    [429, 'RATE_LIMITED', true],
    [500, 'NETWORK_ERROR', true],
  ])('classifies HTTP %i retryability', (httpStatus, errorCode, expectedRetryable) => {
    const failedAction = Object.freeze({
      actionType: SecurityActionType.FREEZE_WEBHOOKS,
      sequence: 4,
      correlationId: 'incident-http',
      status: CoordinatedContainmentActionStatus.FAILED,
      executionTimeMs: 3,
      metadata: Object.freeze({
        httpStatus,
        error: Object.freeze({ code: errorCode, message: 'failure' }),
      }),
    });

    const result = classifyRecoveryFailure(failedAction);
    expect(result?.retryable).toBe(expectedRetryable);
    expect(result?.httpStatus).toBe(httpStatus);
  });

  test('detects timeout failures as retryable even without HTTP status', () => {
    const failedAction = Object.freeze({
      actionType: SecurityActionType.LOCK_CHANNELS,
      sequence: 3,
      correlationId: 'incident-timeout',
      status: CoordinatedContainmentActionStatus.FAILED,
      executionTimeMs: 3,
      metadata: Object.freeze({
        error: Object.freeze({
          code: 'UNKNOWN_ERROR',
          message: 'request timed out after 10s',
        }),
      }),
    });

    const result = classifyRecoveryFailure(failedAction);
    expect(result?.retryable).toBe(true);
    expect(result?.timeoutDetected).toBe(true);
  });

  test('builds forensic metadata with retry plan and preserves actor/incident identity', () => {
    const containment = buildContainmentResult();
    const metadata = buildRecoveryOrchestrationMetadata(
      containment,
      'incident-1',
      'runtime-enterprise-1',
    );

    expect(metadata.incidentId).toBe('incident-1');
    expect(metadata.runtimeId).toBe('runtime-enterprise-1');
    expect(metadata.actorId).toBe('actor-1');
    expect(metadata.retryPlan.shouldRetry).toBe(true);
    expect(metadata.retryPlan.retryableActionTypes).toContain(
      SecurityActionType.FREEZE_WEBHOOKS,
    );
    expect(metadata.succeededActions).toContain(
      SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
    );
    expect(metadata.forensicEvidence).toHaveLength(2);
  });

  test('partial failures only schedule retryable actions', () => {
    const containment = buildContainmentResult({
      failedActions: Object.freeze([
        SecurityActionType.FREEZE_WEBHOOKS,
        SecurityActionType.LOCK_CHANNELS,
      ]),
      actionResults: Object.freeze([
        Object.freeze({
          actionType: SecurityActionType.FREEZE_WEBHOOKS,
          sequence: 2,
          correlationId: 'incident-partial',
          status: CoordinatedContainmentActionStatus.FAILED,
          executionTimeMs: 2,
          metadata: Object.freeze({
            httpStatus: 429,
            error: Object.freeze({ code: 'RATE_LIMITED', message: 'rate limited' }),
          }),
        }),
        Object.freeze({
          actionType: SecurityActionType.LOCK_CHANNELS,
          sequence: 3,
          correlationId: 'incident-partial',
          status: CoordinatedContainmentActionStatus.FAILED,
          executionTimeMs: 2,
          metadata: Object.freeze({
            httpStatus: 403,
            error: Object.freeze({ code: 'API_ERROR', message: 'forbidden' }),
          }),
        }),
      ]),
    });

    const metadata = buildRecoveryOrchestrationMetadata(
      containment,
      'incident-partial',
      'runtime-partial',
    );
    expect(metadata.retryableFailures).toHaveLength(1);
    expect(metadata.nonRetryableFailures).toHaveLength(1);
    expect(metadata.retryPlan.retryableActionSequences).toEqual([2]);
  });
});