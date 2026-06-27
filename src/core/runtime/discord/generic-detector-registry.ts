import { Detector } from './generic-detector-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { DetectionResult } from './generic-detector-types';

export interface DetectorRegistry {
  register(detector: Detector): void;
  unregister(detectorId: string): void;
  resolve(eventName: string): readonly Detector[];
  execute(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<readonly DetectionResult[]>;
  list(): readonly Detector[];
}

export class InMemoryDetectorRegistry implements DetectorRegistry {
  private readonly detectors: Detector[] = [];

  register(detector: Detector): void {
    this.detectors.push(detector);
  }

  unregister(detectorId: string): void {
    const index = this.detectors.findIndex((detector) => detector.id() === detectorId);
    if (index >= 0) {
      this.detectors.splice(index, 1);
    }
  }

  resolve(eventName: string): readonly Detector[] {
    return this.detectors.filter((detector) => detector.supports(eventName));
  }

  async execute(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<readonly DetectionResult[]> {
    const detectors = this.resolve(normalizedEvent.eventName);
    const results: DetectionResult[] = [];

    for (const detector of detectors) {
      try {
        const result = await detector.detect(normalizedEvent);
        results.push(result);
      } catch (error) {
        results.push({
          detectorId: detector.id(),
          detectorName: detector.id(),
          eventType: normalizedEvent.eventName,
          detected: false,
          confidence: 0,
          metadata: {
            isolatedFailure: true,
            error: error instanceof Error ? error.message : 'unknown detector failure',
          },
          correlationId: normalizedEvent.correlationId,
        });
      }
    }

    return results;
  }

  list(): readonly Detector[] {
    return [...this.detectors];
  }
}
