import {
  CoordinatedContainmentActionResult,
  CoordinatedContainmentActionStatus,
  CoordinatedContainmentExecutionResult,
} from '../discord/coordinated-containment-execution';
import { DiscordExecutionErrorCode } from '../discord/discord-execution-service';

export interface RecoveryActionFailureClassification {
  readonly actionType: string;
  readonly sequence: number;
  readonly retryable: boolean;
  readonly failureCode: string;
  readonly httpStatus?: number;
  readonly timeoutDetected: boolean;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryOrchestrationMetadata {
  readonly incidentId: string;
  readonly runtimeId: string;
  readonly executionPlanId: string;
  readonly planId: string;
  readonly actorId?: string;
  readonly failedActions: readonly string[];
  readonly succeededActions: readonly string[];
  readonly skippedDuplicateActions: readonly string[];
  readonly unsupportedActions: readonly string[];
  readonly retryableFailures: readonly RecoveryActionFailureClassification[];
  readonly nonRetryableFailures: readonly RecoveryActionFailureClassification[];
  readonly retryPlan: {
    readonly retryableActionTypes: readonly string[];
    readonly retryableActionSequences: readonly number[];
    readonly shouldRetry: boolean;
  };
  readonly forensicEvidence: readonly {
    readonly actionType: string;
    readonly sequence: number;
    readonly status: string;
    readonly metadata?: Record<string, unknown>;
  }[];
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function readNumber(record: Record<string, unknown> | undefined, ...keys: string[]): number | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function hasTimeoutSignal(metadata: Record<string, unknown> | undefined): boolean {
  const error = readRecord(metadata?.error);
  const nestedError = readRecord(readRecord(metadata?.discordExecutionMetadata)?.error);
  const message = readString(error, 'message', 'cause') ?? '';
  const nestedMessage = readString(nestedError, 'message', 'cause') ?? '';
  return /timeout|timed out|etimedout|abort/i.test(`${message} ${nestedMessage}`);
}

function freezeFailure(
  classification: RecoveryActionFailureClassification,
): RecoveryActionFailureClassification {
  return Object.freeze({
    ...classification,
    metadata: classification.metadata ? Object.freeze({ ...classification.metadata }) : undefined,
  });
}

export function classifyRecoveryFailure(
  actionResult: CoordinatedContainmentActionResult,
): RecoveryActionFailureClassification | undefined {
  if (actionResult.status !== CoordinatedContainmentActionStatus.FAILED) {
    return undefined;
  }

  const metadata = readRecord(actionResult.metadata);
  const discordExecutionMetadata = readRecord(metadata?.discordExecutionMetadata);
  const metadataForClassification = discordExecutionMetadata ?? metadata;
  const error = readRecord(metadataForClassification?.error);
  const errorCode = readString(error, 'code');
  const httpStatus = readNumber(metadataForClassification, 'httpStatus', 'statusCode');
  const timeoutDetected = hasTimeoutSignal(metadata);

  const retryable =
    timeoutDetected ||
    errorCode === DiscordExecutionErrorCode.RATE_LIMITED ||
    errorCode === DiscordExecutionErrorCode.NETWORK_ERROR ||
    httpStatus === 429 ||
    (typeof httpStatus === 'number' && httpStatus >= 500);

  const failureCode =
    errorCode ??
    (httpStatus === 403
      ? 'HTTP_403_PERMISSION'
      : httpStatus === 404
        ? 'HTTP_404_NOT_FOUND'
        : httpStatus === 429
          ? 'HTTP_429_RATE_LIMITED'
          : typeof httpStatus === 'number' && httpStatus >= 500
            ? 'HTTP_5XX'
            : timeoutDetected
              ? 'NETWORK_TIMEOUT'
              : 'UNKNOWN_FAILURE');

  return freezeFailure({
    actionType: actionResult.actionType,
    sequence: actionResult.sequence,
    retryable,
    failureCode,
    httpStatus,
    timeoutDetected,
    reason: retryable
      ? 'recoverable failure classified for retry scheduling'
      : 'non-recoverable failure preserved for forensic evidence',
    metadata,
  });
}

function extractActorId(containment: CoordinatedContainmentExecutionResult): string | undefined {
  for (const action of containment.actionResults) {
    const metadata = readRecord(action.metadata);
    const nestedMetadata = readRecord(metadata?.metadata);
    const discordExecutionMetadata = readRecord(metadata?.discordExecutionMetadata);
    const discordNestedMetadata = readRecord(discordExecutionMetadata?.metadata);
    const authorizationMetadata = readRecord(nestedMetadata?.authorizationMetadata);
    const discordAuthorizationMetadata = readRecord(discordNestedMetadata?.authorizationMetadata);
    const actorId =
      readString(authorizationMetadata, 'actorId', 'actor_id') ??
      readString(discordAuthorizationMetadata, 'actorId', 'actor_id') ??
      readString(nestedMetadata, 'actorId', 'actor_id') ??
      readString(discordNestedMetadata, 'actorId', 'actor_id');
    if (actorId) {
      return actorId;
    }
  }

  return undefined;
}

export function buildRecoveryOrchestrationMetadata(
  containment: CoordinatedContainmentExecutionResult,
  incidentId: string,
  runtimeId: string,
): RecoveryOrchestrationMetadata {
  const failures = containment.actionResults
    .map((result) => classifyRecoveryFailure(result))
    .filter((result): result is RecoveryActionFailureClassification => result !== undefined);
  const retryableFailures = Object.freeze(failures.filter((result) => result.retryable));
  const nonRetryableFailures = Object.freeze(failures.filter((result) => !result.retryable));

  return Object.freeze({
    incidentId,
    runtimeId,
    executionPlanId: containment.executionPlanId,
    planId: containment.planId,
    actorId: extractActorId(containment),
    failedActions: Object.freeze([...containment.failedActions]),
    succeededActions: Object.freeze([...containment.succeededActions]),
    skippedDuplicateActions: Object.freeze([...containment.skippedDuplicateActions]),
    unsupportedActions: Object.freeze([...containment.unsupportedActions]),
    retryableFailures,
    nonRetryableFailures,
    retryPlan: Object.freeze({
      retryableActionTypes: Object.freeze(retryableFailures.map((failure) => failure.actionType)),
      retryableActionSequences: Object.freeze(retryableFailures.map((failure) => failure.sequence)),
      shouldRetry: retryableFailures.length > 0,
    }),
    forensicEvidence: Object.freeze(
      containment.actionResults.map((result) =>
        Object.freeze({
          actionType: result.actionType,
          sequence: result.sequence,
          status: result.status,
          metadata: result.metadata ? Object.freeze({ ...result.metadata }) : undefined,
        }),
      ),
    ),
  });
}