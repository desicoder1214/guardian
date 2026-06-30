import { DetectionSeverity } from '../discord/detection-engine';

export enum AbusedInviteDangerousRoleJoinTrigger {
  GUILD_MEMBER_ADD = 'GUILD_MEMBER_ADD',
  STARTUP = 'STARTUP',
  RECONNECT = 'RECONNECT',
}

export enum AbusedInviteDangerousRoleJoinClassification {
  NONE = 'NONE',
  ABUSED_INVITE_DANGEROUS_ROLE_JOIN = 'ABUSED_INVITE_DANGEROUS_ROLE_JOIN',
}

export enum AbusedInviteDangerousRoleJoinFindingType {
  JOINED_MEMBER_RISK = 'JOINED_MEMBER_RISK',
  DANGEROUS_ROLE_PRESENCE = 'DANGEROUS_ROLE_PRESENCE',
  ATTRIBUTION_PENDING = 'ATTRIBUTION_PENDING',
  INVITE_CODE_PRESENT = 'INVITE_CODE_PRESENT',
  ROLE_ASSIGNMENT_SOURCE_SUSPECTED = 'ROLE_ASSIGNMENT_SOURCE_SUSPECTED',
  ROGUE_ADMIN_INVOLVEMENT_POSSIBLE = 'ROGUE_ADMIN_INVOLVEMENT_POSSIBLE',
  CONTAINMENT_REQUIRED = 'CONTAINMENT_REQUIRED',
  INCONSISTENT_ROLE_MEMBER_STATE = 'INCONSISTENT_ROLE_MEMBER_STATE',
}

export enum AbusedInviteAttributionStatus {
  PENDING = 'PENDING',
  INVITE_CODE_PRESENT = 'INVITE_CODE_PRESENT',
  INTEGRATION_SUSPECTED = 'INTEGRATION_SUSPECTED',
  ONBOARDING_SUSPECTED = 'ONBOARDING_SUSPECTED',
  ROGUE_ADMIN_SUSPECTED = 'ROGUE_ADMIN_SUSPECTED',
}

export enum AbusedInviteDangerousRoleJoinIntentType {
  REMOVE_DANGEROUS_ROLE = 'REMOVE_DANGEROUS_ROLE',
  NEUTRALIZE_JOINED_MEMBER = 'NEUTRALIZE_JOINED_MEMBER',
  INVESTIGATE_INVITE_SOURCE = 'INVESTIGATE_INVITE_SOURCE',
  INVESTIGATE_ROLE_ASSIGNMENT_SOURCE = 'INVESTIGATE_ROLE_ASSIGNMENT_SOURCE',
}

export interface DangerousRoleRoleRecord {
  readonly roleId: string;
  readonly name?: string;
  readonly permissions: readonly string[];
  readonly protectedRole: boolean;
  readonly privilegedRole: boolean;
  readonly dangerousRole: boolean;
  readonly nukerCapable: boolean;
}

export interface DangerousRoleJoinMemberRecord {
  readonly memberId: string;
  readonly roleIds: readonly string[];
  readonly joinedAt?: string;
  readonly inviteCode?: string;
  readonly trusted: boolean;
  readonly owner: boolean;
  readonly integrationAssigned: boolean;
  readonly onboardingAssigned: boolean;
  readonly suspectedRogueAdminId?: string;
}

export interface AbusedInviteDangerousRoleJoinRequest {
  readonly protectionId?: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly trigger: AbusedInviteDangerousRoleJoinTrigger;
  readonly joinedMember?: DangerousRoleJoinMemberRecord;
  readonly currentMembers?: readonly DangerousRoleJoinMemberRecord[];
  readonly safeSnapshotMembers?: readonly DangerousRoleJoinMemberRecord[];
  readonly roleCatalog: readonly DangerousRoleRoleRecord[];
  readonly metadata?: Record<string, unknown>;
}

export interface AbusedInviteDangerousRoleJoinFinding {
  readonly findingId: string;
  readonly type: AbusedInviteDangerousRoleJoinFindingType;
  readonly classification: AbusedInviteDangerousRoleJoinClassification;
  readonly severity: DetectionSeverity;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly memberId: string;
  readonly roleIds: readonly string[];
  readonly inviteCode?: string;
  readonly attributionStatus: AbusedInviteAttributionStatus;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AbusedInviteDangerousRoleJoinIntent {
  readonly intentId: string;
  readonly type: AbusedInviteDangerousRoleJoinIntentType;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly memberId: string;
  readonly roleIds: readonly string[];
  readonly inviteCode?: string;
  readonly attributionStatus: AbusedInviteAttributionStatus;
  readonly containment: boolean;
  readonly punishmentSuppressed: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface AbusedInviteDangerousRoleJoinMemberReport {
  readonly memberId: string;
  readonly classification: AbusedInviteDangerousRoleJoinClassification;
  readonly dangerousRoleIds: readonly string[];
  readonly protectedRoleIds: readonly string[];
  readonly privilegedRoleIds: readonly string[];
  readonly nukerCapableRoleIds: readonly string[];
  readonly attributionStatus: AbusedInviteAttributionStatus;
  readonly containmentRequired: boolean;
  readonly punishmentSuppressed: boolean;
  readonly findings: readonly AbusedInviteDangerousRoleJoinFinding[];
  readonly intents: readonly AbusedInviteDangerousRoleJoinIntent[];
  readonly inconsistentState: boolean;
}

export interface AbusedInviteDangerousRoleJoinReport {
  readonly protectionId: string;
  readonly correlationId: string;
  readonly transactionId: string;
  readonly runtimeId: string;
  readonly guildId: string;
  readonly trigger: AbusedInviteDangerousRoleJoinTrigger;
  readonly classification: AbusedInviteDangerousRoleJoinClassification;
  readonly memberReports: readonly AbusedInviteDangerousRoleJoinMemberReport[];
  readonly findings: readonly AbusedInviteDangerousRoleJoinFinding[];
  readonly intents: readonly AbusedInviteDangerousRoleJoinIntent[];
  readonly containmentRequired: boolean;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly idempotentReplay: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly metadata: {
    readonly source: 'in-memory-abused-invite-dangerous-role-join-protection-foundation';
    readonly deterministicProtectionId: true;
    readonly findingsOnly: true;
    readonly failClosed: true;
    readonly noDiscordRest: true;
  };
}

export interface AbusedInviteDangerousRoleJoinProtectionFoundation {
  evaluate(request: AbusedInviteDangerousRoleJoinRequest): Promise<AbusedInviteDangerousRoleJoinReport>;
}

const FAILURE_CORRELATION_ID_REQUIRED = 'CORRELATION_ID_REQUIRED';
const FAILURE_TRANSACTION_ID_REQUIRED = 'TRANSACTION_ID_REQUIRED';
const FAILURE_RUNTIME_ID_REQUIRED = 'RUNTIME_ID_REQUIRED';
const FAILURE_GUILD_ID_REQUIRED = 'GUILD_ID_REQUIRED';
const FAILURE_MEMBER_REQUIRED = 'MEMBER_REQUIRED';
const FAILURE_ROLE_NOT_FOUND = 'ROLE_NOT_FOUND';
const FAILURE_DUPLICATE_ROLE_ID = 'DUPLICATE_ROLE_ID';
const FAILURE_DUPLICATE_MEMBER_ID = 'DUPLICATE_MEMBER_ID';
const FAILURE_DUPLICATE_MEMBER_ROLE = 'DUPLICATE_MEMBER_ROLE';
const FAILURE_INCONSISTENT_STATE = 'INCONSISTENT_STATE';

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

function freezeMember(member: DangerousRoleJoinMemberRecord): DangerousRoleJoinMemberRecord {
  return deepFreeze({
    ...member,
    roleIds: Object.freeze([...member.roleIds]),
  });
}

function freezeRole(role: DangerousRoleRoleRecord): DangerousRoleRoleRecord {
  return deepFreeze({
    ...role,
    permissions: Object.freeze([...role.permissions]),
  });
}

function freezeRequest(
  request: AbusedInviteDangerousRoleJoinRequest,
): AbusedInviteDangerousRoleJoinRequest {
  return deepFreeze({
    ...request,
    joinedMember: request.joinedMember ? freezeMember(request.joinedMember) : undefined,
    currentMembers: request.currentMembers
      ? Object.freeze(request.currentMembers.map((member) => freezeMember(member)))
      : undefined,
    safeSnapshotMembers: request.safeSnapshotMembers
      ? Object.freeze(request.safeSnapshotMembers.map((member) => freezeMember(member)))
      : undefined,
    roleCatalog: Object.freeze(request.roleCatalog.map((role) => freezeRole(role))),
    metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
  });
}

function freezeFinding(
  finding: AbusedInviteDangerousRoleJoinFinding,
): AbusedInviteDangerousRoleJoinFinding {
  return deepFreeze({
    ...finding,
    roleIds: Object.freeze([...finding.roleIds]),
    metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
  });
}

function freezeIntent(
  intent: AbusedInviteDangerousRoleJoinIntent,
): AbusedInviteDangerousRoleJoinIntent {
  return deepFreeze({
    ...intent,
    roleIds: Object.freeze([...intent.roleIds]),
    metadata: intent.metadata ? Object.freeze({ ...intent.metadata }) : undefined,
  });
}

function freezeMemberReport(
  report: AbusedInviteDangerousRoleJoinMemberReport,
): AbusedInviteDangerousRoleJoinMemberReport {
  return deepFreeze({
    ...report,
    dangerousRoleIds: Object.freeze([...report.dangerousRoleIds]),
    protectedRoleIds: Object.freeze([...report.protectedRoleIds]),
    privilegedRoleIds: Object.freeze([...report.privilegedRoleIds]),
    nukerCapableRoleIds: Object.freeze([...report.nukerCapableRoleIds]),
    findings: Object.freeze(report.findings.map((finding) => freezeFinding(finding))),
    intents: Object.freeze(report.intents.map((intent) => freezeIntent(intent))),
  });
}

function freezeReport(
  report: AbusedInviteDangerousRoleJoinReport,
): AbusedInviteDangerousRoleJoinReport {
  return deepFreeze({
    ...report,
    memberReports: Object.freeze(report.memberReports.map((entry) => freezeMemberReport(entry))),
    findings: Object.freeze(report.findings.map((finding) => freezeFinding(finding))),
    intents: Object.freeze(report.intents.map((intent) => freezeIntent(intent))),
    metadata: Object.freeze({ ...report.metadata }),
  });
}

function toDeterministicProtectionId(request: AbusedInviteDangerousRoleJoinRequest): string {
  const memberSignature = request.trigger === AbusedInviteDangerousRoleJoinTrigger.GUILD_MEMBER_ADD
    ? request.joinedMember?.memberId ?? 'missing-member'
    : (request.currentMembers ?? [])
        .map((member) => `${member.memberId}:${member.roleIds.join(',')}`)
        .sort((left, right) => left.localeCompare(right))
        .join('|');

  return [
    'abused-invite-dangerous-role-join-protection',
    request.trigger,
    request.correlationId,
    request.transactionId,
    request.runtimeId,
    request.guildId,
    memberSignature,
  ].join(':');
}

function resolveAttributionStatus(member: DangerousRoleJoinMemberRecord): AbusedInviteAttributionStatus {
  if (isNonEmptyString(member.suspectedRogueAdminId)) {
    return AbusedInviteAttributionStatus.ROGUE_ADMIN_SUSPECTED;
  }
  if (member.integrationAssigned) {
    return AbusedInviteAttributionStatus.INTEGRATION_SUSPECTED;
  }
  if (member.onboardingAssigned) {
    return AbusedInviteAttributionStatus.ONBOARDING_SUSPECTED;
  }
  if (isNonEmptyString(member.inviteCode)) {
    return AbusedInviteAttributionStatus.INVITE_CODE_PRESENT;
  }
  return AbusedInviteAttributionStatus.PENDING;
}

function classificationForRoleIntersection(member: {
  readonly dangerousRoleIds: readonly string[];
  readonly protectedRoleIds: readonly string[];
  readonly privilegedRoleIds: readonly string[];
  readonly nukerCapableRoleIds: readonly string[];
}): AbusedInviteDangerousRoleJoinClassification {
  return member.dangerousRoleIds.length > 0 ||
    member.protectedRoleIds.length > 0 ||
    member.privilegedRoleIds.length > 0 ||
    member.nukerCapableRoleIds.length > 0
    ? AbusedInviteDangerousRoleJoinClassification.ABUSED_INVITE_DANGEROUS_ROLE_JOIN
    : AbusedInviteDangerousRoleJoinClassification.NONE;
}

function buildFindingId(
  protectionId: string,
  memberId: string,
  type: AbusedInviteDangerousRoleJoinFindingType,
): string {
  return `${protectionId}:finding:${memberId}:${type}`;
}

function buildIntentId(
  protectionId: string,
  memberId: string,
  type: AbusedInviteDangerousRoleJoinIntentType,
): string {
  return `${protectionId}:intent:${memberId}:${type}`;
}

function severityForMember(classification: AbusedInviteDangerousRoleJoinClassification): DetectionSeverity {
  return classification === AbusedInviteDangerousRoleJoinClassification.NONE
    ? DetectionSeverity.INFO
    : DetectionSeverity.CRITICAL;
}

function createFinding(input: {
  readonly protectionId: string;
  readonly request: AbusedInviteDangerousRoleJoinRequest;
  readonly member: DangerousRoleJoinMemberRecord;
  readonly type: AbusedInviteDangerousRoleJoinFindingType;
  readonly classification: AbusedInviteDangerousRoleJoinClassification;
  readonly roleIds: readonly string[];
  readonly attributionStatus: AbusedInviteAttributionStatus;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}): AbusedInviteDangerousRoleJoinFinding {
  return freezeFinding({
    findingId: buildFindingId(input.protectionId, input.member.memberId, input.type),
    type: input.type,
    classification: input.classification,
    severity: severityForMember(input.classification),
    correlationId: input.request.correlationId,
    transactionId: input.request.transactionId,
    runtimeId: input.request.runtimeId,
    guildId: input.request.guildId,
    memberId: input.member.memberId,
    roleIds: Object.freeze([...input.roleIds]),
    inviteCode: input.member.inviteCode,
    attributionStatus: input.attributionStatus,
    summary: input.summary,
    metadata: input.metadata,
  });
}

function createIntent(input: {
  readonly protectionId: string;
  readonly request: AbusedInviteDangerousRoleJoinRequest;
  readonly member: DangerousRoleJoinMemberRecord;
  readonly type: AbusedInviteDangerousRoleJoinIntentType;
  readonly roleIds: readonly string[];
  readonly attributionStatus: AbusedInviteAttributionStatus;
  readonly containment: boolean;
  readonly punishmentSuppressed: boolean;
}): AbusedInviteDangerousRoleJoinIntent {
  return freezeIntent({
    intentId: buildIntentId(input.protectionId, input.member.memberId, input.type),
    type: input.type,
    correlationId: input.request.correlationId,
    transactionId: input.request.transactionId,
    runtimeId: input.request.runtimeId,
    guildId: input.request.guildId,
    memberId: input.member.memberId,
    roleIds: Object.freeze([...input.roleIds]),
    inviteCode: input.member.inviteCode,
    attributionStatus: input.attributionStatus,
    containment: input.containment,
    punishmentSuppressed: input.punishmentSuppressed,
    metadata: Object.freeze({
      owner: input.member.owner,
      trusted: input.member.trusted,
    }),
  });
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function validateMemberCatalogConsistency(
  request: AbusedInviteDangerousRoleJoinRequest,
): readonly string[] {
  const failures: string[] = [];
  const roleIds = new Set<string>();

  for (const role of request.roleCatalog) {
    if (roleIds.has(role.roleId)) {
      failures.push(`${FAILURE_DUPLICATE_ROLE_ID}:${role.roleId}`);
    }
    roleIds.add(role.roleId);
  }

  const memberCollections = [request.joinedMember ? [request.joinedMember] : [], request.currentMembers ?? [], request.safeSnapshotMembers ?? []];
  for (const members of memberCollections) {
    const memberIds = new Set<string>();
    for (const member of members) {
      if (memberIds.has(member.memberId)) {
        failures.push(`${FAILURE_DUPLICATE_MEMBER_ID}:${member.memberId}`);
      }
      memberIds.add(member.memberId);

      const seenRoles = new Set<string>();
      for (const roleId of member.roleIds) {
        if (seenRoles.has(roleId)) {
          failures.push(`${FAILURE_DUPLICATE_MEMBER_ROLE}:${member.memberId}:${roleId}`);
        }
        seenRoles.add(roleId);
        if (!roleIds.has(roleId)) {
          failures.push(`${FAILURE_ROLE_NOT_FOUND}:${member.memberId}:${roleId}`);
        }
      }
    }
  }

  return Object.freeze(failures);
}

function isRiskRole(role: DangerousRoleRoleRecord): boolean {
  return role.protectedRole || role.privilegedRole || role.dangerousRole || role.nukerCapable;
}

function selectMembers(request: AbusedInviteDangerousRoleJoinRequest): readonly DangerousRoleJoinMemberRecord[] {
  if (request.trigger === AbusedInviteDangerousRoleJoinTrigger.GUILD_MEMBER_ADD) {
    return request.joinedMember ? Object.freeze([request.joinedMember]) : Object.freeze([]);
  }

  const currentById = new Map((request.currentMembers ?? []).map((member) => [member.memberId, member]));
  const snapshotIds = new Set((request.safeSnapshotMembers ?? []).map((member) => member.memberId));
  const missedMembers: DangerousRoleJoinMemberRecord[] = [];

  for (const [memberId, member] of currentById.entries()) {
    if (!snapshotIds.has(memberId)) {
      missedMembers.push(member);
    }
  }

  return Object.freeze(missedMembers.sort((left, right) => left.memberId.localeCompare(right.memberId)));
}

function buildMemberReport(
  protectionId: string,
  request: AbusedInviteDangerousRoleJoinRequest,
  member: DangerousRoleJoinMemberRecord,
  roleCatalogById: ReadonlyMap<string, DangerousRoleRoleRecord>,
): AbusedInviteDangerousRoleJoinMemberReport {
  const memberRoles = member.roleIds
    .map((roleId) => roleCatalogById.get(roleId))
    .filter((role): role is DangerousRoleRoleRecord => role !== undefined);
  const dangerousRoleIds = uniqueStrings(memberRoles.filter((role) => role.dangerousRole).map((role) => role.roleId));
  const protectedRoleIds = uniqueStrings(memberRoles.filter((role) => role.protectedRole).map((role) => role.roleId));
  const privilegedRoleIds = uniqueStrings(memberRoles.filter((role) => role.privilegedRole).map((role) => role.roleId));
  const nukerCapableRoleIds = uniqueStrings(memberRoles.filter((role) => role.nukerCapable).map((role) => role.roleId));

  const classification = classificationForRoleIntersection({
    dangerousRoleIds,
    protectedRoleIds,
    privilegedRoleIds,
    nukerCapableRoleIds,
  });
  const attributionStatus = resolveAttributionStatus(member);
  const punishmentSuppressed = member.owner || member.trusted;
  const containmentRequired = classification !== AbusedInviteDangerousRoleJoinClassification.NONE;
  const riskyRoleIds = uniqueStrings([
    ...dangerousRoleIds,
    ...protectedRoleIds,
    ...privilegedRoleIds,
    ...nukerCapableRoleIds,
  ]);

  if (!containmentRequired) {
    return freezeMemberReport({
      memberId: member.memberId,
      classification,
      dangerousRoleIds,
      protectedRoleIds,
      privilegedRoleIds,
      nukerCapableRoleIds,
      attributionStatus,
      containmentRequired: false,
      punishmentSuppressed,
      findings: Object.freeze([]),
      intents: Object.freeze([]),
      inconsistentState: false,
    });
  }

  const findings: AbusedInviteDangerousRoleJoinFinding[] = [];
  findings.push(
    createFinding({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinFindingType.JOINED_MEMBER_RISK,
      classification,
      roleIds: riskyRoleIds,
      attributionStatus,
      summary: `Member ${member.memberId} joined with dangerous, privileged, protected, or nuker-capable roles already assigned.`,
      metadata: Object.freeze({ trigger: request.trigger }),
    }),
  );
  findings.push(
    createFinding({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinFindingType.DANGEROUS_ROLE_PRESENCE,
      classification,
      roleIds: riskyRoleIds,
      attributionStatus,
      summary: `Member ${member.memberId} holds risky roles on join and requires immediate containment independent of attribution.`,
      metadata: Object.freeze({
        dangerousRoleIds,
        protectedRoleIds,
        privilegedRoleIds,
        nukerCapableRoleIds,
      }),
    }),
  );

  if (attributionStatus === AbusedInviteAttributionStatus.INVITE_CODE_PRESENT) {
    findings.push(
      createFinding({
        protectionId,
        request,
        member,
        type: AbusedInviteDangerousRoleJoinFindingType.INVITE_CODE_PRESENT,
        classification,
        roleIds: riskyRoleIds,
        attributionStatus,
        summary: `Invite code ${member.inviteCode} is available for downstream investigation.`,
      }),
    );
  } else {
    findings.push(
      createFinding({
        protectionId,
        request,
        member,
        type: AbusedInviteDangerousRoleJoinFindingType.ATTRIBUTION_PENDING,
        classification,
        roleIds: riskyRoleIds,
        attributionStatus,
        summary: 'Invite, onboarding, integration, or rogue-admin attribution is pending and must not block containment.',
      }),
    );
  }

  if (
    attributionStatus === AbusedInviteAttributionStatus.INTEGRATION_SUSPECTED ||
    attributionStatus === AbusedInviteAttributionStatus.ONBOARDING_SUSPECTED
  ) {
    findings.push(
      createFinding({
        protectionId,
        request,
        member,
        type: AbusedInviteDangerousRoleJoinFindingType.ROLE_ASSIGNMENT_SOURCE_SUSPECTED,
        classification,
        roleIds: riskyRoleIds,
        attributionStatus,
        summary: 'Integration or onboarding role assignment is suspected and requires investigation.',
      }),
    );
  }

  if (attributionStatus === AbusedInviteAttributionStatus.ROGUE_ADMIN_SUSPECTED) {
    findings.push(
      createFinding({
        protectionId,
        request,
        member,
        type: AbusedInviteDangerousRoleJoinFindingType.ROGUE_ADMIN_INVOLVEMENT_POSSIBLE,
        classification,
        roleIds: riskyRoleIds,
        attributionStatus,
        summary: `Possible rogue admin involvement is suspected for member ${member.memberId}.`,
        metadata: Object.freeze({ suspectedRogueAdminId: member.suspectedRogueAdminId }),
      }),
    );
  }

  findings.push(
    createFinding({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinFindingType.CONTAINMENT_REQUIRED,
      classification,
      roleIds: riskyRoleIds,
      attributionStatus,
      summary: 'Containment is required immediately and cannot wait for attribution resolution.',
      metadata: Object.freeze({ punishmentSuppressed }),
    }),
  );

  const intents = Object.freeze([
    createIntent({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinIntentType.REMOVE_DANGEROUS_ROLE,
      roleIds: riskyRoleIds,
      attributionStatus,
      containment: true,
      punishmentSuppressed,
    }),
    createIntent({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinIntentType.NEUTRALIZE_JOINED_MEMBER,
      roleIds: riskyRoleIds,
      attributionStatus,
      containment: true,
      punishmentSuppressed,
    }),
    createIntent({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinIntentType.INVESTIGATE_INVITE_SOURCE,
      roleIds: riskyRoleIds,
      attributionStatus,
      containment: false,
      punishmentSuppressed,
    }),
    createIntent({
      protectionId,
      request,
      member,
      type: AbusedInviteDangerousRoleJoinIntentType.INVESTIGATE_ROLE_ASSIGNMENT_SOURCE,
      roleIds: riskyRoleIds,
      attributionStatus,
      containment: false,
      punishmentSuppressed,
    }),
  ]);

  return freezeMemberReport({
    memberId: member.memberId,
    classification,
    dangerousRoleIds,
    protectedRoleIds,
    privilegedRoleIds,
    nukerCapableRoleIds,
    attributionStatus,
    containmentRequired,
    punishmentSuppressed,
    findings: Object.freeze(findings),
    intents,
    inconsistentState: false,
  });
}

export class InMemoryAbusedInviteDangerousRoleJoinProtectionFoundation
  implements AbusedInviteDangerousRoleJoinProtectionFoundation
{
  private readonly completedReports = new Map<string, AbusedInviteDangerousRoleJoinReport>();

  async evaluate(
    request: AbusedInviteDangerousRoleJoinRequest,
  ): Promise<AbusedInviteDangerousRoleJoinReport> {
    const frozenRequest = freezeRequest(request);
    const protectionId = frozenRequest.protectionId ?? toDeterministicProtectionId(frozenRequest);
    const startedAtMs = Date.now();

    const cached = this.completedReports.get(protectionId);
    if (cached) {
      return freezeReport({
        ...cached,
        idempotentReplay: true,
      });
    }

    const failures: string[] = [];
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
    if (
      frozenRequest.trigger === AbusedInviteDangerousRoleJoinTrigger.GUILD_MEMBER_ADD &&
      !frozenRequest.joinedMember
    ) {
      failures.push(FAILURE_MEMBER_REQUIRED);
    }

    failures.push(...validateMemberCatalogConsistency(frozenRequest));

    const roleCatalogById = new Map(
      frozenRequest.roleCatalog.map((role) => [role.roleId, role] as const),
    );
    const members = selectMembers(frozenRequest);
    const memberReports = members.map((member) => buildMemberReport(protectionId, frozenRequest, member, roleCatalogById));
    const findings = memberReports.flatMap((report) => report.findings);
    const intents = memberReports.flatMap((report) => report.intents);
    const classification = memberReports.some(
      (report) => report.classification !== AbusedInviteDangerousRoleJoinClassification.NONE,
    )
      ? AbusedInviteDangerousRoleJoinClassification.ABUSED_INVITE_DANGEROUS_ROLE_JOIN
      : AbusedInviteDangerousRoleJoinClassification.NONE;

    if (failures.length > 0) {
      const failedMemberId = frozenRequest.joinedMember?.memberId ?? members[0]?.memberId ?? 'unknown-member';
      const failureFinding = createFinding({
        protectionId,
        request: frozenRequest,
        member:
          frozenRequest.joinedMember ??
          Object.freeze({
            memberId: failedMemberId,
            roleIds: Object.freeze([]),
            trusted: false,
            owner: false,
            integrationAssigned: false,
            onboardingAssigned: false,
          }),
        type: AbusedInviteDangerousRoleJoinFindingType.INCONSISTENT_ROLE_MEMBER_STATE,
        classification: AbusedInviteDangerousRoleJoinClassification.ABUSED_INVITE_DANGEROUS_ROLE_JOIN,
        roleIds: Object.freeze([]),
        attributionStatus: AbusedInviteAttributionStatus.PENDING,
        summary: 'Member or role state is inconsistent; protection foundation failed closed.',
        metadata: Object.freeze({ failures }),
      });
      const failedReport = freezeReport({
        protectionId,
        correlationId: frozenRequest.correlationId,
        transactionId: frozenRequest.transactionId,
        runtimeId: frozenRequest.runtimeId,
        guildId: frozenRequest.guildId,
        trigger: frozenRequest.trigger,
        classification: AbusedInviteDangerousRoleJoinClassification.ABUSED_INVITE_DANGEROUS_ROLE_JOIN,
        memberReports: Object.freeze(memberReports),
        findings: Object.freeze([failureFinding, ...findings]),
        intents: Object.freeze(intents),
        containmentRequired: true,
        success: false,
        failureReason: `${FAILURE_INCONSISTENT_STATE}:${failures.join(',')}`,
        idempotentReplay: false,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(Date.now()).toISOString(),
        durationMs: Math.max(0, Date.now() - startedAtMs),
        metadata: Object.freeze({
          source: 'in-memory-abused-invite-dangerous-role-join-protection-foundation' as const,
          deterministicProtectionId: true as const,
          findingsOnly: true as const,
          failClosed: true as const,
          noDiscordRest: true as const,
        }),
      });
      this.completedReports.set(protectionId, failedReport);
      return failedReport;
    }

    const report = freezeReport({
      protectionId,
      correlationId: frozenRequest.correlationId,
      transactionId: frozenRequest.transactionId,
      runtimeId: frozenRequest.runtimeId,
      guildId: frozenRequest.guildId,
      trigger: frozenRequest.trigger,
      classification,
      memberReports: Object.freeze(memberReports),
      findings: Object.freeze(findings),
      intents: Object.freeze(intents),
      containmentRequired: memberReports.some((entry) => entry.containmentRequired),
      success: true,
      idempotentReplay: false,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(Date.now()).toISOString(),
      durationMs: Math.max(0, Date.now() - startedAtMs),
      metadata: Object.freeze({
        source: 'in-memory-abused-invite-dangerous-role-join-protection-foundation' as const,
        deterministicProtectionId: true as const,
        findingsOnly: true as const,
        failClosed: true as const,
        noDiscordRest: true as const,
      }),
    });

    this.completedReports.set(protectionId, report);
    return report;
  }
}

export function freezeAbusedInviteDangerousRoleJoinRequest(
  request: AbusedInviteDangerousRoleJoinRequest,
): AbusedInviteDangerousRoleJoinRequest {
  return freezeRequest(request);
}