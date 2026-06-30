import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  freezeSecurityMultiIncidentCoordinationRequest,
  InMemorySecurityMultiIncidentCoordinationEngine,
  SecurityCoordinatedActionType,
  SecurityCoordinationStage,
  SecurityCoordinationVerificationOutcome,
  SecurityIncidentEnvelope,
  SecurityIncidentSource,
  SecurityMultiIncidentCoordinationRequest,
} from '../../src/core/runtime/security/security-multi-incident-coordination-engine';

function buildIncident(
  source: SecurityIncidentSource,
  incidentId: string,
  actions: ReadonlyArray<{ actionType: SecurityCoordinatedActionType; targetId: string; attributionPending?: boolean }>,
): SecurityIncidentEnvelope {
  return Object.freeze({
    incidentId,
    source,
    correlationId: 'corr-multi-incident-1',
    transactionId: 'txn-multi-incident-1',
    runtimeId: 'runtime-multi-incident-1',
    guildId: 'guild-multi-incident-1',
    actions: Object.freeze(
      actions.map((action) =>
        Object.freeze({
          actionType: action.actionType,
          targetId: action.targetId,
          metadata: Object.freeze({ attributionPending: action.attributionPending === true }),
        }),
      ),
    ),
    metadata: Object.freeze({ source: 'unit-test' }),
  });
}

function buildRequest(
  incidents: readonly SecurityIncidentEnvelope[],
  overrides: Partial<SecurityMultiIncidentCoordinationRequest> = {},
): SecurityMultiIncidentCoordinationRequest {
  return Object.freeze({
    correlationId: 'corr-multi-incident-1',
    transactionId: 'txn-multi-incident-1',
    runtimeId: 'runtime-multi-incident-1',
    guildId: 'guild-multi-incident-1',
    incidents: Object.freeze([...incidents]),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

describe('SecurityMultiIncidentCoordinationEngine', () => {
  test('simultaneous unauthorized bot and dangerous role join are merged', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.UNAUTHORIZED_BOT_PROTECTION, 'incident-bot-1', [
          { actionType: SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT, targetId: 'bot-rogue-1' },
        ]),
        buildIncident(SecurityIncidentSource.ABUSED_INVITE_DANGEROUS_ROLE_JOIN, 'incident-join-1', [
          { actionType: SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE, targetId: 'role-dangerous-1', attributionPending: true },
          { actionType: SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER, targetId: 'member-joined-1', attributionPending: true },
        ]),
      ]),
    );

    expect(report.success).toBe(true);
    expect(report.coordinatedActions.map((action) => action.actionType)).toEqual([
      SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT,
      SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE,
      SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER,
    ]);
  });

  test('dangerous role join and webhook attack are merged', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.ABUSED_INVITE_DANGEROUS_ROLE_JOIN, 'incident-join-2', [
          { actionType: SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE, targetId: 'role-dangerous-2' },
          { actionType: SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER, targetId: 'member-2' },
        ]),
        buildIncident(SecurityIncidentSource.WEBHOOK_PROTECTION, 'incident-webhook-1', [
          { actionType: SecurityCoordinatedActionType.FREEZE_WEBHOOKS, targetId: 'webhook-rogue-1' },
        ]),
      ]),
    );

    expect(report.success).toBe(true);
    expect(report.coordinatedActions.map((action) => action.actionType)).toEqual([
      SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE,
      SecurityCoordinatedActionType.NEUTRALIZE_JOINED_MEMBER,
      SecurityCoordinatedActionType.FREEZE_WEBHOOKS,
    ]);
  });

  test('duplicate containment suppression removes duplicates', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.DANGEROUS_ROLE_GRANT, 'incident-role-dup-1', [
          { actionType: SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE, targetId: 'role-dup-1' },
        ]),
        buildIncident(SecurityIncidentSource.ABUSED_INVITE_DANGEROUS_ROLE_JOIN, 'incident-role-dup-2', [
          { actionType: SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE, targetId: 'role-dup-1' },
        ]),
      ]),
    );

    expect(report.success).toBe(true);
    expect(
      report.coordinatedActions.filter((action) => action.actionType === SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE),
    ).toHaveLength(1);
    expect(report.duplicatesSuppressed).toHaveLength(1);
  });

  test('execution ordering follows P0 P1 P2 P3 priority', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.RECOVERY_RECONCILIATION, 'incident-recovery-1', [
          { actionType: SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE, targetId: 'resource-a' },
        ]),
        buildIncident(SecurityIncidentSource.WEBHOOK_PROTECTION, 'incident-webhook-order-1', [
          { actionType: SecurityCoordinatedActionType.FREEZE_WEBHOOKS, targetId: 'webhook-a' },
        ]),
        buildIncident(SecurityIncidentSource.CHANNEL_PROTECTION, 'incident-channel-order-1', [
          { actionType: SecurityCoordinatedActionType.LOCK_CHANNELS, targetId: 'resource-b' },
        ]),
        buildIncident(SecurityIncidentSource.ABUSED_INVITE_DANGEROUS_ROLE_JOIN, 'incident-investigate-1', [
          { actionType: SecurityCoordinatedActionType.INVESTIGATE_INVITE_SOURCE, targetId: 'invite-a', attributionPending: true },
        ]),
      ]),
    );

    expect(report.success).toBe(true);
    expect(report.coordinatedActions.map((entry) => entry.actionType)).toEqual([
      SecurityCoordinatedActionType.FREEZE_WEBHOOKS,
      SecurityCoordinatedActionType.LOCK_CHANNELS,
      SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE,
      SecurityCoordinatedActionType.INVESTIGATE_INVITE_SOURCE,
    ]);
    expect(report.metadata.attributionDidNotBlockContainment).toBe(true);
  });

  test('conflicting actions fail closed', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.RECOVERY_RECONCILIATION, 'incident-conflict-recovery-1', [
          { actionType: SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE, targetId: 'resource-1' },
        ]),
        buildIncident(SecurityIncidentSource.DANGEROUS_ROLE_GRANT, 'incident-conflict-role-1', [
          { actionType: SecurityCoordinatedActionType.REMOVE_DANGEROUS_ROLE, targetId: 'resource-1' },
        ]),
      ]),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityCoordinationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('CONFLICT_DETECTED');
    expect(report.conflicts.length).toBeGreaterThan(0);
  });

  test('startup reconciliation merged with live incidents and recovery starts after containment', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        buildIncident(SecurityIncidentSource.RECOVERY_RECONCILIATION, 'incident-startup-recovery-1', [
          { actionType: SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE, targetId: 'resource-2' },
        ]),
        buildIncident(SecurityIncidentSource.UNAUTHORIZED_BOT_PROTECTION, 'incident-live-bot-1', [
          { actionType: SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT, targetId: 'bot-2' },
        ]),
      ]),
    );

    expect(report.success).toBe(true);
    const containmentSeq =
      report.executionGraph.nodes.find((node) => node.actionType === SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT)
        ?.sequence ?? 0;
    const recoverySeq =
      report.executionGraph.nodes.find((node) => node.actionType === SecurityCoordinatedActionType.RECOVERY_RESTORE_RESOURCE)
        ?.sequence ?? 0;
    expect(recoverySeq).toBeGreaterThan(containmentSeq);
    expect(report.metadata.recoveryAfterContainmentEnforced).toBe(true);
  });

  test('deterministic IDs are stable for equivalent requests', async () => {
    const engineA = new InMemorySecurityMultiIncidentCoordinationEngine();
    const engineB = new InMemorySecurityMultiIncidentCoordinationEngine();
    const request = buildRequest([
      buildIncident(SecurityIncidentSource.UNAUTHORIZED_BOT_PROTECTION, 'incident-idem-1', [
        { actionType: SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT, targetId: 'bot-3' },
      ]),
    ]);

    const first = await engineA.execute(request);
    const second = await engineB.execute(request);

    expect(first.coordinationId).toBe(second.coordinationId);
    expect(first.executionGraph.nodes.map((node) => node.nodeId)).toEqual(
      second.executionGraph.nodes.map((node) => node.nodeId),
    );
  });

  test('idempotent replay', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const request = buildRequest([
      buildIncident(SecurityIncidentSource.WEBHOOK_PROTECTION, 'incident-replay-1', [
        { actionType: SecurityCoordinatedActionType.FREEZE_WEBHOOKS, targetId: 'webhook-replay-1' },
      ]),
    ]);

    const first = await engine.execute(request);
    const second = await engine.execute(request);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(first.coordinationId).toBe(second.coordinationId);
  });

  test('immutable request and reports are deeply frozen', async () => {
    const request = freezeSecurityMultiIncidentCoordinationRequest(
      buildRequest([
        buildIncident(SecurityIncidentSource.CHANNEL_PROTECTION, 'incident-immut-1', [
          { actionType: SecurityCoordinatedActionType.LOCK_CHANNELS, targetId: 'channel-immut-1' },
        ]),
      ]),
    );

    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.incidents)).toBe(true);
    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);

    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(request);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.coordinatedActions)).toBe(true);
    expect(Object.isFrozen(report.executionGraph.nodes)).toBe(true);
    expect(Object.isFrozen(report.executionGraph.edges)).toBe(true);
    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('fail closed behavior on inconsistent incident context', async () => {
    const engine = new InMemorySecurityMultiIncidentCoordinationEngine();
    const report = await engine.execute(
      buildRequest([
        Object.freeze({
          ...buildIncident(SecurityIncidentSource.UNAUTHORIZED_BOT_PROTECTION, 'incident-bad-1', [
            { actionType: SecurityCoordinatedActionType.REMOVE_UNAUTHORIZED_BOT, targetId: 'bot-bad-1' },
          ]),
          runtimeId: 'runtime-mismatch',
        }),
      ]),
    );

    expect(report.success).toBe(false);
    expect(report.verificationOutcome).toBe(SecurityCoordinationVerificationOutcome.FAILED);
    expect(report.failureReason).toContain('INCIDENT_CONTEXT_MISMATCH');
    expect(report.stagesCompleted).toEqual([
      SecurityCoordinationStage.INCIDENT_VALIDATION,
      SecurityCoordinationStage.REPORT_GENERATION,
    ]);
  });

  test('source has no discord rest, discord.js, persistence, filesystem, or command dashboard surfaces', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/core/runtime/security/security-multi-incident-coordination-engine.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/discord\.js/i);
    expect(source).not.toMatch(/fetch\s*\(/i);
    expect(source).not.toMatch(/DiscordRest|DiscordREST|RESTClient|ProductionDiscord|discord\.com\/api/i);
    expect(source).not.toMatch(/node:fs|from\s+['"]fs['"]|writeFile|appendFile|createWriteStream/i);
    expect(source).not.toMatch(/typeorm|prisma|mongoose|sequelize|persist|repository|save\s*\(/i);
    expect(source).not.toMatch(/slash command|registerCommand|dashboard|react|commander|yargs/i);
  });
});