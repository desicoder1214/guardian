import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AbusedInviteAttributionStatus,
  AbusedInviteDangerousRoleJoinClassification,
  AbusedInviteDangerousRoleJoinFindingType,
  AbusedInviteDangerousRoleJoinIntentType,
  AbusedInviteDangerousRoleJoinTrigger,
  AbusedInviteDangerousRoleJoinRequest,
  freezeAbusedInviteDangerousRoleJoinRequest,
  InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation,
} from '../../src/core/runtime/security/abused-invite-dangerous-role-join-protection-foundation';

function buildRoleCatalog() {
  return Object.freeze([
    Object.freeze({
      roleId: 'role-safe-1',
      name: 'Safe',
      permissions: Object.freeze(['VIEW_CHANNEL']),
      protectedRole: false,
      privilegedRole: false,
      dangerousRole: false,
      nukerCapable: false,
    }),
    Object.freeze({
      roleId: 'role-dangerous-1',
      name: 'Dangerous',
      permissions: Object.freeze(['BAN_MEMBERS']),
      protectedRole: false,
      privilegedRole: false,
      dangerousRole: true,
      nukerCapable: false,
    }),
    Object.freeze({
      roleId: 'role-protected-1',
      name: 'Protected',
      permissions: Object.freeze(['MANAGE_GUILD']),
      protectedRole: true,
      privilegedRole: false,
      dangerousRole: false,
      nukerCapable: false,
    }),
    Object.freeze({
      roleId: 'role-admin-1',
      name: 'Admin',
      permissions: Object.freeze(['ADMINISTRATOR']),
      protectedRole: false,
      privilegedRole: true,
      dangerousRole: false,
      nukerCapable: false,
    }),
    Object.freeze({
      roleId: 'role-nuker-1',
      name: 'Nuker',
      permissions: Object.freeze(['MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS']),
      protectedRole: false,
      privilegedRole: false,
      dangerousRole: false,
      nukerCapable: true,
    }),
  ]);
}

function buildMember(
  overrides: Partial<AbusedInviteDangerousRoleJoinRequest['joinedMember']> = {},
) {
  return Object.freeze({
    memberId: 'member-1',
    roleIds: Object.freeze(['role-safe-1', 'role-dangerous-1']),
    trusted: false,
    owner: false,
    integrationAssigned: false,
    onboardingAssigned: false,
    ...overrides,
  });
}

function buildRequest(
  overrides: Partial<AbusedInviteDangerousRoleJoinRequest> = {},
): AbusedInviteDangerousRoleJoinRequest {
  return Object.freeze({
    correlationId: 'corr-abused-invite-1',
    transactionId: 'txn-abused-invite-1',
    runtimeId: 'runtime-abused-invite-1',
    guildId: 'guild-abused-invite-1',
    trigger: AbusedInviteDangerousRoleJoinTrigger.GUILD_MEMBER_ADD,
    joinedMember: buildMember(),
    roleCatalog: buildRoleCatalog(),
    metadata: Object.freeze({ source: 'unit-test' }),
    ...overrides,
  });
}

describe('InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation', () => {
  test('member joins with dangerous role', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(buildRequest());

    expect(report.success).toBe(true);
    expect(report.classification).toBe(
      AbusedInviteDangerousRoleJoinClassification.ABUSED_INVITE_DANGEROUS_ROLE_JOIN,
    );
    expect(report.memberReports[0]?.dangerousRoleIds).toEqual(['role-dangerous-1']);
    expect(report.intents.map((intent) => intent.type)).toEqual([
      AbusedInviteDangerousRoleJoinIntentType.REMOVE_DANGEROUS_ROLE,
      AbusedInviteDangerousRoleJoinIntentType.NEUTRALIZE_JOINED_MEMBER,
      AbusedInviteDangerousRoleJoinIntentType.INVESTIGATE_INVITE_SOURCE,
      AbusedInviteDangerousRoleJoinIntentType.INVESTIGATE_ROLE_ASSIGNMENT_SOURCE,
    ]);
  });

  test('member joins with protected role', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ roleIds: Object.freeze(['role-protected-1']) }),
      }),
    );

    expect(report.memberReports[0]?.protectedRoleIds).toEqual(['role-protected-1']);
    expect(report.containmentRequired).toBe(true);
  });

  test('member joins with administrator-capable role', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ roleIds: Object.freeze(['role-admin-1', 'role-nuker-1']) }),
      }),
    );

    expect(report.memberReports[0]?.privilegedRoleIds).toEqual(['role-admin-1']);
    expect(report.memberReports[0]?.nukerCapableRoleIds).toEqual(['role-nuker-1']);
  });

  test('member joins with no dangerous role', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ roleIds: Object.freeze(['role-safe-1']) }),
      }),
    );

    expect(report.classification).toBe(AbusedInviteDangerousRoleJoinClassification.NONE);
    expect(report.findings).toEqual([]);
    expect(report.intents).toEqual([]);
    expect(report.containmentRequired).toBe(false);
  });

  test('attribution missing produces pending finding', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(buildRequest());

    expect(
      report.findings.some(
        (finding) =>
          finding.type === AbusedInviteDangerousRoleJoinFindingType.ATTRIBUTION_PENDING &&
          finding.attributionStatus === AbusedInviteAttributionStatus.PENDING,
      ),
    ).toBe(true);
  });

  test('invite code present is preserved', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ inviteCode: 'invite-abc-1' }),
      }),
    );

    expect(report.findings.some((finding) => finding.inviteCode === 'invite-abc-1')).toBe(true);
    expect(report.memberReports[0]?.attributionStatus).toBe(
      AbusedInviteAttributionStatus.INVITE_CODE_PRESENT,
    );
  });

  test('rogue admin suspected', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ suspectedRogueAdminId: 'admin-rogue-1' }),
      }),
    );

    expect(
      report.findings.some(
        (finding) =>
          finding.type === AbusedInviteDangerousRoleJoinFindingType.ROGUE_ADMIN_INVOLVEMENT_POSSIBLE,
      ),
    ).toBe(true);
  });

  test('integration and onboarding suspected', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const integrationReport = await foundation.evaluate(
      buildRequest({
        protectionId: 'integration-case',
        joinedMember: buildMember({ integrationAssigned: true }),
      }),
    );
    const onboardingReport = await foundation.evaluate(
      buildRequest({
        protectionId: 'onboarding-case',
        joinedMember: buildMember({ onboardingAssigned: true }),
      }),
    );

    expect(integrationReport.memberReports[0]?.attributionStatus).toBe(
      AbusedInviteAttributionStatus.INTEGRATION_SUSPECTED,
    );
    expect(onboardingReport.memberReports[0]?.attributionStatus).toBe(
      AbusedInviteAttributionStatus.ONBOARDING_SUSPECTED,
    );
  });

  test('containment required even when attribution is pending', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(buildRequest());

    expect(report.containmentRequired).toBe(true);
    expect(report.intents.find((intent) => intent.type === AbusedInviteDangerousRoleJoinIntentType.REMOVE_DANGEROUS_ROLE)?.containment).toBe(true);
    expect(report.intents.find((intent) => intent.type === AbusedInviteDangerousRoleJoinIntentType.NEUTRALIZE_JOINED_MEMBER)?.containment).toBe(true);
  });

  test('trusted and owner exemption suppresses punishment only', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const trustedReport = await foundation.evaluate(
      buildRequest({
        protectionId: 'trusted-case',
        joinedMember: buildMember({ trusted: true }),
      }),
    );
    const ownerReport = await foundation.evaluate(
      buildRequest({
        protectionId: 'owner-case',
        joinedMember: buildMember({ owner: true }),
      }),
    );

    expect(trustedReport.memberReports[0]?.punishmentSuppressed).toBe(true);
    expect(ownerReport.memberReports[0]?.punishmentSuppressed).toBe(true);
    expect(trustedReport.containmentRequired).toBe(true);
    expect(ownerReport.containmentRequired).toBe(true);
  });

  test('startup reconciliation catches missed dangerous-role joins', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        protectionId: 'startup-case',
        trigger: AbusedInviteDangerousRoleJoinTrigger.STARTUP,
        joinedMember: undefined,
        currentMembers: Object.freeze([
          buildMember(),
          buildMember({ memberId: 'member-safe-2', roleIds: Object.freeze(['role-safe-1']) }),
        ]),
        safeSnapshotMembers: Object.freeze([
          buildMember({ memberId: 'member-safe-2', roleIds: Object.freeze(['role-safe-1']) }),
        ]),
      }),
    );

    expect(report.trigger).toBe(AbusedInviteDangerousRoleJoinTrigger.STARTUP);
    expect(report.memberReports).toHaveLength(1);
    expect(report.memberReports[0]?.memberId).toBe('member-1');
    expect(report.containmentRequired).toBe(true);
  });

  test('deterministic IDs', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const first = await foundation.evaluate(buildRequest({ protectionId: undefined }));
    const second = await foundation.evaluate(
      buildRequest({
        protectionId: 'deterministic-second-pass',
      }),
    );
    const thirdFoundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const third = await thirdFoundation.evaluate(buildRequest({ protectionId: undefined }));

    expect(first.protectionId).toBe(third.protectionId);
    expect(first.findings.map((finding) => finding.findingId)).toEqual(
      third.findings.map((finding) => finding.findingId),
    );
    expect(second.protectionId).toBe('deterministic-second-pass');
  });

  test('idempotent replay', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const request = buildRequest();
    const first = await foundation.evaluate(request);
    const second = await foundation.evaluate(request);

    expect(first.protectionId).toBe(second.protectionId);
    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
  });

  test('immutable requests and reports are deeply frozen', async () => {
    const request = freezeAbusedInviteDangerousRoleJoinRequest(buildRequest());
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.roleCatalog)).toBe(true);
    expect(() => {
      (request as { correlationId: string }).correlationId = 'mutated';
    }).toThrow(TypeError);

    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(buildRequest());
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.memberReports)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.intents)).toBe(true);
    expect(() => {
      (report as { success: boolean }).success = false;
    }).toThrow(TypeError);
  });

  test('fails closed on inconsistent role or member state', async () => {
    const foundation = new InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation();
    const report = await foundation.evaluate(
      buildRequest({
        joinedMember: buildMember({ roleIds: Object.freeze(['role-missing-1']) }),
      }),
    );

    expect(report.success).toBe(false);
    expect(report.failureReason).toContain('INCONSISTENT_STATE');
    expect(
      report.findings.some(
        (finding) => finding.type === AbusedInviteDangerousRoleJoinFindingType.INCONSISTENT_ROLE_MEMBER_STATE,
      ),
    ).toBe(true);
  });

  test('source has no discord rest, discord.js, fetch, filesystem, persistence, or command surfaces', () => {
    const filePath = path.join(
      process.cwd(),
      'src/core/runtime/security/abused-invite-dangerous-role-join-protection-foundation.ts',
    );
    const source = readFileSync(filePath, 'utf8');

    const forbiddenPatterns = [
      /discord\.js/i,
      /fetch\s*\(/i,
      /\bDiscordRest\b|\bDiscordREST\b|\bRESTClient\b|\bProductionDiscord\b/i,
      /node:fs|from\s+['"]fs['"]/i,
      /writeFile|appendFile|createWriteStream/i,
      /typeorm|prisma|mongoose|sequelize|repository|persist|save\s*\(/i,
      /dashboard|slash command|registerCommand|commander|yargs/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
});