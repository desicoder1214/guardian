export enum DiscordExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

export enum DiscordExecutionErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface DiscordExecutionResult {
  readonly status: DiscordExecutionStatus;
  readonly executionTimeMs: number;
  readonly metadata?: unknown;
  readonly correlationId: string;
}

export interface DiscordExecutionRetryMetadata {
  readonly bounded: true;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly exhausted: boolean;
}

export interface DiscordExecutionRateLimitMetadata {
  readonly limited: boolean;
  readonly retryAfterMs?: number;
  readonly bucketId?: string;
  readonly global?: boolean;
}

export interface DiscordExecutionErrorMetadata {
  readonly code: DiscordExecutionErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: string;
}

export enum DiscordBotRemovalVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_REMOVED = 'ALREADY_REMOVED',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum DiscordRoleRemovalVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_ABSENT = 'ALREADY_ABSENT',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum DiscordWebhookRemovalVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_REMOVED = 'ALREADY_REMOVED',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum DiscordChannelContainmentVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_CONTAINED = 'ALREADY_CONTAINED',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum DiscordPermissionOverwriteVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_RESTORED = 'ALREADY_RESTORED',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum DiscordIntegrationRestorationVerificationOutcome {
  SUCCESS = 'SUCCESS',
  ALREADY_REMOVED = 'ALREADY_REMOVED',
  PERMISSION_FAILURE = 'PERMISSION_FAILURE',
  FAILURE = 'FAILURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface DiscordBotRemovalExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly botUserId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordRoleRemovalExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly memberUserId?: string;
  readonly roleId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordWebhookRemovalExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly webhookId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordChannelContainmentExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly channelId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordPermissionOverwriteExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly channelId?: string;
  readonly overwriteId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordMemberContainmentExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly memberUserId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordIntegrationRestorationExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly integrationId?: string;
  readonly applicationId?: string;
  readonly idempotencyKey?: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordBotRemovalOperationRequest {
  readonly correlationId: string;
  readonly guildId: string;
  readonly botUserId: string;
  readonly reason?: string;
}

export interface DiscordBotRemovalOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordIntegrationRestorationOperationRequest {
  readonly correlationId: string;
  readonly guildId: string;
  readonly integrationId: string;
  readonly applicationId?: string;
  readonly reason?: string;
}

export interface DiscordIntegrationRestorationOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordBotRemovalOperation {
  removeUnauthorizedBot(request: DiscordBotRemovalOperationRequest): Promise<DiscordBotRemovalOperationResponse>;
}

export interface DiscordIntegrationRestorationOperation {
  restoreIntegration(
    request: DiscordIntegrationRestorationOperationRequest,
  ): Promise<DiscordIntegrationRestorationOperationResponse>;
}

export interface DiscordRoleRemovalOperationRequest {
  readonly correlationId: string;
  readonly guildId: string;
  readonly memberUserId?: string;
  readonly roleId: string;
  readonly reason?: string;
}

export interface DiscordRoleRemovalOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordRoleRemovalOperation {
  removeDangerousRole(request: DiscordRoleRemovalOperationRequest): Promise<DiscordRoleRemovalOperationResponse>;
}

export interface DiscordWebhookRemovalOperationRequest {
  readonly correlationId: string;
  readonly webhookId: string;
  readonly guildId?: string;
  readonly reason?: string;
}

export interface DiscordWebhookRemovalOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordWebhookRemovalOperation {
  removeDangerousWebhook(request: DiscordWebhookRemovalOperationRequest): Promise<DiscordWebhookRemovalOperationResponse>;
}

export interface DiscordChannelContainmentOperationRequest {
  readonly correlationId: string;
  readonly channelId: string;
  readonly guildId?: string;
  readonly reason?: string;
}

export interface DiscordChannelContainmentOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordChannelContainmentOperation {
  containChannel(request: DiscordChannelContainmentOperationRequest): Promise<DiscordChannelContainmentOperationResponse>;
}

export interface DiscordPermissionOverwriteOperationRequest {
  readonly correlationId: string;
  readonly channelId: string;
  readonly overwriteId: string;
  readonly guildId?: string;
  readonly reason?: string;
}

export interface DiscordPermissionOverwriteOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordPermissionOverwriteOperation {
  restorePermissionOverwrite(
    request: DiscordPermissionOverwriteOperationRequest,
  ): Promise<DiscordPermissionOverwriteOperationResponse>;
}

export interface DiscordMemberModerationOperationRequest {
  readonly correlationId: string;
  readonly guildId: string;
  readonly memberUserId: string;
  readonly reason?: string;
}

export interface DiscordMemberModerationOperationResponse {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly rateLimit?: {
    readonly retryAfterMs?: number;
    readonly bucketId?: string;
    readonly global?: boolean;
  };
  readonly error?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface DiscordMemberModerationOperation {
  banMember(request: DiscordMemberModerationOperationRequest): Promise<DiscordMemberModerationOperationResponse>;
  kickMember(request: DiscordMemberModerationOperationRequest): Promise<DiscordMemberModerationOperationResponse>;
}

export interface MemberExecutionService {
  banMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult>;
  kickMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult>;
  removeRoles(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult>;
}

export interface RoleExecutionService {
  restoreRole(correlationId: string): Promise<DiscordExecutionResult>;
  removeDangerousRole(request: string | DiscordRoleRemovalExecutionRequest): Promise<DiscordExecutionResult>;
}

export interface ChannelExecutionService {
  lockChannel(request: string | DiscordChannelContainmentExecutionRequest): Promise<DiscordExecutionResult>;
  unlockChannel(correlationId: string): Promise<DiscordExecutionResult>;
  restoreChannel(request: string | DiscordPermissionOverwriteExecutionRequest): Promise<DiscordExecutionResult>;
}

export interface WebhookExecutionService {
  deleteWebhook(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult>;
  restoreWebhook(correlationId: string): Promise<DiscordExecutionResult>;
  freezeWebhooks(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult>;
}

export interface GuildExecutionService {
  createIncident(correlationId: string): Promise<DiscordExecutionResult>;
  notifyAudit(correlationId: string): Promise<DiscordExecutionResult>;
  restoreResource(correlationId: string): Promise<DiscordExecutionResult>;
  escalate(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface EmojiExecutionService {
  restoreEmoji(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface VanityExecutionService {
  restoreVanity(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface IntegrationExecutionService {
  restoreIntegration(
    request: string | DiscordIntegrationRestorationExecutionRequest,
  ): Promise<DiscordExecutionResult>;
}

export interface BotExecutionService {
  removeUnauthorizedBot(request: string | DiscordBotRemovalExecutionRequest): Promise<DiscordExecutionResult>;
}

export interface DiscordExecutionService {
  readonly member: MemberExecutionService;
  readonly role: RoleExecutionService;
  readonly channel: ChannelExecutionService;
  readonly webhook: WebhookExecutionService;
  readonly guild: GuildExecutionService;
  readonly emoji: EmojiExecutionService;
  readonly vanity: VanityExecutionService;
  readonly integration: IntegrationExecutionService;
  readonly bot: BotExecutionService;
}

export interface InMemoryDiscordExecutionServiceOptions {
  readonly allowInMemoryExecution?: boolean;
}

export interface ProductionDiscordExecutionServiceOptions {
  readonly maxAttempts?: number;
  readonly supportedOperation?:
    | 'REMOVE_UNAUTHORIZED_BOT'
    | 'REMOVE_DANGEROUS_ROLE'
    | 'REMOVE_DANGEROUS_WEBHOOK'
    | 'LOCK_CHANNELS'
    | 'RESTORE_PERMISSION_OVERWRITE';
}

export interface ProductionDiscordExecutionServiceDependencies {
  readonly memberModerationOperation?: DiscordMemberModerationOperation;
  readonly botRemovalOperation?: DiscordBotRemovalOperation;
  readonly roleRemovalOperation?: DiscordRoleRemovalOperation;
  readonly webhookRemovalOperation?: DiscordWebhookRemovalOperation;
  readonly channelContainmentOperation?: DiscordChannelContainmentOperation;
  readonly permissionOverwriteOperation?: DiscordPermissionOverwriteOperation;
  readonly integrationRestorationOperation?: DiscordIntegrationRestorationOperation;
}

interface FrozenExecutionMetadata {
  readonly operation:
    | 'REMOVE_UNAUTHORIZED_BOT'
    | 'REMOVE_DANGEROUS_ROLE'
    | 'REMOVE_DANGEROUS_WEBHOOK'
    | 'LOCK_CHANNELS'
    | 'RESTORE_PERMISSION_OVERWRITE'
    | 'RESTORE_INTEGRATION';
  readonly idempotencyKey: string;
  readonly httpStatus: number;
  readonly verification: {
    readonly outcome:
      | DiscordBotRemovalVerificationOutcome
      | DiscordRoleRemovalVerificationOutcome
        | DiscordWebhookRemovalVerificationOutcome
        | DiscordChannelContainmentVerificationOutcome
        | DiscordPermissionOverwriteVerificationOutcome
        | DiscordIntegrationRestorationVerificationOutcome;
  };
  readonly duplicate?: boolean;
  readonly retry: DiscordExecutionRetryMetadata;
  readonly rateLimit: DiscordExecutionRateLimitMetadata;
  readonly error?: DiscordExecutionErrorMetadata;
  readonly metadata?: Record<string, unknown>;
}

const DEFAULT_PRODUCTION_OPTIONS: Required<ProductionDiscordExecutionServiceOptions> = Object.freeze({
  maxAttempts: 2,
  supportedOperation: 'REMOVE_UNAUTHORIZED_BOT',
});

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeRetryMetadata(metadata: DiscordExecutionRetryMetadata): DiscordExecutionRetryMetadata {
  return Object.freeze({
    bounded: true,
    attemptCount: metadata.attemptCount,
    maxAttempts: metadata.maxAttempts,
    exhausted: metadata.exhausted,
  });
}

function freezeRateLimitMetadata(metadata: DiscordExecutionRateLimitMetadata): DiscordExecutionRateLimitMetadata {
  return Object.freeze({
    limited: metadata.limited,
    retryAfterMs: metadata.retryAfterMs,
    bucketId: metadata.bucketId,
    global: metadata.global,
  });
}

function freezeErrorMetadata(metadata?: DiscordExecutionErrorMetadata): DiscordExecutionErrorMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return Object.freeze({
    code: metadata.code,
    message: metadata.message,
    retryable: metadata.retryable,
    cause: metadata.cause,
  });
}

function freezeExecutionResult(result: DiscordExecutionResult): DiscordExecutionResult {
  const metadataRecord = result.metadata as FrozenExecutionMetadata | undefined;
  return Object.freeze({
    status: result.status,
    executionTimeMs: result.executionTimeMs,
    correlationId: result.correlationId,
    metadata: metadataRecord
      ? Object.freeze({
          operation: metadataRecord.operation,
          idempotencyKey: metadataRecord.idempotencyKey,
          httpStatus: metadataRecord.httpStatus,
          verification: freezeVerification(metadataRecord.verification),
          duplicate: metadataRecord.duplicate,
          retry: freezeRetryMetadata(metadataRecord.retry),
          rateLimit: freezeRateLimitMetadata(metadataRecord.rateLimit),
          error: freezeErrorMetadata(metadataRecord.error),
          metadata: freezeMetadata(metadataRecord.metadata),
        })
      : undefined,
  });
}

function freezeVerification(metadata: {
  outcome:
    | DiscordBotRemovalVerificationOutcome
    | DiscordRoleRemovalVerificationOutcome
    | DiscordWebhookRemovalVerificationOutcome
    | DiscordChannelContainmentVerificationOutcome
    | DiscordPermissionOverwriteVerificationOutcome
    | DiscordIntegrationRestorationVerificationOutcome;
}): {
  readonly outcome:
    | DiscordBotRemovalVerificationOutcome
    | DiscordRoleRemovalVerificationOutcome
    | DiscordWebhookRemovalVerificationOutcome
    | DiscordChannelContainmentVerificationOutcome
    | DiscordPermissionOverwriteVerificationOutcome
    | DiscordIntegrationRestorationVerificationOutcome;
} {
  return Object.freeze({ outcome: metadata.outcome });
}

function nowMs(): number {
  return Date.now();
}

function coerceBotRequest(request: string | DiscordBotRemovalExecutionRequest): DiscordBotRemovalExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    botUserId: request.botUserId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolveIdempotencyKey(request: DiscordBotRemovalExecutionRequest): string {
  return request.idempotencyKey ?? request.correlationId;
}

function coerceRoleRequest(request: string | DiscordRoleRemovalExecutionRequest): DiscordRoleRemovalExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    memberUserId: request.memberUserId,
    roleId: request.roleId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolveRoleIdempotencyKey(request: DiscordRoleRemovalExecutionRequest): string {
  return request.idempotencyKey ?? request.correlationId;
}

function coerceWebhookRequest(request: string | DiscordWebhookRemovalExecutionRequest): DiscordWebhookRemovalExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    webhookId: request.webhookId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function coerceIntegrationRequest(
  request: string | DiscordIntegrationRestorationExecutionRequest,
): DiscordIntegrationRestorationExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    integrationId: request.integrationId,
    applicationId: request.applicationId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolveWebhookIdempotencyKey(request: DiscordWebhookRemovalExecutionRequest): string {
  return request.idempotencyKey ?? request.correlationId;
}

function coerceChannelContainmentRequest(
  request: string | DiscordChannelContainmentExecutionRequest,
): DiscordChannelContainmentExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    channelId: request.channelId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolveChannelContainmentIdempotencyKey(request: DiscordChannelContainmentExecutionRequest): string {
  return request.idempotencyKey ?? request.correlationId;
}

function coercePermissionOverwriteRequest(
  request: string | DiscordPermissionOverwriteExecutionRequest,
): DiscordPermissionOverwriteExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    channelId: request.channelId,
    overwriteId: request.overwriteId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolvePermissionOverwriteIdempotencyKey(request: DiscordPermissionOverwriteExecutionRequest): string {
  return request.idempotencyKey ?? request.correlationId;
}

function coerceMemberRequest(request: string | DiscordMemberContainmentExecutionRequest): DiscordMemberContainmentExecutionRequest {
  if (typeof request === 'string') {
    return Object.freeze({ correlationId: request, idempotencyKey: request });
  }

  return Object.freeze({
    correlationId: request.correlationId,
    guildId: request.guildId,
    memberUserId: request.memberUserId,
    idempotencyKey: request.idempotencyKey,
    reason: request.reason,
    metadata: freezeMetadata(request.metadata),
  });
}

function resolveMemberIdempotencyKey(request: DiscordMemberContainmentExecutionRequest, operation: string): string {
  return request.idempotencyKey ?? `${operation}:${request.correlationId}`;
}

function mapErrorCode(
  response?:
    | DiscordBotRemovalOperationResponse
    | DiscordMemberModerationOperationResponse
    | DiscordRoleRemovalOperationResponse
    | DiscordWebhookRemovalOperationResponse
    | DiscordChannelContainmentOperationResponse
    | DiscordPermissionOverwriteOperationResponse,
): DiscordExecutionErrorCode {
  if (!response) {
    return DiscordExecutionErrorCode.UNKNOWN_ERROR;
  }

  if (response.statusCode === 429 || response.rateLimit?.retryAfterMs !== undefined) {
    return DiscordExecutionErrorCode.RATE_LIMITED;
  }

  if (response.statusCode >= 500) {
    return DiscordExecutionErrorCode.NETWORK_ERROR;
  }

  if (response.statusCode >= 400) {
    return DiscordExecutionErrorCode.API_ERROR;
  }

  return DiscordExecutionErrorCode.UNKNOWN_ERROR;
}

function resolveFailureCode(
  response:
    | DiscordBotRemovalOperationResponse
    | DiscordMemberModerationOperationResponse
    | DiscordRoleRemovalOperationResponse
    | DiscordWebhookRemovalOperationResponse
    | DiscordChannelContainmentOperationResponse
    | DiscordPermissionOverwriteOperationResponse
    | undefined,
  failureCause: unknown,
): DiscordExecutionErrorCode {
  if (response?.error?.code === 'UNKNOWN_ERROR') {
    return DiscordExecutionErrorCode.UNKNOWN_ERROR;
  }

  if (response) {
    return mapErrorCode(response);
  }

  if (failureCause !== undefined) {
    return DiscordExecutionErrorCode.NETWORK_ERROR;
  }

  return DiscordExecutionErrorCode.UNKNOWN_ERROR;
}

function parseFailureCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === 'string') {
    return cause;
  }

  return 'unknown-cause';
}

function isAlreadyRemoved(response: DiscordBotRemovalOperationResponse): boolean {
  return (
    response.statusCode === 404 ||
    response.error?.code === 'ALREADY_REMOVED' ||
    response.error?.code === 'UNKNOWN_MEMBER'
  );
}

function isPermissionFailure(response: DiscordBotRemovalOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

function isMemberAlreadyRemoved(response: DiscordMemberModerationOperationResponse): boolean {
  return response.statusCode === 404 || response.error?.code === 'ALREADY_REMOVED' || response.error?.code === 'UNKNOWN_MEMBER';
}

function isMemberPermissionFailure(response: DiscordMemberModerationOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

function isRoleAlreadyAbsent(response: DiscordRoleRemovalOperationResponse): boolean {
  return (
    response.statusCode === 404 ||
    response.error?.code === 'ALREADY_ABSENT' ||
    response.error?.code === 'UNKNOWN_MEMBER' ||
    response.error?.code === 'UNKNOWN_ROLE'
  );
}

function isRolePermissionFailure(response: DiscordRoleRemovalOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

function isWebhookAlreadyRemoved(response: DiscordWebhookRemovalOperationResponse): boolean {
  return response.statusCode === 404 || response.error?.code === 'ALREADY_REMOVED' || response.error?.code === 'UNKNOWN_WEBHOOK';
}

function isWebhookPermissionFailure(response: DiscordWebhookRemovalOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

function isChannelAlreadyContained(response: DiscordChannelContainmentOperationResponse): boolean {
  return response.statusCode === 409 || response.error?.code === 'ALREADY_CONTAINED';
}

function isChannelPermissionFailure(response: DiscordChannelContainmentOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

function isPermissionOverwriteAlreadyRestored(response: DiscordPermissionOverwriteOperationResponse): boolean {
  return response.statusCode === 404 || response.error?.code === 'ALREADY_RESTORED' || response.error?.code === 'UNKNOWN_OVERWRITE';
}

function isPermissionOverwritePermissionFailure(response: DiscordPermissionOverwriteOperationResponse): boolean {
  return response.statusCode === 403 || response.error?.code === 'PERMISSION_DENIED' || response.error?.code === 'MISSING_PERMISSIONS';
}

abstract class BaseInMemoryExecutionService {
  protected buildResult(service: string, operation: string, correlationId: string): DiscordExecutionResult {
    return Object.freeze({
      status: DiscordExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({
        mode: 'in-memory-placeholder',
        service,
        operation,
      }),
    });
  }
}

class InMemoryMemberExecutionService extends BaseInMemoryExecutionService implements MemberExecutionService {
  async banMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceMemberRequest(request);
    return this.buildResult('member', 'banMember', normalizedRequest.correlationId);
  }

  async kickMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceMemberRequest(request);
    return this.buildResult('member', 'kickMember', normalizedRequest.correlationId);
  }

  async removeRoles(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceMemberRequest(request);
    return this.buildResult('member', 'removeRoles', normalizedRequest.correlationId);
  }
}

class InMemoryRoleExecutionService extends BaseInMemoryExecutionService implements RoleExecutionService {
  async restoreRole(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('role', 'restoreRole', correlationId);
  }

  async removeDangerousRole(request: string | DiscordRoleRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceRoleRequest(request);
    return this.buildResult('role', 'removeDangerousRole', normalizedRequest.correlationId);
  }
}

class InMemoryChannelExecutionService extends BaseInMemoryExecutionService implements ChannelExecutionService {
  async lockChannel(request: string | DiscordChannelContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceChannelContainmentRequest(request);
    return this.buildResult('channel', 'lockChannel', normalizedRequest.correlationId);
  }

  async unlockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('channel', 'unlockChannel', correlationId);
  }

  async restoreChannel(request: string | DiscordPermissionOverwriteExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coercePermissionOverwriteRequest(request);
    return this.buildResult('channel', 'restoreChannel', normalizedRequest.correlationId);
  }
}

class InMemoryWebhookExecutionService extends BaseInMemoryExecutionService implements WebhookExecutionService {
  async deleteWebhook(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceWebhookRequest(request);
    return this.buildResult('webhook', 'deleteWebhook', normalizedRequest.correlationId);
  }

  async restoreWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('webhook', 'restoreWebhook', correlationId);
  }

  async freezeWebhooks(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceWebhookRequest(request);
    return this.buildResult('webhook', 'freezeWebhooks', normalizedRequest.correlationId);
  }
}

class InMemoryGuildExecutionService extends BaseInMemoryExecutionService implements GuildExecutionService {
  async createIncident(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('guild', 'createIncident', correlationId);
  }

  async notifyAudit(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('guild', 'notifyAudit', correlationId);
  }

  async restoreResource(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('guild', 'restoreResource', correlationId);
  }

  async escalate(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('guild', 'escalate', correlationId);
  }
}

class InMemoryEmojiExecutionService extends BaseInMemoryExecutionService implements EmojiExecutionService {
  async restoreEmoji(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('emoji', 'restoreEmoji', correlationId);
  }
}

class InMemoryVanityExecutionService extends BaseInMemoryExecutionService implements VanityExecutionService {
  async restoreVanity(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('vanity', 'restoreVanity', correlationId);
  }
}

class InMemoryIntegrationExecutionService extends BaseInMemoryExecutionService implements IntegrationExecutionService {
  async restoreIntegration(request: string | DiscordIntegrationRestorationExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return this.buildResult('integration', 'restoreIntegration', correlationId);
  }
}

class InMemoryBotExecutionService extends BaseInMemoryExecutionService implements BotExecutionService {
  async removeUnauthorizedBot(request: string | DiscordBotRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceBotRequest(request);
    const correlationId = normalizedRequest.correlationId;
    return this.buildResult('bot', 'removeUnauthorizedBot', correlationId);
  }
}

class UnsupportedMemberExecutionService implements MemberExecutionService {
  async banMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('member', 'banMember', correlationId);
  }

  async kickMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('member', 'kickMember', correlationId);
  }

  async removeRoles(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('member', 'removeRoles', correlationId);
  }
}

class UnsupportedRoleExecutionService implements RoleExecutionService {
  async restoreRole(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('role', 'restoreRole', correlationId);
  }

  async removeDangerousRole(request: string | DiscordRoleRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('role', 'removeDangerousRole', correlationId);
  }
}

class UnsupportedBotExecutionService implements BotExecutionService {
  async removeUnauthorizedBot(request: string | DiscordBotRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('bot', 'removeUnauthorizedBot', correlationId);
  }
}

class UnsupportedChannelExecutionService implements ChannelExecutionService {
  async lockChannel(request: string | DiscordChannelContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('channel', 'lockChannel', correlationId);
  }

  async unlockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('channel', 'unlockChannel', correlationId);
  }

  async restoreChannel(request: string | DiscordPermissionOverwriteExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('channel', 'restoreChannel', correlationId);
  }
}

class UnsupportedWebhookExecutionService implements WebhookExecutionService {
  async deleteWebhook(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('webhook', 'deleteWebhook', correlationId);
  }

  async restoreWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('webhook', 'restoreWebhook', correlationId);
  }

  async freezeWebhooks(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('webhook', 'freezeWebhooks', correlationId);
  }
}

class UnsupportedGuildExecutionService implements GuildExecutionService {
  async createIncident(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('guild', 'createIncident', correlationId);
  }

  async notifyAudit(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('guild', 'notifyAudit', correlationId);
  }

  async restoreResource(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('guild', 'restoreResource', correlationId);
  }

  async escalate(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('guild', 'escalate', correlationId);
  }
}

class UnsupportedEmojiExecutionService implements EmojiExecutionService {
  async restoreEmoji(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('emoji', 'restoreEmoji', correlationId);
  }
}

class UnsupportedVanityExecutionService implements VanityExecutionService {
  async restoreVanity(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('vanity', 'restoreVanity', correlationId);
  }
}

class UnsupportedIntegrationExecutionService implements IntegrationExecutionService {
  async restoreIntegration(request: string | DiscordIntegrationRestorationExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('integration', 'restoreIntegration', correlationId);
  }
}

function unsupportedResult(service: string, operation: string, correlationId: string): DiscordExecutionResult {
  return Object.freeze({
    status: DiscordExecutionStatus.NOT_SUPPORTED,
    executionTimeMs: 0,
    correlationId,
    metadata: Object.freeze({
      mode: 'production-discord-execution-service',
      reason: 'operation-not-supported-in-foundation',
      service,
      operation,
    }),
  });
}

export class ProductionDiscordIntegrationExecutionService implements IntegrationExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordIntegrationRestorationOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async restoreIntegration(
    request: string | DiscordIntegrationRestorationExecutionRequest,
  ): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceIntegrationRequest(request);
    const idempotencyKey = normalizedRequest.idempotencyKey ?? normalizedRequest.correlationId;
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'RESTORE_INTEGRATION',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordIntegrationRestorationVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.guildId || !normalizedRequest.integrationId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'RESTORE_INTEGRATION',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordIntegrationRestorationVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'guildId and integrationId are required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordIntegrationRestorationOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.restoreIntegration({
          correlationId: normalizedRequest.correlationId,
          guildId: normalizedRequest.guildId,
          integrationId: normalizedRequest.integrationId,
          applicationId: normalizedRequest.applicationId,
          reason: normalizedRequest.reason,
        });

        if (response.ok || response.statusCode === 404) {
          const verificationOutcome = response.statusCode === 404
            ? DiscordIntegrationRestorationVerificationOutcome.ALREADY_REMOVED
            : DiscordIntegrationRestorationVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'RESTORE_INTEGRATION',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                guildId: normalizedRequest.guildId,
                integrationId: normalizedRequest.integrationId,
                applicationId: normalizedRequest.applicationId,
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = lastFailure?.error?.code ??
      (lastFailure?.statusCode === 403
        ? DiscordExecutionErrorCode.API_ERROR
        : lastFailure?.statusCode === 429
          ? DiscordExecutionErrorCode.RATE_LIMITED
          : lastFailure?.statusCode && lastFailure.statusCode >= 500
            ? DiscordExecutionErrorCode.NETWORK_ERROR
            : lastFailureCause !== undefined
              ? DiscordExecutionErrorCode.UNKNOWN_ERROR
              : DiscordExecutionErrorCode.UNKNOWN_ERROR);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure?.statusCode === 403 || lastFailure?.error?.code === 'PERMISSION_DENIED';
    const verificationOutcome = permissionFailure
      ? DiscordIntegrationRestorationVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordIntegrationRestorationVerificationOutcome.UNKNOWN_ERROR
        : DiscordIntegrationRestorationVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED || failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'RESTORE_INTEGRATION',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          guildId: normalizedRequest.guildId,
          integrationId: normalizedRequest.integrationId,
          applicationId: normalizedRequest.applicationId,
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }
}

export class ProductionDiscordBotExecutionService implements BotExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordBotRemovalOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async removeUnauthorizedBot(request: string | DiscordBotRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceBotRequest(request);
    const idempotencyKey = resolveIdempotencyKey(normalizedRequest);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_UNAUTHORIZED_BOT',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordBotRemovalVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.guildId || !normalizedRequest.botUserId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_UNAUTHORIZED_BOT',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordBotRemovalVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'guildId and botUserId are required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordBotRemovalOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.removeUnauthorizedBot(
          Object.freeze({
            correlationId: normalizedRequest.correlationId,
            guildId: normalizedRequest.guildId,
            botUserId: normalizedRequest.botUserId,
            reason: normalizedRequest.reason,
          }),
        );

        if (response.ok || isAlreadyRemoved(response)) {
          const verificationOutcome = isAlreadyRemoved(response)
            ? DiscordBotRemovalVerificationOutcome.ALREADY_REMOVED
            : DiscordBotRemovalVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'REMOVE_UNAUTHORIZED_BOT',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isPermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordBotRemovalVerificationOutcome.UNKNOWN_ERROR
        : DiscordBotRemovalVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'REMOVE_UNAUTHORIZED_BOT',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }
}

export class ProductionDiscordMemberExecutionService implements MemberExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordMemberModerationOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async banMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    return this.executeMemberModeration(request, 'ban');
  }

  async kickMember(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    return this.executeMemberModeration(request, 'kick');
  }

  async removeRoles(request: string | DiscordMemberContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceMemberRequest(request);
    return unsupportedResult('member', 'removeRoles', normalizedRequest.correlationId);
  }

  private async executeMemberModeration(
    request: string | DiscordMemberContainmentExecutionRequest,
    moderation: 'ban' | 'kick',
  ): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceMemberRequest(request);
    const operationName = moderation === 'ban' ? 'BAN_MEMBER' : 'KICK_MEMBER';
    const idempotencyKey = resolveMemberIdempotencyKey(normalizedRequest, operationName);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_UNAUTHORIZED_BOT',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordBotRemovalVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.guildId || !normalizedRequest.memberUserId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_UNAUTHORIZED_BOT',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordBotRemovalVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'guildId and memberUserId are required for production member execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordMemberModerationOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response =
          moderation === 'ban'
            ? await this.operation.banMember({
                correlationId: normalizedRequest.correlationId,
                guildId: normalizedRequest.guildId,
                memberUserId: normalizedRequest.memberUserId,
                reason: normalizedRequest.reason,
              })
            : await this.operation.kickMember({
                correlationId: normalizedRequest.correlationId,
                guildId: normalizedRequest.guildId,
                memberUserId: normalizedRequest.memberUserId,
                reason: normalizedRequest.reason,
              });

        if (response.ok || isMemberAlreadyRemoved(response)) {
          const verificationOutcome = isMemberAlreadyRemoved(response)
            ? DiscordBotRemovalVerificationOutcome.ALREADY_REMOVED
            : DiscordBotRemovalVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'REMOVE_UNAUTHORIZED_BOT',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                moderation,
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isMemberPermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordBotRemovalVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordBotRemovalVerificationOutcome.UNKNOWN_ERROR
        : DiscordBotRemovalVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'REMOVE_UNAUTHORIZED_BOT',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          moderation,
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }
}

export class ProductionDiscordRoleExecutionService implements RoleExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordRoleRemovalOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async restoreRole(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('role', 'restoreRole', correlationId);
  }

  async removeDangerousRole(request: string | DiscordRoleRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceRoleRequest(request);
    const idempotencyKey = resolveRoleIdempotencyKey(normalizedRequest);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_DANGEROUS_ROLE',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordRoleRemovalVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.guildId || !normalizedRequest.roleId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_DANGEROUS_ROLE',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordRoleRemovalVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'guildId and roleId are required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordRoleRemovalOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.removeDangerousRole({
          correlationId: normalizedRequest.correlationId,
          guildId: normalizedRequest.guildId,
          memberUserId: normalizedRequest.memberUserId,
          roleId: normalizedRequest.roleId,
          reason: normalizedRequest.reason,
        });

        if (response.ok || isRoleAlreadyAbsent(response)) {
          const verificationOutcome = isRoleAlreadyAbsent(response)
            ? DiscordRoleRemovalVerificationOutcome.ALREADY_ABSENT
            : DiscordRoleRemovalVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'REMOVE_DANGEROUS_ROLE',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isRolePermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordRoleRemovalVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordRoleRemovalVerificationOutcome.UNKNOWN_ERROR
        : DiscordRoleRemovalVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'REMOVE_DANGEROUS_ROLE',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }
}

export class ProductionDiscordWebhookExecutionService implements WebhookExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordWebhookRemovalOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async deleteWebhook(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceWebhookRequest(request);
    const idempotencyKey = resolveWebhookIdempotencyKey(normalizedRequest);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_DANGEROUS_WEBHOOK',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordWebhookRemovalVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.webhookId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_DANGEROUS_WEBHOOK',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordWebhookRemovalVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'webhookId is required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordWebhookRemovalOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.removeDangerousWebhook({
          correlationId: normalizedRequest.correlationId,
          webhookId: normalizedRequest.webhookId,
          guildId: normalizedRequest.guildId,
          reason: normalizedRequest.reason,
        });

        if (response.ok || isWebhookAlreadyRemoved(response)) {
          const verificationOutcome = isWebhookAlreadyRemoved(response)
            ? DiscordWebhookRemovalVerificationOutcome.ALREADY_REMOVED
            : DiscordWebhookRemovalVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'REMOVE_DANGEROUS_WEBHOOK',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                guildId: normalizedRequest.guildId,
                webhookId: normalizedRequest.webhookId,
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isWebhookPermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordWebhookRemovalVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordWebhookRemovalVerificationOutcome.UNKNOWN_ERROR
        : DiscordWebhookRemovalVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'REMOVE_DANGEROUS_WEBHOOK',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          guildId: normalizedRequest.guildId,
          webhookId: normalizedRequest.webhookId,
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }

  async restoreWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('webhook', 'restoreWebhook', correlationId);
  }

  async freezeWebhooks(request: string | DiscordWebhookRemovalExecutionRequest): Promise<DiscordExecutionResult> {
    const correlationId = typeof request === 'string' ? request : request.correlationId;
    return unsupportedResult('webhook', 'freezeWebhooks', correlationId);
  }
}

export class ProductionDiscordPermissionExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordPermissionOverwriteOperation,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async restorePermissionOverwrite(
    request: string | DiscordPermissionOverwriteExecutionRequest,
  ): Promise<DiscordExecutionResult> {
    const normalizedRequest = coercePermissionOverwriteRequest(request);
    const idempotencyKey = resolvePermissionOverwriteIdempotencyKey(normalizedRequest);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'RESTORE_PERMISSION_OVERWRITE',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordPermissionOverwriteVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.channelId || !normalizedRequest.overwriteId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'RESTORE_PERMISSION_OVERWRITE',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordPermissionOverwriteVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'channelId and overwriteId are required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordPermissionOverwriteOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.restorePermissionOverwrite({
          correlationId: normalizedRequest.correlationId,
          channelId: normalizedRequest.channelId,
          overwriteId: normalizedRequest.overwriteId,
          guildId: normalizedRequest.guildId,
          reason: normalizedRequest.reason,
        });

        if (response.ok || isPermissionOverwriteAlreadyRestored(response)) {
          const verificationOutcome = isPermissionOverwriteAlreadyRestored(response)
            ? DiscordPermissionOverwriteVerificationOutcome.ALREADY_RESTORED
            : DiscordPermissionOverwriteVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'RESTORE_PERMISSION_OVERWRITE',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                guildId: normalizedRequest.guildId,
                channelId: normalizedRequest.channelId,
                overwriteId: normalizedRequest.overwriteId,
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isPermissionOverwritePermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordPermissionOverwriteVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordPermissionOverwriteVerificationOutcome.UNKNOWN_ERROR
        : DiscordPermissionOverwriteVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'RESTORE_PERMISSION_OVERWRITE',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          guildId: normalizedRequest.guildId,
          channelId: normalizedRequest.channelId,
          overwriteId: normalizedRequest.overwriteId,
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }
}

export class ProductionDiscordChannelExecutionService implements ChannelExecutionService {
  private readonly completedByIdempotencyKey = new Map<string, DiscordExecutionResult>();
  private readonly maxAttempts: number;

  constructor(
    private readonly operation: DiscordChannelContainmentOperation,
    private readonly permissionService: ProductionDiscordPermissionExecutionService,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const merged = { ...DEFAULT_PRODUCTION_OPTIONS, ...options };
    this.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  }

  async lockChannel(request: string | DiscordChannelContainmentExecutionRequest): Promise<DiscordExecutionResult> {
    const normalizedRequest = coerceChannelContainmentRequest(request);
    const idempotencyKey = resolveChannelContainmentIdempotencyKey(normalizedRequest);
    const cached = this.completedByIdempotencyKey.get(idempotencyKey);
    if (cached) {
      const metadata = cached.metadata as FrozenExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'LOCK_CHANNELS',
          idempotencyKey,
          httpStatus: metadata?.httpStatus ?? 200,
          verification: {
            outcome: metadata?.verification?.outcome ?? DiscordChannelContainmentVerificationOutcome.SUCCESS,
          },
          duplicate: true,
          retry: metadata?.retry ?? {
            bounded: true,
            attemptCount: 1,
            maxAttempts: this.maxAttempts,
            exhausted: false,
          },
          rateLimit: metadata?.rateLimit ?? { limited: false },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    if (!normalizedRequest.channelId) {
      return freezeExecutionResult({
        status: DiscordExecutionStatus.FAILED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'LOCK_CHANNELS',
          idempotencyKey,
          httpStatus: 0,
          verification: { outcome: DiscordChannelContainmentVerificationOutcome.FAILURE },
          retry: {
            bounded: true,
            attemptCount: 0,
            maxAttempts: this.maxAttempts,
            exhausted: true,
          },
          rateLimit: { limited: false },
          error: {
            code: DiscordExecutionErrorCode.VALIDATION_ERROR,
            message: 'channelId is required for production execution',
            retryable: false,
          },
          metadata: normalizedRequest.metadata,
        },
      });
    }

    let attemptCount = 0;
    const startedAt = nowMs();
    let lastFailure: DiscordChannelContainmentOperationResponse | undefined;
    let lastFailureCause: unknown;

    while (attemptCount < this.maxAttempts) {
      attemptCount += 1;
      try {
        const response = await this.operation.containChannel({
          correlationId: normalizedRequest.correlationId,
          channelId: normalizedRequest.channelId,
          guildId: normalizedRequest.guildId,
          reason: normalizedRequest.reason,
        });

        if (response.ok || isChannelAlreadyContained(response)) {
          const verificationOutcome = isChannelAlreadyContained(response)
            ? DiscordChannelContainmentVerificationOutcome.ALREADY_CONTAINED
            : DiscordChannelContainmentVerificationOutcome.SUCCESS;

          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'LOCK_CHANNELS',
              idempotencyKey,
              httpStatus: response.statusCode,
              verification: {
                outcome: verificationOutcome,
              },
              retry: {
                bounded: true,
                attemptCount,
                maxAttempts: this.maxAttempts,
                exhausted: false,
              },
              rateLimit: {
                limited: false,
                retryAfterMs: response.rateLimit?.retryAfterMs,
                bucketId: response.rateLimit?.bucketId,
                global: response.rateLimit?.global,
              },
              metadata: Object.freeze({
                guildId: normalizedRequest.guildId,
                channelId: normalizedRequest.channelId,
                statusCode: response.statusCode,
                ...response.metadata,
                ...normalizedRequest.metadata,
              }),
            },
          });
          this.completedByIdempotencyKey.set(idempotencyKey, successResult);
          return successResult;
        }

        lastFailure = response;
        const isRetryable = Boolean(response.error?.retryable) || response.statusCode === 429;
        if (!isRetryable) {
          break;
        }
      } catch (error) {
        lastFailureCause = error;
      }
    }

    const failureCode = resolveFailureCode(lastFailure, lastFailureCause);
    const failureMessage = lastFailure?.error?.message ?? parseFailureCause(lastFailureCause);
    const permissionFailure = lastFailure ? isChannelPermissionFailure(lastFailure) : false;
    const verificationOutcome = permissionFailure
      ? DiscordChannelContainmentVerificationOutcome.PERMISSION_FAILURE
      : failureCode === DiscordExecutionErrorCode.UNKNOWN_ERROR
        ? DiscordChannelContainmentVerificationOutcome.UNKNOWN_ERROR
        : DiscordChannelContainmentVerificationOutcome.FAILURE;
    const retryable =
      lastFailure?.error?.retryable ??
      (failureCode === DiscordExecutionErrorCode.RATE_LIMITED ||
        failureCode === DiscordExecutionErrorCode.NETWORK_ERROR);

    return freezeExecutionResult({
      status: DiscordExecutionStatus.FAILED,
      executionTimeMs: Math.max(0, nowMs() - startedAt),
      correlationId: normalizedRequest.correlationId,
      metadata: {
        operation: 'LOCK_CHANNELS',
        idempotencyKey,
        httpStatus: lastFailure?.statusCode ?? 0,
        verification: {
          outcome: verificationOutcome,
        },
        retry: {
          bounded: true,
          attemptCount,
          maxAttempts: this.maxAttempts,
          exhausted: true,
        },
        rateLimit: {
          limited: failureCode === DiscordExecutionErrorCode.RATE_LIMITED,
          retryAfterMs: lastFailure?.rateLimit?.retryAfterMs,
          bucketId: lastFailure?.rateLimit?.bucketId,
          global: lastFailure?.rateLimit?.global,
        },
        error: {
          code: failureCode,
          message: failureMessage,
          retryable,
          cause: lastFailureCause !== undefined ? parseFailureCause(lastFailureCause) : undefined,
        },
        metadata: Object.freeze({
          guildId: normalizedRequest.guildId,
          channelId: normalizedRequest.channelId,
          statusCode: lastFailure?.statusCode,
          ...lastFailure?.metadata,
          ...normalizedRequest.metadata,
        }),
      },
    });
  }

  async unlockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('channel', 'unlockChannel', correlationId);
  }

  async restoreChannel(request: string | DiscordPermissionOverwriteExecutionRequest): Promise<DiscordExecutionResult> {
    return this.permissionService.restorePermissionOverwrite(request);
  }
}

export class ProductionDiscordExecutionService implements DiscordExecutionService {
  readonly member: MemberExecutionService;
  readonly role: RoleExecutionService;
  readonly channel: ChannelExecutionService;
  readonly webhook: WebhookExecutionService;
  readonly guild: GuildExecutionService = new UnsupportedGuildExecutionService();
  readonly emoji: EmojiExecutionService = new UnsupportedEmojiExecutionService();
  readonly vanity: VanityExecutionService = new UnsupportedVanityExecutionService();
  readonly integration: IntegrationExecutionService;
  readonly bot: BotExecutionService;

  constructor(
    operationOrDependencies: DiscordBotRemovalOperation | ProductionDiscordExecutionServiceDependencies,
    options: ProductionDiscordExecutionServiceOptions = {},
  ) {
    const dependencies: ProductionDiscordExecutionServiceDependencies =
      typeof (operationOrDependencies as DiscordBotRemovalOperation).removeUnauthorizedBot === 'function'
        ? { botRemovalOperation: operationOrDependencies as DiscordBotRemovalOperation }
        : (operationOrDependencies as ProductionDiscordExecutionServiceDependencies);

    this.member = dependencies.memberModerationOperation
      ? new ProductionDiscordMemberExecutionService(dependencies.memberModerationOperation, options)
      : new UnsupportedMemberExecutionService();

    this.bot = dependencies.botRemovalOperation
      ? new ProductionDiscordBotExecutionService(dependencies.botRemovalOperation, options)
      : new UnsupportedBotExecutionService();
    this.role = dependencies.roleRemovalOperation
      ? new ProductionDiscordRoleExecutionService(dependencies.roleRemovalOperation, options)
      : new UnsupportedRoleExecutionService();
    const permissionService = dependencies.permissionOverwriteOperation
      ? new ProductionDiscordPermissionExecutionService(dependencies.permissionOverwriteOperation, options)
      : undefined;
    this.channel = dependencies.channelContainmentOperation && permissionService
      ? new ProductionDiscordChannelExecutionService(dependencies.channelContainmentOperation, permissionService, options)
      : new UnsupportedChannelExecutionService();
    this.webhook = dependencies.webhookRemovalOperation
      ? new ProductionDiscordWebhookExecutionService(dependencies.webhookRemovalOperation, options)
      : new UnsupportedWebhookExecutionService();
    this.integration = dependencies.integrationRestorationOperation
      ? new ProductionDiscordIntegrationExecutionService(dependencies.integrationRestorationOperation, options)
      : new UnsupportedIntegrationExecutionService();
  }
}

export class InMemoryDiscordExecutionService implements DiscordExecutionService {
  readonly member: MemberExecutionService;
  readonly role: RoleExecutionService;
  readonly channel: ChannelExecutionService;
  readonly webhook: WebhookExecutionService;
  readonly guild: GuildExecutionService;
  readonly emoji: EmojiExecutionService;
  readonly vanity: VanityExecutionService;
  readonly integration: IntegrationExecutionService;
  readonly bot: BotExecutionService;

  constructor(
    member: MemberExecutionService = new InMemoryMemberExecutionService(),
    role: RoleExecutionService = new InMemoryRoleExecutionService(),
    channel: ChannelExecutionService = new InMemoryChannelExecutionService(),
    webhook: WebhookExecutionService = new InMemoryWebhookExecutionService(),
    guild: GuildExecutionService = new InMemoryGuildExecutionService(),
    emoji: EmojiExecutionService = new InMemoryEmojiExecutionService(),
    vanity: VanityExecutionService = new InMemoryVanityExecutionService(),
    integration: IntegrationExecutionService = new InMemoryIntegrationExecutionService(),
    bot: BotExecutionService = new InMemoryBotExecutionService(),
    options: InMemoryDiscordExecutionServiceOptions = {},
  ) {
    this.assertSafeForRuntime(options);
    this.member = member;
    this.role = role;
    this.channel = channel;
    this.webhook = webhook;
    this.guild = guild;
    this.emoji = emoji;
    this.vanity = vanity;
    this.integration = integration;
    this.bot = bot;
  }

  private assertSafeForRuntime(options: InMemoryDiscordExecutionServiceOptions): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && options.allowInMemoryExecution !== true) {
      throw new Error(
        'InMemoryDiscordExecutionService is test/dev-only and is disabled in production unless allowInMemoryExecution=true',
      );
    }
  }
}
