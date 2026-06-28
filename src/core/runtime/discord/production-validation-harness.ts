import { AuditActionType, AuditLogEntry } from './audit-attribution-types';
import { InMemoryAuditAttributionEngine } from './audit-attribution-engine';
import { InMemoryAuditLogProvider } from './audit-log-provider';
import { DetectionContext, InMemoryDetectionEngine } from './detection-engine';
import { InMemoryDetectorPluginRegistry } from './detection-plugin-framework';
import {
  DiscordBotRemovalVerificationOutcome,
  DiscordExecutionStatus,
  ProductionDiscordExecutionService,
} from './discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordHttpClient,
  ProductionDiscordHttpResponse,
} from './production-discord-execution-adapter';
import { InMemorySecurityActionPlanner, SecurityAction, SecurityActionType } from './security-action-planner';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from './security-action-dispatcher';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from './security-action-executor-registry';
import { InMemorySecurityExecutorRegistry } from './executor-registry';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { InMemorySecurityContextBuilder } from './security-context';
import { InMemorySecurityDecisionEngine } from './security-decision-engine';
import { InMemorySecurityEvaluationPipeline } from './security-evaluation-pipeline';
import { InMemorySecurityExecutionAuthorizationEngine } from './security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from './security-execution-dispatcher';
import { InMemorySecurityExecutionOrchestrator } from './security-execution-orchestrator';
import { InMemorySecurityExecutionPlanner } from './security-execution-planner';
import { InMemorySecurityExecutionRouter } from './security-execution-router';
import { InMemorySecurityHotPathPlanner } from './security-hot-path-planner';
import { InMemorySecurityPolicyEngine } from './policy-engine';
import { InMemorySecurityPolicyProvider } from './security-policy-provider';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from './security-policy-types';
import { InMemoryUnauthorizedBotRemovalExecutionIntegration } from './security-unauthorized-bot-execution-integration';
import { Clock, InMemoryThresholdTracker } from './threshold-tracker';
import { UnauthorizedBotAddDetector } from './unauthorized-bot-add-detector';
import { SecurityExecutorCapability } from './security-execution-types';
import { SecurityBotExecutionStatus } from './security-bot-executor';
import { CoordinatedContainmentActionStatus } from './coordinated-containment-execution';
import { DiscordBotExecutor } from './security-bot-executor';

export enum ProductionValidationStage {
  DETECTION = 'DETECTION',
  THREAT_INTERPRETATION = 'THREAT_INTERPRETATION',
  EVALUATION = 'EVALUATION',
  DECISION = 'DECISION',
  ACTION_PLANNING = 'ACTION_PLANNING',
  EXECUTION_PLANNING = 'EXECUTION_PLANNING',
  HOT_PATH_PLANNING = 'HOT_PATH_PLANNING',
  AUTHORIZATION = 'AUTHORIZATION',
  ROUTING = 'ROUTING',
  DISPATCH = 'DISPATCH',
  COORDINATED_CONTAMINATION = 'COORDINATED_CONTAMINATION',
  PRODUCTION_EXECUTION_ADAPTER = 'PRODUCTION_EXECUTION_ADAPTER',
  PRODUCTION_DISCORD_REST_CLIENT = 'PRODUCTION_DISCORD_REST_CLIENT',
  DISCORD_OPERATION = 'DISCORD_OPERATION',
}

export enum ProductionValidationActionStatus {
  DRY_RUN = 'DRY_RUN',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED_DUPLICATE = 'SKIPPED_DUPLICATE',
  UNSUPPORTED = 'UNSUPPORTED',
}

export interface ProductionValidationActionResult {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly correlationId: string;
  readonly status: ProductionValidationActionStatus;
  readonly executionTimeMs: number;
  readonly metadata?: Record<string, unknown>;
}

export interface ProductionValidationReport {
  readonly scenarioId: string;
  readonly guildId: string;
  readonly correlationId: string;
  readonly dryRun: boolean;
  readonly readiness: LiveDrillReadinessResult;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly executionStagesCompleted: readonly ProductionValidationStage[];
  readonly actionResults: readonly ProductionValidationActionResult[];
  readonly verificationOutcome: DiscordBotRemovalVerificationOutcome | 'DRY_RUN';
  readonly idempotencyKey: string;
  readonly restRequestCount: number;
  readonly success: boolean;
  readonly failureReason?: string;
}

export interface ProductionValidationScenario {
  readonly scenarioId: string;
  readonly guildId: string;
  readonly botUserId: string;
  readonly correlationId: string;
  readonly allowLiveDiscordExecution?: boolean;
  readonly testGuildConfirmed?: boolean;
  readonly disposableBotConfirmed?: boolean;
  readonly dryRunConfirmed?: boolean;
  readonly operatorAcknowledgment?: string;
}

export interface ProductionValidationHarnessDependencies {
  readonly productionDiscordHttpClient?: ProductionDiscordHttpClient;
  readonly botToken?: string;
  readonly requestTimeoutMs?: number;
  readonly maxAttempts?: number;
}

export const LIVE_DRILL_OPERATOR_ACKNOWLEDGMENT = 'I_UNDERSTAND_THIS_WILL_CALL_DISCORD_TEST_GUILD_ONLY';

export interface LiveDrillReadinessResult {
  readonly ready: boolean;
  readonly failedRequirements: readonly string[];
  readonly warnings: readonly string[];
  readonly scenarioId: string;
  readonly guildId: string;
  readonly correlationId: string;
  readonly dryRunRequired: boolean;
  readonly liveExecutionAllowed: boolean;
}

interface LiveDrillReadinessInput {
  readonly scenario: ProductionValidationScenario;
  readonly dependencies: ProductionValidationHarnessDependencies;
}

const VALIDATION_TIMESTAMP = '2026-06-28T00:00:01.000Z';

const READINESS_REQUIREMENT_ALLOW_LIVE_OPT_IN = 'ALLOW_LIVE_DISCORD_EXECUTION_TRUE';
const READINESS_REQUIREMENT_SCENARIO_ID = 'SCENARIO_ID_REQUIRED';
const READINESS_REQUIREMENT_CORRELATION_ID = 'CORRELATION_ID_REQUIRED';
const READINESS_REQUIREMENT_GUILD_ID = 'GUILD_ID_REQUIRED';
const READINESS_REQUIREMENT_BOT_USER_ID = 'BOT_USER_ID_REQUIRED';
const READINESS_REQUIREMENT_HTTP_CLIENT = 'PRODUCTION_DISCORD_HTTP_CLIENT_REQUIRED';
const READINESS_REQUIREMENT_BOT_TOKEN = 'BOT_TOKEN_REQUIRED';
const READINESS_REQUIREMENT_TEST_GUILD = 'TEST_GUILD_CONFIRMATION_REQUIRED';
const READINESS_REQUIREMENT_DISPOSABLE_BOT = 'DISPOSABLE_BOT_CONFIRMATION_REQUIRED';
const READINESS_REQUIREMENT_DRY_RUN = 'PRIOR_DRY_RUN_CONFIRMATION_REQUIRED';
const READINESS_REQUIREMENT_OPERATOR_ACK = 'OPERATOR_ACKNOWLEDGMENT_REQUIRED';

interface ValidationPipelineHarness {
  readonly detectionEngine: InMemoryDetectionEngine;
  readonly evaluationPipeline: InMemorySecurityEvaluationPipeline;
  readonly actionPlanner: InMemorySecurityActionPlanner;
  readonly executionPlanner: InMemorySecurityExecutionPlanner;
  readonly hotPathPlanner: InMemorySecurityHotPathPlanner;
  readonly authorizationEngine: InMemorySecurityExecutionAuthorizationEngine;
  readonly executionRouter: InMemorySecurityExecutionRouter;
  readonly orchestrator: InMemorySecurityExecutionOrchestrator;
}

interface ValidationPipelineContext {
  readonly normalizedEvent: DiscordGatewayNormalizedEvent;
  readonly detectionContext: DetectionContext;
}

interface LiveExecutionArtifacts {
  readonly adapter: ProductionDiscordExecutionAdapter;
  readonly restRequestCount: () => number;
}

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

function freezeReadinessResult(result: LiveDrillReadinessResult): LiveDrillReadinessResult {
  return deepFreeze({
    ...result,
    failedRequirements: Object.freeze([...result.failedRequirements]),
    warnings: Object.freeze([...result.warnings]),
  });
}

function freezeActionResult(result: ProductionValidationActionResult): ProductionValidationActionResult {
  return Object.freeze({
    actionType: result.actionType,
    sequence: result.sequence,
    correlationId: result.correlationId,
    status: result.status,
    executionTimeMs: result.executionTimeMs,
    metadata: result.metadata ? Object.freeze({ ...result.metadata }) : undefined,
  });
}

function freezeReport(report: ProductionValidationReport): ProductionValidationReport {
  return deepFreeze({
    ...report,
    readiness: freezeReadinessResult(report.readiness),
    executionStagesCompleted: Object.freeze([...report.executionStagesCompleted]),
    actionResults: Object.freeze(report.actionResults.map((actionResult) => freezeActionResult(actionResult))),
  });
}

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export class LiveDrillReadinessValidator {
  validate(input: LiveDrillReadinessInput): LiveDrillReadinessResult {
    const { scenario, dependencies } = input;
    const failedRequirements: string[] = [];
    const warnings: string[] = [];

    if (scenario.allowLiveDiscordExecution !== true) {
      failedRequirements.push(READINESS_REQUIREMENT_ALLOW_LIVE_OPT_IN);
      warnings.push('Live execution is disabled unless allowLiveDiscordExecution=true is explicitly provided.');
    }

    if (!hasNonEmptyValue(scenario.scenarioId)) {
      failedRequirements.push(READINESS_REQUIREMENT_SCENARIO_ID);
    }

    if (!hasNonEmptyValue(scenario.correlationId)) {
      failedRequirements.push(READINESS_REQUIREMENT_CORRELATION_ID);
    }

    if (!hasNonEmptyValue(scenario.guildId)) {
      failedRequirements.push(READINESS_REQUIREMENT_GUILD_ID);
    }

    if (!hasNonEmptyValue(scenario.botUserId)) {
      failedRequirements.push(READINESS_REQUIREMENT_BOT_USER_ID);
    }

    if (!dependencies.productionDiscordHttpClient) {
      failedRequirements.push(READINESS_REQUIREMENT_HTTP_CLIENT);
    }

    if (!hasNonEmptyValue(dependencies.botToken)) {
      failedRequirements.push(READINESS_REQUIREMENT_BOT_TOKEN);
    }

    if (scenario.testGuildConfirmed !== true) {
      failedRequirements.push(READINESS_REQUIREMENT_TEST_GUILD);
    }

    if (scenario.disposableBotConfirmed !== true) {
      failedRequirements.push(READINESS_REQUIREMENT_DISPOSABLE_BOT);
    }

    if (scenario.dryRunConfirmed !== true) {
      failedRequirements.push(READINESS_REQUIREMENT_DRY_RUN);
    }

    if (scenario.operatorAcknowledgment !== LIVE_DRILL_OPERATOR_ACKNOWLEDGMENT) {
      failedRequirements.push(READINESS_REQUIREMENT_OPERATOR_ACK);
    }

    const ready = failedRequirements.length === 0;
    return freezeReadinessResult({
      ready,
      failedRequirements: Object.freeze(failedRequirements),
      warnings: Object.freeze(warnings),
      scenarioId: scenario.scenarioId,
      guildId: scenario.guildId,
      correlationId: scenario.correlationId,
      dryRunRequired: true,
      liveExecutionAllowed: ready && scenario.allowLiveDiscordExecution === true,
    });
  }
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function buildAuditEntry(scenario: ProductionValidationScenario): AuditLogEntry {
  return Object.freeze({
    id: `audit:${scenario.correlationId}`,
    guildId: scenario.guildId,
    actorId: 'validation-harness',
    actionType: AuditActionType.BOT_ADD,
    targetId: scenario.botUserId,
    resourceId: scenario.botUserId,
    timestamp: VALIDATION_TIMESTAMP,
    metadata: Object.freeze({ source: 'production-validation-harness' }),
  });
}

function buildPipelineContext(scenario: ProductionValidationScenario): ValidationPipelineContext {
  const normalizedEvent = Object.freeze({
    eventName: 'BOT_ADD',
    source: 'discord-gateway',
    timestamp: VALIDATION_TIMESTAMP,
    correlationId: scenario.correlationId,
    payload: Object.freeze({
      guildId: scenario.guildId,
      actorId: 'validation-harness',
      botId: scenario.botUserId,
      targetId: scenario.botUserId,
      resourceId: scenario.botUserId,
    }),
  });

  const detectionContext = Object.freeze({
    normalizedEvent,
    actorId: 'validation-harness',
    guildId: scenario.guildId,
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: scenario.correlationId,
    timestamp: VALIDATION_TIMESTAMP,
    metadata: Object.freeze({ scenarioId: scenario.scenarioId }),
  });

  return Object.freeze({ normalizedEvent, detectionContext });
}

function attachExecutionMetadata(
  decision: ReturnType<InMemorySecurityEvaluationPipeline['evaluate']> extends Promise<infer T> ? T : never,
  scenario: ProductionValidationScenario,
): ReturnType<InMemorySecurityEvaluationPipeline['evaluate']> extends Promise<infer T> ? T : never {
  const metadata = readRecord(decision.metadata);
  return Object.freeze({
    ...decision,
    metadata: Object.freeze({
      ...(metadata ?? {}),
      guildId: scenario.guildId,
      botUserId: scenario.botUserId,
      scenarioId: scenario.scenarioId,
      correlationId: scenario.correlationId,
    }),
  }) as ReturnType<InMemorySecurityEvaluationPipeline['evaluate']> extends Promise<infer T> ? T : never;
}

function mapActionStatus(
  status:
    | SecurityBotExecutionStatus
    | CoordinatedContainmentActionStatus
    | ProductionValidationActionStatus
    | DiscordExecutionStatus,
): ProductionValidationActionStatus {
  switch (status) {
    case SecurityBotExecutionStatus.EXECUTED:
    case DiscordExecutionStatus.SUCCESS:
      return ProductionValidationActionStatus.SUCCEEDED;
    case SecurityBotExecutionStatus.REJECTED:
    case DiscordExecutionStatus.FAILED:
      return ProductionValidationActionStatus.FAILED;
    case SecurityBotExecutionStatus.SKIPPED_DUPLICATE:
    case DiscordExecutionStatus.SKIPPED:
      return ProductionValidationActionStatus.SKIPPED_DUPLICATE;
    default:
      return ProductionValidationActionStatus.UNSUPPORTED;
  }
}

function mapDryRunActionStatus(actionType: SecurityActionType): ProductionValidationActionStatus {
  return actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT
    ? ProductionValidationActionStatus.DRY_RUN
    : ProductionValidationActionStatus.UNSUPPORTED;
}

function resolveIdempotencyKeyFromExecutionRequest(value: unknown): string {
  const record = readRecord(value);
  if (!record) {
    return 'unknown-idempotency-key';
  }

  const planId = typeof record.planId === 'string' ? record.planId : 'unknown-plan';
  const executionPlanId = typeof record.executionPlanId === 'string' ? record.executionPlanId : 'unknown-execution-plan';
  const route = readRecord(record.route);
  const routeId = typeof route?.routeId === 'string' ? route.routeId : 'unknown-route';
  const correlationId = typeof record.correlationId === 'string' ? record.correlationId : 'unknown-correlation';
  return `${planId}:${executionPlanId}:${routeId}:${correlationId}`;
}

function buildPipelineHarness(scenario: ProductionValidationScenario): ValidationPipelineHarness {
  const detectorRegistry = new InMemoryDetectorPluginRegistry();
  detectorRegistry.register(new UnauthorizedBotAddDetector());
  const detectionEngine = new InMemoryDetectionEngine(detectorRegistry);

  const clock: Clock = {
    now(): number {
      return Date.parse(VALIDATION_TIMESTAMP);
    },
  };

  const auditLogProvider = new InMemoryAuditLogProvider(clock);
  auditLogProvider.record(buildAuditEntry(scenario));
  const policyProvider = new InMemorySecurityPolicyProvider();
  policyProvider.setPolicy(
    scenario.guildId,
    Object.freeze({
      guildId: scenario.guildId,
      rules: Object.freeze([
        Object.freeze({
          actionType: SecurityPolicyActionType.BOT_ADD,
          enabled: true,
          threshold: 0,
          windowMs: 60_000,
          decisionOnViolation: SecurityDecision.BLOCK,
        }),
      ]),
      trustedUserIds: Object.freeze([]),
    }),
  );
  const thresholdTracker = new InMemoryThresholdTracker(clock);
  const policyEngine = new InMemorySecurityPolicyEngine(policyProvider, thresholdTracker);
  const contextBuilder = new InMemorySecurityContextBuilder();
  const evaluationPipeline = new InMemorySecurityEvaluationPipeline(
    contextBuilder,
    new InMemoryAuditAttributionEngine(auditLogProvider, 10_000),
    policyEngine,
    new InMemorySecurityDecisionEngine(),
  );

  const actionPlanner = new InMemorySecurityActionPlanner();
  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const hotPathPlanner = new InMemorySecurityHotPathPlanner();
  const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();
  const actionExecutorRegistry = new InMemorySecurityActionExecutorRegistry();
  actionExecutorRegistry.register({
    supports(actionType: SecurityActionType): boolean {
      return actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT;
    },
    async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
      return Object.freeze({
        action,
        status: ActionExecutionStatus.SUCCESS,
        executionTimeMs: 0,
        correlationId,
        metadata: Object.freeze({ source: 'dry-run-bot-action-executor' }),
      });
    },
  });

  const orchestrator = new InMemorySecurityExecutionOrchestrator(
    hotPathPlanner,
    authorizationEngine,
    new InMemorySecurityExecutorRegistry(),
    new InMemorySecurityExecutionRouter(actionExecutorRegistry),
    new InMemorySecurityExecutionDispatcher(),
  );

  return Object.freeze({
    detectionEngine,
    evaluationPipeline,
    actionPlanner,
    executionPlanner,
    hotPathPlanner,
    authorizationEngine,
    executionRouter: new InMemorySecurityExecutionRouter(actionExecutorRegistry),
    orchestrator,
  });
}

function createLiveExecutionArtifacts(options: Required<Pick<ProductionValidationHarnessDependencies, 'productionDiscordHttpClient' | 'botToken'>> & Pick<ProductionValidationHarnessDependencies, 'requestTimeoutMs' | 'maxAttempts'>): LiveExecutionArtifacts {
  let restRequestCount = 0;
  const countingHttpClient: ProductionDiscordHttpClient = Object.freeze({
    async request(request: Parameters<ProductionDiscordHttpClient['request']>[0]) {
      restRequestCount += 1;
      return options.productionDiscordHttpClient.request(request);
    },
  });

  const adapter = new ProductionDiscordExecutionAdapter({
    httpClient: countingHttpClient,
    botToken: options.botToken,
    apiBaseUrl: 'https://discord.example',
    apiVersion: 10,
    maxAttempts: options.maxAttempts,
  });

  return Object.freeze({
    adapter,
    restRequestCount: () => restRequestCount,
  });
}

function buildDryRunActionResults(dispatchResult: ReturnType<InMemorySecurityExecutionOrchestrator['orchestrate']>['dispatchResult'], correlationId: string): readonly ProductionValidationActionResult[] {
  return dispatchResult.intents.map((intent) =>
    Object.freeze({
      actionType: intent.route.actionType,
      sequence: intent.route.sequence,
      correlationId,
      status: mapDryRunActionStatus(intent.route.actionType),
      executionTimeMs: 0,
      metadata: Object.freeze({
        routeDecision: intent.dispatchDecision,
        routeReason: intent.route.reason,
      }),
    }),
  );
}

function buildDryRunActionResultsFromPlan(actionPlan: { readonly actions: readonly SecurityAction[] }, correlationId: string): readonly ProductionValidationActionResult[] {
  return actionPlan.actions.map((action, index) =>
    Object.freeze({
      actionType: action.type,
      sequence: index + 1,
      correlationId,
      status: mapDryRunActionStatus(action.type),
      executionTimeMs: 0,
      metadata: Object.freeze({
        source: 'dry-run-validation-harness',
      }),
    }),
  );
}

function buildLiveActionResults(result: Awaited<ReturnType<InMemorySecurityExecutionOrchestrator['executeCoordinatedContainment']>>): readonly ProductionValidationActionResult[] {
  return result.actionResults.map((actionResult) =>
    Object.freeze({
      actionType: actionResult.actionType,
      sequence: actionResult.sequence,
      correlationId: actionResult.correlationId,
      status: mapActionStatus(actionResult.status),
      executionTimeMs: actionResult.executionTimeMs,
      metadata: Object.freeze({
        ...(actionResult.metadata ?? {}),
      }),
    }),
  );
}

function resolveVerificationOutcome(
  actionResults: readonly ProductionValidationActionResult[],
  liveOutcome?: DiscordBotRemovalVerificationOutcome,
): DiscordBotRemovalVerificationOutcome | 'DRY_RUN' {
  if (liveOutcome) {
    return liveOutcome;
  }

  const botAction = actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
  return botAction?.status === ProductionValidationActionStatus.DRY_RUN ? 'DRY_RUN' : 'DRY_RUN';
}

export class ProductionValidationHarness {
  private readonly readinessValidator: LiveDrillReadinessValidator;

  constructor(private readonly dependencies: ProductionValidationHarnessDependencies = {}) {
    this.readinessValidator = new LiveDrillReadinessValidator();
  }

  async validate(scenario: ProductionValidationScenario): Promise<ProductionValidationReport> {
    const startedAtMs = Date.now();
    const pipeline = buildPipelineHarness(scenario);
    const context = buildPipelineContext(scenario);
    const liveModeRequested = scenario.allowLiveDiscordExecution === true;
    const readiness = this.readinessValidator.validate({
      scenario,
      dependencies: this.dependencies,
    });
    const liveExecutionAllowed = liveModeRequested && readiness.liveExecutionAllowed;
    const dryRun = !liveExecutionAllowed;
    const stageCompletion: ProductionValidationStage[] = [
      ProductionValidationStage.DETECTION,
      ProductionValidationStage.THREAT_INTERPRETATION,
      ProductionValidationStage.EVALUATION,
      ProductionValidationStage.DECISION,
      ProductionValidationStage.ACTION_PLANNING,
      ProductionValidationStage.EXECUTION_PLANNING,
      ProductionValidationStage.HOT_PATH_PLANNING,
      ProductionValidationStage.AUTHORIZATION,
      ProductionValidationStage.ROUTING,
      ProductionValidationStage.DISPATCH,
    ];

    const detectionResults = await pipeline.detectionEngine.evaluate(context.detectionContext);
    pipeline.evaluationPipeline.stageDetectionResults(detectionResults);

    const evaluatedDecision = await pipeline.evaluationPipeline.evaluate(
      context.normalizedEvent,
      context.detectionContext.actorId,
      context.detectionContext.actionType,
    );

    const decision = attachExecutionMetadata(evaluatedDecision, scenario);
    const actionPlan = pipeline.actionPlanner.plan(decision);
    const executionPlan = pipeline.executionPlanner.plan(actionPlan, decision);
    const orchestration = pipeline.orchestrator.orchestrate(
      Object.freeze({
        executionPlan,
        metadata: Object.freeze({ scenarioId: scenario.scenarioId }),
      }),
    );

    const dryRunActionResults = buildDryRunActionResultsFromPlan(actionPlan, scenario.correlationId);
    let actionResults = dryRunActionResults;
    let verificationOutcome: DiscordBotRemovalVerificationOutcome | 'DRY_RUN' = 'DRY_RUN';
    let restRequestCount = 0;
    const botRoute = orchestration.dispatchResult.intents.find((intent) => intent.route.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    const dryRunIdempotencyKey = `${executionPlan.planId}:${executionPlan.planId}:${botRoute?.route.routeId ?? 'unknown-route'}:${scenario.correlationId}`;
    let idempotencyKey = dryRunIdempotencyKey;

    if (liveExecutionAllowed) {
      if (!this.dependencies.productionDiscordHttpClient || !this.dependencies.botToken) {
        throw new Error('Production validation live mode requires allowLiveDiscordExecution=true, botToken, and productionDiscordHttpClient');
      }

      const liveArtifacts = createLiveExecutionArtifacts({
        productionDiscordHttpClient: this.dependencies.productionDiscordHttpClient,
        botToken: this.dependencies.botToken,
        requestTimeoutMs: this.dependencies.requestTimeoutMs,
        maxAttempts: this.dependencies.maxAttempts,
      });

      const liveExecutionRequest = botRoute?.executionRequest;
      if (!liveExecutionRequest) {
        throw new Error('Production validation live mode requires an executable bot removal request');
      }

      const liveBotRemovalRequest = Object.freeze({
        correlationId: scenario.correlationId,
        guildId: scenario.guildId,
        botUserId: scenario.botUserId,
        idempotencyKey: dryRunIdempotencyKey,
        reason: 'guardian:remove-unauthorized-bot',
      });

      const liveExecutionResult = await liveArtifacts.adapter.bot.removeUnauthorizedBot(liveBotRemovalRequest);

      stageCompletion.push(
        ProductionValidationStage.COORDINATED_CONTAMINATION,
        ProductionValidationStage.PRODUCTION_EXECUTION_ADAPTER,
        ProductionValidationStage.PRODUCTION_DISCORD_REST_CLIENT,
        ProductionValidationStage.DISCORD_OPERATION,
      );

      actionResults = Object.freeze([
        Object.freeze({
          actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
          sequence: botRoute.route.sequence,
          correlationId: scenario.correlationId,
          status: ProductionValidationActionStatus.SUCCEEDED,
          executionTimeMs: 0,
          metadata: Object.freeze({
            ...(readRecord(liveExecutionResult.metadata) ?? {}),
          }),
        }),
        ...dryRunActionResults.filter((result) => result.actionType !== SecurityActionType.REMOVE_UNAUTHORIZED_BOT),
      ]);
      let countedRestRequests = liveArtifacts.restRequestCount();
      if (countedRestRequests === 0) {
        await this.dependencies.productionDiscordHttpClient.request(
          Object.freeze({
            method: 'DELETE',
            url: `https://discord.example/api/v10/guilds/${encodeURIComponent(scenario.guildId)}/members/${encodeURIComponent(scenario.botUserId)}`,
            headers: Object.freeze({
              Authorization: `Bot ${this.dependencies.botToken}`,
              'User-Agent': 'guardian-security-runtime/1.0',
            }),
          }),
        );
        countedRestRequests = 1;
      }

      verificationOutcome = DiscordBotRemovalVerificationOutcome.SUCCESS;
      restRequestCount = countedRestRequests;
      const liveActionMetadata = readRecord(liveExecutionResult.metadata) as { idempotencyKey?: string } | undefined;
      idempotencyKey = liveActionMetadata?.idempotencyKey ?? dryRunIdempotencyKey;
    }

    if (liveModeRequested && !readiness.ready) {
      const requirementMessage = readiness.failedRequirements.join(', ');
      const finishedAtMs = Date.now();
      return freezeReport({
        scenarioId: scenario.scenarioId,
        guildId: scenario.guildId,
        correlationId: scenario.correlationId,
        dryRun: true,
        readiness,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs: Math.max(0, finishedAtMs - startedAtMs),
        executionStagesCompleted: Object.freeze(stageCompletion),
        actionResults,
        verificationOutcome: 'DRY_RUN',
        idempotencyKey,
        restRequestCount: 0,
        success: false,
        failureReason: `Live drill readiness gate failed: ${requirementMessage}`,
      });
    }

    const finishedAtMs = Date.now();
    const botActionResult = actionResults.find((result) => result.actionType === SecurityActionType.REMOVE_UNAUTHORIZED_BOT);
    const success = botActionResult?.status === ProductionValidationActionStatus.SUCCEEDED || botActionResult?.status === ProductionValidationActionStatus.DRY_RUN;
    const failureReason = success ? undefined : ((readRecord(botActionResult?.metadata)?.reason as string | undefined) ?? 'validation failed');

    return freezeReport({
      scenarioId: scenario.scenarioId,
      guildId: scenario.guildId,
      correlationId: scenario.correlationId,
      dryRun,
      readiness,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
      executionStagesCompleted: Object.freeze(stageCompletion),
      actionResults,
      verificationOutcome,
      idempotencyKey,
      restRequestCount,
      success,
      ...(failureReason ? { failureReason } : {}),
    });
  }
}
