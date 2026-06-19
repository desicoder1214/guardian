import { ServiceContainer, ServiceFactory, ServiceIdentifier } from '../../src/infra/di/container';
import { ServiceResolutionError } from '../../src/shared/errors';

interface TestService {
  getValue(): string;
}

class TestServiceFactory implements ServiceFactory<TestService> {
  create(): TestService {
    return { getValue: () => 'value' };
  }
}

const TestServiceId: ServiceIdentifier<TestService> = { name: 'TestService' };

test('ServiceContainer resolves registered services', () => {
  const container = new ServiceContainer();
  container.register(TestServiceId, new TestServiceFactory());

  const service = container.resolve(TestServiceId);

  expect(service.getValue()).toBe('value');
});

test('ServiceContainer returns the same instance for repeated resolutions', () => {
  const container = new ServiceContainer();
  container.register(TestServiceId, new TestServiceFactory());

  const first = container.resolve(TestServiceId);
  const second = container.resolve(TestServiceId);

  expect(first).toBe(second);
});

test('ServiceContainer rejects duplicate registrations', () => {
  const container = new ServiceContainer();
  container.register(TestServiceId, new TestServiceFactory());

  expect(() => container.register(TestServiceId, new TestServiceFactory())).toThrow(
    ServiceResolutionError,
  );
});

test('ServiceContainer throws ServiceResolutionError when service is not registered', () => {
  const container = new ServiceContainer();

  expect(() => container.resolve(TestServiceId)).toThrow(ServiceResolutionError);
  expect(() => container.resolve(TestServiceId)).toThrow('Service not registered: TestService');
});
