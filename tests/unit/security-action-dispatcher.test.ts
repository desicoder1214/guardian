import {
  ActionExecutionResult,
  ActionExecutionStatus,
  InMemorySecurityActionDispatcher,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  DiscordExecutionResult,
  DiscordExecutionService,
  DiscordExecutionStatus,
  MemberExecutionService,
  RoleExecutionService,
  ChannelExecutionService,
  WebhookExecutionService,
  GuildExecutionService,
  EmojiExecutionService,
  VanityExecutionService,
  IntegrationExecutionService,
  BotExecutionService,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import {
  FreezeWebhooksExecutor,
  LockChannelsExecutor,
  QuarantineActorExecutor,
  RemoveUnauthorizedBotExecutor,
  CreateIncidentExecutor,
  NotifyAuditExecutor,
  RestoreResourceExecutor,
  EscalateExecutor,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import { SecurityAction, SecurityActionPlan, SecurityActionPriority, SecurityActionType } from '../../src/core/runtime/discord/security-action-planner';
import { SecurityDecision } from '../../src/core/runtime/discord/security-policy-types';

function result(correlationId: string, operation: string): DiscordExecutionResult {
  return {
    status: DiscordExecutionStatus.SUCCESS,
    executionTimeMs: 0,
    correlationId,
    metadata: { operation, mode: 'test-double' },
  };
}

function buildService(spy: { calls: string[] }): DiscordExecutionService {
  const member: MemberExecutionService = {
    banMember: async (correlationId) => {
      spy.calls.push('member.banMember');
      return result(correlationId, 'member.banMember');
    },
    kickMember: async (correlationId) => {
      spy.calls.push('member.kickMember');
      return result(correlationId, 'member.kickMember');
    },
    removeRoles: async (correlationId) => {
      spy.calls.push('member.removeRoles');
      return result(correlationId, 'member.removeRoles');
    },
  };

  const role: RoleExecutionService = {
    restoreRole: async (correlationId) => {
      spy.calls.push('role.restoreRole');
      return result(correlationId, 'role.restoreRole');
    },
  };

  const channel: ChannelExecutionService = {
    lockChannel: async (correlationId) => {
      spy.calls.push('channel.lockChannel');
      return result(correlationId, 'channel.lockChannel');
    },
    unlockChannel: async (correlationId) => {
      spy.calls.push('channel.unlockChannel');
      return result(correlationId, 'channel.unlockChannel');
    },
    restoreChannel: async (correlationId) => {
      spy.calls.push('channel.restoreChannel');
      return result(correlationId, 'channel.restoreChannel');
    },
  };

  const webhook: WebhookExecutionService = {
    deleteWebhook: async (correlationId) => {
      spy.calls.push('webhook.deleteWebhook');
      return result(correlationId, 'webhook.deleteWebhook');
    },
    restoreWebhook: async (correlationId) => {
      spy.calls.push('webhook.restoreWebhook');
      return result(correlationId, 'webhook.restoreWebhook');
    },
    freezeWebhooks: async (correlationId) => {
      spy.calls.push('webhook.freezeWebhooks');
      return result(correlationId, 'webhook.freezeWebhooks');
    },
  };

  const guild: GuildExecutionService = {
    createIncident: async (correlationId) => {
      spy.calls.push('guild.createIncident');
      return result(correlationId, 'guild.createIncident');
    },
    notifyAudit: async (correlationId) => {
      spy.calls.push('guild.notifyAudit');
      return result(correlationId, 'guild.notifyAudit');
    },
    restoreResource: async (correlationId) => {
      spy.calls.push('guild.restoreResource');
      return result(correlationId, 'guild.restoreResource');
    },
    escalate: async (correlationId) => {
      spy.calls.push('guild.escalate');
      return result(correlationId, 'guild.escalate');
    },
  };

  const emoji: EmojiExecutionService = {
    restoreEmoji: async (correlationId) => {
      spy.calls.push('emoji.restoreEmoji');
      return result(correlationId, 'emoji.restoreEmoji');
    },
  };

  const vanity: VanityExecutionService = {
    restoreVanity: async (correlationId) => {
      spy.calls.push('vanity.restoreVanity');
      return result(correlationId, 'vanity.restoreVanity');
    },
  };

  const integration: IntegrationExecutionService = {
    restoreIntegration: async (correlationId) => {
      spy.calls.push('integration.restoreIntegration');
      return result(correlationId, 'integration.restoreIntegration');
    },
  };

  const bot: BotExecutionService = {
    removeUnauthorizedBot: async (correlationId) => {
      spy.calls.push('bot.removeUnauthorizedBot');
      return result(correlationId, 'bot.removeUnauthorizedBot');
    },
  };

  return {
    member,
    role,
    channel,
    webhook,
    guild,
    emoji,
    vanity,
    integration,
    bot,
  };
}

class RecordingExecutor implements SecurityActionExecutor {
  readonly calls: SecurityActionType[] = [];

  constructor(readonly supportedActionType: SecurityActionType, private readonly status: ActionExecutionStatus = ActionExecutionStatus.SUCCESS) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    this.calls.push(action.type);
    return {
      action,
      status: this.status,
      executionTimeMs: 0,
      correlationId,
      metadata: {
        executor: 'RecordingExecutor',
      },
    };
  }
}

class FailingExecutor implements SecurityActionExecutor {
  constructor(readonly supportedActionType: SecurityActionType, private readonly fatal: boolean) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return {
      action,
      status: ActionExecutionStatus.FAILED,
      executionTimeMs: 0,
      correlationId,
      metadata: { fatal: this.fatal, executor: 'FailingExecutor' },
    };
  }
}

function action(type: SecurityActionType, sequence: number): SecurityAction {
  return {
    type,
    priority: SecurityActionPriority.NORMAL,
    sequence,
    metadata: { test: true },
  };
}

function buildPlan(actions: readonly SecurityAction[]): SecurityActionPlan {
  return {
    decision: SecurityDecision.CONTAIN,
    actions,
    correlationId: 'corr-dispatch-1',
  };
}

test('actions execute in declared sequence', async () => {
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new RecordingExecutor(SecurityActionType.CREATE_INCIDENT));
  registry.register(new RecordingExecutor(SecurityActionType.NOTIFY_AUDIT));
  registry.register(new RecordingExecutor(SecurityActionType.QUARANTINE_ACTOR));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  const report = await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.NOTIFY_AUDIT, 3),
      action(SecurityActionType.CREATE_INCIDENT, 1),
      action(SecurityActionType.QUARANTINE_ACTOR, 2),
    ]),
  );

  expect(report.results.map((entry) => entry.action.type)).toEqual([
    SecurityActionType.CREATE_INCIDENT,
    SecurityActionType.QUARANTINE_ACTOR,
    SecurityActionType.NOTIFY_AUDIT,
  ]);
});

test('unsupported actions return NOT_SUPPORTED', async () => {
  const service = buildService({ calls: [] });
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new CreateIncidentExecutor(service));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  const report = await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.LOCK_CHANNELS, 1),
      action(SecurityActionType.CREATE_INCIDENT, 2),
    ]),
  );

  expect(report.results[0].status).toBe(ActionExecutionStatus.NOT_SUPPORTED);
  expect(report.results[1].status).toBe(ActionExecutionStatus.SUCCESS);
});

test('executor failures do not corrupt remaining execution for non-fatal failures', async () => {
  const service = buildService({ calls: [] });
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new FailingExecutor(SecurityActionType.QUARANTINE_ACTOR, false));
  registry.register(new CreateIncidentExecutor(service));
  registry.register(new NotifyAuditExecutor(service));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  const report = await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.QUARANTINE_ACTOR, 1),
      action(SecurityActionType.CREATE_INCIDENT, 2),
      action(SecurityActionType.NOTIFY_AUDIT, 3),
    ]),
  );

  expect(report.results.map((entry) => entry.status)).toEqual([
    ActionExecutionStatus.FAILED,
    ActionExecutionStatus.SUCCESS,
    ActionExecutionStatus.SUCCESS,
  ]);
});

test('correlationId propagates through every execution result', async () => {
  const service = buildService({ calls: [] });
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new QuarantineActorExecutor(service));
  registry.register(new RemoveUnauthorizedBotExecutor(service));
  registry.register(new FreezeWebhooksExecutor(service));
  registry.register(new CreateIncidentExecutor(service));
  registry.register(new NotifyAuditExecutor(service));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  const report = await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, 1),
      action(SecurityActionType.FREEZE_WEBHOOKS, 2),
      action(SecurityActionType.CREATE_INCIDENT, 3),
    ]),
  );

  expect(report.correlationId).toBe('corr-dispatch-1');
  for (const result of report.results) {
    expect(result.correlationId).toBe('corr-dispatch-1');
  }
});

test('dispatcher itself performs no Discord REST calls', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const service = buildService({ calls: [] });
    const registry = new InMemorySecurityActionExecutorRegistry();
    registry.register(new CreateIncidentExecutor(service));
    registry.register(new NotifyAuditExecutor(service));

    const dispatcher = new InMemorySecurityActionDispatcher(registry);
    await dispatcher.dispatch(
      buildPlan([
        action(SecurityActionType.CREATE_INCIDENT, 1),
        action(SecurityActionType.NOTIFY_AUDIT, 2),
      ]),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});

test('executor failure skips remaining actions deterministically when fatal metadata is set', async () => {
  const service = buildService({ calls: [] });
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new FailingExecutor(SecurityActionType.QUARANTINE_ACTOR, true));
  registry.register(new CreateIncidentExecutor(service));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  const report = await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.QUARANTINE_ACTOR, 1),
      action(SecurityActionType.CREATE_INCIDENT, 2),
    ]),
  );

  expect(report.results.map((result) => result.status)).toEqual([
    ActionExecutionStatus.FAILED,
    ActionExecutionStatus.SKIPPED,
  ]);
});

test('executors only call injected execution services', async () => {
  const calls: string[] = [];
  const service = buildService({ calls });
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new CreateIncidentExecutor(service));
  registry.register(new NotifyAuditExecutor(service));
  registry.register(new QuarantineActorExecutor(service));
  registry.register(new RemoveUnauthorizedBotExecutor(service));
  registry.register(new FreezeWebhooksExecutor(service));
  registry.register(new LockChannelsExecutor(service));
  registry.register(new RestoreResourceExecutor(service));
  registry.register(new EscalateExecutor(service));

  const dispatcher = new InMemorySecurityActionDispatcher(registry);
  await dispatcher.dispatch(
    buildPlan([
      action(SecurityActionType.CREATE_INCIDENT, 1),
      action(SecurityActionType.NOTIFY_AUDIT, 2),
      action(SecurityActionType.QUARANTINE_ACTOR, 3),
      action(SecurityActionType.REMOVE_UNAUTHORIZED_BOT, 4),
      action(SecurityActionType.FREEZE_WEBHOOKS, 5),
      action(SecurityActionType.LOCK_CHANNELS, 6),
      action(SecurityActionType.RESTORE_RESOURCE, 7),
      action(SecurityActionType.ESCALATE, 8),
    ]),
  );

  expect(calls).toEqual([
    'guild.createIncident',
    'guild.notifyAudit',
    'member.removeRoles',
    'bot.removeUnauthorizedBot',
    'webhook.freezeWebhooks',
    'channel.lockChannel',
    'guild.restoreResource',
    'guild.escalate',
  ]);
});

test('execution services remain side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const service = buildService({ calls: [] });
    await service.guild.createIncident('corr-1');
    await service.guild.notifyAudit('corr-1');
    await service.guild.restoreResource('corr-1');
    await service.guild.escalate('corr-1');
    await service.member.banMember('corr-1');
    await service.member.kickMember('corr-1');
    await service.member.removeRoles('corr-1');
    await service.role.restoreRole('corr-1');
    await service.channel.lockChannel('corr-1');
    await service.channel.unlockChannel('corr-1');
    await service.channel.restoreChannel('corr-1');
    await service.webhook.deleteWebhook('corr-1');
    await service.webhook.restoreWebhook('corr-1');
    await service.webhook.freezeWebhooks('corr-1');
    await service.emoji.restoreEmoji('corr-1');
    await service.vanity.restoreVanity('corr-1');
    await service.integration.restoreIntegration('corr-1');
    await service.bot.removeUnauthorizedBot('corr-1');

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
