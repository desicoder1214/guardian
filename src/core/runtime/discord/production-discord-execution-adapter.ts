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

export interface ProductionDiscordHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
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
  return Object.freeze({
    maxAttempts: options.maxAttempts,
  });
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
    const botOperation = new ProductionDiscordBotRemovalOperation(toOperationOptions(options));
    const roleOperation = new ProductionDiscordRoleRemovalOperation(toRoleOperationOptions(options));
    const webhookOperation = new ProductionDiscordWebhookRemovalOperation(toWebhookOperationOptions(options));
    const channelContainmentOperation = new ProductionDiscordChannelContainmentOperation(
      toChannelContainmentOperationOptions(options),
    );
    const permissionOverwriteOperation = new ProductionDiscordPermissionOverwriteOperation(
      toPermissionOverwriteOperationOptions(options),
    );
    this.delegate = new ProductionDiscordExecutionService(
      {
        botRemovalOperation: botOperation,
        roleRemovalOperation: roleOperation,
        webhookRemovalOperation: webhookOperation,
        channelContainmentOperation,
        permissionOverwriteOperation,
      },
      toServiceOptions(options),
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
