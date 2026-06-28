import {
  DiscordExecutionErrorCode,
  DiscordExecutionStatus,
  DiscordRoleRemovalVerificationOutcome,
} from '../../src/core/runtime/discord/discord-execution-service';
import {
  ProductionDiscordExecutionAdapter,
  ProductionDiscordHttpClient,
  ProductionDiscordHttpResponse,
} from '../../src/core/runtime/discord/production-discord-execution-adapter';
import {
  InMemorySecurityActionExecutorRegistry,
  InMemorySecurityDomainExecutorRegistry,
  SecurityActionExecutor,
} from '../../src/core/runtime/discord/security-action-executor-registry';
import {
  ActionExecutionResult,
  ActionExecutionStatus,
} from '../../src/core/runtime/discord/security-action-dispatcher';
import {
  SecurityAction,
  SecurityActionPlan,
  SecurityActionPriority,
  SecurityActionType,
} from '../../src/core/runtime/discord/security-action-planner';
import { InMemorySecurityExecutionAuthorizationEngine } from '../../src/core/runtime/discord/security-execution-authorization-engine';
import { InMemorySecurityExecutionDispatcher } from '../../src/core/runtime/discord/security-execution-dispatcher';
import { InMemorySecurityExecutionPlanner } from '../../src/core/runtime/discord/security-execution-planner';
import { InMemorySecurityExecutionRouter } from '../../src/core/runtime/discord/security-execution-router';
import {
  SecurityDomainExecutionRequest,
  SecurityExecutionRouteDecision,
} from '../../src/core/runtime/discord/security-execution-types';
import { InMemorySecurityHotPathPlanner } from '../../src/core/runtime/discord/security-hot-path-planner';
import {
  SecurityDecisionModel,
  SecurityDecisionReason,
} from '../../src/core/runtime/discord/security-decision-types';
import {
  SecurityActionType as SecurityPolicyActionType,
  SecurityDecision,
} from '../../src/core/runtime/discord/security-policy-types';
import { AuditAttributionConfidence } from '../../src/core/runtime/discord/audit-attribution-types';
import { DetectionConfidence, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';
import { DiscordRoleExecutor, SecurityRoleExecutionStatus } from '../../src/core/runtime/discord/security-role-executor';

class StubRouterActionExecutor implements SecurityActionExecutor {
  constructor(private readonly supportedActionType: SecurityActionType) {}

  supports(actionType: SecurityActionType): boolean {
    return actionType === this.supportedActionType;
  }

  async execute(action: SecurityAction, correlationId: string): Promise<ActionExecutionResult> {
    return Object.freeze({
      action,
      status: ActionExecutionStatus.SUCCESS,
      executionTimeMs: 0,
      correlationId,
      metadata: Object.freeze({ source: 'stub-router-action-executor' }),
    });
  }
}

function buildDecisionModel(): SecurityDecisionModel {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    reason: SecurityDecisionReason.POLICY_ALLOW,
    confidence: AuditAttributionConfidence.HIGH,
    actorId: 'actor-role-e2e-1',
    guildId: 'guild-role-e2e-1',
    actionType: SecurityPolicyActionType.ROLE_CREATE,
    correlationId: 'corr-role-e2e-1',
    auditLogCorrelationId: 'audit-role-e2e-1',
    metadata: Object.freeze({
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: 'dangerous role grant detected',
        correlationIds: Object.freeze(['corr-role-e2e-1']),
        overrides: Object.freeze([]),
      }),
      source: 'dangerous-role-grant-execution-integration-test',
    }),
  });
}

function buildActionPlan(): SecurityActionPlan {
  return Object.freeze({
    decision: SecurityDecision.BLOCK,
    correlationId: 'corr-role-e2e-1',
    actions: Object.freeze([
      Object.freeze({
        type: SecurityActionType.REMOVE_DANGEROUS_ROLE,
        priority: SecurityActionPriority.CRITICAL,
        sequence: 1,
      }),
    ]),
    metadata: Object.freeze({
      threatAssessment: Object.freeze({
        severity: DetectionSeverity.CRITICAL,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.MALICIOUS,
        rationale: 'dangerous role grant detected',
        correlationIds: Object.freeze(['corr-role-e2e-1']),
        overrides: Object.freeze([]),
      }),
    }),
  });
}

function buildHttpResponse(overrides: Partial<ProductionDiscordHttpResponse> = {}): ProductionDiscordHttpResponse {
  return Object.freeze({
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: Object.freeze({
      get(): string | null {
        return null;
      },
    }),
    ...overrides,
  });
}

async function runRolePipeline(httpClient: ProductionDiscordHttpClient) {
  const adapter = new ProductionDiscordExecutionAdapter({
    httpClient,
    botToken: 'test-token',
    apiBaseUrl: 'https://discord.example',
    apiVersion: 10,
    maxAttempts: 2,
  });
  const roleExecutor = new DiscordRoleExecutor(adapter);

  const actionRegistry = new InMemorySecurityActionExecutorRegistry();
  actionRegistry.register(new StubRouterActionExecutor(SecurityActionType.REMOVE_DANGEROUS_ROLE));

  const domainRegistry = new InMemorySecurityDomainExecutorRegistry();
  domainRegistry.register(roleExecutor);

  const executionPlanner = new InMemorySecurityExecutionPlanner();
  const hotPathPlanner = new InMemorySecurityHotPathPlanner();
  const authorizationEngine = new InMemorySecurityExecutionAuthorizationEngine();
  const executionRouter = new InMemorySecurityExecutionRouter(actionRegistry);
  const executionDispatcher = new InMemorySecurityExecutionDispatcher(domainRegistry);

  const executionPlan = executionPlanner.plan(buildActionPlan(), buildDecisionModel());
  const hotPathPlan = hotPathPlanner.plan(executionPlan);
  const authorizationResult = authorizationEngine.authorize(Object.freeze({ executionPlan }));
  const routingResult = executionRouter.route(Object.freeze({ hotPathPlan, authorizationResult }));
  const dispatchResult = executionDispatcher.dispatch(routingResult);

  const intent = dispatchResult.intents.find(
    (item) =>
      item.dispatchDecision === SecurityExecutionRouteDecision.EXECUTABLE &&
      item.executionRequest !== undefined &&
      item.targetedCapability === 'REMOVE_DANGEROUS_ROLE',
  );

  expect(intent).toBeDefined();

  const baseRequest = intent?.executionRequest as SecurityDomainExecutionRequest;
  const request = Object.freeze({
    ...baseRequest,
    metadata: Object.freeze({
      ...(baseRequest.metadata ?? {}),
      guildId: 'guild-role-e2e-1',
      memberUserId: 'member-role-e2e-1',
      roleId: 'role-dangerous-e2e-1',
    }),
  });

  return {
    executionPlan,
    hotPathPlan,
    authorizationResult,
    routingResult,
    dispatchResult,
    roleExecutor,
    request,
  };
}

test('successful dangerous role removal flow preserves metadata and endpoint through production adapter path', async () => {
  const requests: Array<{ method: string; url: string }> = [];
  const client: ProductionDiscordHttpClient = {
    async request(request) {
      requests.push({ method: request.method, url: request.url });
      return buildHttpResponse({ status: 204 });
    },
  };

  const pipeline = await runRolePipeline(client);
  const execution = await pipeline.roleExecutor.execute(pipeline.request);

  expect(pipeline.executionPlan.correlationId).toBe('corr-role-e2e-1');
  expect(pipeline.hotPathPlan.correlationId).toBe('corr-role-e2e-1');
  expect(pipeline.authorizationResult.correlationId).toBe('corr-role-e2e-1');
  expect(pipeline.routingResult.correlationId).toBe('corr-role-e2e-1');
  expect(pipeline.dispatchResult.correlationId).toBe('corr-role-e2e-1');

  expect(execution.status).toBe(SecurityRoleExecutionStatus.EXECUTED);
  expect(requests).toEqual([
    {
      method: 'DELETE',
      url: 'https://discord.example/api/v10/guilds/guild-role-e2e-1/members/member-role-e2e-1/roles/role-dangerous-e2e-1',
    },
  ]);

  const metadata = execution.metadata?.discordExecutionMetadata as {
    idempotencyKey: string;
    verification: { outcome: DiscordRoleRemovalVerificationOutcome };
    metadata: { threatAssessment: unknown; securityDecision: unknown; authorizationMetadata: unknown };
  };

  expect(metadata.idempotencyKey).toBe(
    `${pipeline.request.planId}:${pipeline.request.executionPlanId}:${pipeline.request.route.routeId}:${pipeline.request.correlationId}`,
  );
  expect(metadata.verification.outcome).toBe(DiscordRoleRemovalVerificationOutcome.SUCCESS);
  expect(metadata.metadata.threatAssessment).toBeDefined();
  expect(metadata.metadata.securityDecision).toBeDefined();
  expect(metadata.metadata.authorizationMetadata).toBeDefined();
});

test('role already absent returns ALREADY_ABSENT verification', async () => {
  const client: ProductionDiscordHttpClient = {
    async request() {
      return buildHttpResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => Object.freeze({ code: 'UNKNOWN_ROLE', message: 'Unknown Role' }),
      });
    },
  };

  const pipeline = await runRolePipeline(client);
  const execution = await pipeline.roleExecutor.execute(pipeline.request);

  expect(execution.status).toBe(SecurityRoleExecutionStatus.EXECUTED);
  const metadata = execution.metadata?.discordExecutionMetadata as {
    verification: { outcome: DiscordRoleRemovalVerificationOutcome };
  };
  expect(metadata.verification.outcome).toBe(DiscordRoleRemovalVerificationOutcome.ALREADY_ABSENT);
});

test('permission failures and rate limits are classified on role containment path', async () => {
  let call = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      call += 1;
      if (call === 1) {
        return buildHttpResponse({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => Object.freeze({ code: 'MISSING_PERMISSIONS', message: 'Missing Permissions' }),
        });
      }

      return buildHttpResponse({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: Object.freeze({
          get(name: string): string | null {
            if (name.toLowerCase() === 'retry-after') {
              return '0.5';
            }

            if (name.toLowerCase() === 'x-ratelimit-bucket') {
              return 'bucket-role-e2e-1';
            }

            return null;
          },
        }),
      });
    },
  };

  const firstPipeline = await runRolePipeline(client);
  const permissionFailure = await firstPipeline.roleExecutor.execute(firstPipeline.request);
  expect(permissionFailure.status).toBe(SecurityRoleExecutionStatus.REJECTED);
  const permissionMetadata = permissionFailure.metadata?.discordExecutionMetadata as {
    verification: { outcome: DiscordRoleRemovalVerificationOutcome };
  };
  expect(permissionMetadata.verification.outcome).toBe(DiscordRoleRemovalVerificationOutcome.PERMISSION_FAILURE);

  const secondPipeline = await runRolePipeline(client);
  const rateLimited = await secondPipeline.roleExecutor.execute(secondPipeline.request);
  expect(rateLimited.status).toBe(SecurityRoleExecutionStatus.REJECTED);

  const rateMetadata = rateLimited.metadata?.discordExecutionMetadata as {
    error: { code: DiscordExecutionErrorCode };
    rateLimit: { limited: boolean; retryAfterMs?: number; bucketId?: string };
  };
  expect(rateMetadata.error.code).toBe(DiscordExecutionErrorCode.RATE_LIMITED);
  expect(rateMetadata.rateLimit).toMatchObject({ limited: true, retryAfterMs: 500, bucketId: 'bucket-role-e2e-1' });
});

test('retryable transport failure retries and duplicate requests are deterministically idempotent', async () => {
  let calls = 0;
  const client: ProductionDiscordHttpClient = {
    async request() {
      calls += 1;
      if (calls === 1) {
        throw new Error('socket reset');
      }

      return buildHttpResponse({ status: 204 });
    },
  };

  const pipeline = await runRolePipeline(client);
  const first = await pipeline.roleExecutor.execute(pipeline.request);
  const second = await pipeline.roleExecutor.execute(pipeline.request);

  expect(first.status).toBe(SecurityRoleExecutionStatus.EXECUTED);
  expect(second.status).toBe(SecurityRoleExecutionStatus.SKIPPED_DUPLICATE);
  expect(calls).toBe(2);

  const firstMetadata = first.metadata?.discordExecutionMetadata as { idempotencyKey: string; retry: { attemptCount: number } };

  expect(firstMetadata.idempotencyKey).toBe(
    `${pipeline.request.planId}:${pipeline.request.executionPlanId}:${pipeline.request.route.routeId}:${pipeline.request.correlationId}`,
  );
  expect(firstMetadata.retry.attemptCount).toBe(2);
});
