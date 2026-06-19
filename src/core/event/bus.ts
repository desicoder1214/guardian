import {
  EventHandler,
  EventHandlerError,
  EventPublishResult,
  EventSubscription,
  KernelEvent,
} from './types';

export interface EventBus {
  publish(event: KernelEvent): Promise<EventPublishResult>;
  subscribe(handler: EventHandler): EventSubscription;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers: EventHandler[] = [];

  subscribe(handler: EventHandler): EventSubscription {
    this.handlers.push(handler);
    let active = true;

    return {
      unsubscribe: (): void => {
        if (!active) {
          return;
        }

        active = false;
        const index = this.handlers.indexOf(handler);
        if (index >= 0) {
          this.handlers.splice(index, 1);
        }
      },
    };
  }

  async publish(event: KernelEvent): Promise<EventPublishResult> {
    const handlersSnapshot = [...this.handlers];
    const errors: EventHandlerError[] = [];

    await Promise.all(
      handlersSnapshot.map(async (handler, handlerIndex) => {
        try {
          await handler.handle(event);
        } catch (error) {
          errors.push({ handlerIndex, error });
        }
      }),
    );

    return {
      event,
      handlersInvoked: handlersSnapshot.length,
      errors,
    };
  }
}
