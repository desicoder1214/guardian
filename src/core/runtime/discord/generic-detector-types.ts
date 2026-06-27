import { DiscordGatewayNormalizedEvent } from './pipeline-types';

export interface DetectionResult {
  readonly detectorId: string;
  readonly detectorName: string;
  readonly eventType: string;
  readonly detected: boolean;
  readonly confidence: number;
  readonly metadata: Record<string, unknown>;
  readonly correlationId: string;
}

export interface Detector {
  id(): string;
  supports(eventName: string): boolean;
  detect(normalizedEvent: DiscordGatewayNormalizedEvent): Promise<DetectionResult>;
}
