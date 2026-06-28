import {
  AuthorizationDecision,
  SecurityContainmentTarget,
  SecurityExecutionRoute,
  SecurityExecutionRouteDecision,
  SecurityExecutionRouteReason,
  SecurityExecutionRouter,
  SecurityExecutionRoutingContext,
  SecurityExecutionRoutingResult,
  SecurityHotPathAction,
  SecurityHotPathExecutionLane,
} from './security-execution-types';
import { SecurityActionType } from './security-action-planner';
import {
  InMemorySecurityActionExecutorRegistry,
  SecurityActionExecutorRegistry,
} from './security-action-executor-registry';

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeContainmentTarget(target: SecurityContainmentTarget): SecurityContainmentTarget {
  return Object.freeze({
    resourceType: target.resourceType,
    resourceId: target.resourceId,
    correlationId: target.correlationId,
    metadata: freezeMetadata(target.metadata),
  });
}

function freezeRoute(route: SecurityExecutionRoute): SecurityExecutionRoute {
  return Object.freeze({
    ...route,
    containmentTarget: route.containmentTarget ? freezeContainmentTarget(route.containmentTarget) : undefined,
    authorizationResult: Object.freeze({
      ...route.authorizationResult,
      authorizationRequirements: Object.freeze(
        route.authorizationResult.authorizationRequirements.map((requirement) =>
          Object.freeze({
            actionType: requirement.actionType,
            sequence: requirement.sequence,
            requiresAuthorization: requirement.requiresAuthorization,
            decision: requirement.decision,
            correlationId: requirement.correlationId,
          }),
        ),
      ),
      metadata: freezeMetadata(route.authorizationResult.metadata),
    }),
  });
}

function toRouteDecision(
  action: SecurityHotPathAction,
  isAuthorized: boolean,
  hasExecutor: boolean,
): { decision: SecurityExecutionRouteDecision; reason: SecurityExecutionRouteReason } {
  if (action.lane === SecurityHotPathExecutionLane.BACKGROUND) {
    return {
      decision: SecurityExecutionRouteDecision.DEFERRED,
      reason: SecurityExecutionRouteReason.BACKGROUND_DEFERRED,
    };
  }

  if (!isAuthorized) {
    return {
      decision: SecurityExecutionRouteDecision.SKIPPED,
      reason: SecurityExecutionRouteReason.AUTHORIZATION_DENIED,
    };
  }

  if (!hasExecutor) {
    return {
      decision: SecurityExecutionRouteDecision.SKIPPED,
      reason: SecurityExecutionRouteReason.NO_EXECUTOR,
    };
  }

  return {
    decision: SecurityExecutionRouteDecision.EXECUTABLE,
    reason: SecurityExecutionRouteReason.AUTHORIZED_IMMEDIATE,
  };
}

export class InMemorySecurityExecutionRouter implements SecurityExecutionRouter {
  constructor(
    private readonly executorRegistry: SecurityActionExecutorRegistry = new InMemorySecurityActionExecutorRegistry(),
  ) {}

  route(context: SecurityExecutionRoutingContext): SecurityExecutionRoutingResult {
    const isAuthorized = context.authorizationResult.decision === AuthorizationDecision.AUTHORIZED;

    const routes: SecurityExecutionRoute[] = [];
    let ignoredNoneActionCount = 0;

    for (const action of context.hotPathPlan.actions) {
      if (action.actionType === SecurityActionType.NONE) {
        ignoredNoneActionCount += 1;
        continue;
      }

      const hasExecutor = this.executorRegistry.resolve(action.actionType) !== undefined;
      const { decision, reason } = toRouteDecision(action, isAuthorized, hasExecutor);

      routes.push(
        freezeRoute({
          routeId: `${context.hotPathPlan.planId}:${action.sequence}:${action.actionType}`,
          planId: context.hotPathPlan.planId,
          executionPlanId: context.hotPathPlan.executionPlanId,
          correlationId: context.hotPathPlan.correlationId,
          actionType: action.actionType,
          sequence: action.sequence,
          lane: action.lane,
          decision,
          reason,
          containmentTarget: action.containmentTarget
            ? freezeContainmentTarget(action.containmentTarget)
            : undefined,
          containmentStrategy: action.containmentStrategy,
          authorizationResult: context.authorizationResult,
        }),
      );
    }

    const immutableRoutes = Object.freeze(routes.map((route) => freezeRoute(route)));
    const executableRouteCount = immutableRoutes.filter(
      (route) => route.decision === SecurityExecutionRouteDecision.EXECUTABLE,
    ).length;
    const deferredRouteCount = immutableRoutes.filter(
      (route) => route.decision === SecurityExecutionRouteDecision.DEFERRED,
    ).length;
    const skippedRouteCount = immutableRoutes.filter(
      (route) => route.decision === SecurityExecutionRouteDecision.SKIPPED,
    ).length;

    return Object.freeze({
      planId: context.hotPathPlan.planId,
      executionPlanId: context.hotPathPlan.executionPlanId,
      correlationId: context.hotPathPlan.correlationId,
      authorizationResult: Object.freeze({
        ...context.authorizationResult,
        authorizationRequirements: Object.freeze(
          context.authorizationResult.authorizationRequirements.map((requirement) =>
            Object.freeze({
              actionType: requirement.actionType,
              sequence: requirement.sequence,
              requiresAuthorization: requirement.requiresAuthorization,
              decision: requirement.decision,
              correlationId: requirement.correlationId,
            }),
          ),
        ),
        metadata: freezeMetadata(context.authorizationResult.metadata),
      }),
      routes: immutableRoutes,
      metadata: Object.freeze({
        source: 'in-memory-security-execution-router',
        executableRouteCount,
        deferredRouteCount,
        skippedRouteCount,
        ignoredNoneActionCount,
      }),
    });
  }
}
