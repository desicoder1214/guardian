import { DetectionContext, DetectionEngine, InMemoryDetectionEngine } from './detection-engine';
import { DetectorPluginRegistry, InMemoryDetectorPluginRegistry } from './detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionType as SecurityPolicyActionType } from './security-policy-types';
import { InMemoryRuntimeResultAggregator, RuntimeResultAggregator } from './security-runtime-result-aggregator';
import {
  SecurityRuntimeOrchestrator,
  SecurityRuntimeResult,
} from './security-runtime-orchestrator';
import { DetectionAwareSecurityEvaluationPipeline } from './security-evaluation-pipeline';

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
  constructor(
    private readonly orchestrator: SecurityRuntimeOrchestrator,
    private readonly securityEvaluationPipeline?: DetectionAwareSecurityEvaluationPipeline,
    private readonly detectorRegistry: DetectorPluginRegistry = new InMemoryDetectorPluginRegistry(),
    private readonly detectionEngine: DetectionEngine = new InMemoryDetectionEngine(detectorRegistry),
    private readonly runtimeResultAggregator: RuntimeResultAggregator = new InMemoryRuntimeResultAggregator(),
  ) {}

  async process(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): Promise<SecurityRuntimeResult> {
    try {
      const detectionContext = this.buildDetectionContext(normalizedEvent, actorId, actionType);
      const detectionResults = await this.detectionEngine.evaluate(detectionContext);
      this.securityEvaluationPipeline?.stageDetectionResults(detectionResults);

      const result = await this.orchestrator.orchestrate(normalizedEvent, actorId, actionType);
      const summary = this.runtimeResultAggregator.aggregate(result);
      const metadata: RuntimeEngineResultMetadata & Record<string, unknown> = Object.freeze({
        engine: 'in-memory-security-runtime-engine',
        processedAt: normalizedEvent.timestamp,
        correlationId: result.correlationId,
        summary,
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

  private buildDetectionContext(
    normalizedEvent: DiscordGatewayNormalizedEvent,
    actorId: string,
    actionType: SecurityPolicyActionType,
  ): DetectionContext {
    return Object.freeze({
      normalizedEvent,
      actorId,
      guildId: this.readGuildId(normalizedEvent.payload),
      actionType,
      correlationId: normalizedEvent.correlationId,
      timestamp: normalizedEvent.timestamp,
      metadata: Object.freeze({
        source: 'in-memory-security-runtime-engine',
      }),
    });
  }

  private readGuildId(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
      return 'unknown-guild';
    }

    const record = payload as Record<string, unknown>;
    const value = record.guildId ?? record.guild_id;
    return typeof value === 'string' && value.length > 0 ? value : 'unknown-guild';
  }
}