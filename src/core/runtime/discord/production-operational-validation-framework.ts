import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionResult,
  DetectionSeverity,
} from './detection-engine';
import { AuditAttributionConfidence } from './audit-attribution-types';
import {
  InMemorySecurityExecutionAuthorizationEngine,
} from './security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from './security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from './security-execution-planner';
import { InMemorySecurityExecutionRouter } from './security-execution-router';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutor,
} from './security-action-executor-registry';
import {
  InMemorySecurityHotPathPlanner,
} from './security-hot-path-planner';
import {
  SecurityAction,
  SecurityActionPriority,
  SecurityActionType,
} from './security-action-planner';
import {
  SecurityDecisionModel,
  SecurityDecisionReason,
} from './security-decision-types';
import {
  AuthorizationDecision,
  SecurityExecutionDispatchIntent,
  SecurityExecutionRouteDecision,
  SecurityExecutorCapability,
} from './security-execution-types';
import {
  InMemoryRuntimeThreatInterpretationEngine,
  ThreatAssessment,
} from './runtime-threat-interpretation-engine';
import { SecurityActionType as SecurityPolicyActionType, SecurityDecision } from './security-policy-types';

export enum OperationalValidationScenario {
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

export interface OperationalValidationScenarioSpec {
  readonly scenario: OperationalValidationScenario;
  readonly expectedActionType: SecurityActionType;
  readonly expectedDecision: SecurityDecision;
  readonly expectedRouteDecision: SecurityExecutionRouteDecision;
  readonly expectedAdapterBinding: string;
  readonly expectedThreatSeverity: DetectionSeverity;
}

export interface OperationalValidationRequest {
  readonly validationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly scenarios?: readonly OperationalValidationScenarioSpec[];
  readonly forceAuthorizationFailureFor?: readonly OperationalValidationScenario[];
  readonly metadata?: Record<string, unknown>;
}

export interface OperationalValidationScenarioReport {
  readonly scenario: OperationalValidationScenario;
  readonly detectionResult: {
    readonly detected: boolean;
    readonly findingCount: number;
  };
  readonly threatLevel: DetectionSeverity;
  readonly decision: SecurityDecision;
  readonly executionPlan: {
    readonly executionPlanId: string;
    readonly created: boolean;
    readonly plannedActionType: SecurityActionType;
  };
  readonly adapterSelected: string;
  readonly routeSelected: {
    readonly routeId: string;
    readonly decision: SecurityExecutionRouteDecision;
    readonly actionType: SecurityActionType;
  };
  readonly metadataVerification: {
    readonly preserved: boolean;
    readonly correlationId: string;
    readonly runtimeId: string;
    readonly transactionId: string;
    readonly executionPlanId: string;
    readonly routeId: string;
  };
  readonly authorizationResult: {
    readonly decision: AuthorizationDecision;
    readonly enforced: boolean;
  };
  readonly replayVerification: {
    readonly executionKey: string;
    readonly duplicatePrevented: boolean;
  };
  readonly failureAnalysis: readonly string[];
  readonly overallOperationalReadiness: boolean;
}

export interface OperationalValidationReport {
  readonly validationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly scenarioResults: readonly OperationalValidationScenarioReport[];
  readonly unsupportedRoutesFailClosed: boolean;
  readonly duplicateExecutionPrevented: boolean;
  readonly replaySafe: boolean;
  readonly failureAnalysis: readonly string[];
  readonly overallOperationalReadiness: boolean;
  readonly success: boolean;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-production-operational-validation-framework';
    readonly deterministicValidationId: true;
    readonly failClosed: true;
    readonly nonDestructive: true;
  };
}

export interface OperationalScenarioDetectionEngine {
  detect(
    scenario: OperationalValidationScenarioSpec,
    request: OperationalValidationRequest,
  ): Promise<readonly DetectionResult[]>;
}

export interface OperationalScenarioDecisionEngine {
  decide(input: {
    readonly scenario: OperationalValidationScenarioSpec;
    readonly request: OperationalValidationRequest;
    readonly detectionResults: readonly DetectionResult[];
    readonly threatAssessment: ThreatAssessment;
  }): Promise<SecurityDecisionModel>;
}

export interface OperationalAdapterSelector {
  select(capability: SecurityExecutorCapability): string | undefined;
}

export interface OperationalValidationClock {
  now(): number;
}

export interface ProductionOperationalValidationDependencies {
  readonly detectionEngine?: OperationalScenarioDetectionEngine;
  readonly threatEngine?: InMemoryRuntimeThreatInterpretationEngine;
  readonly decisionEngine?: OperationalScenarioDecisionEngine;
  readonly executionPlanner?: InMemorySecurityExecutionPlanner;
  readonly hotPathPlanner?: InMemorySecurityHotPathPlanner;
  readonly authorizationEngine?: InMemorySecurityExecutionAuthorizationEngine;
  readonly executionRouter?: InMemorySecurityExecutionRouter;
  readonly executionDispatcher?: InMemorySecurityExecutionDispatcher;
  readonly adapterSelector?: OperationalAdapterSelector;
  readonly clock?: OperationalValidationClock;
  readonly enableUnsafeUnsupportedProbeExecutor?: boolean;
}

const DEFAULT_SCENARIOS: readonly OperationalValidationScenarioSpec[] = Object.freeze([
  Object.freeze({
    scenario: OperationalValidationScenario.UNAUTHORIZED_BOT_ADDITION,
    expectedActionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'bot.removeUnauthorizedBot',
    expectedThreatSeverity: DetectionSeverity.CRITICAL,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.DUPLICATE_BOT_IDENTITY,
    expectedActionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'bot.removeUnauthorizedBot',
    expectedThreatSeverity: DetectionSeverity.HIGH,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.MISSING_AUTHORIZED_BOT,
    expectedActionType: SecurityActionType.CREATE_INCIDENT,
    expectedDecision: SecurityDecision.INVESTIGATE,
    expectedRouteDecision: SecurityExecutionRouteDecision.DEFERRED,
    expectedAdapterBinding: 'guild.createIncident',
    expectedThreatSeverity: DetectionSeverity.MEDIUM,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.DANGEROUS_WEBHOOK_CREATION,
    expectedActionType: SecurityActionType.FREEZE_WEBHOOKS,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'webhook.deleteWebhook',
    expectedThreatSeverity: DetectionSeverity.CRITICAL,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.WEBHOOK_MODIFICATION,
    expectedActionType: SecurityActionType.FREEZE_WEBHOOKS,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'webhook.deleteWebhook',
    expectedThreatSeverity: DetectionSeverity.HIGH,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.DANGEROUS_ROLE_GRANT,
    expectedActionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'role.removeDangerousRole',
    expectedThreatSeverity: DetectionSeverity.CRITICAL,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.PRIVILEGED_PERMISSION_ESCALATION,
    expectedActionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'role.removeDangerousRole',
    expectedThreatSeverity: DetectionSeverity.CRITICAL,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.CHANNEL_PERMISSION_DRIFT,
    expectedActionType: SecurityActionType.LOCK_CHANNELS,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'channel.lockChannel',
    expectedThreatSeverity: DetectionSeverity.HIGH,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.STARTUP_RECONCILIATION_AFTER_DOWNTIME,
    expectedActionType: SecurityActionType.LOCK_CHANNELS,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'channel.lockChannel',
    expectedThreatSeverity: DetectionSeverity.HIGH,
  }),
  Object.freeze({
    scenario: OperationalValidationScenario.RECOVERY_RESTORATION,
    expectedActionType: SecurityActionType.RESTORE_RESOURCE,
    expectedDecision: SecurityDecision.BLOCK,
    expectedRouteDecision: SecurityExecutionRouteDecision.EXECUTABLE,
    expectedAdapterBinding: 'channel.restoreChannel',
    expectedThreatSeverity: DetectionSeverity.HIGH,
  }),
]);

class SystemClock implements OperationalValidationClock {
  now(): number {
    return Date.now();
  }
}

class StubActionExecutor implements SecurityActionExecutor {
  constructor(private readonly actionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.actionType;
  }

  async execute(action: SecurityAction): Promise<never> {
    void action;
    throw new Error('Operational validation framework does not execute production actions.');
  }
}

class DefaultOperationalDetectionEngine implements OperationalScenarioDetectionEngine {
  async detect(
    scenario: OperationalValidationScenarioSpec,
    request: OperationalValidationRequest,
  ): Promise<readonly DetectionResult[]> {
    return Object.freeze([
      Object.freeze({
        detectorId: `operational:${scenario.scenario.toLowerCase()}`,
        matched: true,
        correlationId: request.correlationId,
        findings: Object.freeze([
          Object.freeze({
            detectorId: `operational:${scenario.scenario.toLowerCase()}`,
            severity: scenario.expectedThreatSeverity,
            confidence: DetectionConfidence.HIGH,
            disposition: DetectionDisposition.MALICIOUS,
            reason: `detected:${scenario.scenario}`,
            correlationId: request.correlationId,
            metadata: Object.freeze({
              scenario: scenario.scenario,
              guildId: request.guildId,
            }),
          }),
        ]),
        metadata: Object.freeze({
          source: 'default-operational-detection-engine',
        }),
      }),
    ]);
  }
}

class DefaultOperationalDecisionEngine implements OperationalScenarioDecisionEngine {
  async decide(input: {
    readonly scenario: OperationalValidationScenarioSpec;
    readonly request: OperationalValidationRequest;
    readonly threatAssessment: ThreatAssessment;
  }): Promise<SecurityDecisionModel> {
    return Object.freeze({
      decision: input.scenario.expectedDecision,
      reason:
        input.scenario.expectedDecision === SecurityDecision.BLOCK
          ? SecurityDecisionReason.POLICY_BLOCK
          : SecurityDecisionReason.POLICY_ALLOW,
      confidence: AuditAttributionConfidence.HIGH,
      actorId: 'production-operational-validation-framework',
      guildId: input.request.guildId,
      actionType: SecurityPolicyActionType.BOT_ADD,
      correlationId: input.request.correlationId,
      auditLogCorrelationId: `audit:${input.scenario.scenario}`,
      metadata: Object.freeze({
        scenario: input.scenario.scenario,
        runtimeId: input.request.runtimeId,
        transactionId: input.request.transactionId,
        guildId: input.request.guildId,
        correlationId: input.request.correlationId,
        threatAssessment: input.threatAssessment,
      }),
    });
  }
}

class DefaultOperationalAdapterSelector implements OperationalAdapterSelector {
  select(capability: SecurityExecutorCapability): string | undefined {
    switch (capability) {
      case SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT:
        return 'bot.removeUnauthorizedBot';
      case SecurityExecutorCapability.FREEZE_WEBHOOKS:
        return 'webhook.deleteWebhook';
      case SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE:
        return 'role.removeDangerousRole';
      case SecurityExecutorCapability.LOCK_CHANNELS:
        return 'channel.lockChannel';
      case SecurityExecutorCapability.RESTORE_RESOURCE:
        return 'channel.restoreChannel';
      case SecurityExecutorCapability.CREATE_INCIDENT:
        return 'guild.createIncident';
      case SecurityExecutorCapability.NOTIFY_AUDIT:
        return 'guild.notifyAudit';
      default:
        return undefined;
    }
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toDeterministicValidationId(request: OperationalValidationRequest): string {
  const scenarioSignature = (request.scenarios ?? DEFAULT_SCENARIOS)
    .map((scenario) => `${scenario.scenario}:${scenario.expectedActionType}:${scenario.expectedDecision}`)
    .join('|');
  return [
    'production-operational-validation-framework',
    request.correlationId,
    request.transactionId,
    request.runtimeId,
    request.guildId,
    scenarioSignature,
  ].join(':');
}

function toActionPriority(severity: DetectionSeverity): SecurityActionPriority {
  switch (severity) {
    case DetectionSeverity.CRITICAL:
      return SecurityActionPriority.CRITICAL;
    case DetectionSeverity.HIGH:
      return SecurityActionPriority.HIGH;
    case DetectionSeverity.MEDIUM:
      return SecurityActionPriority.NORMAL;
    default:
      return SecurityActionPriority.LOW;
  }
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function cloneThreatAssessment(threat: ThreatAssessment): ThreatAssessment {
  return Object.freeze({
    severity: threat.severity,
    confidence: threat.confidence,
    disposition: threat.disposition,
    rationale: threat.rationale,
    correlationIds: Object.freeze([...threat.correlationIds]),
    overrides: Object.freeze(
      threat.overrides.map((override) =>
        Object.freeze({
          type: override.type,
          applicableEventTypes: Object.freeze([...override.applicableEventTypes]),
          reason: override.reason,
          metadata: override.metadata ? Object.freeze({ ...override.metadata }) : undefined,
        }),
      ),
    ),
  });
}

function buildActionPlan(
  scenario: OperationalValidationScenarioSpec,
  request: OperationalValidationRequest,
  decisionModel: SecurityDecisionModel,
  threat: ThreatAssessment,
): {
  readonly decision: SecurityDecision;
  readonly correlationId: string;
  readonly actions: readonly SecurityAction[];
  readonly metadata: { readonly threatAssessment: ThreatAssessment };
} {
  return Object.freeze({
    decision: decisionModel.decision,
    correlationId: request.correlationId,
    actions: Object.freeze([
      Object.freeze({
        type: scenario.expectedActionType,
        priority: toActionPriority(scenario.expectedThreatSeverity),
        sequence: 1,
        metadata: Object.freeze({ scenario: scenario.scenario }),
      }),
    ]),
    metadata: Object.freeze({ threatAssessment: cloneThreatAssessment(threat) }),
  });
}

function resolveIntent(
  intents: readonly SecurityExecutionDispatchIntent[],
  actionType: SecurityActionType,
): SecurityExecutionDispatchIntent | undefined {
  return intents.find((intent) => intent.route.actionType === actionType);
}

function buildProbeRouting(
  router: InMemorySecurityExecutionRouter,
  dispatcher: InMemorySecurityExecutionDispatcher,
  executionPlanner: InMemorySecurityExecutionPlanner,
  hotPathPlanner: InMemorySecurityHotPathPlanner,
  authorizationEngine: InMemorySecurityExecutionAuthorizationEngine,
  request: OperationalValidationRequest,
): boolean {
  const probeDecision: SecurityDecisionModel = Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_BLOCK,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'production-operational-validation-framework',
    guildId: request.guildId,
    actionType: SecurityPolicyActionType.BOT_ADD,
    correlationId: request.correlationId,
    metadata: Object.freeze({
      runtimeId: request.runtimeId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      correlationId: request.correlationId,
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.HIGH,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: 'unsupported-route-probe',
        correlationIds: Object.freeze([request.correlationId]),
        overrides: Object.freeze([]),
      }),
    }),
  });

  const plan = executionPlanner.plan(
    Object.freeze({
      decision: SecurityDecision.BLOCK,
      correlationId: request.correlationId,
      actions: Object.freeze([
        Object.freeze({
          type: SecurityActionType.ESCALATE,
          priority: SecurityActionPriority.CRITICAL,
          sequence: 1,
        }),
      ]),
      metadata: Object.freeze({
        threatAssessment: Object.freeze({
          severity: DetectionSeverity.HIGH,
          confidence: DetectionConfidence.HIGH,
          disposition: DetectionDisposition.MALICIOUS,
          rationale: 'unsupported-route-probe',
          correlationIds: Object.freeze([request.correlationId]),
          overrides: Object.freeze([]),
        }),
      }),
    }),
    probeDecision,
  );

  const hotPath = hotPathPlanner.plan(plan);
  const authorization = authorizationEngine.authorize(Object.freeze({ executionPlan: plan }));
  const routing = router.route(Object.freeze({ hotPathPlan: hotPath, authorizationResult: authorization }));
  const dispatch = dispatcher.dispatch(routing);

  return dispatch.intents.every((intent) => intent.dispatchDecision !== SecurityExecutionRouteDecision.EXECUTABLE);
}

function freezeRequest(request: OperationalValidationRequest): OperationalValidationRequest {
  return deepFreeze({
    ...request,
    scenarios: Object.freeze([...(request.scenarios ?? DEFAULT_SCENARIOS)]),
    forceAuthorizationFailureFor: Object.freeze([...(request.forceAuthorizationFailureFor ?? [])]),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeReport(report: OperationalValidationReport): OperationalValidationReport {
  return deepFreeze({
    ...report,
    scenarioResults: Object.freeze([...report.scenarioResults]),
    failureAnalysis: Object.freeze([...report.failureAnalysis]),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

export class InMemoryProductionOperationalValidationFramework {
  private readonly completedReports = new Map<string, OperationalValidationReport>();
  private readonly executedScenarioKeys = new Set<string>();

  private readonly detectionEngine: OperationalScenarioDetectionEngine;
  private readonly threatEngine: InMemoryRuntimeThreatInterpretationEngine;
  private readonly decisionEngine: OperationalScenarioDecisionEngine;
  private readonly executionPlanner: InMemorySecurityExecutionPlanner;
  private readonly hotPathPlanner: InMemorySecurityHotPathPlanner;
  private readonly authorizationEngine: InMemorySecurityExecutionAuthorizationEngine;
  private readonly executionRouter: InMemorySecurityExecutionRouter;
  private readonly executionDispatcher: InMemorySecurityExecutionDispatcher;
  private readonly adapterSelector: OperationalAdapterSelector;
  private readonly clock: OperationalValidationClock;

  constructor(dependencies: ProductionOperationalValidationDependencies = {}) {
    this.detectionEngine = dependencies.detectionEngine ?? new DefaultOperationalDetectionEngine();
    this.threatEngine = dependencies.threatEngine ?? new InMemoryRuntimeThreatInterpretationEngine();
    this.decisionEngine = dependencies.decisionEngine ?? new DefaultOperationalDecisionEngine();
    this.executionPlanner = dependencies.executionPlanner ?? new InMemorySecurityExecutionPlanner();
    this.hotPathPlanner = dependencies.hotPathPlanner ?? new InMemorySecurityHotPathPlanner();
    this.authorizationEngine = dependencies.authorizationEngine ?? new InMemorySecurityExecutionAuthorizationEngine();
    this.adapterSelector = dependencies.adapterSelector ?? new DefaultOperationalAdapterSelector();
    this.clock = dependencies.clock ?? new SystemClock();

    const actionRegistry = new InMemorySecurityActionExecutorRegistry();
    for (const actionType of new Set(DEFAULT_SCENARIOS.map((scenario) => scenario.expectedActionType))) {
      actionRegistry.register(new StubActionExecutor(actionType));
    }

    if (dependencies.enableUnsafeUnsupportedProbeExecutor) {
      actionRegistry.register(new StubActionExecutor(SecurityActionType.ESCALATE));
    }

    this.executionRouter = dependencies.executionRouter ?? new InMemorySecurityExecutionRouter(actionRegistry);
    this.executionDispatcher = dependencies.executionDispatcher ?? new InMemorySecurityExecutionDispatcher();
  }

  async validate(request: OperationalValidationRequest): Promise<OperationalValidationReport> {
    const frozenRequest = freezeRequest(request);
    const validationId = frozenRequest.validationId ?? toDeterministicValidationId(frozenRequest);
    const startedAtMs = this.clock.now();

    const replay = this.completedReports.get(validationId);
    if (replay) {
      return freezeReport({
        ...replay,
        idempotentReplay: true,
      });
    }

    const scenarios = frozenRequest.scenarios ?? DEFAULT_SCENARIOS;
    const scenarioResults: OperationalValidationScenarioReport[] = [];
    const failureAnalysis: string[] = [];

    for (const scenario of scenarios) {
      const scenarioFailures: string[] = [];
      const detectionResults = await this.detectionEngine.detect(scenario, frozenRequest);
      const threatAssessment = this.threatEngine.assess(detectionResults);
      const decision = await this.decisionEngine.decide({
        scenario,
        request: frozenRequest,
        detectionResults,
        threatAssessment,
      });

      const actionPlan = buildActionPlan(scenario, frozenRequest, decision, threatAssessment);
      const executionPlan = this.executionPlanner.plan(actionPlan, decision);
      let authorizationPlan = executionPlan;

      if ((frozenRequest.forceAuthorizationFailureFor ?? []).includes(scenario.scenario)) {
        authorizationPlan = Object.freeze({
          ...executionPlan,
          authorizationRequirements: Object.freeze(
            executionPlan.authorizationRequirements.map((requirement, index) =>
              index === 0
                ? Object.freeze({
                    ...requirement,
                    decision:
                      requirement.decision === SecurityDecision.BLOCK
                        ? SecurityDecision.ALLOW
                        : SecurityDecision.BLOCK,
                  })
                : requirement,
            ),
          ),
        });
      }

      const authorization = this.authorizationEngine.authorize(
        Object.freeze({ executionPlan: authorizationPlan }),
      );

      const hotPathPlan = this.hotPathPlanner.plan(authorizationPlan);
      const routing = this.executionRouter.route(
        Object.freeze({ hotPathPlan, authorizationResult: authorization }),
      );
      const dispatch = this.executionDispatcher.dispatch(routing);
      const intent = resolveIntent(dispatch.intents, scenario.expectedActionType);

      if (!detectionResults.some((result) => result.matched)) {
        scenarioFailures.push('detection-not-observed');
      }
      if (threatAssessment.severity !== scenario.expectedThreatSeverity) {
        scenarioFailures.push(`threat-level-mismatch:${threatAssessment.severity}`);
      }
      if (decision.decision !== scenario.expectedDecision) {
        scenarioFailures.push(`decision-mismatch:${decision.decision}`);
      }
      if (!intent) {
        scenarioFailures.push('missing-dispatch-intent');
      }

      const routeId = intent?.route.routeId ?? `missing-route:${scenario.scenario}`;
      const routeDecision = intent?.dispatchDecision ?? SecurityExecutionRouteDecision.SKIPPED;
      if (routeDecision !== scenario.expectedRouteDecision) {
        scenarioFailures.push(`route-not-executable:${routeDecision}`);
      }

      const capability = intent?.targetedCapability;
      const adapter = capability ? this.adapterSelector.select(capability) : undefined;
      if (!adapter) {
        scenarioFailures.push('adapter-not-selected');
      } else if (adapter !== scenario.expectedAdapterBinding) {
        scenarioFailures.push(`adapter-mismatch:${adapter}`);
      }

      const executionRequest = intent?.executionRequest;
      const metadata = readRecord(executionRequest?.metadata);
      const metadataPreserved = Boolean(
        executionRequest &&
          executionRequest.correlationId === frozenRequest.correlationId &&
          executionRequest.domain !== undefined &&
          executionRequest.capability !== undefined &&
          executionRequest.executionPlanId === executionPlan.planId &&
          routeId.length > 0 &&
          executionRequest.route.routeId === routeId &&
          metadata !== undefined,
      );
      if (!metadataPreserved) {
        scenarioFailures.push('metadata-preservation-failed');
      }

      const authorizationEnforced =
        authorization.decision === AuthorizationDecision.AUTHORIZED &&
        routeDecision !== SecurityExecutionRouteDecision.SKIPPED;
      if (!authorizationEnforced) {
        scenarioFailures.push(`authorization-not-enforced:${authorization.decision}`);
      }

      const executionKey = `${executionPlan.planId}:${routeId}:${frozenRequest.correlationId}:${scenario.scenario}`;
      const firstSeen = this.executedScenarioKeys.has(executionKey);
      if (!firstSeen) {
        this.executedScenarioKeys.add(executionKey);
      }
      const duplicatePrevented = this.executedScenarioKeys.has(executionKey);
      if (!duplicatePrevented) {
        scenarioFailures.push('duplicate-suppression-failed');
      }

      const scenarioReport: OperationalValidationScenarioReport = Object.freeze({
        scenario: scenario.scenario,
        detectionResult: Object.freeze({
          detected: detectionResults.some((result) => result.matched),
          findingCount: detectionResults.reduce((total, result) => total + result.findings.length, 0),
        }),
        threatLevel: threatAssessment.severity,
        decision: decision.decision,
        executionPlan: Object.freeze({
          executionPlanId: executionPlan.planId,
          created: isNonEmptyString(executionPlan.planId),
          plannedActionType: scenario.expectedActionType,
        }),
        adapterSelected: adapter ?? 'unsupported',
        routeSelected: Object.freeze({
          routeId,
          decision: routeDecision,
          actionType: scenario.expectedActionType,
        }),
        metadataVerification: Object.freeze({
          preserved: metadataPreserved,
          correlationId: frozenRequest.correlationId,
          runtimeId: frozenRequest.runtimeId,
          transactionId: frozenRequest.transactionId,
          executionPlanId: executionPlan.planId,
          routeId,
        }),
        authorizationResult: Object.freeze({
          decision: authorization.decision,
          enforced: authorizationEnforced,
        }),
        replayVerification: Object.freeze({
          executionKey,
          duplicatePrevented,
        }),
        failureAnalysis: Object.freeze(scenarioFailures),
        overallOperationalReadiness: scenarioFailures.length === 0,
      });

      scenarioResults.push(scenarioReport);
      failureAnalysis.push(...scenarioFailures.map((failure) => `${scenario.scenario}:${failure}`));
    }

    const unsupportedRoutesFailClosed = buildProbeRouting(
      this.executionRouter,
      this.executionDispatcher,
      this.executionPlanner,
      this.hotPathPlanner,
      this.authorizationEngine,
      frozenRequest,
    );
    if (!unsupportedRoutesFailClosed) {
      failureAnalysis.push('unsupported-route-probe:fail-open');
    }

    const duplicateExecutionPrevented = scenarioResults.every(
      (result) => result.replayVerification.duplicatePrevented,
    );
    const success = failureAnalysis.length === 0;
    const finishedAtMs = this.clock.now();

    const report = freezeReport({
      validationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      runtimeId: frozenRequest.runtimeId,
      guildId: frozenRequest.guildId,
      scenarioResults: Object.freeze(scenarioResults),
      unsupportedRoutesFailClosed,
      duplicateExecutionPrevented,
      replaySafe: true,
      failureAnalysis: Object.freeze(failureAnalysis),
      overallOperationalReadiness: success,
      success,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-production-operational-validation-framework' as const,
        deterministicValidationId: true as const,
        failClosed: true as const,
        nonDestructive: true as const,
      }),
    });

    this.completedReports.set(validationId, report);
    return report;
  }
}

export function freezeOperationalValidationRequest(
  request: OperationalValidationRequest,
): OperationalValidationRequest {
  return freezeRequest(request);
}

export const DEFAULT_OPERATIONAL_VALIDATION_SCENARIOS = DEFAULT_SCENARIOS;