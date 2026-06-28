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

export interface DiscordBotRemovalExecutionRequest {
  readonly correlationId: string;
  readonly guildId?: string;
  readonly botUserId?: string;
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

export interface DiscordBotRemovalOperation {
  removeUnauthorizedBot(request: DiscordBotRemovalOperationRequest): Promise<DiscordBotRemovalOperationResponse>;
}

export interface MemberExecutionService {
  banMember(correlationId: string): Promise<DiscordExecutionResult>;
  kickMember(correlationId: string): Promise<DiscordExecutionResult>;
  removeRoles(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface RoleExecutionService {
  restoreRole(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface ChannelExecutionService {
  lockChannel(correlationId: string): Promise<DiscordExecutionResult>;
  unlockChannel(correlationId: string): Promise<DiscordExecutionResult>;
  restoreChannel(correlationId: string): Promise<DiscordExecutionResult>;
}

export interface WebhookExecutionService {
  deleteWebhook(correlationId: string): Promise<DiscordExecutionResult>;
  restoreWebhook(correlationId: string): Promise<DiscordExecutionResult>;
  freezeWebhooks(correlationId: string): Promise<DiscordExecutionResult>;
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
  restoreIntegration(correlationId: string): Promise<DiscordExecutionResult>;
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
  readonly supportedOperation?: 'REMOVE_UNAUTHORIZED_BOT';
}

interface FrozenBotExecutionMetadata {
  readonly operation: 'REMOVE_UNAUTHORIZED_BOT';
  readonly idempotencyKey: string;
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
  const metadataRecord = result.metadata as FrozenBotExecutionMetadata | undefined;
  return Object.freeze({
    status: result.status,
    executionTimeMs: result.executionTimeMs,
    correlationId: result.correlationId,
    metadata: metadataRecord
      ? Object.freeze({
          operation: metadataRecord.operation,
          idempotencyKey: metadataRecord.idempotencyKey,
          duplicate: metadataRecord.duplicate,
          retry: freezeRetryMetadata(metadataRecord.retry),
          rateLimit: freezeRateLimitMetadata(metadataRecord.rateLimit),
          error: freezeErrorMetadata(metadataRecord.error),
          metadata: freezeMetadata(metadataRecord.metadata),
        })
      : undefined,
  });
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

function mapErrorCode(response?: DiscordBotRemovalOperationResponse): DiscordExecutionErrorCode {
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
  response: DiscordBotRemovalOperationResponse | undefined,
  failureCause: unknown,
): DiscordExecutionErrorCode {
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
  async banMember(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('member', 'banMember', correlationId);
  }

  async kickMember(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('member', 'kickMember', correlationId);
  }

  async removeRoles(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('member', 'removeRoles', correlationId);
  }
}

class InMemoryRoleExecutionService extends BaseInMemoryExecutionService implements RoleExecutionService {
  async restoreRole(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('role', 'restoreRole', correlationId);
  }
}

class InMemoryChannelExecutionService extends BaseInMemoryExecutionService implements ChannelExecutionService {
  async lockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('channel', 'lockChannel', correlationId);
  }

  async unlockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('channel', 'unlockChannel', correlationId);
  }

  async restoreChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('channel', 'restoreChannel', correlationId);
  }
}

class InMemoryWebhookExecutionService extends BaseInMemoryExecutionService implements WebhookExecutionService {
  async deleteWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('webhook', 'deleteWebhook', correlationId);
  }

  async restoreWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('webhook', 'restoreWebhook', correlationId);
  }

  async freezeWebhooks(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('webhook', 'freezeWebhooks', correlationId);
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
  async restoreIntegration(correlationId: string): Promise<DiscordExecutionResult> {
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
  async banMember(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('member', 'banMember', correlationId);
  }

  async kickMember(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('member', 'kickMember', correlationId);
  }

  async removeRoles(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('member', 'removeRoles', correlationId);
  }
}

class UnsupportedRoleExecutionService implements RoleExecutionService {
  async restoreRole(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('role', 'restoreRole', correlationId);
  }
}

class UnsupportedChannelExecutionService implements ChannelExecutionService {
  async lockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('channel', 'lockChannel', correlationId);
  }

  async unlockChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('channel', 'unlockChannel', correlationId);
  }

  async restoreChannel(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('channel', 'restoreChannel', correlationId);
  }
}

class UnsupportedWebhookExecutionService implements WebhookExecutionService {
  async deleteWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('webhook', 'deleteWebhook', correlationId);
  }

  async restoreWebhook(correlationId: string): Promise<DiscordExecutionResult> {
    return unsupportedResult('webhook', 'restoreWebhook', correlationId);
  }

  async freezeWebhooks(correlationId: string): Promise<DiscordExecutionResult> {
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
  async restoreIntegration(correlationId: string): Promise<DiscordExecutionResult> {
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
      const metadata = cached.metadata as FrozenBotExecutionMetadata | undefined;
      return freezeExecutionResult({
        status: DiscordExecutionStatus.SKIPPED,
        executionTimeMs: 0,
        correlationId: normalizedRequest.correlationId,
        metadata: {
          operation: 'REMOVE_UNAUTHORIZED_BOT',
          idempotencyKey,
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
        const response = await this.operation.removeUnauthorizedBot({
          correlationId: normalizedRequest.correlationId,
          guildId: normalizedRequest.guildId,
          botUserId: normalizedRequest.botUserId,
          reason: normalizedRequest.reason,
        });

        if (response.ok) {
          const successResult = freezeExecutionResult({
            status: DiscordExecutionStatus.SUCCESS,
            executionTimeMs: Math.max(0, nowMs() - startedAt),
            correlationId: normalizedRequest.correlationId,
            metadata: {
              operation: 'REMOVE_UNAUTHORIZED_BOT',
              idempotencyKey,
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
        metadata: normalizedRequest.metadata,
      },
    });
  }
}

export class ProductionDiscordExecutionService implements DiscordExecutionService {
  readonly member: MemberExecutionService = new UnsupportedMemberExecutionService();
  readonly role: RoleExecutionService = new UnsupportedRoleExecutionService();
  readonly channel: ChannelExecutionService = new UnsupportedChannelExecutionService();
  readonly webhook: WebhookExecutionService = new UnsupportedWebhookExecutionService();
  readonly guild: GuildExecutionService = new UnsupportedGuildExecutionService();
  readonly emoji: EmojiExecutionService = new UnsupportedEmojiExecutionService();
  readonly vanity: VanityExecutionService = new UnsupportedVanityExecutionService();
  readonly integration: IntegrationExecutionService = new UnsupportedIntegrationExecutionService();
  readonly bot: BotExecutionService;

  constructor(operation: DiscordBotRemovalOperation, options: ProductionDiscordExecutionServiceOptions = {}) {
    this.bot = new ProductionDiscordBotExecutionService(operation, options);
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
