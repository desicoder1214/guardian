import { SecurityEvaluationDetectionPipeline } from './generic-detector-pipeline';
import { DetectionResult } from './generic-detector-types';
import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityEvaluationPipeline } from './security-evaluation-pipeline';
import { SecurityActionType } from './security-policy-types';
import { SecurityActionDispatcher } from './security-action-dispatcher';
import { SecurityActionPlanner } from './security-action-planner';

const DETECTION_EVENT_TO_SECURITY_ACTION_TYPE_MAP: Readonly<Record<string, SecurityActionType>> = {
  BOT_ADD: SecurityActionType.BOT_ADD,
  GUILD_MEMBER_ADD: SecurityActionType.BOT_ADD,
  GUILD_MEMBER_UPDATE: SecurityActionType.ROLE_CREATE,
  GUILD_ROLE_UPDATE: SecurityActionType.ROLE_CREATE,
  MEMBER_ROLE_ADD: SecurityActionType.ROLE_CREATE,
  ROLE_CREATE: SecurityActionType.ROLE_CREATE,
  GUILD_ROLE_CREATE: SecurityActionType.ROLE_CREATE,
};

export class InMemorySecurityDetectionForwarder implements SecurityEvaluationDetectionPipeline {
  constructor(
    private readonly securityEvaluationPipeline: SecurityEvaluationPipeline,
    private readonly actionPlanner: SecurityActionPlanner,
    private readonly actionDispatcher: SecurityActionDispatcher,
  ) {}

  async evaluateDetection(normalizedEvent: DiscordGatewayNormalizedEvent, detection: DetectionResult): Promise<void> {
    if (!detection.detected) {
      return;
    }

    const actionType = this.resolveActionType(detection.eventType);
    if (!actionType) {
      return;
    }

    const actorId = this.readActorId(normalizedEvent.payload);
    const decision = await this.securityEvaluationPipeline.evaluate(normalizedEvent, actorId, actionType);
    const plan = this.actionPlanner.plan(decision);
    await this.actionDispatcher.dispatch(plan);
  }

  private resolveActionType(eventType: string): SecurityActionType | undefined {
    return DETECTION_EVENT_TO_SECURITY_ACTION_TYPE_MAP[eventType];
  }

  private readActorId(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
      return 'unknown-actor';
    }

    const record = payload as Record<string, unknown>;
    const candidateKeys = ['actorId', 'actor_id', 'userId', 'user_id', 'executorId', 'executor_id', 'inviterId'];

    for (const key of candidateKeys) {
      const value = record[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return 'unknown-actor';
  }
}
