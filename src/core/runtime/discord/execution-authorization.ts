import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityAction, SecurityActionPlan, SecurityActionType } from './security-action-planner';
import { SecurityDecisionModel } from './security-decision-types';

export enum ExecutionAuthorizationDecision {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  DRY_RUN = 'DRY_RUN',
  SKIP = 'SKIP',
}

export enum ExecutionAuthorizationReason {
  AUTHORIZED = 'AUTHORIZED',
  DRY_RUN_MODE = 'DRY_RUN_MODE',
  GLOBAL_KILL_SWITCH = 'GLOBAL_KILL_SWITCH',
  GUILD_DISABLED = 'GUILD_DISABLED',
  ACTION_DISABLED = 'ACTION_DISABLED',
  TRUSTED_ACTOR_BYPASS = 'TRUSTED_ACTOR_BYPASS',
  MISSING_POLICY = 'MISSING_POLICY',
  UNSUPPORTED_ACTION = 'UNSUPPORTED_ACTION',
  UNKNOWN = 'UNKNOWN',
}

export interface ExecutionAuthorizationRequest {
  readonly action: SecurityAction;
  readonly actionPlan: SecurityActionPlan;
  readonly runtimeDecision: SecurityDecisionModel;
  readonly normalizedEvent?: DiscordGatewayNormalizedEvent;
  readonly correlationId: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ExecutionAuthorizationResult {
  readonly decision: ExecutionAuthorizationDecision;
  readonly reason: ExecutionAuthorizationReason;
  readonly actionType: SecurityActionType;
  readonly correlationId: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ExecutionAuthorizationPolicy {
  readonly enabled: boolean;
  readonly dryRun: boolean;
  readonly globalKillSwitch: boolean;
  readonly disabledGuildIds: readonly string[];
  readonly disabledActionTypes: readonly SecurityActionType[];
  readonly trustedActorIds: readonly string[];
}

export interface ExecutionAuthorizationProvider {
  getPolicy(guildId: string): ExecutionAuthorizationPolicy;
}

const DEFAULT_AUTHORIZATION_POLICY: ExecutionAuthorizationPolicy = Object.freeze({
  enabled: true,
  dryRun: false,
  globalKillSwitch: false,
  disabledGuildIds: Object.freeze([]),
  disabledActionTypes: Object.freeze([]),
  trustedActorIds: Object.freeze([]),
});

export class InMemoryExecutionAuthorizationProvider implements ExecutionAuthorizationProvider {
  constructor(
    private readonly defaultPolicyOverrides: Partial<ExecutionAuthorizationPolicy> = {},
    private readonly guildPolicyOverrides: Readonly<Record<string, Partial<ExecutionAuthorizationPolicy>>> = {},
  ) {}

  getPolicy(guildId: string): ExecutionAuthorizationPolicy {
    const guildOverrides = this.guildPolicyOverrides[guildId] ?? {};
    return this.buildPolicy(this.defaultPolicyOverrides, guildOverrides);
  }

  private buildPolicy(...overrides: readonly Partial<ExecutionAuthorizationPolicy>[]): ExecutionAuthorizationPolicy {
    const merged = Object.assign({}, DEFAULT_AUTHORIZATION_POLICY, ...overrides);
    return Object.freeze({
      enabled: merged.enabled,
      dryRun: merged.dryRun,
      globalKillSwitch: merged.globalKillSwitch,
      disabledGuildIds: Object.freeze([...(merged.disabledGuildIds ?? [])]),
      disabledActionTypes: Object.freeze([...(merged.disabledActionTypes ?? [])]),
      trustedActorIds: Object.freeze([...(merged.trustedActorIds ?? [])]),
    });
  }
}

export interface ExecutionAuthorizationEngine {
  authorize(request: ExecutionAuthorizationRequest): ExecutionAuthorizationResult;
}

export class InMemoryExecutionAuthorizationEngine implements ExecutionAuthorizationEngine {
  constructor(private readonly authorizationProvider: ExecutionAuthorizationProvider) {}

  authorize(request: ExecutionAuthorizationRequest): ExecutionAuthorizationResult {
    let policy: ExecutionAuthorizationPolicy | undefined;

    try {
      policy = this.authorizationProvider.getPolicy(request.guildId);
    } catch {
      return this.createResult(
        request,
        ExecutionAuthorizationDecision.DENY,
        ExecutionAuthorizationReason.UNKNOWN,
        Object.freeze({ safelyHandled: true, source: 'execution-authorization-engine' }),
      );
    }

    if (!policy) {
      return this.createResult(request, ExecutionAuthorizationDecision.DENY, ExecutionAuthorizationReason.MISSING_POLICY);
    }

    if (policy.globalKillSwitch) {
      return this.createResult(
        request,
        ExecutionAuthorizationDecision.DENY,
        ExecutionAuthorizationReason.GLOBAL_KILL_SWITCH,
      );
    }

    if (!policy.enabled || policy.disabledGuildIds.includes(request.guildId)) {
      return this.createResult(request, ExecutionAuthorizationDecision.DENY, ExecutionAuthorizationReason.GUILD_DISABLED);
    }

    if (policy.dryRun) {
      return this.createResult(request, ExecutionAuthorizationDecision.DRY_RUN, ExecutionAuthorizationReason.DRY_RUN_MODE);
    }

    if (policy.disabledActionTypes.includes(request.action.type)) {
      return this.createResult(request, ExecutionAuthorizationDecision.SKIP, ExecutionAuthorizationReason.ACTION_DISABLED);
    }

    if (policy.trustedActorIds.includes(request.actorId)) {
      return this.createResult(
        request,
        ExecutionAuthorizationDecision.ALLOW,
        ExecutionAuthorizationReason.TRUSTED_ACTOR_BYPASS,
      );
    }

    return this.createResult(request, ExecutionAuthorizationDecision.ALLOW, ExecutionAuthorizationReason.AUTHORIZED);
  }

  private createResult(
    request: ExecutionAuthorizationRequest,
    decision: ExecutionAuthorizationDecision,
    reason: ExecutionAuthorizationReason,
    metadata?: Record<string, unknown>,
  ): ExecutionAuthorizationResult {
    return Object.freeze({
      decision,
      reason,
      actionType: request.action.type,
      correlationId: request.correlationId,
      guildId: request.guildId,
      actorId: request.actorId,
      metadata,
    });
  }
}