import { SecurityActionType } from './security-action-planner';
import {
  SecurityExecutionTopology,
  SecurityExecutionTopologyEntry,
  SecurityExecutionTopologyResolution,
  SecurityExecutionTopologyResolutionReason,
  SecurityExecutionTopologyResolver,
  SecurityExecutorCapability,
  SecurityExecutorDomain,
} from './security-execution-types';

function freezeEntry(entry: SecurityExecutionTopologyEntry): SecurityExecutionTopologyEntry {
  return Object.freeze({
    actionType: entry.actionType,
    domain: entry.domain,
    capability: entry.capability,
  });
}

const TOPOLOGY_ENTRIES: readonly SecurityExecutionTopologyEntry[] = Object.freeze([
  freezeEntry({
    actionType: SecurityActionType.REMOVE_UNAUTHORIZED_BOT,
    domain: SecurityExecutorDomain.BOT,
    capability: SecurityExecutorCapability.REMOVE_UNAUTHORIZED_BOT,
  }),
  freezeEntry({
    actionType: SecurityActionType.REMOVE_DANGEROUS_ROLE,
    domain: SecurityExecutorDomain.ROLE,
    capability: SecurityExecutorCapability.REMOVE_DANGEROUS_ROLE,
  }),
  freezeEntry({
    actionType: SecurityActionType.NEUTRALIZE_ESCALATED_MEMBER,
    domain: SecurityExecutorDomain.MEMBER,
    capability: SecurityExecutorCapability.NEUTRALIZE_ESCALATED_MEMBER,
  }),
  freezeEntry({
    actionType: SecurityActionType.QUARANTINE_ACTOR,
    domain: SecurityExecutorDomain.MEMBER,
    capability: SecurityExecutorCapability.QUARANTINE_ACTOR,
  }),
  freezeEntry({
    actionType: SecurityActionType.PUNISH_ROLE_ESCALATION_ACTOR,
    domain: SecurityExecutorDomain.MEMBER,
    capability: SecurityExecutorCapability.PUNISH_ROLE_ESCALATION_ACTOR,
  }),
  freezeEntry({
    actionType: SecurityActionType.LOCK_CHANNELS,
    domain: SecurityExecutorDomain.CHANNEL,
    capability: SecurityExecutorCapability.LOCK_CHANNELS,
  }),
  freezeEntry({
    actionType: SecurityActionType.FREEZE_WEBHOOKS,
    domain: SecurityExecutorDomain.WEBHOOK,
    capability: SecurityExecutorCapability.FREEZE_WEBHOOKS,
  }),
  freezeEntry({
    actionType: SecurityActionType.REVOKE_ESCALATION_SOURCE,
    domain: SecurityExecutorDomain.INTEGRATION,
    capability: SecurityExecutorCapability.REVOKE_ESCALATION_SOURCE,
  }),
  freezeEntry({
    actionType: SecurityActionType.CREATE_INCIDENT,
    domain: SecurityExecutorDomain.GUILD,
    capability: SecurityExecutorCapability.CREATE_INCIDENT,
  }),
  freezeEntry({
    actionType: SecurityActionType.NOTIFY_AUDIT,
    domain: SecurityExecutorDomain.GUILD,
    capability: SecurityExecutorCapability.NOTIFY_AUDIT,
  }),
  freezeEntry({
    actionType: SecurityActionType.RESTORE_RESOURCE,
    domain: SecurityExecutorDomain.GUILD,
    capability: SecurityExecutorCapability.RESTORE_RESOURCE,
  }),
  freezeEntry({
    actionType: SecurityActionType.ESCALATE,
    domain: SecurityExecutorDomain.GUILD,
    capability: SecurityExecutorCapability.ESCALATE,
  }),
  freezeEntry({
    actionType: SecurityActionType.INVESTIGATE,
    domain: SecurityExecutorDomain.GUILD,
    capability: SecurityExecutorCapability.INVESTIGATE,
  }),
]);

const TOPOLOGY: SecurityExecutionTopology = Object.freeze({
  entries: TOPOLOGY_ENTRIES,
  metadata: Object.freeze({
    source: 'in-memory-security-execution-topology-resolver',
    entryCount: TOPOLOGY_ENTRIES.length,
  }),
});

const ENTRY_BY_ACTION_TYPE = new Map<SecurityActionType, SecurityExecutionTopologyEntry>(
  TOPOLOGY_ENTRIES.map((entry) => [entry.actionType, entry] as const),
);

function resolved(
  actionType: SecurityActionType,
  entry: SecurityExecutionTopologyEntry,
): SecurityExecutionTopologyResolution {
  return Object.freeze({
    actionType,
    resolved: true,
    reason: SecurityExecutionTopologyResolutionReason.RESOLVED,
    entry,
  });
}

function unsupported(actionType: SecurityActionType): SecurityExecutionTopologyResolution {
  return Object.freeze({
    actionType,
    resolved: false,
    reason: SecurityExecutionTopologyResolutionReason.UNSUPPORTED_ACTION,
  });
}

export class InMemorySecurityExecutionTopologyResolver implements SecurityExecutionTopologyResolver {
  getTopology(): SecurityExecutionTopology {
    return TOPOLOGY;
  }

  resolve(actionType: SecurityActionType): SecurityExecutionTopologyResolution {
    const entry = ENTRY_BY_ACTION_TYPE.get(actionType);
    if (!entry) {
      return unsupported(actionType);
    }

    return resolved(actionType, entry);
  }
}
