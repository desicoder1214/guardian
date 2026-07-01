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
} from './discord/security-action-planner';
import {
  InMemorySecurityExecutionPlanner,
} from './discord/security-execution-planner';
import {
  InMemorySecurityExecutionOrchestrator,
} from './discord/security-execution-orchestrator';
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
  private readonly executionOrchestrator = new InMemorySecurityExecutionOrchestrator();
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

    this.configureDefaultPolicy();
    this.registerProductionDetectors();
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
    const actionType = this.resolvePolicyActionType(event.eventName);
    const actorId = this.readActorId(event.payload);
    const detectionResults = await this.detectionEngine.evaluate(
      Object.freeze({
        normalizedEvent: event,
        actorId,
        guildId: this.guildId,
        actionType,
        correlationId: event.correlationId,
        timestamp: event.timestamp,
      }),
    );

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
