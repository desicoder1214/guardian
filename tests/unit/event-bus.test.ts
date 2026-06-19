import { InMemoryEventBus } from '../../src/core/event/bus';
import { KernelEvent } from '../../src/core/event/types';

class TestHandler {
  public events: KernelEvent[] = [];

  async handle(event: KernelEvent): Promise<void> {
    this.events.push(event);
  }
}

class FailingHandler {
  async handle(): Promise<void> {
    throw new Error('handler failure');
  }
}

const event: KernelEvent = {
  id: '1',
  correlationId: 'corr-1',
  guildId: 'guild-1',
  type: 'TEST_EVENT',
  payload: { name: 'test' },
};

test('InMemoryEventBus publishes events to subscribed handlers', async () => {
  const bus = new InMemoryEventBus();
  const handler = new TestHandler();

  bus.subscribe(handler);

  const result = await bus.publish(event);

  expect(handler.events).toHaveLength(1);
  expect(handler.events[0]).toEqual(event);
  expect(result.handlersInvoked).toBe(1);
  expect(result.errors).toHaveLength(0);
});

test('InMemoryEventBus supports unsubscribe behavior', async () => {
  const bus = new InMemoryEventBus();
  const handler = new TestHandler();
  const subscription = bus.subscribe(handler);

  subscription.unsubscribe();
  subscription.unsubscribe();

  const result = await bus.publish(event);

  expect(handler.events).toHaveLength(0);
  expect(result.handlersInvoked).toBe(0);
});

test('InMemoryEventBus isolates handler errors and continues dispatch', async () => {
  const bus = new InMemoryEventBus();
  const healthyHandler = new TestHandler();

  bus.subscribe(new FailingHandler());
  bus.subscribe(healthyHandler);

  const result = await bus.publish(event);

  expect(healthyHandler.events).toHaveLength(1);
  expect(result.handlersInvoked).toBe(2);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]?.handlerIndex).toBe(0);
});
