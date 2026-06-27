import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { DetectorRegistry, InMemoryDetectorRegistry } from './generic-detector-registry';
import { DetectionResult } from './generic-detector-types';

export interface SecurityEvaluationDetectionPipeline {
  evaluateDetection(normalizedEvent: DiscordGatewayNormalizedEvent, detection: DetectionResult): Promise<void>;
}

export interface DetectorPipeline {
  execute(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<readonly DetectionResult[]>;
}

export class InMemoryDetectorPipeline implements DetectorPipeline {
  constructor(
    private readonly registry: DetectorRegistry = new InMemoryDetectorRegistry(),
    private readonly securityEvaluationPipeline: SecurityEvaluationDetectionPipeline,
  ) {}

  async execute(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<readonly DetectionResult[]> {
    const results = await this.registry.execute(normalizedEvent);

    for (const result of results) {
      if (!result.detected) {
        continue;
      }

      await this.securityEvaluationPipeline.evaluateDetection(normalizedEvent, result);
    }

    return results;
  }
}
