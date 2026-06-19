export type CorrelationId = string;
export type GuildId = string;
export type ActorId = string;
export type IncidentId = string;

export interface ActorReference {
  readonly id: ActorId;
  readonly displayName?: string;
}
