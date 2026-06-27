import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { DiscordEventDetector } from './detector-types';

export interface DiscordDetectorRegistry {
  register(detector: DiscordEventDetector): () => void;
  getDetectors(): readonly DiscordEventDetector[];
  dispatch(event: DiscordGatewayNormalizedEvent): Promise<void>;
}

export class InMemoryDiscordDetectorRegistry implements DiscordDetectorRegistry {
  private readonly detectors: DiscordEventDetector[] = [];

  register(detector: DiscordEventDetector): () => void {
    this.detectors.push(detector);

    let active = true;
    return () => {
      if (!active) {
        return;
      }

      active = false;
      const index = this.detectors.indexOf(detector);
      if (index >= 0) {
        this.detectors.splice(index, 1);
      }
    };
  }

  getDetectors(): readonly DiscordEventDetector[] {
    return [...this.detectors];
  }

  async dispatch(event: DiscordGatewayNormalizedEvent): Promise<void> {
    const detectorsSnapshot = [...this.detectors];
    await Promise.all(detectorsSnapshot.map((detector) => detector.handle(event)));
  }
}
