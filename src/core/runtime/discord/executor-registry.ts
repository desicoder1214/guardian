import { SecurityActionType } from './security-action-planner';
import {
  SecurityExecutionAuthorizationResult,
  SecurityExecutionPlan,
  SecurityHotPathPlan,
} from './security-execution-types';

export interface SecurityExecutionProvider {
  readonly providerId: string;
  readonly supportedActionTypes: readonly SecurityActionType[];
  supports(actionType: SecurityActionType): boolean;
}

export enum SecurityExecutorResolutionReason {
  RESOLVED = 'RESOLVED',
  NO_PROVIDER_REGISTERED = 'NO_PROVIDER_REGISTERED',
  UNSUPPORTED_ACTION = 'UNSUPPORTED_ACTION',
}

export interface SecurityExecutorActionResolution {
  readonly actionType: SecurityActionType;
  readonly sequence: number;
  readonly correlationId: string;
  readonly resolved: boolean;
  readonly reason: SecurityExecutorResolutionReason;
  readonly providerId?: string;
  readonly threatAssessmentPreserved: boolean;
  readonly authorizationMetadata?: Record<string, unknown>;
}

export interface SecurityExecutorRegistrySnapshot {
  readonly providers: readonly {
    readonly providerId: string;
    readonly supportedActionTypes: readonly SecurityActionType[];
    readonly registrationOrder: number;
  }[];
  readonly metadata: {
    readonly source: 'in-memory-security-executor-registry';
    readonly providerCount: number;
  };
}

export interface SecurityExecutorRegistryRoutingContext {
  readonly executionPlan: SecurityExecutionPlan;
  readonly hotPathPlan: SecurityHotPathPlan;
  readonly authorizationResult: SecurityExecutionAuthorizationResult;
}

export interface SecurityExecutorRegistryRoutingResult {
  readonly planId: string;
  readonly executionPlanId: string;
  readonly correlationId: string;
  readonly threatAssessmentPreserved: boolean;
  readonly securityDecisionPreserved: boolean;
  readonly authorizationMetadata?: Record<string, unknown>;
  readonly actionResolutions: readonly SecurityExecutorActionResolution[];
  readonly metadata: {
    readonly source: 'in-memory-security-executor-registry';
    readonly resolvedActionCount: number;
    readonly unresolvedActionCount: number;
  };
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function isUnsupportedAction(actionType: SecurityActionType): boolean {
  return actionType === SecurityActionType.NONE;
}

function freezeResolution(resolution: SecurityExecutorActionResolution): SecurityExecutorActionResolution {
  return Object.freeze({
    actionType: resolution.actionType,
    sequence: resolution.sequence,
    correlationId: resolution.correlationId,
    resolved: resolution.resolved,
    reason: resolution.reason,
    providerId: resolution.providerId,
    threatAssessmentPreserved: resolution.threatAssessmentPreserved,
    authorizationMetadata: freezeMetadata(resolution.authorizationMetadata),
  });
}

export class InMemorySecurityExecutorRegistry {
  private readonly providers: SecurityExecutionProvider[] = [];
  private readonly registrationOrderByProviderId = new Map<string, number>();
  private nextRegistrationOrder = 1;

  register(provider: SecurityExecutionProvider): void {
    if (this.registrationOrderByProviderId.has(provider.providerId)) {
      throw new Error(`executor provider ${provider.providerId} is already registered`);
    }

    this.registrationOrderByProviderId.set(provider.providerId, this.nextRegistrationOrder);
    this.nextRegistrationOrder += 1;
    this.providers.push(provider);
  }

  unregister(providerId: string): void {
    const index = this.providers.findIndex((provider) => provider.providerId === providerId);
    if (index < 0) {
      return;
    }

    this.providers.splice(index, 1);
    this.registrationOrderByProviderId.delete(providerId);
  }

  resolve(actionType: SecurityActionType): SecurityExecutionProvider | undefined {
    for (const provider of this.providers) {
      if (provider.supports(actionType)) {
        return provider;
      }
    }

    return undefined;
  }

  list(): readonly SecurityExecutionProvider[] {
    return Object.freeze([...this.providers]);
  }

  getSnapshot(): SecurityExecutorRegistrySnapshot {
    const providers = this.providers.map((provider) =>
      Object.freeze({
        providerId: provider.providerId,
        supportedActionTypes: Object.freeze([...provider.supportedActionTypes]),
        registrationOrder: this.registrationOrderByProviderId.get(provider.providerId) ?? -1,
      }),
    );

    return Object.freeze({
      providers: Object.freeze(providers),
      metadata: Object.freeze({
        source: 'in-memory-security-executor-registry',
        providerCount: providers.length,
      }),
    });
  }

  route(context: SecurityExecutorRegistryRoutingContext): SecurityExecutorRegistryRoutingResult {
    const actionResolutions = context.executionPlan.plannedActions.map((action) => {
      if (isUnsupportedAction(action.type)) {
        return freezeResolution({
          actionType: action.type,
          sequence: action.sequence,
          correlationId: context.executionPlan.correlationId,
          resolved: false,
          reason: SecurityExecutorResolutionReason.UNSUPPORTED_ACTION,
          threatAssessmentPreserved:
            context.executionPlan.threatAssessment?.rationale === context.hotPathPlan.threatAssessment?.rationale,
          authorizationMetadata: context.authorizationResult.metadata,
        });
      }

      const provider = this.resolve(action.type);
      if (!provider) {
        return freezeResolution({
          actionType: action.type,
          sequence: action.sequence,
          correlationId: context.executionPlan.correlationId,
          resolved: false,
          reason: SecurityExecutorResolutionReason.NO_PROVIDER_REGISTERED,
          threatAssessmentPreserved:
            context.executionPlan.threatAssessment?.rationale === context.hotPathPlan.threatAssessment?.rationale,
          authorizationMetadata: context.authorizationResult.metadata,
        });
      }

      return freezeResolution({
        actionType: action.type,
        sequence: action.sequence,
        correlationId: context.executionPlan.correlationId,
        resolved: true,
        reason: SecurityExecutorResolutionReason.RESOLVED,
        providerId: provider.providerId,
        threatAssessmentPreserved:
          context.executionPlan.threatAssessment?.rationale === context.hotPathPlan.threatAssessment?.rationale,
        authorizationMetadata: context.authorizationResult.metadata,
      });
    });

    const immutableResolutions = Object.freeze(actionResolutions.map((resolution) => freezeResolution(resolution)));
    const resolvedActionCount = immutableResolutions.filter((resolution) => resolution.resolved).length;
    const unresolvedActionCount = immutableResolutions.length - resolvedActionCount;

    return Object.freeze({
      planId: context.hotPathPlan.planId,
      executionPlanId: context.executionPlan.planId,
      correlationId: context.executionPlan.correlationId,
      threatAssessmentPreserved:
        context.executionPlan.threatAssessment?.rationale === context.hotPathPlan.threatAssessment?.rationale,
      securityDecisionPreserved:
        context.executionPlan.securityDecision.decision === context.hotPathPlan.securityDecision.decision,
      authorizationMetadata: freezeMetadata(context.authorizationResult.metadata),
      actionResolutions: immutableResolutions,
      metadata: Object.freeze({
        source: 'in-memory-security-executor-registry',
        resolvedActionCount,
        unresolvedActionCount,
      }),
    });
  }
}
