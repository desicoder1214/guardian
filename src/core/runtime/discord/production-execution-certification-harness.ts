import { AuditAttributionConfidence } from './audit-attribution-types';
import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionSeverity,
} from './detection-engine';
import {
  DiscordExecutionResult,
  DiscordExecutionService,
  DiscordExecutionStatus,
} from './discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordExecutionAdapterOptions,
  ProductionDiscordHttpClient,
} from './production-discord-execution-adapter';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from './security-action-dispatcher';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from './security-action-executor-registry';
import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPriority,
  SecurityActionType,
} from './security-action-planner';
import {
  SecurityDecisionModel,
  SecurityDecisionReason,
} from './security-decision-types';
import { InMemorySecurityExecutionAuthorizationEngine } from './security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from './security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from './security-execution-planner';
import { InMemorySecurityExecutionRouter } from './security-execution-router';
import {
  SecurityDomainExecutionRequest,
  SecurityExecutionRouteDecision,
  SecurityExecutorCapability,
} from './security-execution-types';
import { InMemorySecurityHotPathPlanner } from './security-hot-path-planner';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from './security-policy-types';

export enum ProductionExecutionCertificationScenarioType {
  UNAUTHORIZED_BOT_ADDITION = 'UNAUTHORIZED_BOT_ADDITION',
  DANGEROUS_WEBHOOK = 'DANGEROUS_WEBHOOK',
  DANGEROUS_ROLE_GRANT = 'DANGEROUS_ROLE_GRANT',
  CHANNEL_PERMISSION_DRIFT = 'CHANNEL_PERMISSION_DRIFT',
  RECOVERY_RESTORATION = 'RECOVERY_RESTORATION',
}

export enum ProductionExecutionCertificationOutcome {
  CERTIFIED = 'CERTIFIED',
  FAILED = 'FAILED',
}

export interface ProductionExecutionCertificationScenario {
  readonly scenarioId: string;
  readonly scenarioType: ProductionExecutionCertificationScenarioType;
  readonly actionType: SecurityActionType;
  readonly expectedCapability: SecurityExecutorCapability;
  readonly expectedAdapterBinding:
    | 'bot.removeUnauthorizedBot'
    | 'webhook.deleteWebhook'
    | 'role.removeDangerousRole'
    | 'channel.lockChannel'
    | 'channel.restoreChannel';
  readonly targetId: string;
  readonly metadata: {
    readonly botUserId?: string;
    readonly webhookId?: string;
    readonly memberUserId?: string;
    readonly roleId?: string;
    readonly channelId?: string;
    readonly overwriteId?: string;
  };
}

export interface ProductionExecutionCertificationRequest {
  readonly certificationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly botToken: string;
  readonly productionDiscordHttpClient: ProductionDiscordHttpClient;
  readonly scenarioMatrix?: readonly ProductionExecutionCertificationScenario[];
  readonly adapterOptions?: Omit<ProductionDiscordExecutionAdapterOptions, 'httpClient' | 'botToken'>;
  readonly metadata?: Record<string, unknown>;
}

export interface ProductionExecutionCertificationScenarioReport {
  readonly scenarioId: string;
  readonly scenarioType: ProductionExecutionCertificationScenarioType;
  readonly actionType: SecurityActionType;
  readonly routeId: string;
  readonly executionPlanId: string;
  readonly adapterSelected: string;
  readonly status: 'PASSED' | 'FAILED';
  readonly failureReason?: string;
}

export interface ProductionExecutionCertificationReport {
  readonly certificationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly routesExercised: readonly string[];
  readonly adaptersSelected: readonly string[];
  readonly metadataVerification: {
    readonly preserved: boolean;
    readonly checkedFields: readonly string[];
  };
  readonly failClosedVerification: {
    readonly unsupportedRouteFailsClosed: boolean;
    readonly authorizationGatesEnforced: boolean;
  };
  readonly noLiveDiscordRestOrGatewayOperations: true;
  readonly scenarioReports: readonly ProductionExecutionCertificationScenarioReport[];
  readonly outcome: ProductionExecutionCertificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-production-execution-certification-harness';
    readonly deterministicCertificationId: true;
    readonly failClosed: true;
  };
}

const REQUIRED_METADATA_FIELDS = Object.freeze([
  'correlationId',
  'transactionId',
  'runtimeId',
  'executionPlanId',
  'routeId',
  'guildId',
  'targetId',
  'actionType',
]);

const DEFAULT_SCENARIO_MATRIX: readonly ProductionExecutionCertificationScenario[] = Object.freeze([
  Object.freeze({
    scenarioId: 'scenario-unauthorized-bot-addition',
    scenarioType: ProductionExecutionCertificationScenarioType.UNAUTHORIZED_BOT_ADDITION,
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    expectedCapability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
    expectedAdapterBinding: 'bot.removeUnauthorizedBot',
    targetId: 'bot-cert-1',
    metadata: Object.freeze({ botUserId: 'bot-cert-1' }),
  }),
  Object.freeze({
    scenarioId: 'scenario-dangerous-webhook',
    scenarioType: ProductionExecutionCertificationScenarioType.DANGEROUS_WEBHOOK,
    actionType: SecurityActionType.FREEZE_WEBHOOKS,
    expectedCapability: SecurityExecutorCapability.FREEZE_WEBHOOKS,
    expectedAdapterBinding: 'webhook.deleteWebhook',
    targetId: 'webhook-cert-1',
    metadata: Object.freeze({ webhookId: 'webhook-cert-1' }),
  }),
  Object.freeze({
    scenarioId: 'scenario-dangerous-role-grant',
    scenarioType: ProductionExecutionCertificationScenarioType.DANGEROUS_ROLE_GRANT,
    actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
    expectedCapability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
    expectedAdapterBinding: 'role.removeDangerousRole',
    targetId: 'role-cert-1',
    metadata: Object.freeze({ memberUserId: 'member-cert-1', roleId: 'role-cert-1' }),
  }),
  Object.freeze({
    scenarioId: 'scenario-channel-permission-drift',
    scenarioType: ProductionExecutionCertificationScenarioType.CHANNEL_PERMISSION_DRIFT,
    actionType: SecurityActionType.LOCK_CHANNELS,
    expectedCapability: SecurityExecutorCapability.LOCK_CHANNELS,
    expectedAdapterBinding: 'channel.lockChannel',
    targetId: 'channel-cert-1',
    metadata: Object.freeze({ channelId: 'channel-cert-1' }),
  }),
  Object.freeze({
    scenarioId: 'scenario-recovery-restoration',
    scenarioType: ProductionExecutionCertificationScenarioType.RECOVERY_RESTORATION,
    actionType: SecurityActionType.RESTORE_RESOURCE,
    expectedCapability: SecurityExecutorCapability.RESTORE_RESOURCE,
    expectedAdapterBinding: 'channel.restoreChannel',
    targetId: 'overwrite-cert-1',
    metadata: Object.freeze({ channelId: 'channel-cert-1', overwriteId: 'overwrite-cert-1' }),
  }),
]);

class StubRouteExecutor implements SecurityActionExecutor {
  constructor(private readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'production-execution-certification-harness' }),
    });
  }
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

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function freezeRequest(request: ProductionExecutionCertificationRequest): ProductionExecutionCertificationRequest {
  return deepFreeze({
    ...request,
    scenarioMatrix: Object.freeze([...(request.scenarioMatrix ?? DEFAULT_SCENARIO_MATRIX)]),
    adapterOptions: request.adapterOptions ? Object.freeze({ ...request.adapterOptions }) : undefined,
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(report: ProductionExecutionCertificationReport): ProductionExecutionCertificationReport {
  return deepFreeze({
    ...report,
    routesExercised: Object.freeze([...report.routesExercised]),
    adaptersSelected: Object.freeze([...report.adaptersSelected]),
    metadataVerification: Object.freeze({
      ...report.metadataVerification,
      checkedFields: Object.freeze([...report.metadataVerification.checkedFields]),
    }),
    failClosedVerification: Object.freeze({ ...report.failClosedVerification }),
    scenarioReports: Object.freeze(report.scenarioReports.map((entry) => Object.freeze({ ...entry }))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicCertificationId(request: ProductionExecutionCertificationRequest): string {
  const scenarioSignature = (request.scenarioMatrix ?? DEFAULT_SCENARIO_MATRIX)
    .map((scenario) => `${scenario.scenarioId}:${scenario.actionType}:${scenario.targetId}`)
    .join('|');

  return [
    'production-execution-certification-harness',
    request.correlationId,
    request.transactionId,
    request.runtimeId,
    request.guildId,
    scenarioSignature,
  ].join(':');
}

function buildDecisionModel(
  request: ProductionExecutionCertificationRequest,
  scenario: ProductionExecutionCertificationScenario,
): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_BLOCK,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'production-certification-harness',
    guildId: request.guildId,
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: request.correlationId,
    auditLogCorrelationId: `audit:${scenario.scenarioId}`,
    metadata: Object.freeze({
      scenarioId: scenario.scenarioId,
      scenarioType: scenario.scenarioType,
      targetId: scenario.targetId,
      actionType: scenario.actionType,
      guildId: request.guildId,
      transactionId: request.transactionId,
      runtimeId: request.runtimeId,
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: `certification:${scenario.scenarioType}`,
        correlationIds: Object.freeze([request.correlationId]),
        overrides: Object.freeze([]),
      }),
    }),
  });
}

function buildActionPlan(
  request: ProductionExecutionCertificationRequest,
  scenario: ProductionExecutionCertificationScenario,
): SecurityActionPlan {
  const action = Object.freeze({
    type: scenario.actionType,
    priority: SecurityActionPriority.CRITICAL,
    sequence: 1,
  });

  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    correlationId: request.correlationId,
    actions: Object.freeze([action]),
    metadata: Object.freeze({
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: `certification:${scenario.scenarioType}`,
        correlationIds: Object.freeze([request.correlationId]),
        overrides: Object.freeze([]),
      }),
    }),
  });
}

function resolveIdempotencyKey(executionRequest: SecurityDomainExecutionRequest): string {
  return `${executionRequest.planId}:${executionRequest.executionPlanId}:${executionRequest.route.routeId}:${executionRequest.correlationId}`;
}

function buildRouteRegistry(actionType: SecurityActionType): InMemorySecurityActionExecutorRegistry {
  const registry = new InMemorySecurityActionExecutorRegistry();
  registry.register(new StubRouteExecutor(actionType));
  return registry;
}

async function executeForCapability(
  adapter: DiscordExecutionService,
  capability: SecurityExecutorCapability,
  scenario: ProductionExecutionCertificationScenario,
  request: ProductionExecutionCertificationRequest,
  executionRequest: SecurityDomainExecutionRequest,
): Promise<{ readonly adapterSelected: string; readonly result: DiscordExecutionResult }> {
  const idempotencyKey = resolveIdempotencyKey(executionRequest);
  const securityDecision = Object.freeze({
    decision: SecurityDecision.BLOCK,
    metadata: Object.freeze({
      transactionId: request.transactionId,
      runtimeId: request.runtimeId,
      guildId: request.guildId,
      targetId: scenario.targetId,
      actionType: scenario.actionType,
    }),
  });
  const metadata = Object.freeze({
    planId: executionRequest.planId,
    executionPlanId: executionRequest.executionPlanId,
    routeId: executionRequest.route.routeId,
    threatAssessment:
      executionRequest.metadata?.threatAssessment ??
      Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
      }),
    securityDecision,
    authorizationMetadata:
      executionRequest.metadata?.authorizationMetadata ??
      Object.freeze({
        decision: 'AUTHORIZED',
        source: 'production-execution-certification-harness',
      }),
  });

  switch (capability) {
    case SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT:
      return Object.freeze({
        adapterSelected: 'bot.removeUnauthorizedBot',
        result: await adapter.bot.removeUnauthorizedBot(
          Object.freeze({
            correlationId: request.correlationId,
            guildId: request.guildId,
            botUserId: scenario.metadata.botUserId ?? scenario.targetId,
            idempotencyKey,
            reason: 'guardian:certification-remove-unauthorized-bot',
            metadata,
          }),
        ),
      });
    case SecurityExecutorCapability.FREEZE_WEBHOOKS:
      return Object.freeze({
        adapterSelected: 'webhook.deleteWebhook',
        result: await adapter.webhook.deleteWebhook(
          Object.freeze({
            correlationId: request.correlationId,
            guildId: request.guildId,
            webhookId: scenario.metadata.webhookId ?? scenario.targetId,
            idempotencyKey,
            reason: 'guardian:certification-freeze-webhook',
            metadata,
          }),
        ),
      });
    case SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE:
      return Object.freeze({
        adapterSelected: 'role.removeDangerousRole',
        result: await adapter.role.removeDangerousRole(
          Object.freeze({
            correlationId: request.correlationId,
            guildId: request.guildId,
            memberUserId:
              scenario.metadata.memberUserId ?? `member:${scenario.targetId}`,
            roleId: scenario.metadata.roleId ?? scenario.targetId,
            idempotencyKey,
            reason: 'guardian:certification-remove-dangerous-role',
            metadata,
          }),
        ),
      });
    case SecurityExecutorCapability.LOCK_CHANNELS:
      return Object.freeze({
        adapterSelected: 'channel.lockChannel',
        result: await adapter.channel.lockChannel(
          Object.freeze({
            correlationId: request.correlationId,
            guildId: request.guildId,
            channelId: scenario.metadata.channelId ?? scenario.targetId,
            lockPermissions: true,
            idempotencyKey,
            reason: 'guardian:certification-lock-channel',
            metadata,
          }),
        ),
      });
    case SecurityExecutorCapability.RESTORE_RESOURCE:
      return Object.freeze({
        adapterSelected: 'channel.restoreChannel',
        result: await adapter.channel.restoreChannel(
          Object.freeze({
            correlationId: request.correlationId,
            guildId: request.guildId,
            channelId:
              scenario.metadata.channelId ?? `channel:${scenario.targetId}`,
            overwriteId: scenario.metadata.overwriteId ?? scenario.targetId,
            idempotencyKey,
            reason: 'guardian:certification-restore-resource',
            metadata,
          }),
        ),
      });
    default:
      return Object.freeze({
        adapterSelected: 'unsupported',
        result: Object.freeze({
          status: DiscordExecutionStatus.NOT_SUPPORTED,
          executionTimeMs: 0,
          correlationId: request.correlationId,
          metadata: Object.freeze({ reason: 'unsupported-capability' }),
        }),
      });
  }
}

function verifyMetadataContinuity(
  request: ProductionExecutionCertificationRequest,
  scenario: ProductionExecutionCertificationScenario,
  executionPlanId: string,
  routeId: string,
  executionMetadata: unknown,
): boolean {
  const metadata = readRecord(executionMetadata);
  const securityDecision = readRecord(metadata?.securityDecision);
  const securityDecisionMetadata = readRecord(securityDecision?.metadata);

  if (!metadata || !securityDecisionMetadata) {
    return false;
  }

  return (
    metadata.executionPlanId === executionPlanId &&
    metadata.routeId === routeId &&
    securityDecisionMetadata.transactionId === request.transactionId &&
    securityDecisionMetadata.runtimeId === request.runtimeId &&
    securityDecisionMetadata.guildId === request.guildId &&
    securityDecisionMetadata.targetId === scenario.targetId &&
    securityDecisionMetadata.actionType === scenario.actionType
  );
}

function buildScenarioFailure(
  scenario: ProductionExecutionCertificationScenario,
  executionPlanId: string,
  routeId: string,
  failureReason: string,
): ProductionExecutionCertificationScenarioReport {
  return Object.freeze({
    scenarioId: scenario.scenarioId,
    scenarioType: scenario.scenarioType,
    actionType: scenario.actionType,
    routeId,
    executionPlanId,
    adapterSelected: 'none',
    status: 'FAILED',
    failureReason,
  });
}

function buildReport(
  request: ProductionExecutionCertificationRequest,
  certificationId: string,
  scenarioReports: readonly ProductionExecutionCertificationScenarioReport[],
  routesExercised: readonly string[],
  adaptersSelected: readonly string[],
  metadataPreserved: boolean,
  unsupportedRouteFailsClosed: boolean,
  authorizationGatesEnforced: boolean,
  startedAtMs: number,
  failureReason?: string,
): ProductionExecutionCertificationReport {
  const success = !failureReason;
  return freezeReport({
    certificationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    runtimeId: request.runtimeId,
    guildId: request.guildId,
    routesExercised,
    adaptersSelected,
    metadataVerification: Object.freeze({
      preserved: metadataPreserved,
      checkedFields: REQUIRED_METADATA_FIELDS,
    }),
    failClosedVerification: Object.freeze({
      unsupportedRouteFailsClosed,
      authorizationGatesEnforced,
    }),
    noLiveDiscordRestOrGatewayOperations: true,
    scenarioReports,
    outcome: success
      ? ProductionExecutionCertificationOutcome.CERTIFIED
      : ProductionExecutionCertificationOutcome.FAILED,
    success,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-production-execution-certification-harness' as const,
      deterministicCertificationId: true as const,
      failClosed: true as const,
    }),
  });
}

export class InMemoryProductionExecutionCertificationHarness {
  private readonly completedReports = new Map<string, ProductionExecutionCertificationReport>();

  async certify(
    request: ProductionExecutionCertificationRequest,
  ): Promise<ProductionExecutionCertificationReport> {
    const frozenRequest = freezeRequest(request);
    const certificationId =
      frozenRequest.certificationId ?? toDeterministicCertificationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(certificationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const adapter = new ProductionDiscordExecutionAdapter({
      httpClient: frozenRequest.productionDiscordHttpClient,
      botToken: frozenRequest.botToken,
      ...(frozenRequest.adapterOptions ?? {}),
    });

    const executionPlanner = new InMemorySecurityExecutionPlanner();
    const hotPathPlanner = new InMemorySecurityHotPathPlanner();
    const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();

    const scenarioReports: ProductionExecutionCertificationScenarioReport[] = [];
    const routesExercised: string[] = [];
    const adaptersSelected: string[] = [];
    let metadataPreserved = true;

    for (const scenario of frozenRequest.scenarioMatrix ?? DEFAULT_SCENARIO_MATRIX) {
      if (!scenario.targetId) {
        scenarioReports.push(
          buildScenarioFailure(
            scenario,
            'unknown-plan',
            'unknown-route',
            'missing-target-id',
          ),
        );
        metadataPreserved = false;
        continue;
      }

      const decisionModel = buildDecisionModel(frozenRequest, scenario);
      const actionPlan = buildActionPlan(frozenRequest, scenario);
      const executionPlan = executionPlanner.plan(actionPlan, decisionModel);
      const hotPathPlan = hotPathPlanner.plan(executionPlan);
      const authorizationResult = authorizationEngine.authorize(
        Object.freeze({ executionPlan }),
      );

      const router = new InMemorySecurityExecutionRouter(
        buildRouteRegistry(scenario.actionType),
      );
      const routingResult = router.route(
        Object.freeze({
          hotPathPlan,
          authorizationResult,
        }),
      );
      const dispatchResult = new InMemorySecurityExecutionDispatcher().dispatch(routingResult);

      const intent = dispatchResult.intents.find(
        (entry) =>
          entry.route.actionType === scenario.actionType &&
          entry.dispatchDecision === SecurityExecutionRouteDecision.EXECUTABLE &&
          entry.executionRequest !== undefined &&
          entry.targetedCapability === scenario.expectedCapability,
      );

      if (!intent || !intent.executionRequest || !intent.targetedCapability) {
        scenarioReports.push(
          buildScenarioFailure(
            scenario,
            executionPlan.planId,
            `missing-route:${scenario.actionType}`,
            'missing-executable-route-or-capability',
          ),
        );
        metadataPreserved = false;
        continue;
      }

      if (
        intent.executionRequest.correlationId !== frozenRequest.correlationId ||
        intent.executionRequest.executionPlanId !== executionPlan.planId
      ) {
        scenarioReports.push(
          buildScenarioFailure(
            scenario,
            executionPlan.planId,
            intent.route.routeId,
            'execution-request-identity-mismatch',
          ),
        );
        metadataPreserved = false;
        continue;
      }

      const executed = await executeForCapability(
        adapter,
        intent.targetedCapability,
        scenario,
        frozenRequest,
        intent.executionRequest,
      );

      if (executed.adapterSelected !== scenario.expectedAdapterBinding) {
        scenarioReports.push(
          buildScenarioFailure(
            scenario,
            executionPlan.planId,
            intent.route.routeId,
            `unexpected-adapter-selection:${executed.adapterSelected}`,
          ),
        );
        metadataPreserved = false;
        continue;
      }

      if (executed.result.status !== DiscordExecutionStatus.SUCCESS) {
        scenarioReports.push(
          buildScenarioFailure(
            scenario,
            executionPlan.planId,
            intent.route.routeId,
            `adapter-execution-failed:${executed.result.status}`,
          ),
        );
        metadataPreserved = false;
        continue;
      }

      const executionMetadata =
        (readRecord(executed.result.metadata)?.metadata as unknown) ??
        readRecord(executed.result.metadata);
      const metadataContinuity = verifyMetadataContinuity(
        frozenRequest,
        scenario,
        executionPlan.planId,
        intent.route.routeId,
        executionMetadata,
      );
      metadataPreserved = metadataPreserved && metadataContinuity;

      scenarioReports.push(
        Object.freeze({
          scenarioId: scenario.scenarioId,
          scenarioType: scenario.scenarioType,
          actionType: scenario.actionType,
          routeId: intent.route.routeId,
          executionPlanId: executionPlan.planId,
          adapterSelected: executed.adapterSelected,
          status: metadataContinuity ? 'PASSED' : 'FAILED',
          failureReason: metadataContinuity ? undefined : 'metadata-continuity-failed',
        }),
      );

      routesExercised.push(intent.route.routeId);
      adaptersSelected.push(executed.adapterSelected);
    }

    const authorizationProbeScenario = Object.freeze({
      scenarioId: 'probe-authorization-gate',
      scenarioType: ProductionExecutionCertificationScenarioType.UNAUTHORIZED_BOT_ADDITION,
      actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
      targetId: 'probe-target',
    });
    const authorizationDecision = buildDecisionModel(
      frozenRequest,
      authorizationProbeScenario as unknown as ProductionExecutionCertificationScenario,
    );
    const authorizationActionPlan = buildActionPlan(
      frozenRequest,
      authorizationProbeScenario as unknown as ProductionExecutionCertificationScenario,
    );
    const authorizationPlan = executionPlanner.plan(
      authorizationActionPlan,
      authorizationDecision,
    );
    const deniedPlan = Object.freeze({
      ...authorizationPlan,
      authorizationRequirements: Object.freeze(
        authorizationPlan.authorizationRequirements.map((requirement, index) =>
          index === 0
            ? Object.freeze({ ...requirement, decision: SecurityDecision.ALLOW })
            : requirement,
        ),
      ),
    });
    const deniedHotPath = hotPathPlanner.plan(deniedPlan);
    const deniedAuthorization = authorizationEngine.authorize(
      Object.freeze({ executionPlan: deniedPlan }),
    );
    const deniedRouting = new InMemorySecurityExecutionRouter(
      buildRouteRegistry(SecurityActionType.REMOVE_UNAUTHORIZED_BOT),
    ).route(
      Object.freeze({
        hotPathPlan: deniedHotPath,
        authorizationResult: deniedAuthorization,
      }),
    );
    const authorizationGatesEnforced = deniedRouting.routes.every(
      (route) => route.decision !== SecurityExecutionRouteDecision.EXECUTABLE,
    );

    const unsupportedProbeDecision = buildDecisionModel(
      frozenRequest,
      Object.freeze({
        scenarioId: 'probe-unsupported-route',
        scenarioType: ProductionExecutionCertificationScenarioType.CHANNEL_PERMISSION_DRIFT,
        actionType: SecurityActionType.ESCALATE,
        targetId: 'probe-unsupported-target',
      }) as unknown as ProductionExecutionCertificationScenario,
    );
    const unsupportedActionPlan = Object.freeze({
      decision: SecurityDecision.BLOCK,
      correlationId: frozenRequest.correlationId,
      actions: Object.freeze([
        Object.freeze({
          type: SecurityActionType.ESCALATE,
          priority: SecurityActionPriority.CRITICAL,
          sequence: 1,
        }),
      ]),
      metadata: Object.freeze({
        threatAssessment: Object.freeze({
          severity: DetectionSeverity.CRITICAL,
          confidence: DetectionConfidence.HIGH,
          disposition: DetectionDisposition.MALICIOUS,
          rationale: 'unsupported-route-probe',
          correlationIds: Object.freeze([frozenRequest.correlationId]),
          overrides: Object.freeze([]),
        }),
      }),
    });
    const unsupportedPlan = executionPlanner.plan(unsupportedActionPlan, unsupportedProbeDecision);
    const unsupportedHotPath = hotPathPlanner.plan(unsupportedPlan);
    const unsupportedAuthorization = authorizationEngine.authorize(
      Object.freeze({ executionPlan: unsupportedPlan }),
    );
    const unsupportedRouting = new InMemorySecurityExecutionRouter(
      new InMemorySecurityActionExecutorRegistry(),
    ).route(
      Object.freeze({
        hotPathPlan: unsupportedHotPath,
        authorizationResult: unsupportedAuthorization,
      }),
    );
    const unsupportedRouteFailsClosed = unsupportedRouting.routes.every(
      (route) => route.decision !== SecurityExecutionRouteDecision.EXECUTABLE,
    );

    const failedScenario = scenarioReports.find((scenario) => scenario.status === 'FAILED');
    const failureReasons: string[] = [];
    if (failedScenario) {
      failureReasons.push(
        `scenario-failed:${failedScenario.scenarioId}:${failedScenario.failureReason ?? 'unknown'}`,
      );
    }
    if (!metadataPreserved) {
      failureReasons.push('metadata-verification-failed');
    }
    if (!authorizationGatesEnforced) {
      failureReasons.push('authorization-gate-not-enforced');
    }
    if (!unsupportedRouteFailsClosed) {
      failureReasons.push('unsupported-route-not-fail-closed');
    }

    const report = buildReport(
      frozenRequest,
      certificationId,
      Object.freeze(scenarioReports),
      Object.freeze(routesExercised),
      Object.freeze(adaptersSelected),
      metadataPreserved,
      unsupportedRouteFailsClosed,
      authorizationGatesEnforced,
      startedAtMs,
      failureReasons.length > 0 ? failureReasons.join(',') : undefined,
    );

    this.completedReports.set(certificationId, report);
    return report;
  }
}

export function freezeProductionExecutionCertificationRequest(
  request: ProductionExecutionCertificationRequest,
): ProductionExecutionCertificationRequest {
  return freezeRequest(request);
}
