import {
  SecurityDomainExecutionRequest,
  SecurityDomainExecutionResult,
  SecurityExecutionCapabilityResolver,
  SecurityExecutionDispatchIntent,
  SecurityExecutionDispatchResult,
  SecurityExecutionDispatcher,
  SecurityExecutionRouteDecision,
  SecurityExecutionRoutingResult,
  SecurityExecutionStrategy,
  SecurityExecutionStrategyResolution,
  SecurityExecutionStrategyResolver,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
} from './security-execution-types';
import {
  InMemorySecurityDomainExecutorRegistry,
  SecurityDomainExecutorRegistry,
} from './security-action-executor-registry';
import { InMemorySecurityExecutionCapabilityResolver } from './security-execution-capability-resolver';
import { InMemorySecurityExecutionStrategyResolver } from './security-execution-strategy';

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function freezeIntent(intent: SecurityExecutionDispatchIntent): SecurityExecutionDispatchIntent {
  return Object.freeze({
    route: Object.freeze({
      ...intent.route,
      containmentTarget: intent.route.containmentTarget
        ? Object.freeze({
            ...intent.route.containmentTarget,
            metadata: freezeMetadata(intent.route.containmentTarget.metadata),
          })
        : undefined,
      authorizationResult: Object.freeze({
        ...intent.route.authorizationResult,
        authorizationRequirements: Object.freeze(
          intent.route.authorizationResult.authorizationRequirements.map((requirement) =>
            Object.freeze({
              actionType: requirement.actionType,
              sequence: requirement.sequence,
              requiresAuthorization: requirement.requiresAuthorization,
              decision: requirement.decision,
              correlationId: requirement.correlationId,
            }),
          ),
        ),
        metadata: freezeMetadata(intent.route.authorizationResult.metadata),
      }),
    }),
    dispatchDecision: intent.dispatchDecision,
    targetedDomain: intent.targetedDomain,
    targetedCapability: intent.targetedCapability,
    executionStrategy: intent.executionStrategy ? freezeStrategy(intent.executionStrategy) : undefined,
    strategyResolutionReason: intent.strategyResolutionReason,
    executionRequest: intent.executionRequest
      ? Object.freeze({
          ...intent.executionRequest,
          route: Object.freeze({ ...intent.executionRequest.route }),
          metadata: freezeMetadata(intent.executionRequest.metadata),
        })
      : undefined,
    executionResult: intent.executionResult
      ? Object.freeze({
          ...intent.executionResult,
          metadata: freezeMetadata(intent.executionResult.metadata),
        })
      : undefined,
    metadata: freezeMetadata(intent.metadata),
  });
}

function freezeRetryPolicy(policy: SecurityExecutionStrategy['retryPolicy']): SecurityExecutionStrategy['retryPolicy'] {
  return Object.freeze({
    eligible: policy.eligible,
    maxAttempts: policy.maxAttempts,
    backoff: policy.backoff,
    metadata: freezeMetadata(policy.metadata),
  });
}

function freezeStrategy(strategy: SecurityExecutionStrategy): SecurityExecutionStrategy {
  return Object.freeze({
    actionType: strategy.actionType,
    lane: strategy.lane,
    dispatchMode: strategy.dispatchMode,
    retryPolicy: freezeRetryPolicy(strategy.retryPolicy),
    idempotencyPolicy: strategy.idempotencyPolicy,
    orderingConstraint: strategy.orderingConstraint,
    parallelizable: strategy.parallelizable,
    hotPathSafe: strategy.hotPathSafe,
    backgroundSafe: strategy.backgroundSafe,
    metadata: freezeMetadata(strategy.metadata),
  });
}

function freezeRequest(request: SecurityDomainExecutionRequest): SecurityDomainExecutionRequest {
  return Object.freeze({
    ...request,
    route: Object.freeze({ ...request.route }),
    metadata: freezeMetadata(request.metadata),
  });
}

function freezeResult(result: SecurityDomainExecutionResult): SecurityDomainExecutionResult {
  return Object.freeze({
    ...result,
    metadata: freezeMetadata(result.metadata),
  });
}

export class InMemorySecurityExecutionDispatcher implements SecurityExecutionDispatcher {
  constructor(
    private readonly domainExecutorRegistry: SecurityDomainExecutorRegistry = new InMemorySecurityDomainExecutorRegistry(),
    private readonly capabilityResolver: SecurityExecutionCapabilityResolver = new InMemorySecurityExecutionCapabilityResolver(),
    private readonly strategyResolver: SecurityExecutionStrategyResolver = new InMemorySecurityExecutionStrategyResolver(),
  ) {}

  dispatch(routingResult: SecurityExecutionRoutingResult): SecurityExecutionDispatchResult {
    const intents = routingResult.routes.map((route) => {
      const resolution = this.capabilityResolver.resolve(route.actionType);
      const strategyResolution: SecurityExecutionStrategyResolution = this.strategyResolver.resolve(route.actionType);
      const targetedDomain = resolution.domain;
      const targetedCapability = resolution.capability;
      const executionStrategy = strategyResolution.strategy ? freezeStrategy(strategyResolution.strategy) : undefined;
      const securityDecision = route.authorizationResult.authorizationRequirements[0]?.decision;
      const authorizationMetadata = readRecord(route.authorizationResult.metadata);
      const securityDecisionMetadata = readRecord(authorizationMetadata?.securityDecisionMetadata);
      const memberUserId = readString(
        securityDecisionMetadata,
        'memberUserId',
        'member_user_id',
        'memberId',
        'member_id',
        'targetUserId',
        'target_user_id',
      );
      const roleId = readString(
        securityDecisionMetadata,
        'roleId',
        'role_id',
        'dangerousRoleId',
        'dangerous_role_id',
      );
      const webhookId = readString(
        securityDecisionMetadata,
        'webhookId',
        'webhook_id',
        'targetWebhookId',
        'target_webhook_id',
      );
      const channelId = readString(
        securityDecisionMetadata,
        'channelId',
        'channel_id',
        'targetChannelId',
        'target_channel_id',
      );
      const overwriteId = readString(
        securityDecisionMetadata,
        'overwriteId',
        'overwrite_id',
        'targetOverwriteId',
        'target_overwrite_id',
      );
      const integrationId = readString(
        securityDecisionMetadata,
        'integrationId',
        'integration_id',
        'ownerIntegrationId',
        'owner_integration_id',
      );
      const applicationId = readString(
        securityDecisionMetadata,
        'applicationId',
        'application_id',
        'appId',
        'app_id',
      );
      const request = freezeRequest({
        route,
        planId: routingResult.planId,
        executionPlanId: routingResult.executionPlanId,
        correlationId: routingResult.correlationId,
        domain: targetedDomain ?? SecurityExecutorDomain.GUILD,
        capability: targetedCapability ?? SecurityExecutorCapability.CREATE_INCIDENT,
        metadata: Object.freeze({
          source: 'in-memory-security-execution-dispatcher',
          threatAssessment: route.authorizationResult.threatAssessment,
          securityDecision,
          authorizationMetadata: route.authorizationResult.metadata,
          runtimeId: authorizationMetadata?.runtimeId,
          guildId: authorizationMetadata?.guildId,
          actorId: authorizationMetadata?.actorId,
          botId: authorizationMetadata?.botId,
          ...(memberUserId ? { memberUserId } : {}),
          ...(roleId ? { roleId } : {}),
          ...(webhookId ? { webhookId } : {}),
          ...(channelId ? { channelId } : {}),
          ...(overwriteId ? { overwriteId } : {}),
          ...(integrationId ? { integrationId } : {}),
          ...(applicationId ? { applicationId } : {}),
          executionPlanId: routingResult.executionPlanId,
          securityDecisionMetadata,
        }),
      });

      if (
        route.decision !== SecurityExecutionRouteDecision.EXECUTABLE ||
        !resolution.resolved ||
        !targetedDomain ||
        !targetedCapability
      ) {
        return freezeIntent({
          route,
          dispatchDecision: route.decision,
          targetedDomain,
          targetedCapability,
          executionStrategy,
          strategyResolutionReason: strategyResolution.reason,
          executionRequest: request,
          metadata: Object.freeze({
            source: 'in-memory-security-execution-dispatcher',
            routeReason: route.reason,
            resolutionReason: resolution.reason,
          }),
        });
      }

      const executor = this.domainExecutorRegistry.resolve(targetedDomain, targetedCapability);

      const executionResult = executor
        ? freezeResult(executor.prepare(request))
        : freezeResult({
            domain: targetedDomain,
            capability: targetedCapability,
            accepted: false,
            reason: 'INTENT_REJECTED',
            metadata: Object.freeze({ reason: 'no-domain-executor-registered' }),
          });

      return freezeIntent({
        route,
        dispatchDecision: route.decision,
        targetedDomain,
        targetedCapability,
        executionStrategy,
        strategyResolutionReason: strategyResolution.reason,
        executionRequest: request,
        executionResult,
        metadata: Object.freeze({
          source: 'in-memory-security-execution-dispatcher',
          routeReason: route.reason,
        }),
      });
    });

    const immutableIntents = Object.freeze(intents.map((intent) => freezeIntent(intent)));

    const executableIntentCount = immutableIntents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.EXECUTABLE,
    ).length;
    const deferredIntentCount = immutableIntents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.DEFERRED,
    ).length;
    const skippedIntentCount = immutableIntents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.SKIPPED,
    ).length;

    return Object.freeze({
      planId: routingResult.planId,
      executionPlanId: routingResult.executionPlanId,
      correlationId: routingResult.correlationId,
      intents: immutableIntents,
      metadata: Object.freeze({
        source: 'in-memory-security-execution-dispatcher',
        executableIntentCount,
        deferredIntentCount,
        skippedIntentCount,
      }),
    });
  }
}
