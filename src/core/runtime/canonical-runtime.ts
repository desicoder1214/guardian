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
import { DiscordRoleExecutor } from './discord/security-role-executor';
import {
  InMemorySecurityDecisionEngine,
} from './discord/security-decision-engine';
import {
  InMemoryRecoveryEngine,
  RecoveryOperationType,
} from './recovery/recovery-engine';
import { DiscordGatewayNormalizedEvent } from './discord/pipeline-types';

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
          actionType: PolicyActionType.WEBHOOK_DELETE,
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
        actionType: PolicyActionType.WEBHOOK_DELETE,
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
            threshold: 0,
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
            actionType: PolicyActionType.WEBHOOK_DELETE,
            enabled: true,
            threshold: 0,
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
        trustedUserIds: Object.freeze([]),
      }),
    );
  }

  private registerProductionDetectors(): void {
    this.detectorRegistry.register(new UnauthorizedBotAddDetector());
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
        'dangerous-webhook-creation-detector',
        '1.0.0',
        80,
        Object.freeze([PolicyActionType.WEBHOOK_DELETE]),
        Object.freeze(['WEBHOOK_CREATE']),
        'Dangerous webhook creation detected',
        DetectionSeverity.CRITICAL,
        EnterpriseOperationalScenario.DANGEROUS_WEBHOOK_CREATION,
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
    const candidates = ['actorId', 'actor_id', 'userId', 'user_id', 'executorId', 'executor_id'];
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
    const actionType = scenarioContract?.actionType ?? this.resolvePolicyActionType(event.eventName);

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
        }),
      }),
    );

    this.logger.info('Canonical Guardian detector path evaluated', {
      runtimeId: this.runtimeId,
      guildId: this.guildId,
      correlationId: event.correlationId,
      scenario: scenarioContract?.scenario,
      eventName: event.eventName,
      actionType,
      detectorCount: detectionResults.length,
      matchedDetectorCount: detectionResults.filter((result) => result.matched).length,
    });

    this.securityEvaluationPipeline.stageDetectionResults(detectionResults);
    const decision = await this.securityEvaluationPipeline.evaluate(event, actorId, actionType);
    const actionPlan = this.actionPlanner.plan(decision);
    const executionPlan = this.executionPlanner.plan(actionPlan, decision);

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
