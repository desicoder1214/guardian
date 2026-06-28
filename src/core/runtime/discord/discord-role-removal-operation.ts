import {
  DiscordRoleRemovalOperation,
  DiscordRoleRemovalOperationRequest,
  DiscordRoleRemovalOperationResponse,
} from './discord-execution-service';

interface HeaderReader {
  get(name: string): string | null;
}

interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers: HeaderReader;
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

export interface ProductionDiscordRoleRemovalOperationOptions {
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

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function parseRetryAfterMs(headers: HeaderReader): number | undefined {
  const retryAfterSeconds = headers.get('retry-after');
  const resetAfterSeconds = headers.get('x-ratelimit-reset-after');

  const retryAfterMs = retryAfterSeconds ? Number(retryAfterSeconds) * 1000 : undefined;
  if (Number.isFinite(retryAfterMs)) {
    return Math.max(0, Math.floor(retryAfterMs as number));
  }

  const resetAfterMs = resetAfterSeconds ? Number(resetAfterSeconds) * 1000 : undefined;
  if (Number.isFinite(resetAfterMs)) {
    return Math.max(0, Math.floor(resetAfterMs as number));
  }

  return undefined;
}

function parseRateLimit(headers: HeaderReader): DiscordRoleRemovalOperationResponse['rateLimit'] {
  const retryAfterMs = parseRetryAfterMs(headers);
  const bucketId = headers.get('x-ratelimit-bucket') ?? undefined;
  const globalHeader = headers.get('x-ratelimit-global');
  const global = globalHeader === 'true' || globalHeader === '1';

  if (retryAfterMs === undefined && !bucketId && globalHeader === null) {
    return undefined;
  }

  return Object.freeze({
    retryAfterMs,
    bucketId,
    global,
  });
}

async function parseErrorPayload(response: FetchLikeResponse): Promise<{ code?: string; message: string }> {
  try {
    if (response.json) {
      const payload = (await response.json()) as { code?: number | string; message?: string } | undefined;
      if (payload) {
        const code = payload.code !== undefined ? String(payload.code) : undefined;
        const message = payload.message ?? response.statusText ?? 'discord-api-error';
        return { code, message };
      }
    }
  } catch {
    // Fallback to plain text below
  }

  try {
    if (response.text) {
      const text = await response.text();
      if (text) {
        return { message: text };
      }
    }
  } catch {
    // Fallback to status text below
  }

  return { message: response.statusText ?? 'discord-api-error' };
}

function classifyDiscordErrorCode(statusCode: number): string {
  if (statusCode === 404) {
    return 'ALREADY_ABSENT';
  }

  if (statusCode === 403) {
    return 'PERMISSION_DENIED';
  }

  if (statusCode === 429) {
    return 'RATE_LIMITED';
  }

  if (statusCode >= 400 && statusCode < 500) {
    return 'API_ERROR';
  }

  if (statusCode >= 500) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

export class ProductionDiscordRoleRemovalOperation implements DiscordRoleRemovalOperation {
  private readonly fetchFn: FetchLike;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: number;
  private readonly userAgent: string;

  constructor(private readonly options: ProductionDiscordRoleRemovalOperationOptions) {
    if (!options.botToken || options.botToken.trim().length === 0) {
      throw new Error('ProductionDiscordRoleRemovalOperation requires a non-empty botToken');
    }

    this.fetchFn =
      options.fetchFn ??
      ((globalThis as unknown as { fetch?: FetchLike }).fetch as FetchLike | undefined) ??
      (() => {
        throw new Error('No fetch implementation available for ProductionDiscordRoleRemovalOperation');
      });

    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_OPTIONS.apiBaseUrl;
    this.apiVersion = options.apiVersion ?? DEFAULT_OPTIONS.apiVersion;
    this.userAgent = options.userAgent ?? DEFAULT_OPTIONS.userAgent;
  }

  async removeDangerousRole(
    request: DiscordRoleRemovalOperationRequest,
  ): Promise<DiscordRoleRemovalOperationResponse> {
    const endpoint = `${this.apiBaseUrl}/api/v${this.apiVersion}/guilds/${encodeURIComponent(
      request.guildId,
    )}/members/${encodeURIComponent(request.memberUserId)}/roles/${encodeURIComponent(request.roleId)}`;

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

    const rateLimit = parseRateLimit(response.headers);
    if (response.ok) {
      return Object.freeze({
        ok: true,
        statusCode: response.status,
        rateLimit,
        metadata: freezeMetadata({
          endpoint,
          correlationId: request.correlationId,
        }),
      });
    }

    const parsedError = await parseErrorPayload(response);
    const classifiedCode = parsedError.code ?? classifyDiscordErrorCode(response.status);

    return Object.freeze({
      ok: false,
      statusCode: response.status,
      rateLimit,
      error: Object.freeze({
        code: classifiedCode,
        message: parsedError.message,
        retryable: response.status === 429 || response.status >= 500,
      }),
      metadata: freezeMetadata({
        endpoint,
        correlationId: request.correlationId,
      }),
    });
  }
}
