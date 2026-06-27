export enum DiscordExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

export interface DiscordExecutionResult {
  readonly status: DiscordExecutionStatus;
  readonly executionTimeMs: number;
  readonly metadata?: unknown;
  readonly correlationId: string;
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
  removeUnauthorizedBot(correlationId: string): Promise<DiscordExecutionResult>;
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

abstract class BaseInMemoryExecutionService {
  protected buildResult(service: string, operation: string, correlationId: string): DiscordExecutionResult {
    return {
      status: DiscordExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: {
        mode: 'in-memory-placeholder',
        service,
        operation,
      },
    };
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
  async removeUnauthorizedBot(correlationId: string): Promise<DiscordExecutionResult> {
    return this.buildResult('bot', 'removeUnauthorizedBot', correlationId);
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
