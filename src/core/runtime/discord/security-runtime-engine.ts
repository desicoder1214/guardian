import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionType as SecurityPolicyActionType } from './security-policy-types';
import {
  SecurityRuntimeOrchestrator,
  SecurityRuntimeResult,
} from './security-runtime-orchestrator';

export interface SecurityRuntimeEngine {
  process(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult>;
}

export interface RuntimeEngineResultMetadata {
  readonly engine: 'in-memory-security-runtime-engine';
  readonly processedAt: string;
  readonly correlationId: string;
}

export class InMemorySecurityRuntimeEngine implements SecurityRuntimeEngine {
  constructor(private readonly orchestrator: SecurityRuntimeOrchestrator) {}

  async process(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult> {
    try {
      const result = await this.orchestrator.orchestrate(normalizedEvent, actorId, actionType);
      const metadata: RuntimeEngineResultMetadata & Record<string, unknown> = Object.freeze({
        engine: 'in-memory-security-runtime-engine',
        processedAt: normalizedEvent.timestamp,
        correlationId: result.correlationId,
        ...(result.metadata ?? {}),
      });

      return Object.freeze({
        ...result,
        metadata,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`InMemorySecurityRuntimeEngine.process failed: ${error.message}`);
      }

      throw new Error('InMemorySecurityRuntimeEngine.process failed: Unknown runtime error');
    }
  }
}