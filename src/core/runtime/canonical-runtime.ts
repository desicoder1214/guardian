import { EventBus } from '../event/bus';
import { RuntimeHealthService } from './health';
import { RuntimeManager } from './lifecycle';
import { Logger, LoggerFactory } from './logger';
import { GuardianRuntimeMode, isProductionMode } from './runtime-mode';
import {
  InMemoryDiscordEventPipeline,
} from './discord/pipeline';
import { DiscordEventPipeline, DiscordGatewayRawEvent } from './discord/pipeline-types';
import { DiscordRuntimeAdapter } from './discord/types';
import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionResult,
  DetectionSeverity,
  InMemoryDetectionEngine,
} from './discord/detection-engine';
import {
  DetectorPlugin,
  InMemoryDetectorPluginRegistry,
} from './discord/detection-plugin-framework';
import { UnauthorizedBotAddDetector } from './discord/unauthorized-bot-add-detector';
import { UnauthorizedWebhookCreateDetector } from './discord/unauthorized-webhook-create-detector';
import { DangerousRoleGrantDetector } from './discord/dangerous-role-grant-detector';
import {
  InMemorySecurityContextBuilder,
} from './discord/security-context';
import {
  InMemorySecurityEvaluationPipeline,
} from './discord/security-evaluation-pipeline';
import { InMemoryAuditAttributionEngine } from './discord/audit-attribution-engine';
import { InMemoryAuditLogProvider } from './discord/audit-log-provider';
import {
  InMemorySecurityPolicyEngine,
} from './discord/policy-engine';
import {
  InMemorySecurityPolicyProvider,
} from './discord/security-policy-provider';
import {
  SecurityActionType as PolicyActionType,
  SecurityDecision,
} from './discord/security-policy-types';
import { InMemoryThresholdTracker } from './discord/threshold-tracker';
import {
  InMemorySecurityActionPlanner,
  SecurityActionType,
} from './discord/security-action-planner';
import {
  InMemorySecurityExecutionPlanner,
} from './discord/security-execution-planner';
import {
  InMemorySecurityExecutionOrchestrator,
} from './discord/security-execution-orchestrator';
import { InMemorySecurityExecutionRouter } from './discord/security-execution-router';
import { InMemorySecurityExecutionDispatcher } from './discord/security-execution-dispatcher';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from './discord/security-action-executor-registry';
import {
  CoordinatedContainmentExecutionResult,
} from './discord/coordinated-containment-execution';
import {
  DiscordExecutionService,
  InMemoryDiscordExecutionService,
} from './discord/discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
} from './discord/production-discord-execution-adapter';
import {
  ProductionDiscordRestClient,
} from './discord/production-discord-rest-client';
import { DiscordBotExecutor } from './discord/security-bot-executor';
import { DiscordMemberExecutor } from './discord/security-member-executor';
import { DiscordRoleExecutor } from './discord/security-role-executor';
import {
  InMemorySecurityDecisionEngine,
} from './discord/security-decision-engine';
import { SecurityDecisionModel } from './discord/security-decision-types';
import {
  InMemoryRecoveryEngine,
  RecoveryOperationType,
} from './recovery/recovery-engine';
import { DiscordGatewayNormalizedEvent } from './discord/pipeline-types';
import {
  AbusedInviteAttributionStatus,
  AbusedInviteDangerousRoleJoinTrigger,
  DangerousRoleJoinMemberRecord,
  DangerousRoleRoleRecord,
  InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation,
} from './security/abused-invite-dangerous-role-join-protection-foundation';

enum EnterpriseOperationalScenario {
  UNAUTHORIZED_BOT_ADDITION = 'UNAUTHORIZED_BOT_ADDITION',
  DUPLICATE_BOT_IDENTITY = 'DUPLICATE_BOT_IDENTITY',
  MISSING_AUTHORIZED_BOT = 'MISSING_AUTHORIZED_BOT',
  DANGEROUS_WEBHOOK_CREATION = 'DANGEROUS_WEBHOOK_CREATION',
  WEBHOOK_MODIFICATION = 'WEBHOOK_MODIFICATION',
  DANGEROUS_ROLE_GRANT = 'DANGEROUS_ROLE_GRANT',
  PRIVILEGED_PERMISSION_ESCALATION = 'PRIVILEGED_PERMISSION_ESCALATION',
  CHANNEL_PERMISSION_DRIFT = 'CHANNEL_PERMISSION_DRIFT',
  STARTUP_RECONCILIATION_AFTER_DOWNTIME = 'STARTUP_RECONCILIATION_AFTER_DOWNTIME',
  RECOVERY_RESTORATION = 'RECOVERY_RESTORATION',
}

interface EnterpriseScenarioContract {
  readonly scenario: EnterpriseOperationalScenario;
  readonly actionType: PolicyActionType;
  readonly supportedByCanonicalDetectorPath: boolean;
  readonly unsupportedReason?: string;
}

class ScenarioContractDetectorPlugin implements DetectorPlugin {
  constructor(
    readonly detectorId: string,
    readonly version: string,
    readonly priority: number,
    readonly supportedActionTypes: readonly PolicyActionType[],
    private readonly supportedEventNames: readonly string[],
    private readonly findingReason: string,
    private readonly findingSeverity: DetectionSeverity,
    private readonly scenario: EnterpriseOperationalScenario,
  ) {}

  enabled(): boolean {
    return true;
  }

  async evaluate(context: {
    readonly normalizedEvent: DiscordGatewayNormalizedEvent;
    readonly correlationId: string;
  }): Promise<DetectionResult> {
    const matched = this.supportedEventNames.includes(context.normalizedEvent.eventName);

    return Object.freeze({
      detectorId: this.detectorId,
      matched,
      findings: Object.freeze([
        Object.freeze({
          detectorId: this.detectorId,
          severity: matched ? this.findingSeverity : DetectionSeverity.INFO,
          confidence: matched ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
          disposition: matched ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
          reason: matched ? this.findingReason : `No ${this.scenario} signal detected`,
          correlationId: context.correlationId,
          metadata: Object.freeze({
            scenario: this.scenario,
            eventName: context.normalizedEvent.eventName,
          }),
        }),
      ]),
      correlationId: context.correlationId,
      metadata: Object.freeze({
        scenario: this.scenario,
      }),
    });
  }
}

function readScenarioOverride(payload: unknown): EnterpriseOperationalScenario | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const scenarioCandidate = (payload as { scenario?: unknown }).scenario;
  if (typeof scenarioCandidate !== 'string') {
    return undefined;
  }

  const allowedScenarios = new Set<string>(Object.values(EnterpriseOperationalScenario));
  if (!allowedScenarios.has(scenarioCandidate)) {
    return undefined;
  }

  return scenarioCandidate as EnterpriseOperationalScenario;
}

function resolveEnterpriseScenarioContract(
  eventName: string,
  payload: unknown,
): EnterpriseScenarioContract | undefined {
  const override = readScenarioOverride(payload);
  if (override) {
    switch (override) {
      case EnterpriseOperationalScenario.UNAUTHORIZED_BOT_ADDITION:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.BOT_ADD,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.DUPLICATE_BOT_IDENTITY:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.BOT_ADD,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.MISSING_AUTHORIZED_BOT:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.BOT_ADD,
          supportedByCanonicalDetectorPath: false,
          unsupportedReason: 'Requires startup inventory reconciliation baseline, unavailable in canonical event-only detector path',
        });
      case EnterpriseOperationalScenario.DANGEROUS_WEBHOOK_CREATION:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.WEBHOOK_CREATE,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.WEBHOOK_MODIFICATION:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.WEBHOOK_DELETE,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.DANGEROUS_ROLE_GRANT:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.ROLE_CREATE,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.PRIVILEGED_PERMISSION_ESCALATION:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.ROLE_CREATE,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.CHANNEL_PERMISSION_DRIFT:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.CHANNEL_DELETE,
          supportedByCanonicalDetectorPath: true,
        });
      case EnterpriseOperationalScenario.STARTUP_RECONCILIATION_AFTER_DOWNTIME:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.CHANNEL_DELETE,
          supportedByCanonicalDetectorPath: false,
          unsupportedReason: 'Requires startup reconciliation coordinator state, unavailable in canonical event-only detector path',
        });
      case EnterpriseOperationalScenario.RECOVERY_RESTORATION:
        return Object.freeze({
          scenario: override,
          actionType: PolicyActionType.CHANNEL_DELETE,
          supportedByCanonicalDetectorPath: false,
          unsupportedReason: 'Requires recovery snapshot restore context, unavailable in canonical event-only detector path',
        });
      default:
        return undefined;
    }
  }

  switch (eventName) {
    case 'BOT_ADD':
    case 'GUILD_MEMBER_ADD':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.UNAUTHORIZED_BOT_ADDITION,
        actionType: PolicyActionType.BOT_ADD,
        supportedByCanonicalDetectorPath: true,
      });
    case 'BOT_DUPLICATE_IDENTITY':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.DUPLICATE_BOT_IDENTITY,
        actionType: PolicyActionType.BOT_ADD,
        supportedByCanonicalDetectorPath: true,
      });
    case 'BOT_AUTHORIZED_MISSING':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.MISSING_AUTHORIZED_BOT,
        actionType: PolicyActionType.BOT_ADD,
        supportedByCanonicalDetectorPath: false,
        unsupportedReason: 'Requires startup inventory reconciliation baseline, unavailable in canonical event-only detector path',
      });
    case 'WEBHOOK_CREATE':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.DANGEROUS_WEBHOOK_CREATION,
        actionType: PolicyActionType.WEBHOOK_CREATE,
        supportedByCanonicalDetectorPath: true,
      });
    case 'WEBHOOK_UPDATE':
    case 'WEBHOOK_MODIFICATION':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.WEBHOOK_MODIFICATION,
        actionType: PolicyActionType.WEBHOOK_DELETE,
        supportedByCanonicalDetectorPath: true,
      });
    case 'GUILD_MEMBER_UPDATE':
    case 'GUILD_ROLE_UPDATE':
    case 'MEMBER_ROLE_ADD':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.DANGEROUS_ROLE_GRANT,
        actionType: PolicyActionType.ROLE_CREATE,
        supportedByCanonicalDetectorPath: true,
      });
    case 'PRIVILEGED_PERMISSION_ESCALATION':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.PRIVILEGED_PERMISSION_ESCALATION,
        actionType: PolicyActionType.ROLE_CREATE,
        supportedByCanonicalDetectorPath: true,
      });
    case 'CHANNEL_PERMISSION_DRIFT':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.CHANNEL_PERMISSION_DRIFT,
        actionType: PolicyActionType.CHANNEL_DELETE,
        supportedByCanonicalDetectorPath: true,
      });
    case 'STARTUP_RECONCILIATION_AFTER_DOWNTIME':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.STARTUP_RECONCILIATION_AFTER_DOWNTIME,
        actionType: PolicyActionType.CHANNEL_DELETE,
        supportedByCanonicalDetectorPath: false,
        unsupportedReason: 'Requires startup reconciliation coordinator state, unavailable in canonical event-only detector path',
      });
    case 'RECOVERY_RESTORATION':
      return Object.freeze({
        scenario: EnterpriseOperationalScenario.RECOVERY_RESTORATION,
        actionType: PolicyActionType.CHANNEL_DELETE,
        supportedByCanonicalDetectorPath: false,
        unsupportedReason: 'Requires recovery snapshot restore context, unavailable in canonical event-only detector path',
      });
    default:
      return undefined;
  }
}

class DangerousRoleGrantDetectorPluginAdapter implements DetectorPlugin {
  readonly detectorId = 'dangerous-role-grant-detector';
  readonly version = '1.0.0';
  readonly priority = 90;
  readonly supportedActionTypes = Object.freeze([PolicyActionType.ROLE_CREATE]);
  private readonly detector = new DangerousRoleGrantDetector();

  enabled(): boolean {
    return true;
  }

  async evaluate(context: {
    readonly normalizedEvent: DiscordGatewayNormalizedEvent;
    readonly correlationId: string;
  }): Promise<DetectionResult> {
    const detection = await this.detector.detect(context.normalizedEvent);
    const findingDisposition = detection.detected
      ? DetectionDisposition.MALICIOUS
      : DetectionDisposition.CLEAN;

    return Object.freeze({
      detectorId: this.detectorId,
      matched: detection.detected,
      findings: Object.freeze([
        Object.freeze({
          detectorId: this.detectorId,
          severity: detection.detected ? DetectionSeverity.HIGH : DetectionSeverity.INFO,
          confidence: detection.detected ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
          disposition: findingDisposition,
          reason: detection.detected
            ? 'Dangerous role grant detected'
            : 'No dangerous role grant detected',
          correlationId: context.correlationId,
          metadata: detection.metadata ? Object.freeze({ ...detection.metadata }) : undefined,
        }),
      ]),
      correlationId: context.correlationId,
      metadata: detection.metadata ? Object.freeze({ ...detection.metadata }) : undefined,
    });
  }
}

export interface CanonicalGuardianRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
  ingestGatewayEvent(event: DiscordGatewayRawEvent): Promise<void>;
}

export class IntegratedCanonicalGuardianRuntime implements CanonicalGuardianRuntime {
  private static readonly REPLAY_SUPPRESSION_TTL_MS = 15 * 60_000;
  private static readonly REPLAY_SUPPRESSION_MAX_ENTRIES = 50_000;
  private static readonly REPLAY_SUPPRESSION_PRUNE_INTERVAL = 128;

  private readonly logger: Logger;
  private readonly eventPipeline: DiscordEventPipeline;
  private readonly detectorRegistry = new InMemoryDetectorPluginRegistry();
  private readonly detectionEngine = new InMemoryDetectionEngine(this.detectorRegistry);
  private readonly policyProvider = new InMemorySecurityPolicyProvider();
  private readonly executionService: DiscordExecutionService;
  private readonly securityEvaluationPipeline: InMemorySecurityEvaluationPipeline;
  private readonly actionPlanner = new InMemorySecurityActionPlanner();
  private readonly executionPlanner = new InMemorySecurityExecutionPlanner();
  private readonly executionOrchestrator: InMemorySecurityExecutionOrchestrator;
  private readonly recoveryEngine = new InMemoryRecoveryEngine();
  private readonly inviteDangerousRoleJoinFoundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
  private readonly trustedInviterIds: readonly string[];
  private readonly runtimeAuthorizedBotIds: readonly string[];
  private readonly runtimeTrustedBotIds: readonly string[];
  private readonly runtimeAuthorizedWebhookIds: readonly string[];
  private readonly runtimeAuthorizedIntegrationIds: readonly string[];
  private readonly processedContainmentKeys = new Map<string, number>();
  private replaySuppressionEventsSincePrune = 0;
  private unsubscribeEventHandler?: () => void;

  constructor(
    private readonly mode: GuardianRuntimeMode,
    private readonly runtimeManager: RuntimeManager,
    private readonly discordRuntime: DiscordRuntimeAdapter,
    eventBus: EventBus,
    healthService: RuntimeHealthService,
    loggerFactory: LoggerFactory,
    private readonly runtimeId: string,
    private readonly guildId: string,
  ) {
    this.logger = loggerFactory.createLogger();
    this.trustedInviterIds = this.readIdListFromEnvironment('GUARDIAN_TRUSTED_INVITER_IDS');
    this.runtimeAuthorizedBotIds = this.readIdListFromEnvironment('GUARDIAN_AUTHORIZED_BOT_IDS');
    this.runtimeTrustedBotIds = this.readIdListFromEnvironment('GUARDIAN_TRUSTED_BOT_IDS');
    this.runtimeAuthorizedWebhookIds = this.readIdListFromEnvironment('GUARDIAN_AUTHORIZED_WEBHOOK_IDS');
    this.runtimeAuthorizedIntegrationIds = this.readIdListFromEnvironment('GUARDIAN_AUTHORIZED_INTEGRATION_IDS');
    this.eventPipeline = new InMemoryDiscordEventPipeline(
      eventBus,
      healthService,
      this.logger,
      runtimeManager,
    );

    this.executionService = this.resolveExecutionService();
    this.securityEvaluationPipeline = new InMemorySecurityEvaluationPipeline(
      new InMemorySecurityContextBuilder(),
      new InMemoryAuditAttributionEngine(new InMemoryAuditLogProvider()),
      new InMemorySecurityPolicyEngine(this.policyProvider, new InMemoryThresholdTracker()),
      new InMemorySecurityDecisionEngine(),
    );
    this.executionOrchestrator = this.createExecutionOrchestrator();

    this.configureDefaultPolicy();
    this.registerProductionDetectors();
  }

  private createExecutionOrchestrator(): InMemorySecurityExecutionOrchestrator {
    const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
    const domainExecutorRegistry = new InMemorySecurityDomainExecutorRegistry();

    this.registerRouterActionExecutors(actionExecutorRegistry);

    domainExecutorRegistry.register(new DiscordBotExecutor(this.executionService));
    domainExecutorRegistry.register(new DiscordMemberExecutor(this.executionService));
    domainExecutorRegistry.register(new DiscordRoleExecutor(this.executionService));

    const executionRouter = new InMemorySecurityExecutionRouter(actionExecutorRegistry);
    const executionDispatcher = new InMemorySecurityExecutionDispatcher(domainExecutorRegistry);

    return new InMemorySecurityExecutionOrchestrator(
      undefined,
      undefined,
      undefined,
      executionRouter,
      executionDispatcher,
    );
  }

  private registerRouterActionExecutors(registry: InMemorySecurityActionExecutorRegistry): void {
    const register = (actionType: SecurityActionType): void => {
      const executor: SecurityActionExecutor = {
        supports(candidate) {
          return candidate === actionType;
        },
        async execute() {
          throw new Error('router-action-executor is a route-only registration and must not execute');
        },
      };

      registry.register(executor);
    };

    register(SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    register(SecurityActionType.REMOVE_DANGEROUS_ROLE);
    register(SecurityActionType.FREEZE_WEBHOOKS);
    register(SecurityActionType.LOCK_CHANNELS);
    register(SecurityActionType.RESTORE_RESOURCE);
    register(SecurityActionType.CREATE_INCIDENT);
    register(SecurityActionType.NOTIFY_AUDIT);
    register(SecurityActionType.QUARANTINE_ACTOR);
    register(SecurityActionType.ESCALATE);
    register(SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER);
    register(SecurityActionType.REVOKE_ESCALATION_SOURCE);
    register(SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR);
  }

  async start(): Promise<void> {
    await this.runtimeManager.start();
    await this.discordRuntime.start();
    await this.eventPipeline.start();

    if (!this.unsubscribeEventHandler) {
      this.unsubscribeEventHandler = this.eventPipeline.subscribe((event) => this.handleEvent(event));
    }

    this.logger.info('Canonical Guardian runtime started', {
      runtimeMode: this.mode,
      runtimeId: this.runtimeId,
      guildId: this.guildId,
    });
  }

  async stop(): Promise<void> {
    if (this.unsubscribeEventHandler) {
      this.unsubscribeEventHandler();
      this.unsubscribeEventHandler = undefined;
    }

    await this.eventPipeline.stop();
    await this.discordRuntime.stop();
    await this.runtimeManager.stop();

    this.logger.info('Canonical Guardian runtime stopped', {
      runtimeMode: this.mode,
      runtimeId: this.runtimeId,
      guildId: this.guildId,
    });
  }

  async ingestGatewayEvent(event: DiscordGatewayRawEvent): Promise<void> {
    await this.eventPipeline.ingest(event);
  }

  private configureDefaultPolicy(): void {
    this.policyProvider.setPolicy(
      this.guildId,
      Object.freeze({
        guildId: this.guildId,
        rules: Object.freeze([
          Object.freeze({
            actionType: PolicyActionType.BOT_ADD,
            enabled: true,
            threshold: Number.MAX_SAFE_INTEGER,
            windowMs: 60_000,
            decisionOnViolation: SecurityDecision.BLOCK,
          }),
          Object.freeze({
            actionType: PolicyActionType.ROLE_CREATE,
            enabled: true,
            threshold: 0,
            windowMs: 60_000,
            decisionOnViolation: SecurityDecision.BLOCK,
          }),
          Object.freeze({
            actionType: PolicyActionType.WEBHOOK_CREATE,
            enabled: true,
            threshold: Number.MAX_SAFE_INTEGER,
            windowMs: 60_000,
            decisionOnViolation: SecurityDecision.BLOCK,
          }),
          Object.freeze({
            actionType: PolicyActionType.CHANNEL_DELETE,
            enabled: true,
            threshold: 0,
            windowMs: 60_000,
            decisionOnViolation: SecurityDecision.BLOCK,
          }),
        ]),
        trustedUserIds: Object.freeze([...this.trustedInviterIds]),
      }),
    );
  }

  private readIdListFromEnvironment(key: string): readonly string[] {
    const raw = process.env[key] ?? '';
    if (raw.trim().length === 0) {
      return Object.freeze([]);
    }

    const values = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return Object.freeze([...new Set(values)]);
  }

  private readRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
    if (!record) {
      return undefined;
    }

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private readStringArray(record: Record<string, unknown> | undefined, key: string): readonly string[] {
    if (!record) {
      return Object.freeze([]);
    }

    const value = record[key];
    if (!Array.isArray(value)) {
      return Object.freeze([]);
    }

    return Object.freeze(
      value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0),
    );
  }

  private readBotId(payload: unknown): string | undefined {
    const record = this.readRecord(payload);
    const direct = this.readString(record, 'botId', 'bot_id', 'targetId', 'target_id');
    if (direct) {
      return direct;
    }

    const user = this.readRecord(record?.user);
    const userId = this.readString(user, 'id', 'userId', 'user_id');
    if (userId) {
      return userId;
    }

    const member = this.readRecord(record?.member);
    const memberId = this.readString(member, 'id', 'userId', 'user_id');
    if (memberId) {
      return memberId;
    }

    const memberUser = this.readRecord(member?.user);
    return this.readString(memberUser, 'id', 'userId', 'user_id');
  }

  private readMemberUserId(payload: unknown): string | undefined {
    const record = this.readRecord(payload);
    const direct = this.readString(
      record,
      'memberUserId',
      'member_user_id',
      'memberId',
      'member_id',
      'targetUserId',
      'target_user_id',
      'targetId',
      'target_id',
    );
    if (direct) {
      return direct;
    }

    const target = this.readRecord(record?.target);
    const targetId = this.readString(target, 'userId', 'user_id', 'id');
    if (targetId) {
      return targetId;
    }

    const member = this.readRecord(record?.member);
    const memberId = this.readString(member, 'userId', 'user_id', 'id');
    if (memberId) {
      return memberId;
    }

    const memberUser = this.readRecord(member?.user);
    const memberUserId = this.readString(memberUser, 'id', 'userId', 'user_id');
    if (memberUserId) {
      return memberUserId;
    }

    const user = this.readRecord(record?.user);
    return this.readString(user, 'id', 'userId', 'user_id');
  }

  private readRoleId(payload: unknown): string | undefined {
    const record = this.readRecord(payload);
    const direct = this.readString(
      record,
      'roleId',
      'role_id',
      'dangerousRoleId',
      'dangerous_role_id',
      'targetRoleId',
      'target_role_id',
    );
    if (direct) {
      return direct;
    }

    const role = this.readRecord(record?.role);
    const roleId = this.readString(role, 'id', 'roleId', 'role_id');
    if (roleId) {
      return roleId;
    }

    const roleIds = this.readStringArray(record, 'roleIds');
    if (roleIds.length > 0) {
      return roleIds[0];
    }

    const roles = this.readStringArray(record, 'roles');
    if (roles.length > 0) {
      return roles[0];
    }

    const after = this.readRecord(record?.after);
    const afterRole = this.readRecord(after?.role);
    return this.readString(afterRole, 'id', 'roleId', 'role_id');
  }

  private readWebhookId(payload: unknown): string | undefined {
    const record = this.readRecord(payload);
    const direct = this.readString(
      record,
      'webhookId',
      'webhook_id',
      'targetWebhookId',
      'target_webhook_id',
      'targetId',
      'target_id',
      'resourceId',
      'resource_id',
    );
    if (direct) {
      return direct;
    }

    const webhook = this.readRecord(record?.webhook);
    return this.readString(webhook, 'id', 'webhookId', 'webhook_id');
  }

  private readRoleContainmentPolicy(payload: unknown): {
    readonly punishActor: boolean;
    readonly neutralizeTarget: boolean;
    readonly protectedRole: boolean;
  } {
    const record = this.readRecord(payload);
    const policy = this.readRecord(record?.policy);

    const punishActor =
      this.readBoolean(policy, 'punishActor', 'punish_actor') ??
      this.readBoolean(record, 'policyPunishActor', 'policy_punish_actor') ??
      true;
    const neutralizeTarget =
      this.readBoolean(policy, 'neutralizeTarget', 'neutralize_target') ??
      this.readBoolean(record, 'policyNeutralizeTarget', 'policy_neutralize_target') ??
      true;
    const protectedRole =
      this.readBoolean(record, 'protectedRole', 'protected_role') ??
      this.readBoolean(policy, 'protectedRole', 'protected_role') ??
      false;

    return Object.freeze({
      punishActor,
      neutralizeTarget,
      protectedRole,
    });
  }

  private readWebhookContainmentPolicy(payload: unknown): {
    readonly punishActor: boolean;
  } {
    const record = this.readRecord(payload);
    const policy = this.readRecord(record?.policy);

    const punishActor =
      this.readBoolean(policy, 'punishActor', 'punish_actor') ??
      this.readBoolean(record, 'policyPunishActor', 'policy_punish_actor') ??
      true;

    return Object.freeze({
      punishActor,
    });
  }

  private mergeRoleContainmentPolicyFromDetections(
    roleContainmentPolicy: {
      readonly punishActor: boolean;
      readonly neutralizeTarget: boolean;
      readonly protectedRole: boolean;
    },
    detectionResults: readonly DetectionResult[],
  ): {
    readonly punishActor: boolean;
    readonly neutralizeTarget: boolean;
    readonly protectedRole: boolean;
  } {
    const inviteAbuse = detectionResults.find(
      (result) => result.detectorId === 'dangerous-role-invite-abuse-detector' && result.matched,
    );
    const metadata = inviteAbuse?.metadata && typeof inviteAbuse.metadata === 'object'
      ? (inviteAbuse.metadata as Record<string, unknown>)
      : undefined;

    return Object.freeze({
      punishActor: typeof metadata?.policyPunishActor === 'boolean'
        ? metadata.policyPunishActor
        : roleContainmentPolicy.punishActor,
      neutralizeTarget: typeof metadata?.policyNeutralizeTarget === 'boolean'
        ? metadata.policyNeutralizeTarget
        : roleContainmentPolicy.neutralizeTarget,
      protectedRole: typeof metadata?.protectedRole === 'boolean'
        ? metadata.protectedRole
        : roleContainmentPolicy.protectedRole,
    });
  }

  private readInviteDangerousRoleCatalog(payload: unknown): readonly DangerousRoleRoleRecord[] {
    const record = this.readRecord(payload);
    const candidate = record?.roleCatalog;
    if (!Array.isArray(candidate)) {
      return Object.freeze([]);
    }

    const catalog: DangerousRoleRoleRecord[] = [];
    for (const entry of candidate) {
      const roleRecord = this.readRecord(entry);
      const roleId = this.readString(roleRecord, 'roleId', 'role_id', 'id');
      if (!roleId) {
        continue;
      }

      catalog.push(
        Object.freeze({
          roleId,
          name: this.readString(roleRecord, 'name'),
          permissions: Object.freeze([
            ...this.readStringArray(roleRecord, 'permissions'),
          ]),
          protectedRole: this.readBoolean(roleRecord, 'protectedRole', 'protected_role') === true,
          privilegedRole: this.readBoolean(roleRecord, 'privilegedRole', 'privileged_role') === true,
          dangerousRole: this.readBoolean(roleRecord, 'dangerousRole', 'dangerous_role') === true,
          nukerCapable: this.readBoolean(roleRecord, 'nukerCapable', 'nuker_capable') === true,
        }),
      );
    }

    return Object.freeze(catalog);
  }

  private readJoinMemberRecord(payload: unknown): DangerousRoleJoinMemberRecord | undefined {
    const record = this.readRecord(payload);
    const memberId = this.readMemberUserId(payload);
    if (!memberId) {
      return undefined;
    }

    const roleIds = this.readStringArray(record, 'roleIds');
    const roles = this.readStringArray(record, 'roles');

    return Object.freeze({
      memberId,
      roleIds: Object.freeze(roleIds.length > 0 ? [...roleIds] : [...roles]),
      joinedAt: this.readString(record, 'joinedAt', 'joined_at'),
      inviteCode: this.readString(record, 'inviteCode', 'invite_code'),
      trusted: this.readBoolean(record, 'trusted', 'trustedMember') === true,
      owner: this.readBoolean(record, 'owner', 'guildOwner') === true,
      integrationAssigned: this.readBoolean(record, 'integrationAssigned', 'integration_assigned') === true,
      onboardingAssigned: this.readBoolean(record, 'onboardingAssigned', 'onboarding_assigned') === true,
      suspectedRogueAdminId: this.readString(record, 'suspectedRogueAdminId', 'suspected_rogue_admin_id', 'inviterId', 'inviter_id'),
    });
  }

  private async evaluateInviteDangerousRoleJoinDetection(
    event: DiscordGatewayNormalizedEvent,
    actorId: string,
  ): Promise<DetectionResult | undefined> {
    if (event.eventName !== 'GUILD_MEMBER_ADD') {
      return undefined;
    }

    if (this.isBotAddEvent(event.eventName, event.payload)) {
      return undefined;
    }

    const joinedMember = this.readJoinMemberRecord(event.payload);
    const roleCatalog = this.readInviteDangerousRoleCatalog(event.payload);

    if (!joinedMember || roleCatalog.length === 0) {
      return undefined;
    }

    const report = await this.inviteDangerousRoleJoinFoundation.evaluate(
      Object.freeze({
        correlationId: event.correlationId,
        transactionId: event.correlationId,
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        trigger: AbusedInviteDangerousRoleJoinTrigger.GUILD_MEMBER_ADD,
        joinedMember,
        roleCatalog,
        metadata: Object.freeze({ source: 'canonical-guardian-runtime' }),
      }),
    );

    const matched = report.success && report.containmentRequired;
    const primaryMember = report.memberReports[0];
    const roleId = primaryMember?.dangerousRoleIds[0]
      ?? primaryMember?.privilegedRoleIds[0]
      ?? primaryMember?.nukerCapableRoleIds[0]
      ?? primaryMember?.protectedRoleIds[0]
      ?? joinedMember.roleIds[0];
    const policyPunishActor =
      (primaryMember?.punishmentSuppressed ?? false)
        ? false
        : primaryMember?.attributionStatus === AbusedInviteAttributionStatus.ROGUE_ADMIN_SUSPECTED;

    return Object.freeze({
      detectorId: 'dangerous-role-invite-abuse-detector',
      matched,
      findings: Object.freeze([
        Object.freeze({
          detectorId: 'dangerous-role-invite-abuse-detector',
          severity: matched ? DetectionSeverity.CRITICAL : DetectionSeverity.INFO,
          confidence: matched ? DetectionConfidence.HIGH : DetectionConfidence.CERTAIN,
          disposition: matched ? DetectionDisposition.MALICIOUS : DetectionDisposition.CLEAN,
          reason: matched
            ? 'Dangerous role join via invite/onboarding context detected'
            : 'No dangerous role join detected',
          correlationId: event.correlationId,
          metadata: Object.freeze({
            protectionId: report.protectionId,
            containmentRequired: report.containmentRequired,
            classification: report.classification,
          }),
        }),
      ]),
      correlationId: event.correlationId,
      metadata: Object.freeze({
        source: 'canonical-guardian-runtime',
        protectionId: report.protectionId,
        containmentRequired: report.containmentRequired,
        classification: report.classification,
        memberUserId: joinedMember.memberId,
        roleId,
        protectedRole: (primaryMember?.protectedRoleIds.length ?? 0) > 0,
        policyPunishActor,
        policyNeutralizeTarget: matched,
        inviteAttributionStatus: primaryMember?.attributionStatus,
        runtimeThreatOverrides: matched
          ? Object.freeze([
              Object.freeze({
                type: 'FORCE_BLOCK',
                applicableEventTypes: Object.freeze(['ROLE_CREATE']),
                reason: 'mandatory dangerous role join containment',
                metadata: Object.freeze({ source: 'dangerous-role-invite-abuse-detector' }),
              }),
            ])
          : Object.freeze([]),
      }),
    });
  }

  private readBoolean(record: Record<string, unknown> | undefined, ...keys: string[]): boolean | undefined {
    if (!record) {
      return undefined;
    }

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }

    return undefined;
  }

  private isBotAddEvent(eventName: string, payload: unknown): boolean {
    if (eventName === 'BOT_ADD') {
      return true;
    }

    if (eventName !== 'GUILD_MEMBER_ADD') {
      return false;
    }

    const record = this.readRecord(payload);
    const direct = this.readBoolean(record, 'bot', 'isBot');
    if (typeof direct === 'boolean') {
      return direct;
    }

    const user = this.readRecord(record?.user);
    const userBot = this.readBoolean(user, 'bot', 'isBot');
    if (typeof userBot === 'boolean') {
      return userBot;
    }

    const member = this.readRecord(record?.member);
    const memberBot = this.readBoolean(member, 'bot', 'isBot');
    if (typeof memberBot === 'boolean') {
      return memberBot;
    }

    const memberUser = this.readRecord(member?.user);
    return this.readBoolean(memberUser, 'bot', 'isBot') === true;
  }

  private resolveAuthorizedBotIds(payload: unknown): readonly string[] {
    const record = this.readRecord(payload);
    const inline = this.readStringArray(record, 'authorizedBotIds');
    return Object.freeze([...new Set([...this.runtimeAuthorizedBotIds, ...inline])]);
  }

  private resolveTrustedBotIds(payload: unknown): readonly string[] {
    const record = this.readRecord(payload);
    const inline = this.readStringArray(record, 'trustedBotIds');
    return Object.freeze([...new Set([...this.runtimeTrustedBotIds, ...inline])]);
  }

  private resolveAuthorizedWebhookIds(payload: unknown): readonly string[] {
    const record = this.readRecord(payload);
    const inline = this.readStringArray(record, 'authorizedWebhookIds');
    return Object.freeze([...new Set([...this.runtimeAuthorizedWebhookIds, ...inline])]);
  }

  private resolveAuthorizedIntegrationIds(payload: unknown): readonly string[] {
    const record = this.readRecord(payload);
    const inline = this.readStringArray(record, 'authorizedIntegrationIds');
    return Object.freeze([...new Set([...this.runtimeAuthorizedIntegrationIds, ...inline])]);
  }

  private buildReplaySuppressionKey(
    event: DiscordGatewayNormalizedEvent,
    actionType: PolicyActionType,
    actorId: string,
    botId: string | undefined,
    memberUserId: string | undefined,
    roleId: string | undefined,
    webhookId: string | undefined,
  ): string {
    if (botId) {
      return ['bot-add', this.guildId, botId, actorId].join(':');
    }

    if (actionType === PolicyActionType.ROLE_CREATE && memberUserId && roleId) {
      return ['role-grant', this.guildId, memberUserId, roleId, actorId].join(':');
    }

    if (actionType === PolicyActionType.WEBHOOK_CREATE && webhookId) {
      return ['webhook-create', this.guildId, webhookId, actorId].join(':');
    }

    return ['event', this.guildId, event.eventName, event.correlationId].join(':');
  }

  private pruneReplaySuppressionKeys(nowMs: number, force = false): void {
    if (!force) {
      this.replaySuppressionEventsSincePrune += 1;
      if (
        this.replaySuppressionEventsSincePrune < IntegratedCanonicalGuardianRuntime.REPLAY_SUPPRESSION_PRUNE_INTERVAL &&
        this.processedContainmentKeys.size < IntegratedCanonicalGuardianRuntime.REPLAY_SUPPRESSION_MAX_ENTRIES
      ) {
        return;
      }
    }

    this.replaySuppressionEventsSincePrune = 0;

    for (const [key, expiresAtMs] of this.processedContainmentKeys.entries()) {
      if (expiresAtMs <= nowMs) {
        this.processedContainmentKeys.delete(key);
      }
    }

    while (this.processedContainmentKeys.size > IntegratedCanonicalGuardianRuntime.REPLAY_SUPPRESSION_MAX_ENTRIES) {
      const oldestKey = this.processedContainmentKeys.keys().next().value;
      if (!oldestKey) {
        break;
      }

      this.processedContainmentKeys.delete(oldestKey);
    }
  }

  private hasReplaySuppressionKey(key: string, nowMs: number): boolean {
    this.pruneReplaySuppressionKeys(nowMs);

    const expiresAtMs = this.processedContainmentKeys.get(key);
    if (!expiresAtMs) {
      return false;
    }

    if (expiresAtMs <= nowMs) {
      this.processedContainmentKeys.delete(key);
      return false;
    }

    return true;
  }

  private markReplaySuppressionKeyProcessed(key: string, nowMs: number): void {
    this.pruneReplaySuppressionKeys(nowMs);
    this.processedContainmentKeys.set(
      key,
      nowMs + IntegratedCanonicalGuardianRuntime.REPLAY_SUPPRESSION_TTL_MS,
    );
    this.pruneReplaySuppressionKeys(nowMs, true);
  }

  private readUnauthorizedBotDetectionMetadata(
    detectionResults: readonly DetectionResult[],
  ): { readonly unauthorizedBotDetected: boolean; readonly isAuthorizedBot: boolean } {
    const detectorResult = detectionResults.find(
      (result) => result.detectorId === 'unauthorized-bot-add-detector',
    );

    const metadata = detectorResult?.metadata && typeof detectorResult.metadata === 'object'
      ? (detectorResult.metadata as Record<string, unknown>)
      : undefined;
    const isAuthorizedBot = metadata?.isAuthorizedBot === true;

    return Object.freeze({
      unauthorizedBotDetected: detectorResult?.matched === true,
      isAuthorizedBot,
    });
  }

  private readUnauthorizedWebhookDetectionMetadata(
    detectionResults: readonly DetectionResult[],
  ): {
    readonly unauthorizedWebhookDetected: boolean;
    readonly isAuthorizedWebhook: boolean;
    readonly isAuthorizedIntegration: boolean;
  } {
    const detectorResult = detectionResults.find(
      (result) => result.detectorId === 'unauthorized-webhook-create-detector',
    );

    const metadata = detectorResult?.metadata && typeof detectorResult.metadata === 'object'
      ? (detectorResult.metadata as Record<string, unknown>)
      : undefined;

    return Object.freeze({
      unauthorizedWebhookDetected: detectorResult?.matched === true,
      isAuthorizedWebhook: metadata?.isAuthorizedWebhook === true,
      isAuthorizedIntegration: metadata?.isAuthorizedIntegration === true,
    });
  }

  private enrichDecisionMetadata(
    decision: SecurityDecisionModel,
    event: DiscordGatewayNormalizedEvent,
    actorId: string,
    botId: string | undefined,
    webhookId: string | undefined,
    memberUserId: string | undefined,
    roleId: string | undefined,
    roleContainmentPolicy: {
      readonly punishActor: boolean;
      readonly neutralizeTarget: boolean;
      readonly protectedRole: boolean;
    },
    webhookContainmentPolicy: {
      readonly punishActor: boolean;
    },
    isBotAdd: boolean,
    unauthorizedBotDetected: boolean,
    isAuthorizedBot: boolean,
    unauthorizedWebhookDetected: boolean,
    isAuthorizedWebhook: boolean,
    isAuthorizedIntegration: boolean,
  ) {
    const metadata =
      decision.metadata && typeof decision.metadata === 'object'
        ? (decision.metadata as Record<string, unknown>)
        : {};
    const trustedInviter = this.trustedInviterIds.includes(actorId);

    return Object.freeze({
      ...decision,
      metadata: Object.freeze({
        ...metadata,
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        actorId,
        botId,
        botUserId: botId,
        webhookId,
        memberUserId,
        roleId,
        eventName: event.eventName,
        isBotAdd,
        unauthorizedBotDetected,
        isAuthorizedBot,
        unauthorizedWebhookDetected,
        isAuthorizedWebhook,
        isAuthorizedIntegration,
        trustedInviter,
        rogueInviterPunishmentPlanned: isBotAdd && unauthorizedBotDetected && !trustedInviter,
        webhookContainmentRequired: unauthorizedWebhookDetected,
        webhookPolicyViolation: unauthorizedWebhookDetected,
        policyWebhookPunishActor: webhookContainmentPolicy.punishActor,
        policyPunishActor: roleContainmentPolicy.punishActor,
        policyNeutralizeTarget: roleContainmentPolicy.neutralizeTarget,
        protectedRole: roleContainmentPolicy.protectedRole,
        policy: Object.freeze({
          punishActor: roleContainmentPolicy.punishActor,
          neutralizeTarget: roleContainmentPolicy.neutralizeTarget,
          protectedRole: roleContainmentPolicy.protectedRole,
          webhookPunishActor: webhookContainmentPolicy.punishActor,
        }),
      }),
    });
  }

  private registerProductionDetectors(): void {
    this.detectorRegistry.register(new UnauthorizedBotAddDetector());
    this.detectorRegistry.register(new UnauthorizedWebhookCreateDetector());
    this.detectorRegistry.register(new DangerousRoleGrantDetectorPluginAdapter());
    this.detectorRegistry.register(
      new ScenarioContractDetectorPlugin(
        'duplicate-bot-identity-detector',
        '1.0.0',
        80,
        Object.freeze([PolicyActionType.BOT_ADD]),
        Object.freeze(['BOT_DUPLICATE_IDENTITY']),
        'Duplicate bot identity detected',
        DetectionSeverity.HIGH,
        EnterpriseOperationalScenario.DUPLICATE_BOT_IDENTITY,
      ),
    );
    this.detectorRegistry.register(
      new ScenarioContractDetectorPlugin(
        'webhook-modification-detector',
        '1.0.0',
        75,
        Object.freeze([PolicyActionType.WEBHOOK_DELETE]),
        Object.freeze(['WEBHOOK_UPDATE', 'WEBHOOK_MODIFICATION']),
        'Dangerous webhook modification detected',
        DetectionSeverity.HIGH,
        EnterpriseOperationalScenario.WEBHOOK_MODIFICATION,
      ),
    );
    this.detectorRegistry.register(
      new ScenarioContractDetectorPlugin(
        'privileged-permission-escalation-detector',
        '1.0.0',
        80,
        Object.freeze([PolicyActionType.ROLE_CREATE]),
        Object.freeze(['PRIVILEGED_PERMISSION_ESCALATION']),
        'Privileged permission escalation detected',
        DetectionSeverity.CRITICAL,
        EnterpriseOperationalScenario.PRIVILEGED_PERMISSION_ESCALATION,
      ),
    );
    this.detectorRegistry.register(
      new ScenarioContractDetectorPlugin(
        'channel-permission-drift-detector',
        '1.0.0',
        70,
        Object.freeze([PolicyActionType.CHANNEL_DELETE]),
        Object.freeze(['CHANNEL_PERMISSION_DRIFT']),
        'Channel permission drift detected',
        DetectionSeverity.HIGH,
        EnterpriseOperationalScenario.CHANNEL_PERMISSION_DRIFT,
      ),
    );
  }

  private resolveExecutionService(): DiscordExecutionService {
    if (!isProductionMode(this.mode)) {
      return new InMemoryDiscordExecutionService(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
        allowInMemoryExecution: true,
      });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN ?? '';
    const restClient = new ProductionDiscordRestClient();

    return new ProductionDiscordExecutionAdapter({
      httpClient: restClient,
      botToken,
      apiBaseUrl: process.env.DISCORD_API_BASE_URL ?? 'https://discord.com',
      apiVersion: 10,
    });
  }

  private resolvePolicyActionType(eventName: string): PolicyActionType {
    const scenarioContract = resolveEnterpriseScenarioContract(eventName, undefined);
    if (scenarioContract) {
      return scenarioContract.actionType;
    }

    switch (eventName) {
      case 'BOT_ADD':
      case 'GUILD_MEMBER_ADD':
        return PolicyActionType.BOT_ADD;
      case 'GUILD_MEMBER_UPDATE':
      case 'GUILD_ROLE_UPDATE':
      case 'MEMBER_ROLE_ADD':
        return PolicyActionType.ROLE_CREATE;
      case 'WEBHOOK_CREATE':
        return PolicyActionType.WEBHOOK_CREATE;
      case 'WEBHOOK_DELETE':
        return PolicyActionType.WEBHOOK_DELETE;
      case 'CHANNEL_DELETE':
        return PolicyActionType.CHANNEL_DELETE;
      default:
        return PolicyActionType.BOT_ADD;
    }
  }

  private readActorId(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
      return 'unknown-actor';
    }

    const record = payload as Record<string, unknown>;
    const candidates = ['actorId', 'actor_id', 'userId', 'user_id', 'executorId', 'executor_id', 'inviterId', 'inviter_id'];
    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return 'unknown-actor';
  }

  private async handleEvent(event: DiscordGatewayNormalizedEvent): Promise<void> {
    const scenarioContract = resolveEnterpriseScenarioContract(event.eventName, event.payload);
    let actionType = scenarioContract?.actionType ?? this.resolvePolicyActionType(event.eventName);

    if (scenarioContract && !scenarioContract.supportedByCanonicalDetectorPath) {
      this.logger.warn('Canonical Guardian scenario fail-closed', {
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        correlationId: event.correlationId,
        scenario: scenarioContract.scenario,
        eventName: event.eventName,
        actionType,
        failClosed: true,
        reason: scenarioContract.unsupportedReason ?? 'Unsupported enterprise scenario for canonical detector path',
      });
      return;
    }

    const actorId = this.readActorId(event.payload);
    const botId = this.readBotId(event.payload);
    const webhookId = this.readWebhookId(event.payload);
    const memberUserId = this.readMemberUserId(event.payload);
    const roleId = this.readRoleId(event.payload);
    const roleContainmentPolicy = this.readRoleContainmentPolicy(event.payload);
    const webhookContainmentPolicy = this.readWebhookContainmentPolicy(event.payload);
    const botAddEvent = this.isBotAddEvent(event.eventName, event.payload);

    if (event.eventName === 'GUILD_MEMBER_ADD' && !botAddEvent) {
      actionType = PolicyActionType.ROLE_CREATE;
    }

    if (actionType === PolicyActionType.BOT_ADD && botAddEvent && !botId) {
      this.logger.warn('Canonical Guardian scenario fail-closed', {
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        correlationId: event.correlationId,
        eventName: event.eventName,
        actionType,
        failClosed: true,
        reason: 'Bot add event missing bot identity',
      });
      return;
    }

    const nowMs = Date.now();
    const replaySuppressionKey = this.buildReplaySuppressionKey(
      event,
      actionType,
      actorId,
      botId,
      memberUserId,
      roleId,
      webhookId,
    );
    if (this.hasReplaySuppressionKey(replaySuppressionKey, nowMs)) {
      this.logger.warn('Canonical Guardian replay suppressed', {
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        correlationId: event.correlationId,
        eventName: event.eventName,
        actionType,
        replaySuppressionKey,
      });
      return;
    }

    const authorizedBotIds = this.resolveAuthorizedBotIds(event.payload);
    const trustedBotIds = this.resolveTrustedBotIds(event.payload);
    const authorizedWebhookIds = this.resolveAuthorizedWebhookIds(event.payload);
    const authorizedIntegrationIds = this.resolveAuthorizedIntegrationIds(event.payload);
    const detectionResults = await this.detectionEngine.evaluate(
      Object.freeze({
        normalizedEvent: event,
        actorId,
        guildId: this.guildId,
        actionType,
        correlationId: event.correlationId,
        timestamp: event.timestamp,
        metadata: Object.freeze({
          scenario: scenarioContract?.scenario,
          eventName: event.eventName,
          runtimeId: this.runtimeId,
          guildId: this.guildId,
          actorId,
          botId,
          botUserId: botId,
          authorizedBotIds,
          trustedBotIds,
          botAuthorization: Object.freeze({
            authorizedBotIds,
            trustedBotIds,
          }),
          authorizedWebhookIds,
          authorizedIntegrationIds,
          webhookAuthorization: Object.freeze({
            authorizedWebhookIds,
            authorizedIntegrationIds,
          }),
        }),
      }),
    );

    const inviteJoinDetection = await this.evaluateInviteDangerousRoleJoinDetection(event, actorId);
    const effectiveDetectionResults = inviteJoinDetection
      ? Object.freeze([...detectionResults, inviteJoinDetection])
      : detectionResults;

    this.logger.info('Canonical Guardian detector path evaluated', {
      runtimeId: this.runtimeId,
      guildId: this.guildId,
      correlationId: event.correlationId,
      scenario: scenarioContract?.scenario,
      eventName: event.eventName,
      actionType,
      actorId,
      botId,
      detectorCount: effectiveDetectionResults.length,
      matchedDetectorCount: effectiveDetectionResults.filter((result) => result.matched).length,
    });

    if (
      actionType === PolicyActionType.ROLE_CREATE &&
      !effectiveDetectionResults.some(
        (result) =>
          (result.detectorId === 'dangerous-role-grant-detector' ||
            result.detectorId === 'dangerous-role-invite-abuse-detector') &&
          result.matched,
      )
    ) {
      this.logger.info('Canonical Guardian dangerous role containment not required', {
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        correlationId: event.correlationId,
        eventName: event.eventName,
        actionType,
        actorId,
        memberUserId,
        roleId,
      });
      return;
    }

    if (
      actionType === PolicyActionType.WEBHOOK_CREATE &&
      !effectiveDetectionResults.some(
        (result) => result.detectorId === 'unauthorized-webhook-create-detector' && result.matched,
      )
    ) {
      this.logger.info('Canonical Guardian webhook containment not required', {
        runtimeId: this.runtimeId,
        guildId: this.guildId,
        correlationId: event.correlationId,
        eventName: event.eventName,
        actionType,
        actorId,
        webhookId,
      });
      return;
    }

    this.securityEvaluationPipeline.stageDetectionResults(effectiveDetectionResults);
    const decision = await this.securityEvaluationPipeline.evaluate(event, actorId, actionType);
    const botDetectionMetadata = this.readUnauthorizedBotDetectionMetadata(effectiveDetectionResults);
    const webhookDetectionMetadata = this.readUnauthorizedWebhookDetectionMetadata(effectiveDetectionResults);
    const effectiveRoleContainmentPolicy = this.mergeRoleContainmentPolicyFromDetections(
      roleContainmentPolicy,
      effectiveDetectionResults,
    );
    const enrichedDecision = this.enrichDecisionMetadata(
      decision,
      event,
      actorId,
      botId,
      webhookId,
      memberUserId,
      roleId,
      effectiveRoleContainmentPolicy,
      webhookContainmentPolicy,
      botAddEvent,
      botDetectionMetadata.unauthorizedBotDetected,
      botDetectionMetadata.isAuthorizedBot,
      webhookDetectionMetadata.unauthorizedWebhookDetected,
      webhookDetectionMetadata.isAuthorizedWebhook,
      webhookDetectionMetadata.isAuthorizedIntegration,
    );

    const actionPlan = this.actionPlanner.plan(enrichedDecision);
    const executionPlan = this.executionPlanner.plan(actionPlan, enrichedDecision);

    this.markReplaySuppressionKeyProcessed(replaySuppressionKey, nowMs);

    const containment = await this.executionOrchestrator.executeCoordinatedContainment(
      Object.freeze({
        executionPlan,
        metadata: Object.freeze({
          source: 'canonical-guardian-runtime',
          runtimeId: this.runtimeId,
          guildId: this.guildId,
        }),
      }),
      Object.freeze({
        discordExecutionService: this.executionService,
        botExecutor: new DiscordBotExecutor(this.executionService),
        memberExecutor: new DiscordMemberExecutor(this.executionService),
        roleExecutor: new DiscordRoleExecutor(this.executionService),
      }),
    );

    await this.handleRecovery(containment, event.correlationId);
  }

  private async handleRecovery(
    containment: CoordinatedContainmentExecutionResult,
    correlationId: string,
  ): Promise<void> {
    if (containment.failedActions.length === 0) {
      return;
    }

    await this.recoveryEngine.execute(
      Object.freeze({
        recoveryId: `recovery:${containment.executionPlanId}`,
        correlationId,
        transactionId: containment.executionPlanId,
        operationType: RecoveryOperationType.UNAUTHORIZED_BOT_REMOVAL_RECOVERY,
        guildId: this.guildId,
        initiatedBy: 'canonical-runtime',
        requestedAt: new Date().toISOString(),
        metadata: Object.freeze({
          failedActions: Object.freeze([...containment.failedActions]),
          runtimeId: this.runtimeId,
        }),
      }),
    );
  }
}
