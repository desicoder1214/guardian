export enum SecurityIncidentSource {
  UNAUTHORIZED_BOT_PROTECTION = 'UNAUTHORIZED_BOT_PROTECTION',
  DANGEROUS_ROLE_GRANT = 'DANGEROUS_ROLE_GRANT',
  ABUSED_INVITE_DANGEROUS_ROLE_JOIN = 'ABUSED_INVITE_DANGEROUS_ROLE_JOIN',
  WEBHOOK_PROTECTION = 'WEBHOOK_PROTECTION',
  CHANNEL_PROTECTION = 'CHANNEL_PROTECTION',
  RECOVERY_RECONCILIATION = 'RECOVERY_RECONCILIATION',
}

export enum SecurityCoordinatedActionType {
  REMOVE_UNAUTHORIZED_BOT = 'REMOVE_UNAUTHORIZED_BOT',
  REMOVE_DANGEROUS_ROLE = 'REMOVE_DANGEROUS_ROLE',
  NEUTRALIZE_JOINED_MEMBER = 'NEUTRALIZE_JOINED_MEMBER',
  FREEZE_WEBHOOKS = 'FREEZE_WEBHOOKS',
  LOCK_CHANNELS = 'LOCK_CHANNELS',
  RECOVERY_RESTORE_RESOURCE = 'RECOVERY_RESTORE_RESOURCE',
  INVESTIGATE_INVITE_SOURCE = 'INVESTIGATE_INVITE_SOURCE',
  INVESTIGATE_ROLE_ASSIGNMENT_SOURCE = 'INVESTIGATE_ROLE_ASSIGNMENT_SOURCE',
}

export enum SecurityCoordinationStage {
  INCIDENT_VALIDATION = 'INCIDENT_VALIDATION',
  INCIDENT_CORRELATION = 'INCIDENT_CORRELATION',
  DUPLICATE_SUPPRESSION = 'DUPLICATE_SUPPRESSION',
  CONFLICT_DETECTION = 'CONFLICT_DETECTION',
  EXECUTION_GRAPH_PLANNING = 'EXECUTION_GRAPH_PLANNING',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum SecurityCoordinationVerificationOutcome {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum SecurityActionPhase {
  P0_CONTAINMENT = 'P0_CONTAINMENT',
  P1_BOUNDARY = 'P1_BOUNDARY',
  P2_RECOVERY = 'P2_RECOVERY',
  P3_INVESTIGATION = 'P3_INVESTIGATION',
}

export interface SecurityIncidentAction {
  readonly actionType: SecurityCoordinatedActionType;
  readonly targetId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityIncidentEnvelope {
  readonly incidentId: string;
  readonly source: SecurityIncidentSource;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly actions: readonly SecurityIncidentAction[];
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityMultiIncidentCoordinationRequest {
  readonly coordinationId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly incidents: readonly SecurityIncidentEnvelope[];
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionGraphNode {
  readonly nodeId: string;
  readonly actionId: string;
  readonly actionType: SecurityCoordinatedActionType;
  readonly phase: SecurityActionPhase;
  readonly targetId: string;
  readonly incidentSource: SecurityIncidentSource;
  readonly incidentId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly sequence: number;
  readonly attributionPending: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityExecutionGraphEdge {
  readonly edgeId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly reason: 'ORDERING' | 'RECOVERY_AFTER_CONTAINMENT';
}

export interface SecurityConflict {
  readonly conflictId: string;
  readonly actionType: SecurityCoordinatedActionType;
  readonly targetId: string;
  readonly conflictingIncidentIds: readonly string[];
  readonly summary: string;
}

export interface SecurityCoordinatedAction {
  readonly actionId: string;
  readonly actionType: SecurityCoordinatedActionType;
  readonly phase: SecurityActionPhase;
  readonly targetId: string;
  readonly incidentSource: SecurityIncidentSource;
  readonly incidentId: string;
  readonly incidentCorrelationId: string;
  readonly incidentTransactionId: string;
  readonly incidentRuntimeId: string;
  readonly incidentGuildId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly attributionPending: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityMultiIncidentCoordinationReport {
  readonly coordinationId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly stagesCompleted: readonly SecurityCoordinationStage[];
  readonly correlatedIncidents: readonly SecurityIncidentEnvelope[];
  readonly coordinatedActions: readonly SecurityCoordinatedAction[];
  readonly duplicatesSuppressed: readonly SecurityCoordinatedAction[];
  readonly conflicts: readonly SecurityConflict[];
  readonly executionGraph: {
    readonly nodes: readonly SecurityExecutionGraphNode[];
    readonly edges: readonly SecurityExecutionGraphEdge[];
  };
  readonly verificationOutcome: SecurityCoordinationVerificationOutcome;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-security-multi-incident-coordination-engine';
    readonly deterministicCoordinationId: true;
    readonly failClosed: true;
    readonly recoveryAfterContainmentEnforced: boolean;
    readonly attributionDidNotBlockContainment: boolean;
  };
}

export interface SecurityMultiIncidentCoordinationEngine {
  execute(
    request: SecurityMultiIncidentCoordinationRequest,
  ): Promise<SecurityMultiIncidentCoordinationReport>;
}

const FAILURE_COORDINATION_ID_REQUIRED = 'COORDINATION_ID_REQUIRED';
const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_INCIDENT_ID_REQUIRED = 'INCIDENT_ID_REQUIRED';
const FAILURE_INCIDENT_CONTEXT_MISMATCH = 'INCIDENT_CONTEXT_MISMATCH';
const FAILURE_DUPLICATE_INCIDENT_ID = 'DUPLICATE_INCIDENT_ID';
const FAILURE_ACTION_TARGET_REQUIRED = 'ACTION_TARGET_REQUIRED';
const FAILURE_CONFLICT_DETECTED = 'CONFLICT_DETECTED';
const FAILURE_RECOVERY_ORDERING_FAILED = 'RECOVERY_ORDERING_FAILED';

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

function phaseForAction(actionType: SecurityCoordinatedActionType): SecurityActionPhase {
  switch (actionType) {
    case SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT:
    case SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE:
    case SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER:
    case SecurityCoordinatedActionType.FREEZE_WEBHOOKS:
      return SecurityActionPhase.P0_CONTAINMENT;
    case SecurityCoordinatedActionType.LOCK_CHANNELS:
      return SecurityActionPhase.P1_BOUNDARY;
    case SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE:
      return SecurityActionPhase.P2_RECOVERY;
    default:
      return SecurityActionPhase.P3_INVESTIGATION;
  }
}

function phaseRank(phase: SecurityActionPhase): number {
  switch (phase) {
    case SecurityActionPhase.P0_CONTAINMENT:
      return 0;
    case SecurityActionPhase.P1_BOUNDARY:
      return 1;
    case SecurityActionPhase.P2_RECOVERY:
      return 2;
    default:
      return 3;
  }
}

function actionTypeRank(actionType: SecurityCoordinatedActionType): number {
  switch (actionType) {
    case SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT:
      return 0;
    case SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE:
      return 1;
    case SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER:
      return 2;
    case SecurityCoordinatedActionType.FREEZE_WEBHOOKS:
      return 3;
    case SecurityCoordinatedActionType.LOCK_CHANNELS:
      return 4;
    case SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE:
      return 5;
    case SecurityCoordinatedActionType.INVESTIGATE_INVITE_SOURCE:
      return 6;
    default:
      return 7;
  }
}

function freezeIncidentAction(action: SecurityIncidentAction): SecurityIncidentAction {
  return deepFreeze({
    ...action,
    metadata: action.metadata ? Object.freeze({ ...action.metadata }) : undefined,
  });
}

function freezeIncident(incident: SecurityIncidentEnvelope): SecurityIncidentEnvelope {
  return deepFreeze({
    ...incident,
    actions: Object.freeze(incident.actions.map((action) => freezeIncidentAction(action))),
    metadata: incident.metadata ? Object.freeze({ ...incident.metadata }) : undefined,
  });
}

export function freezeSecurityMultiIncidentCoordinationRequest(
  request: SecurityMultiIncidentCoordinationRequest,
): SecurityMultiIncidentCoordinationRequest {
  return deepFreeze({
    ...request,
    incidents: Object.freeze(request.incidents.map((incident) => freezeIncident(incident))),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeCoordinatedAction(action: SecurityCoordinatedAction): SecurityCoordinatedAction {
  return deepFreeze({
    ...action,
    metadata: action.metadata ? Object.freeze({ ...action.metadata }) : undefined,
  });
}

function freezeNode(node: SecurityExecutionGraphNode): SecurityExecutionGraphNode {
  return deepFreeze({
    ...node,
    metadata: node.metadata ? Object.freeze({ ...node.metadata }) : undefined,
  });
}

function freezeEdge(edge: SecurityExecutionGraphEdge): SecurityExecutionGraphEdge {
  return deepFreeze({ ...edge });
}

function freezeConflict(conflict: SecurityConflict): SecurityConflict {
  return deepFreeze({
    ...conflict,
    conflictingIncidentIds: Object.freeze([...conflict.conflictingIncidentIds]),
  });
}

function freezeReport(
  report: SecurityMultiIncidentCoordinationReport,
): SecurityMultiIncidentCoordinationReport {
  return deepFreeze({
    ...report,
    stagesCompleted: Object.freeze([...report.stagesCompleted]),
    correlatedIncidents: Object.freeze(report.correlatedIncidents.map((incident) => freezeIncident(incident))),
    coordinatedActions: Object.freeze(report.coordinatedActions.map((action) => freezeCoordinatedAction(action))),
    duplicatesSuppressed: Object.freeze(report.duplicatesSuppressed.map((action) => freezeCoordinatedAction(action))),
    conflicts: Object.freeze(report.conflicts.map((conflict) => freezeConflict(conflict))),
    executionGraph: Object.freeze({
      nodes: Object.freeze(report.executionGraph.nodes.map((node) => freezeNode(node))),
      edges: Object.freeze(report.executionGraph.edges.map((edge) => freezeEdge(edge))),
    }),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicCoordinationId(
  request: SecurityMultiIncidentCoordinationRequest,
): string {
  const signature = [...request.incidents]
    .map(
      (incident) =>
        `${incident.incidentId}:${incident.source}:${incident.actions
          .map((action) => `${action.actionType}:${action.targetId}`)
          .join(',')}`,
    )
    .sort((left, right) => left.localeCompare(right))
    .join('|');

  return [
    'security-multi-incident-coordination',
    request.correlationId,
    request.transactionId,
    request.runtimeId,
    request.guildId,
    signature,
  ].join(':');
}

function actionKey(action: SecurityIncidentAction): string {
  return `${action.actionType}:${action.targetId}`;
}

function resolveAttributionPending(metadata?: Record<string, unknown>): boolean {
  return metadata?.attributionPending === true;
}

function hasConflictingPair(
  left: SecurityCoordinatedAction,
  right: SecurityCoordinatedAction,
): boolean {
  if (left.targetId !== right.targetId) {
    return false;
  }

  const forwardConflict =
    left.actionType === SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE &&
    (right.actionType === SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE ||
      right.actionType === SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT ||
      right.actionType === SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER ||
      right.actionType === SecurityCoordinatedActionType.FREEZE_WEBHOOKS ||
      right.actionType === SecurityCoordinatedActionType.LOCK_CHANNELS);

  const reverseConflict =
    right.actionType === SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE &&
    (left.actionType === SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE ||
      left.actionType === SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT ||
      left.actionType === SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER ||
      left.actionType === SecurityCoordinatedActionType.FREEZE_WEBHOOKS ||
      left.actionType === SecurityCoordinatedActionType.LOCK_CHANNELS);

  return forwardConflict || reverseConflict;
}

function buildFailureReport(
  request: SecurityMultiIncidentCoordinationRequest,
  coordinationId: string,
  stagesCompleted: readonly SecurityCoordinationStage[],
  failureReason: string,
  startedAtMs: number,
): SecurityMultiIncidentCoordinationReport {
  return freezeReport({
    coordinationId,
    correlationId: request.correlationId,
    transactionId: request.transactionId,
    runtimeId: request.runtimeId,
    guildId: request.guildId,
    stagesCompleted,
    correlatedIncidents: Object.freeze([]),
    coordinatedActions: Object.freeze([]),
    duplicatesSuppressed: Object.freeze([]),
    conflicts: Object.freeze([]),
    executionGraph: Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) }),
    verificationOutcome: SecurityCoordinationVerificationOutcome.FAILED,
    success: false,
    failureReason,
    idempotentReplay: false,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(Date.now()).toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    metadata: Object.freeze({
      source: 'in-memory-security-multi-incident-coordination-engine' as const,
      deterministicCoordinationId: true as const,
      failClosed: true as const,
      recoveryAfterContainmentEnforced: false,
      attributionDidNotBlockContainment: false,
    }),
  });
}

export class InMemorySecurityMultiIncidentCoordinationEngine
  implements SecurityMultiIncidentCoordinationEngine
{
  private readonly completedReports = new Map<string, SecurityMultiIncidentCoordinationReport>();

  async execute(
    request: SecurityMultiIncidentCoordinationRequest,
  ): Promise<SecurityMultiIncidentCoordinationReport> {
    const frozenRequest = freezeSecurityMultiIncidentCoordinationRequest(request);
    const coordinationId = frozenRequest.coordinationId ?? toDeterministicCoordinationId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(coordinationId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const stages: SecurityCoordinationStage[] = [];
    stages.push(SecurityCoordinationStage.INCIDENT_VALIDATION);

    const failures: string[] = [];
    if (!isNonEmptyString(coordinationId)) {
      failures.push(FAILURE_COORDINATION_ID_REQUIRED);
    }
    if (!isNonEmptyString(frozenRequest.correlationId)) {
      failures.push(FAILURE_CORRELATION_ID_REQUIRED);
    }
    if (!isNonEmptyString(frozenRequest.transactionId)) {
      failures.push(FAILURE_TRANSACTION_ID_REQUIRED);
    }
    if (!isNonEmptyString(frozenRequest.runtimeId)) {
      failures.push(FAILURE_RUNTIME_ID_REQUIRED);
    }
    if (!isNonEmptyString(frozenRequest.guildId)) {
      failures.push(FAILURE_GUILD_ID_REQUIRED);
    }

    const seenIncidentIds = new Set<string>();
    for (const incident of frozenRequest.incidents) {
      if (!isNonEmptyString(incident.incidentId)) {
        failures.push(FAILURE_INCIDENT_ID_REQUIRED);
      }
      if (seenIncidentIds.has(incident.incidentId)) {
        failures.push(`${FAILURE_DUPLICATE_INCIDENT_ID}:${incident.incidentId}`);
      }
      seenIncidentIds.add(incident.incidentId);

      if (
        incident.correlationId !== frozenRequest.correlationId ||
        incident.transactionId !== frozenRequest.transactionId ||
        incident.runtimeId !== frozenRequest.runtimeId ||
        incident.guildId !== frozenRequest.guildId
      ) {
        failures.push(`${FAILURE_INCIDENT_CONTEXT_MISMATCH}:${incident.incidentId}`);
      }

      for (const action of incident.actions) {
        if (!isNonEmptyString(action.targetId)) {
          failures.push(`${FAILURE_ACTION_TARGET_REQUIRED}:${incident.incidentId}:${action.actionType}`);
        }
      }
    }

    if (failures.length > 0) {
      stages.push(SecurityCoordinationStage.REPORT_GENERATION);
      const failedReport = buildFailureReport(
        frozenRequest,
        coordinationId,
        Object.freeze(stages),
        failures.join(','),
        startedAtMs,
      );
      this.completedReports.set(coordinationId, failedReport);
      return failedReport;
    }

    stages.push(SecurityCoordinationStage.INCIDENT_CORRELATION);
    const correlatedIncidents = Object.freeze(
      [...frozenRequest.incidents].sort((left, right) => left.incidentId.localeCompare(right.incidentId)),
    );

    stages.push(SecurityCoordinationStage.DUPLICATE_SUPPRESSION);
    const dedupedByKey = new Map<string, SecurityCoordinatedAction>();
    const duplicatesSuppressed: SecurityCoordinatedAction[] = [];
    for (const incident of correlatedIncidents) {
      for (const action of incident.actions) {
        const coordinated: SecurityCoordinatedAction = freezeCoordinatedAction({
          actionId: `${coordinationId}:action:${incident.incidentId}:${action.actionType}:${action.targetId}`,
          actionType: action.actionType,
          phase: phaseForAction(action.actionType),
          targetId: action.targetId,
          incidentSource: incident.source,
          incidentId: incident.incidentId,
          incidentCorrelationId: incident.correlationId,
          incidentTransactionId: incident.transactionId,
          incidentRuntimeId: incident.runtimeId,
          incidentGuildId: incident.guildId,
          correlationId: frozenRequest.correlationId,
          transactionId: frozenRequest.transactionId,
          runtimeId: frozenRequest.runtimeId,
          guildId: frozenRequest.guildId,
          attributionPending: resolveAttributionPending(action.metadata),
          metadata: action.metadata ? Object.freeze({ ...action.metadata }) : undefined,
        });

        const key = actionKey(action);
        if (dedupedByKey.has(key)) {
          duplicatesSuppressed.push(coordinated);
          continue;
        }
        dedupedByKey.set(key, coordinated);
      }
    }
    const coordinatedActions = Object.freeze([...dedupedByKey.values()]);

    stages.push(SecurityCoordinationStage.CONFLICT_DETECTION);
    const conflicts: SecurityConflict[] = [];
    for (let index = 0; index < coordinatedActions.length; index += 1) {
      for (let nested = index + 1; nested < coordinatedActions.length; nested += 1) {
        const left = coordinatedActions[index];
        const right = coordinatedActions[nested];
        if (!hasConflictingPair(left, right)) {
          continue;
        }

        conflicts.push(
          freezeConflict({
            conflictId: `${coordinationId}:conflict:${left.targetId}:${left.actionType}:${right.actionType}`,
            actionType: left.actionType,
            targetId: left.targetId,
            conflictingIncidentIds: Object.freeze([left.incidentId, right.incidentId].sort()),
            summary: `Conflicting actions detected for target ${left.targetId}: ${left.actionType} vs ${right.actionType}`,
          }),
        );
      }
    }

    if (conflicts.length > 0) {
      stages.push(SecurityCoordinationStage.REPORT_GENERATION);
      const report = freezeReport({
        coordinationId,
        correlationId: frozenRequest.correlationId,
        transactionId: frozenRequest.transactionId,
        runtimeId: frozenRequest.runtimeId,
        guildId: frozenRequest.guildId,
        stagesCompleted: Object.freeze(stages),
        correlatedIncidents,
        coordinatedActions,
        duplicatesSuppressed: Object.freeze(duplicatesSuppressed),
        conflicts: Object.freeze(conflicts),
        executionGraph: Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) }),
        verificationOutcome: SecurityCoordinationVerificationOutcome.FAILED,
        success: false,
        failureReason: `${FAILURE_CONFLICT_DETECTED}:${conflicts.map((conflict) => conflict.conflictId).join('|')}`,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
        metadata: Object.freeze({
          source: 'in-memory-security-multi-incident-coordination-engine' as const,
          deterministicCoordinationId: true as const,
          failClosed: true as const,
          recoveryAfterContainmentEnforced: false,
          attributionDidNotBlockContainment: true,
        }),
      });
      this.completedReports.set(coordinationId, report);
      return report;
    }

    stages.push(SecurityCoordinationStage.EXECUTION_GRAPH_PLANNING);
    const orderedActions = [...coordinatedActions].sort((left, right) => {
      const phaseDiff = phaseRank(left.phase) - phaseRank(right.phase);
      if (phaseDiff !== 0) {
        return phaseDiff;
      }

      const typeDiff = actionTypeRank(left.actionType) - actionTypeRank(right.actionType);
      if (typeDiff !== 0) {
        return typeDiff;
      }

      const incidentDiff = left.incidentId.localeCompare(right.incidentId);
      if (incidentDiff !== 0) {
        return incidentDiff;
      }

      return left.targetId.localeCompare(right.targetId);
    });

    const nodes: SecurityExecutionGraphNode[] = orderedActions.map((action, index) =>
      freezeNode({
        nodeId: `${coordinationId}:node:${index + 1}`,
        actionId: action.actionId,
        actionType: action.actionType,
        phase: action.phase,
        targetId: action.targetId,
        incidentSource: action.incidentSource,
        incidentId: action.incidentId,
        correlationId: action.correlationId,
        transactionId: action.transactionId,
        runtimeId: action.runtimeId,
        guildId: action.guildId,
        sequence: index + 1,
        attributionPending: action.attributionPending,
        metadata: action.metadata,
      }),
    );

    const edges: SecurityExecutionGraphEdge[] = [];
    for (let index = 1; index < nodes.length; index += 1) {
      edges.push(
        freezeEdge({
          edgeId: `${coordinationId}:edge:ordering:${index}`,
          fromNodeId: nodes[index - 1].nodeId,
          toNodeId: nodes[index].nodeId,
          reason: 'ORDERING',
        }),
      );
    }

    const containmentNodeIds = nodes
      .filter((node) => node.phase === SecurityActionPhase.P0_CONTAINMENT || node.phase === SecurityActionPhase.P1_BOUNDARY)
      .map((node) => node.nodeId);

    for (const recoveryNode of nodes.filter((node) => node.phase === SecurityActionPhase.P2_RECOVERY)) {
      for (const containmentNodeId of containmentNodeIds) {
        edges.push(
          freezeEdge({
            edgeId: `${coordinationId}:edge:recovery:${containmentNodeId}:${recoveryNode.nodeId}`,
            fromNodeId: containmentNodeId,
            toNodeId: recoveryNode.nodeId,
            reason: 'RECOVERY_AFTER_CONTAINMENT',
          }),
        );
      }
    }

    const firstRecoverySequence = nodes.find((node) => node.phase === SecurityActionPhase.P2_RECOVERY)?.sequence;
    const maxContainmentSequence = Math.max(
      0,
      ...nodes
        .filter((node) => node.phase === SecurityActionPhase.P0_CONTAINMENT || node.phase === SecurityActionPhase.P1_BOUNDARY)
        .map((node) => node.sequence),
    );
    const recoveryOrderingValid = firstRecoverySequence === undefined || firstRecoverySequence > maxContainmentSequence;
    if (!recoveryOrderingValid) {
      stages.push(SecurityCoordinationStage.REPORT_GENERATION);
      const report = buildFailureReport(
        frozenRequest,
        coordinationId,
        Object.freeze(stages),
        FAILURE_RECOVERY_ORDERING_FAILED,
        startedAtMs,
      );
      this.completedReports.set(coordinationId, report);
      return report;
    }

    const attributionDidNotBlockContainment = nodes.every((node) => {
      if (!node.attributionPending) {
        return true;
      }

      return node.phase === SecurityActionPhase.P0_CONTAINMENT ||
        node.phase === SecurityActionPhase.P1_BOUNDARY ||
        node.phase === SecurityActionPhase.P3_INVESTIGATION;
    });

    stages.push(SecurityCoordinationStage.REPORT_GENERATION);
    const report = freezeReport({
      coordinationId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      runtimeId: frozenRequest.runtimeId,
      guildId: frozenRequest.guildId,
      stagesCompleted: Object.freeze(stages),
      correlatedIncidents,
      coordinatedActions: Object.freeze(orderedActions),
      duplicatesSuppressed: Object.freeze(duplicatesSuppressed),
      conflicts: Object.freeze(conflicts),
      executionGraph: Object.freeze({
        nodes: Object.freeze(nodes),
        edges: Object.freeze(edges),
      }),
      verificationOutcome: SecurityCoordinationVerificationOutcome.VERIFIED,
      success: true,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-security-multi-incident-coordination-engine' as const,
        deterministicCoordinationId: true as const,
        failClosed: true as const,
        recoveryAfterContainmentEnforced: true,
        attributionDidNotBlockContainment,
      }),
    });

    this.completedReports.set(coordinationId, report);
    return report;
  }
}