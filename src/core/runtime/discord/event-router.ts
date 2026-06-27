import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { DiscordDetectorRegistry } from './detector-registry';

export interface DiscordEventRouter {
  route(event: DiscordGatewayNormalizedEvent): Promise<void>;
}

export class InMemoryDiscordEventRouter implements DiscordEventRouter {
  constructor(private readonly detectorRegistry: DiscordDetectorRegistry) {}

  async route(event: DiscordGatewayNormalizedEvent): Promise<void> {
    await this.detectorRegistry.dispatch(event);
  }
}
