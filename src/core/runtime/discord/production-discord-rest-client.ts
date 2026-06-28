import {
  ProductionDiscordHttpClient,
  ProductionDiscordHttpRequest,
  ProductionDiscordHttpResponse,
} from './production-discord-execution-adapter';

interface HeaderReader {
  get(name: string): string | null;
}

interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers?: HeaderReader;
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

export enum ProductionDiscordRestErrorCode {
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  RETRYABLE_HTTP_FAILURE = 'RETRYABLE_HTTP_FAILURE',
}

export interface ProductionDiscordRestError {
  readonly code: ProductionDiscordRestErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: string;
}

export interface ProductionDiscordRestRateLimitMetadata {
  readonly retryAfterMs?: number;
  readonly resetAfterMs?: number;
  readonly bucketId?: string;
  readonly global: boolean;
}

export interface ProductionDiscordRestResponseMetadata {
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly boundedRetry: boolean;
  readonly timedOut: boolean;
  readonly retryableFailure: boolean;
  readonly rateLimit: ProductionDiscordRestRateLimitMetadata;
  readonly error?: ProductionDiscordRestError;
}

export interface ProductionDiscordRestHttpResponse extends ProductionDiscordHttpResponse {
  readonly metadata: ProductionDiscordRestResponseMetadata;
}

export interface ProductionDiscordRestClientOptions {
  readonly fetchFn?: FetchLike;
  readonly requestTimeoutMs?: number;
  readonly maxAttempts?: number;
}

const DEFAULT_OPTIONS = Object.freeze({
  requestTimeoutMs: 5_000,
  maxAttempts: 2,
});

const RETRYABLE_STATUS_CODES = new Set<number>([429, 500, 502, 503, 504]);

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

function normalizeFetchFn(fetchFn?: FetchLike): FetchLike {
  if (fetchFn) {
    return fetchFn;
  }

  const candidate = (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (typeof candidate === 'function') {
    return candidate;
  }

  throw new Error('ProductionDiscordRestClient requires a fetch implementation');
}

function freezeHeaders(headers?: HeaderReader): HeaderReader {
  const get = (name: string): string | null => {
    if (!headers) {
      return null;
    }

    const direct = headers.get(name);
    if (direct !== null) {
      return direct;
    }

    if (name === name.toLowerCase()) {
      return headers.get(name.toUpperCase());
    }

    return headers.get(name.toLowerCase());
  };

  return Object.freeze({ get });
}

function asNumber(value: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return undefined;
  }

  return num;
}

function extractRateLimitMetadata(headers: HeaderReader): ProductionDiscordRestRateLimitMetadata {
  const retryAfterRaw = asNumber(headers.get('retry-after'));
  const resetAfterRaw = asNumber(headers.get('x-ratelimit-reset-after'));

  const retryAfterMs = retryAfterRaw !== undefined ? Math.max(0, Math.floor(retryAfterRaw * 1000)) : undefined;
  const resetAfterMs = resetAfterRaw !== undefined ? Math.max(0, Math.floor(resetAfterRaw * 1000)) : undefined;
  const bucketId = headers.get('x-ratelimit-bucket') ?? undefined;
  const globalValue = headers.get('x-ratelimit-global');
  const global = globalValue === 'true' || globalValue === '1';

  return Object.freeze({
    retryAfterMs,
    resetAfterMs,
    bucketId,
    global,
  });
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('request timed out') || isAbortError(error);
}

async function parseResponseBody(response: FetchLikeResponse): Promise<unknown> {
  if (typeof response.json === 'function') {
    try {
      return deepFreeze(await response.json());
    } catch {
      // Fall through to text parsing.
    }
  }

  if (typeof response.text === 'function') {
    try {
      return deepFreeze({ message: await response.text() });
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function toSyntheticErrorResponse(
  status: number,
  statusText: string,
  metadata: ProductionDiscordRestResponseMetadata,
): ProductionDiscordRestHttpResponse {
  const payload = deepFreeze({
    code: metadata.error?.code,
    message: metadata.error?.message ?? statusText,
  });

  const frozenHeaders = freezeHeaders();
  return Object.freeze({
    ok: false,
    status,
    statusText,
    headers: frozenHeaders,
    metadata: deepFreeze({ ...metadata }),
    json: async () => payload,
    text: async () => payload.message,
  });
}

export class ProductionDiscordRestClient implements ProductionDiscordHttpClient {
  private readonly fetchFn: FetchLike;
  private readonly requestTimeoutMs: number;
  private readonly maxAttempts: number;

  constructor(options: ProductionDiscordRestClientOptions = {}) {
    this.fetchFn = normalizeFetchFn(options.fetchFn);
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_OPTIONS.requestTimeoutMs;
    this.maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? DEFAULT_OPTIONS.maxAttempts));
  }

  async request(request: ProductionDiscordHttpRequest): Promise<ProductionDiscordRestHttpResponse> {
    const boundedRetry = this.maxAttempts > 1;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.requestWithTimeout(request);
        const frozenHeaders = freezeHeaders(response.headers);
        const rateLimit = extractRateLimitMetadata(frozenHeaders);
        const retryableFailure = !response.ok && isRetryableStatus(response.status);

        const metadata: ProductionDiscordRestResponseMetadata = deepFreeze({
          attemptCount: attempt,
          maxAttempts: this.maxAttempts,
          boundedRetry,
          timedOut: false,
          retryableFailure,
          rateLimit,
          ...(retryableFailure
            ? {
                error: {
                  code: ProductionDiscordRestErrorCode.RETRYABLE_HTTP_FAILURE,
                  message: response.statusText ?? `Retryable HTTP status ${response.status}`,
                  retryable: true,
                },
              }
            : {}),
        });

        if (retryableFailure && attempt < this.maxAttempts) {
          continue;
        }

        const responseBody = await parseResponseBody(response);
        return Object.freeze({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: frozenHeaders,
          metadata,
          ...(responseBody !== undefined
            ? {
                json: async () => responseBody,
                text: async () => JSON.stringify(responseBody),
              }
            : {}),
        });
      } catch (error) {
        const timedOut = isTimeoutError(error);
        const retryable = true;
        const metadata: ProductionDiscordRestResponseMetadata = deepFreeze({
          attemptCount: attempt,
          maxAttempts: this.maxAttempts,
          boundedRetry,
          timedOut,
          retryableFailure: retryable,
          rateLimit: Object.freeze({ global: false }),
          error: {
            code: timedOut
              ? ProductionDiscordRestErrorCode.REQUEST_TIMEOUT
              : ProductionDiscordRestErrorCode.NETWORK_FAILURE,
            message: error instanceof Error ? error.message : 'Unknown transport failure',
            retryable,
            cause: error instanceof Error ? error.name : undefined,
          },
        });

        if (attempt < this.maxAttempts) {
          continue;
        }

        if (timedOut) {
          return toSyntheticErrorResponse(408, 'Request Timeout', metadata);
        }

        return toSyntheticErrorResponse(599, 'Network Error', metadata);
      }
    }

    return toSyntheticErrorResponse(
      599,
      'Network Error',
      deepFreeze({
        attemptCount: this.maxAttempts,
        maxAttempts: this.maxAttempts,
        boundedRetry: this.maxAttempts > 1,
        timedOut: false,
        retryableFailure: true,
        rateLimit: Object.freeze({ global: false }),
        error: {
          code: ProductionDiscordRestErrorCode.NETWORK_FAILURE,
          message: 'Exhausted retries without response',
          retryable: true,
        },
      }),
    );
  }

  private async requestWithTimeout(request: ProductionDiscordHttpRequest): Promise<FetchLikeResponse> {
    const timeoutMs = Math.max(1, Math.floor(this.requestTimeoutMs));
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

    return new Promise<FetchLikeResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (abortController) {
          abortController.abort();
        }
        reject(new Error(`request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.fetchFn(request.url, {
        method: request.method,
        headers: { ...request.headers },
        body: request.body,
        signal: abortController?.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}
