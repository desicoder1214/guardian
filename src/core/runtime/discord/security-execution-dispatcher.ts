import {
  SecurityExecutionDispatchIntent,
  SecurityExecutionDispatchResult,
  SecurityExecutionDispatcher,
  SecurityExecutionRouteDecision,
  SecurityExecutionRoutingResult,
} from './security-execution-types';

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
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
    metadata: freezeMetadata(intent.metadata),
  });
}

export class InMemorySecurityExecutionDispatcher implements SecurityExecutionDispatcher {
  dispatch(routingResult: SecurityExecutionRoutingResult): SecurityExecutionDispatchResult {
    const intents = Object.freeze(
      routingResult.routes.map((route) =>
        freezeIntent({
          route,
          dispatchDecision: route.decision,
          metadata: Object.freeze({
            source: 'in-memory-security-execution-dispatcher',
            routeReason: route.reason,
          }),
        }),
      ),
    );

    const executableIntentCount = intents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.EXECUTABLE,
    ).length;
    const deferredIntentCount = intents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.DEFERRED,
    ).length;
    const skippedIntentCount = intents.filter(
      (intent) => intent.dispatchDecision === SecurityExecutionRouteDecision.SKIPPED,
    ).length;

    return Object.freeze({
      planId: routingResult.planId,
      executionPlanId: routingResult.executionPlanId,
      correlationId: routingResult.correlationId,
      intents,
      metadata: Object.freeze({
        source: 'in-memory-security-execution-dispatcher',
        executableIntentCount,
        deferredIntentCount,
        skippedIntentCount,
      }),
    });
  }
}
