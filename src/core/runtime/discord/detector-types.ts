import { DiscordGatewayNormalizedEvent } from './pipeline-types';

export interface DiscordEventDetector {
  readonly id: string;
  handle(event: DiscordGatewayNormalizedEvent): Promise<void>;
}
