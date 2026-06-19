export interface KernelEvent {
  readonly id: string;
  readonly correlationId: string;
  readonly guildId: string;
  readonly type: string;
  readonly payload: unknown;
}

export interface EventHandler {
  handle(event: KernelEvent): Promise<void>;
}

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventHandlerError {
  readonly handlerIndex: number;
  readonly error: unknown;
}

export interface EventPublishResult {
  readonly event: KernelEvent;
  readonly handlersInvoked: number;
  readonly errors: readonly EventHandlerError[];
}
