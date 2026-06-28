import { SecurityActionType } from './security-action-planner';
import {
  SecurityExecutionCapabilityResolution,
  SecurityExecutionCapabilityResolutionReason,
  SecurityExecutionCapabilityResolver,
  SecurityExecutionTopologyEntry,
  SecurityExecutionTopologyResolver,
} from './security-execution-types';
import { InMemorySecurityExecutionTopologyResolver } from './security-execution-topology';

function resolved(
  actionType: SecurityActionType,
  topologyEntry: SecurityExecutionTopologyEntry,
): SecurityExecutionCapabilityResolution {
  return Object.freeze({
    actionType,
    resolved: true,
    reason: SecurityExecutionCapabilityResolutionReason.RESOLVED,
    domain: topologyEntry.domain,
    capability: topologyEntry.capability,
  });
}

function unsupported(actionType: SecurityActionType): SecurityExecutionCapabilityResolution {
  return Object.freeze({
    actionType,
    resolved: false,
    reason: SecurityExecutionCapabilityResolutionReason.UNSUPPORTED_ACTION,
  });
}

export class InMemorySecurityExecutionCapabilityResolver implements SecurityExecutionCapabilityResolver {
  constructor(
    private readonly topologyResolver: SecurityExecutionTopologyResolver = new InMemorySecurityExecutionTopologyResolver(),
  ) {}

  resolve(actionType: SecurityActionType): SecurityExecutionCapabilityResolution {
    const topologyResolution = this.topologyResolver.resolve(actionType);
    if (!topologyResolution.resolved || !topologyResolution.entry) {
      return unsupported(actionType);
    }

    return resolved(actionType, topologyResolution.entry);
  }
}
