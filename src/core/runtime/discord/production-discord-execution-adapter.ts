import {
  BotExecutionService,
  ChannelExecutionService,
  DiscordExecutionService,
  EmojiExecutionService,
  GuildExecutionService,
  IntegrationExecutionService,
  MemberExecutionService,
  ProductionDiscordExecutionService,
  ProductionDiscordExecutionServiceOptions,
  RoleExecutionService,
  VanityExecutionService,
  WebhookExecutionService,
} from './discord-execution-service';
import {
  ProductionDiscordBotRemovalOperation,
  ProductionDiscordBotRemovalOperationOptions,
} from './discord-bot-removal-operation';
import {
  ProductionDiscordRoleRemovalOperation,
  ProductionDiscordRoleRemovalOperationOptions,
} from './discord-role-removal-operation';
import {
  ProductionDiscordWebhookRemovalOperation,
  ProductionDiscordWebhookRemovalOperationOptions,
} from './discord-webhook-removal-operation';
import {
  ProductionDiscordChannelContainmentOperation,
  ProductionDiscordChannelContainmentOperationOptions,
} from './discord-channel-containment-operation';
import {
  ProductionDiscordPermissionOverwriteOperation,
  ProductionDiscordPermissionOverwriteOperationOptions,
} from './discord-permission-overwrite-operation';
import {
  ProductionDiscordMemberModerationOperation,
  ProductionDiscordMemberModerationOperationOptions,
} from './discord-member-moderation-operation';
import {
  ProductionDiscordIntegrationRestorationOperation,
  ProductionDiscordIntegrationRestorationOperationOptions,
} from './discord-integration-restoration-operation';
import { normalizeDiscordBotToken } from './auth-token';

export interface ProductionDiscordHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: string;
}

export interface ProductionDiscordHttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly headers: {
    get(name: string): string | null;
  };
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

export interface ProductionDiscordHttpClient {
  request(request: ProductionDiscordHttpRequest): Promise<ProductionDiscordHttpResponse>;
}

export interface ProductionDiscordExecutionAdapterOptions {
  readonly httpClient: ProductionDiscordHttpClient;
  readonly botToken: string;
  readonly apiBaseUrl?: string;
  readonly apiVersion?: number;
  readonly userAgent?: string;
  readonly maxAttempts?: number;
}

function normalizeExecutionAdapterOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordExecutionAdapterOptions {
  return Object.freeze({
    ...options,
    botToken: normalizeDiscordBotToken(options.botToken),
  });
}

function toOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordBotRemovalOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordBotRemovalOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toRoleOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordRoleRemovalOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordRoleRemovalOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toServiceOptions(options: ProductionDiscordExecutionAdapterOptions): ProductionDiscordExecutionServiceOptions {
  if (typeof options.maxAttempts === 'number' && Number.isFinite(options.maxAttempts)) {
    return Object.freeze({
      maxAttempts: options.maxAttempts,
    });
  }

  return Object.freeze({});
}

function toWebhookOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordWebhookRemovalOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordWebhookRemovalOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toChannelContainmentOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordChannelContainmentOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordChannelContainmentOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toPermissionOverwriteOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordPermissionOverwriteOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordPermissionOverwriteOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toMemberModerationOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordMemberModerationOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordMemberModerationOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

function toIntegrationRestorationOperationOptions(
  options: ProductionDiscordExecutionAdapterOptions,
): ProductionDiscordIntegrationRestorationOperationOptions {
  const fetchFn: NonNullable<ProductionDiscordIntegrationRestorationOperationOptions['fetchFn']> = (
    input,
    init,
  ) =>
    options.httpClient.request(
      Object.freeze({
        method: init.method,
        url: input,
        headers: Object.freeze({ ...init.headers }),
        body: init.body,
      }),
    );

  return Object.freeze({
    botToken: options.botToken,
    apiBaseUrl: options.apiBaseUrl,
    apiVersion: options.apiVersion,
    userAgent: options.userAgent,
    fetchFn,
  });
}

export class ProductionDiscordExecutionAdapter implements DiscordExecutionService {
  readonly member: MemberExecutionService;
  readonly role: RoleExecutionService;
  readonly channel: ChannelExecutionService;
  readonly webhook: WebhookExecutionService;
  readonly guild: GuildExecutionService;
  readonly emoji: EmojiExecutionService;
  readonly vanity: VanityExecutionService;
  readonly integration: IntegrationExecutionService;
  readonly bot: BotExecutionService;

  private readonly delegate: DiscordExecutionService;

  constructor(options: ProductionDiscordExecutionAdapterOptions) {
    const normalizedOptions = normalizeExecutionAdapterOptions(options);
    const memberModerationOperation = new ProductionDiscordMemberModerationOperation(
      toMemberModerationOperationOptions(normalizedOptions),
    );
    const botOperation = new ProductionDiscordBotRemovalOperation(toOperationOptions(normalizedOptions));
    const roleOperation = new ProductionDiscordRoleRemovalOperation(toRoleOperationOptions(normalizedOptions));
    const webhookOperation = new ProductionDiscordWebhookRemovalOperation(
      toWebhookOperationOptions(normalizedOptions)
    );
    const channelContainmentOperation = new ProductionDiscordChannelContainmentOperation(
      toChannelContainmentOperationOptions(normalizedOptions),
    );
    const permissionOverwriteOperation = new ProductionDiscordPermissionOverwriteOperation(
      toPermissionOverwriteOperationOptions(normalizedOptions),
    );
    const integrationRestorationOperation = new ProductionDiscordIntegrationRestorationOperation(
      toIntegrationRestorationOperationOptions(normalizedOptions),
    );
    this.delegate = new ProductionDiscordExecutionService(
      {
        memberModerationOperation,
        botRemovalOperation: botOperation,
        roleRemovalOperation: roleOperation,
        webhookRemovalOperation: webhookOperation,
        channelContainmentOperation,
        permissionOverwriteOperation,
        integrationRestorationOperation,
      },
      toServiceOptions(normalizedOptions),
    );

    this.member = this.delegate.member;
    this.role = this.delegate.role;
    this.channel = this.delegate.channel;
    this.webhook = this.delegate.webhook;
    this.guild = this.delegate.guild;
    this.emoji = this.delegate.emoji;
    this.vanity = this.delegate.vanity;
    this.integration = this.delegate.integration;
    this.bot = this.delegate.bot;
  }
}
