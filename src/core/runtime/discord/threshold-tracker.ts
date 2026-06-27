import { SecurityActionType } from './security-policy-types';

export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export interface ThresholdTrackerResult {
  readonly exceeded: boolean;
  readonly observedCount: number;
}

export interface ThresholdTracker {
  recordAction(
    guildId: string,
    actorId: string,
    actionType: SecurityActionType,
    threshold: number,
    windowMs: number,
  ): ThresholdTrackerResult;
}

export class InMemoryThresholdTracker implements ThresholdTracker {
  private readonly actionTimestamps = new Map<string, number[]>();

  constructor(private readonly clock: Clock = new SystemClock()) {}

  recordAction(
    guildId: string,
    actorId: string,
    actionType: SecurityActionType,
    threshold: number,
    windowMs: number,
  ): ThresholdTrackerResult {
    const key = `${guildId}:${actorId}:${actionType}`;
    const now = this.clock.now();
    const windowStart = now - windowMs;
    const existing = this.actionTimestamps.get(key) ?? [];
    const inWindow = existing.filter((timestamp) => timestamp > windowStart);

    inWindow.push(now);
    this.actionTimestamps.set(key, inWindow);

    return {
      exceeded: inWindow.length > threshold,
      observedCount: inWindow.length,
    };
  }
}
