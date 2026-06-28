import {
  DiscordWebhookRemovalOperation,
  DiscordWebhookRemovalOperationRequest,
  DiscordWebhookRemovalOperationResponse,
} from './discord-execution-service';

interface HeaderReader {
  get(name: string): string | null;
}

interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers?: {
    get(name: string): string | null;
  };
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
  },
) => Promise<FetchLikeResponse>;

export interface ProductionDiscordWebhookRemovalOperationOptions {
  readonly botToken: string;
  readonly apiBaseUrl?: string;
  readonly apiVersion?: number;
  readonly userAgent?: string;
  readonly fetchFn?: FetchLike;
}

const DEFAULT_OPTIONS = Object.freeze({
  apiBaseUrl: 'https://discord.com',
  apiVersion: 10,
  userAgent: 'guardian-security-runtime/1.0',
});

interface DiscordErrorPayload {
  readonly code?: number | string;
  readonly message?: string;
  readonly errors?: unknown;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function parseRetryAfterMs(headers?: HeaderReader): number | undefined {
  if (!headers) {
    return undefined;
  }

  const retryAfter = headers.get('retry-after') ?? headers.get('Retry-After') ?? headers.get('x-ratelimit-reset-after');
  if (!retryAfter) {
    return undefined;
  }

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.max(0, Math.floor(asSeconds * 1000));
  }

  return undefined;
}

function parseRateLimitBucket(headers?: HeaderReader): string | undefined {
  if (!headers) {
    return undefined;
  }

  return headers.get('x-ratelimit-bucket') ?? headers.get('X-RateLimit-Bucket') ?? undefined;
}

function parseGlobalRateLimit(headers?: { get(name: string): string | null }): boolean {
  if (!headers) {
    return false;
  }

  const value = headers.get('x-ratelimit-global') ?? headers.get('X-RateLimit-Global');
  if (value == null) {
    return false;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

async function parseDiscordError(response: FetchLikeResponse): Promise<DiscordErrorPayload | undefined> {
  try {
    if (typeof response.json === 'function') {
      const payload = await response.json();
      if (payload && typeof payload === 'object') {
        return payload as DiscordErrorPayload;
      }
    }
  } catch {
    // Fall back to parsing text as message.
  }

  try {
    if (typeof response.text === 'function') {
      const text = await response.text();
      if (text.length > 0) {
        return { message: text };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function classifyErrorCode(statusCode: number, payload?: DiscordErrorPayload): string {
  const payloadCode = payload?.code;
  if (payloadCode != null) {
    if (payloadCode === 10015 || payloadCode === '10015') {
      return 'UNKNOWN_WEBHOOK';
    }
    if (payloadCode === 50013 || payloadCode === '50013') {
      return 'MISSING_PERMISSIONS';
    }
    return String(payloadCode);
  }

  if (statusCode === 404) {
    return 'UNKNOWN_WEBHOOK';
  }
  if (statusCode === 403) {
    return 'MISSING_PERMISSIONS';
  }
  if (statusCode === 429) {
    return 'RATE_LIMITED';
  }
  if (statusCode >= 500) {
    return 'DISCORD_SERVER_ERROR';
  }

  return 'REQUEST_FAILED';
}

function classifyRetryable(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500;
}

export class ProductionDiscordWebhookRemovalOperation implements DiscordWebhookRemovalOperation {
  private readonly fetchFn: FetchLike;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: number;
  private readonly userAgent: string;

  public constructor(private readonly options: ProductionDiscordWebhookRemovalOperationOptions) {
    if (!options.botToken || options.botToken.trim().length === 0) {
      throw new Error('ProductionDiscordWebhookRemovalOperation requires a non-empty botToken');
    }

    this.fetchFn =
      options.fetchFn ??
      ((globalThis as unknown as { fetch?: FetchLike }).fetch as FetchLike | undefined) ??
      (() => {
        throw new Error('No fetch implementation available for ProductionDiscordWebhookRemovalOperation');
      });

    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_OPTIONS.apiBaseUrl;
    this.apiVersion = options.apiVersion ?? DEFAULT_OPTIONS.apiVersion;
    this.userAgent = options.userAgent ?? DEFAULT_OPTIONS.userAgent;
  }

  async removeDangerousWebhook(request: DiscordWebhookRemovalOperationRequest): Promise<DiscordWebhookRemovalOperationResponse> {
    const endpoint = `${this.apiBaseUrl}/api/v${this.apiVersion}/webhooks/${encodeURIComponent(request.webhookId)}`;

    const headers: Record<string, string> = {
      Authorization: `Bot ${this.options.botToken}`,
      'User-Agent': this.userAgent,
    };

    if (request.reason && request.reason.length > 0) {
      headers['X-Audit-Log-Reason'] = encodeURIComponent(request.reason);
    }

    const response = await this.fetchFn(endpoint, {
      method: 'DELETE',
      headers,
    });

    const rateLimit = Object.freeze({
      retryAfterMs: parseRetryAfterMs(response.headers),
      bucketId: parseRateLimitBucket(response.headers),
      global: parseGlobalRateLimit(response.headers),
    });

    if (response.ok) {
      return Object.freeze({
        ok: true,
        statusCode: response.status,
        rateLimit,
        metadata: freezeMetadata({
          endpoint,
          correlationId: request.correlationId,
          guildId: request.guildId,
        }),
      });
    }

    const payload = await parseDiscordError(response);
    const errorCode = classifyErrorCode(response.status, payload);
    return Object.freeze({
      ok: false,
      statusCode: response.status,
      rateLimit,
      error: Object.freeze({
        code: errorCode,
        message: payload?.message ?? `Discord webhook removal failed with status ${response.status}`,
        retryable: classifyRetryable(response.status),
      }),
      metadata: freezeMetadata({
        endpoint,
        correlationId: request.correlationId,
        guildId: request.guildId,
        discordError: payload,
      }),
    });
  }
}
