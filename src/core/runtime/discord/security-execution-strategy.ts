import { SecurityActionType } from './security-action-planner';
import {
  SecurityExecutionDispatchMode,
  SecurityExecutionIdempotencyPolicy,
  SecurityExecutionOrderingConstraint,
  SecurityExecutionRetryPolicy,
  SecurityExecutionStrategy,
  SecurityExecutionStrategyProfile,
  SecurityExecutionStrategyResolution,
  SecurityExecutionStrategyResolutionReason,
  SecurityExecutionStrategyResolver,
  SecurityExecutionTopologyEntry,
  SecurityExecutionTopologyResolver,
  SecurityExecutorCapability,
  SecurityHotPathExecutionLane,
} from './security-execution-types';
import { InMemorySecurityExecutionTopologyResolver } from './security-execution-topology';

interface CapabilityStrategyTemplate {
  readonly lane: SecurityHotPathExecutionLane;
  readonly dispatchMode: SecurityExecutionDispatchMode;
  readonly retryPolicy: SecurityExecutionRetryPolicy;
  readonly idempotencyPolicy: SecurityExecutionIdempotencyPolicy;
  readonly orderingConstraint: SecurityExecutionOrderingConstraint;
  readonly parallelizable: boolean;
  readonly hotPathSafe: boolean;
  readonly backgroundSafe: boolean;
  readonly metadata?: Record<string, unknown>;
}

function freezeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  return metadata ? Object.freeze({ ...metadata }) : undefined;
}

function freezeRetryPolicy(policy: SecurityExecutionRetryPolicy): SecurityExecutionRetryPolicy {
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

const CAPABILITY_STRATEGIES = new Map<SecurityExecutorCapability, CapabilityStrategyTemplate>([
  [
    SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      dispatchMode: SecurityExecutionDispatchMode.FIRE_AND_FORGET,
      retryPolicy: freezeRetryPolicy(
        Object.freeze({
          eligible: true,
          maxAttempts: 2,
          backoff: 'LINEAR',
          metadata: Object.freeze({ bounded: true, mustNotWaitForAuditLogOrPersistence: true }),
        }),
      ),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.HOT_PATH_SEQUENCE,
      parallelizable: true,
      hotPathSafe: true,
      backgroundSafe: false,
    }),
  ],
  [
    SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      dispatchMode: SecurityExecutionDispatchMode.FIRE_AND_FORGET,
      retryPolicy: freezeRetryPolicy(
        Object.freeze({
          eligible: true,
          maxAttempts: 2,
          backoff: 'LINEAR',
          metadata: Object.freeze({ bounded: true }),
        }),
      ),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.HOT_PATH_SEQUENCE,
      parallelizable: true,
      hotPathSafe: true,
      backgroundSafe: false,
    }),
  ],
  [
    SecurityExecutorCapability.FREEZE_WEBHOOKS,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      dispatchMode: SecurityExecutionDispatchMode.FIRE_AND_FORGET,
      retryPolicy: freezeRetryPolicy(
        Object.freeze({
          eligible: true,
          maxAttempts: 2,
          backoff: 'EXPONENTIAL',
          metadata: Object.freeze({ bounded: true }),
        }),
      ),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.PREFERRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.HOT_PATH_SEQUENCE,
      parallelizable: true,
      hotPathSafe: true,
      backgroundSafe: false,
    }),
  ],
  [
    SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      dispatchMode: SecurityExecutionDispatchMode.AWAIT_ACK,
      retryPolicy: freezeRetryPolicy(
        Object.freeze({
          eligible: true,
          maxAttempts: 1,
          backoff: 'NONE',
          metadata: Object.freeze({ bounded: true, ackRequiredByStrategy: true }),
        }),
      ),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.HOT_PATH_SEQUENCE,
      parallelizable: false,
      hotPathSafe: true,
      backgroundSafe: false,
    }),
  ],
  [
    SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.IMMEDIATE,
      dispatchMode: SecurityExecutionDispatchMode.FIRE_AND_FORGET,
      retryPolicy: freezeRetryPolicy(
        Object.freeze({
          eligible: true,
          maxAttempts: 1,
          backoff: 'NONE',
          metadata: Object.freeze({ bounded: true }),
        }),
      ),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.AFTER_CONTAINMENT,
      parallelizable: false,
      hotPathSafe: true,
      backgroundSafe: false,
      metadata: Object.freeze({ requiresContainmentPlannedFirst: true }),
    }),
  ],
  [
    SecurityExecutorCapability.CREATE_INCIDENT,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      dispatchMode: SecurityExecutionDispatchMode.AWAIT_ACK,
      retryPolicy: freezeRetryPolicy(Object.freeze({ eligible: true, maxAttempts: 2, backoff: 'LINEAR' })),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.PREFERRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.NONE,
      parallelizable: true,
      hotPathSafe: false,
      backgroundSafe: true,
    }),
  ],
  [
    SecurityExecutorCapability.NOTIFY_AUDIT,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      dispatchMode: SecurityExecutionDispatchMode.AWAIT_ACK,
      retryPolicy: freezeRetryPolicy(Object.freeze({ eligible: true, maxAttempts: 2, backoff: 'LINEAR' })),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.PREFERRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.NONE,
      parallelizable: true,
      hotPathSafe: false,
      backgroundSafe: true,
    }),
  ],
  [
    SecurityExecutorCapability.ESCALATE,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      dispatchMode: SecurityExecutionDispatchMode.AWAIT_ACK,
      retryPolicy: freezeRetryPolicy(Object.freeze({ eligible: true, maxAttempts: 1, backoff: 'NONE' })),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.NOT_REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.NONE,
      parallelizable: true,
      hotPathSafe: false,
      backgroundSafe: true,
    }),
  ],
  [
    SecurityExecutorCapability.INVESTIGATE,
    Object.freeze({
      lane: SecurityHotPathExecutionLane.BACKGROUND,
      dispatchMode: SecurityExecutionDispatchMode.AWAIT_ACK,
      retryPolicy: freezeRetryPolicy(Object.freeze({ eligible: true, maxAttempts: 1, backoff: 'NONE' })),
      idempotencyPolicy: SecurityExecutionIdempotencyPolicy.NOT_REQUIRED,
      orderingConstraint: SecurityExecutionOrderingConstraint.NONE,
      parallelizable: true,
      hotPathSafe: false,
      backgroundSafe: true,
    }),
  ],
]);

function resolved(actionType: SecurityActionType, strategy: SecurityExecutionStrategy): SecurityExecutionStrategyResolution {
  return Object.freeze({
    actionType,
    resolved: true,
    reason: SecurityExecutionStrategyResolutionReason.RESOLVED,
    strategy: freezeStrategy(strategy),
  });
}

function unsupported(actionType: SecurityActionType): SecurityExecutionStrategyResolution {
  return Object.freeze({
    actionType,
    resolved: false,
    reason: SecurityExecutionStrategyResolutionReason.UNSUPPORTED_ACTION,
  });
}

function fromEntry(entry: SecurityExecutionTopologyEntry): SecurityExecutionStrategy | undefined {
  const template = CAPABILITY_STRATEGIES.get(entry.capability);
  if (!template) {
    return undefined;
  }

  return freezeStrategy(
    Object.freeze({
      actionType: entry.actionType,
      lane: template.lane,
      dispatchMode: template.dispatchMode,
      retryPolicy: template.retryPolicy,
      idempotencyPolicy: template.idempotencyPolicy,
      orderingConstraint: template.orderingConstraint,
      parallelizable: template.parallelizable,
      hotPathSafe: template.hotPathSafe,
      backgroundSafe: template.backgroundSafe,
      metadata: template.metadata,
    }),
  );
}

export class InMemorySecurityExecutionStrategyResolver implements SecurityExecutionStrategyResolver {
  constructor(
    private readonly topologyResolver: SecurityExecutionTopologyResolver = new InMemorySecurityExecutionTopologyResolver(),
  ) {}

  getProfile(): SecurityExecutionStrategyProfile {
    const strategies = this.topologyResolver
      .getTopology()
      .entries.map((entry) => fromEntry(entry))
      .filter((strategy): strategy is SecurityExecutionStrategy => Boolean(strategy));

    return Object.freeze({
      strategies: Object.freeze(strategies.map((strategy) => freezeStrategy(strategy))),
      metadata: Object.freeze({
        source: 'in-memory-security-execution-strategy-resolver',
        strategyCount: strategies.length,
      }),
    });
  }

  resolve(actionType: SecurityActionType): SecurityExecutionStrategyResolution {
    const topologyResolution = this.topologyResolver.resolve(actionType);
    if (!topologyResolution.resolved || !topologyResolution.entry) {
      return unsupported(actionType);
    }

    const strategy = fromEntry(topologyResolution.entry);
    if (!strategy) {
      return unsupported(actionType);
    }

    return resolved(actionType, strategy);
  }
}
