import {
  RuntimeStartupCoordinationRequestFactory,
  RuntimeStartupMode,
} from '../lifecycle';
import {
  InMemorySecurityBotInventoryReconciler,
  SecurityBotInventorySnapshot,
} from './security-bot-inventory-reconciliation';
import {
  InMemorySecurityIntegrationInventoryReconciler,
  SecurityIntegrationInventorySnapshot,
} from './security-integration-inventory-reconciliation';
import {
  InMemorySecurityPermissionRoleStateReconciler,
  SecurityPermissionRoleStateSnapshot,
} from './security-permission-role-state-reconciliation';
import {
  InMemorySecurityStartupRuntimeCoordinator,
  SecurityStartupRuntimeCoordinator,
  SecurityStartupRuntimeCoordinationRequest,
} from './security-startup-runtime-coordinator';
import {
  InMemorySecurityStartupReconciliationPipeline,
} from './security-startup-reconciliation-pipeline';
import {
  InMemorySecurityWebhookInventoryReconciler,
  SecurityWebhookInventorySnapshot,
} from './security-webhook-inventory-reconciliation';
import {
  InMemoryStartupReentrySecurityCoordinator,
  StartupContractReconciler,
  StartupContractReconciliationComponent,
  StartupContractReconciliationReport,
  StartupContractReconciliationRequest,
  StartupReentryMode,
  StartupRecoverySnapshotValidationReport,
  StartupRecoverySnapshotVerifier,
  StartupReentryVerificationOutcome,
} from './startup-reentry-security-coordinator';

class InMemoryStartupContractReconciler implements StartupContractReconciler {
  constructor(private readonly component: StartupContractReconciliationComponent) {}

  async execute(
    request: StartupContractReconciliationRequest,
  ): Promise<StartupContractReconciliationReport> {
    const reconciliationId =
      request.reconciliationId ??
      [
        'startup-contract-reconciler',
        this.component,
        request.runtimeId,
        request.guildId,
        request.transactionId,
        request.correlationId,
      ].join(':');

    const success =
      request.correlationId.trim().length > 0 &&
      request.transactionId.trim().length > 0 &&
      request.guildId.trim().length > 0 &&
      request.runtimeId.trim().length > 0;

    return Object.freeze({
      reconciliationId,
      component: this.component,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      findings: Object.freeze([]),
      verificationOutcome: success
        ? StartupReentryVerificationOutcome.VERIFIED
        : StartupReentryVerificationOutcome.FAILED,
      success,
      failureReason: success ? undefined : 'STARTUP_CONTRACT_CONTEXT_INVALID',
    });
  }
}

class InMemoryStartupRecoverySnapshotVerifier implements StartupRecoverySnapshotVerifier {
  async validate(
    request: {
      readonly correlationId: string;
      readonly transactionId: string;
      readonly guildId: string;
      readonly runtimeId: string;
      readonly runtimeSnapshotId: string;
      readonly recoverySnapshotId: string;
      readonly startupSnapshotId: string;
    },
  ): Promise<StartupRecoverySnapshotValidationReport> {
    const validationId = [
      'startup-recovery-snapshot-validation',
      request.runtimeId,
      request.guildId,
      request.transactionId,
      request.correlationId,
      request.runtimeSnapshotId,
      request.recoverySnapshotId,
      request.startupSnapshotId,
    ].join(':');

    const success =
      request.correlationId.trim().length > 0 &&
      request.transactionId.trim().length > 0 &&
      request.guildId.trim().length > 0 &&
      request.runtimeId.trim().length > 0 &&
      request.runtimeSnapshotId.trim().length > 0 &&
      request.recoverySnapshotId.trim().length > 0 &&
      request.startupSnapshotId.trim().length > 0;

    return Object.freeze({
      validationId,
      correlationId: request.correlationId,
      transactionId: request.transactionId,
      guildId: request.guildId,
      runtimeId: request.runtimeId,
      verificationOutcome: success
        ? StartupReentryVerificationOutcome.VERIFIED
        : StartupReentryVerificationOutcome.FAILED,
      success,
      failureReason: success ? undefined : 'STARTUP_SNAPSHOT_VALIDATION_FAILED',
    });
  }
}

export class InMemoryRuntimeStartupCoordinationRequestFactory
  implements RuntimeStartupCoordinationRequestFactory
{
  constructor(
    private readonly runtimeId: string,
    private readonly guildId: string,
  ) {}

  create(mode: RuntimeStartupMode): SecurityStartupRuntimeCoordinationRequest {
    const correlationId = [
      'startup-correlation',
      this.runtimeId,
      this.guildId,
      mode,
      String(Date.now()),
    ].join(':');
    const transactionId = [
      'startup-transaction',
      this.runtimeId,
      this.guildId,
      mode,
      String(Date.now()),
    ].join(':');
    const startupMode = this.toStartupReentryMode(mode);

    const runtimeSnapshotId = `runtime-snapshot:${this.runtimeId}:${this.guildId}`;
    const recoverySnapshotId = `recovery-snapshot:${this.runtimeId}:${this.guildId}`;
    const startupSnapshotId = `startup-snapshot:${this.runtimeId}:${this.guildId}`;

    const botSnapshot = this.createBotSnapshot(runtimeSnapshotId);
    const recoveryBotSnapshot = this.createBotSnapshot(recoverySnapshotId);
    const startupBotSnapshot = this.createBotSnapshot(startupSnapshotId);

    const webhookSnapshot = this.createWebhookSnapshot(runtimeSnapshotId);
    const recoveryWebhookSnapshot = this.createWebhookSnapshot(recoverySnapshotId);
    const startupWebhookSnapshot = this.createWebhookSnapshot(startupSnapshotId);

    const integrationSnapshot = this.createIntegrationSnapshot(runtimeSnapshotId);
    const recoveryIntegrationSnapshot = this.createIntegrationSnapshot(recoverySnapshotId);
    const startupIntegrationSnapshot = this.createIntegrationSnapshot(startupSnapshotId);

    const permissionSnapshot = this.createPermissionSnapshot(runtimeSnapshotId);
    const recoveryPermissionSnapshot = this.createPermissionSnapshot(recoverySnapshotId);
    const startupPermissionSnapshot = this.createPermissionSnapshot(startupSnapshotId);

    return Object.freeze({
      coordinatorId: `startup-coordinator:${this.runtimeId}:${this.guildId}`,
      planningId: `startup-planning:${this.runtimeId}:${this.guildId}`,
      dispatchId: `startup-dispatch:${this.runtimeId}:${this.guildId}`,
      startupReentrySecurityRequest: Object.freeze({
        startupSecurityReportId: `startup-security-report:${this.runtimeId}:${this.guildId}`,
        correlationId,
        transactionId,
        guildId: this.guildId,
        runtimeId: this.runtimeId,
        mode: startupMode,
        runtimeReady: true,
        snapshots: Object.freeze({
          runtimeSnapshotId,
          recoverySnapshotId,
          startupSnapshotId,
        }),
        botInventoryRequest: Object.freeze({
          reconciliationId: `startup-reentry-bot:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          authorizedBotRegistry: Object.freeze({
            registryId: `authorized-bot-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          currentGuildBotInventory: Object.freeze([]),
          runtimeSnapshot: botSnapshot,
          recoverySnapshot: recoveryBotSnapshot,
          startupInventory: startupBotSnapshot,
          metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
        }),
        webhookReconciliationRequest: Object.freeze({
          reconciliationId: `startup-reentry-webhook:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
        }),
        integrationReconciliationRequest: Object.freeze({
          reconciliationId: `startup-reentry-integration:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
        }),
        permissionReconciliationRequest: Object.freeze({
          reconciliationId: `startup-reentry-permission:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
        }),
        recoverySnapshotValidationRequest: Object.freeze({
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          runtimeSnapshotId,
          recoverySnapshotId,
          startupSnapshotId,
        }),
        metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
      }),
      startupReconciliationPipelineRequest: Object.freeze({
        pipelineId: `startup-pipeline:${this.runtimeId}:${this.guildId}`,
        correlationId,
        transactionId,
        guildId: this.guildId,
        runtimeId: this.runtimeId,
        botInventoryRequest: Object.freeze({
          reconciliationId: `startup-pipeline-bot:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          authorizedBotRegistry: Object.freeze({
            registryId: `authorized-bot-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          currentGuildBotInventory: Object.freeze([]),
          runtimeSnapshot: botSnapshot,
          recoverySnapshot: recoveryBotSnapshot,
          startupInventory: startupBotSnapshot,
          metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
        }),
        webhookInventoryRequest: Object.freeze({
          reconciliationId: `startup-pipeline-webhook:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          authorizedWebhookRegistry: Object.freeze({
            registryId: `authorized-webhook-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          currentGuildWebhookInventory: Object.freeze([]),
          runtimeSnapshot: webhookSnapshot,
          recoverySnapshot: recoveryWebhookSnapshot,
          startupInventory: startupWebhookSnapshot,
          metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
        }),
        integrationInventoryRequest: Object.freeze({
          reconciliationId: `startup-pipeline-integration:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          authorizedIntegrationRegistry: Object.freeze({
            registryId: `authorized-integration-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          currentGuildIntegrationInventory: Object.freeze([]),
          runtimeSnapshot: integrationSnapshot,
          recoverySnapshot: recoveryIntegrationSnapshot,
          startupInventory: startupIntegrationSnapshot,
          metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
        }),
        permissionRoleStateRequest: Object.freeze({
          reconciliationId: `startup-pipeline-permission:${this.runtimeId}:${this.guildId}`,
          correlationId,
          transactionId,
          guildId: this.guildId,
          runtimeId: this.runtimeId,
          authorizedRoleRegistry: Object.freeze({
            registryId: `authorized-role-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          protectedRoleRegistry: Object.freeze({
            registryId: `protected-role-registry:${this.guildId}`,
            registryVersion: 1,
            records: Object.freeze([]),
          }),
          dangerousPermissionPolicy: Object.freeze({
            dangerousPermissions: Object.freeze([
              'ADMINISTRATOR',
              'MANAGE_GUILD',
              'MANAGE_ROLES',
              'MANAGE_CHANNELS',
              'MANAGE_WEBHOOKS',
            ]),
          }),
          currentGuildRoleInventory: Object.freeze([]),
          currentChannelPermissionOverwriteInventory: Object.freeze([]),
          runtimeSnapshot: permissionSnapshot,
          recoverySnapshot: recoveryPermissionSnapshot,
          startupInventory: startupPermissionSnapshot,
          metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
        }),
        metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
      }),
      metadata: Object.freeze({ source: 'runtime-startup-request-factory' }),
    });
  }

  private toStartupReentryMode(mode: RuntimeStartupMode): StartupReentryMode {
    return mode === RuntimeStartupMode.RECONNECT_START
      ? StartupReentryMode.RECONNECT
      : StartupReentryMode.STARTUP;
  }

  private createBotSnapshot(snapshotId: string): SecurityBotInventorySnapshot {
    return Object.freeze({
      snapshotId,
      snapshotVersion: 1,
      guildId: this.guildId,
      runtimeId: this.runtimeId,
      botInventory: Object.freeze([]),
    });
  }

  private createWebhookSnapshot(snapshotId: string): SecurityWebhookInventorySnapshot {
    return Object.freeze({
      snapshotId,
      snapshotVersion: 1,
      guildId: this.guildId,
      runtimeId: this.runtimeId,
      webhookInventory: Object.freeze([]),
    });
  }

  private createIntegrationSnapshot(snapshotId: string): SecurityIntegrationInventorySnapshot {
    return Object.freeze({
      snapshotId,
      snapshotVersion: 1,
      guildId: this.guildId,
      runtimeId: this.runtimeId,
      integrationInventory: Object.freeze([]),
    });
  }

  private createPermissionSnapshot(snapshotId: string): SecurityPermissionRoleStateSnapshot {
    return Object.freeze({
      snapshotId,
      snapshotVersion: 1,
      guildId: this.guildId,
      runtimeId: this.runtimeId,
      roleInventory: Object.freeze([]),
      channelPermissionOverwriteInventory: Object.freeze([]),
    });
  }
}

export function createProductionStartupRuntimeCoordinator(): SecurityStartupRuntimeCoordinator {
  const botReconciler = new InMemorySecurityBotInventoryReconciler();
  const webhookReconciler = new InMemorySecurityWebhookInventoryReconciler();
  const integrationReconciler = new InMemorySecurityIntegrationInventoryReconciler();
  const permissionReconciler = new InMemorySecurityPermissionRoleStateReconciler();

  const startupReentryCoordinator = new InMemoryStartupReentrySecurityCoordinator(
    botReconciler,
    new InMemoryStartupContractReconciler(StartupContractReconciliationComponent.WEBHOOK),
    new InMemoryStartupContractReconciler(StartupContractReconciliationComponent.INTEGRATION),
    new InMemoryStartupContractReconciler(StartupContractReconciliationComponent.PERMISSION),
    new InMemoryStartupRecoverySnapshotVerifier(),
  );

  const startupPipeline = new InMemorySecurityStartupReconciliationPipeline(
    botReconciler,
    webhookReconciler,
    integrationReconciler,
    permissionReconciler,
  );

  return new InMemorySecurityStartupRuntimeCoordinator(
    startupReentryCoordinator,
    startupPipeline,
  );
}
