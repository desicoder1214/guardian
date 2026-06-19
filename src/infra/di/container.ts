import { ServiceResolutionError } from '../../shared/errors';

export interface ServiceIdentifier<TService = unknown> {
  readonly name: string;
  readonly __type?: TService;
}

export interface ServiceFactory<TService> {
  create(): TService;
}

export class ServiceContainer {
  private readonly factories = new Map<string, ServiceFactory<unknown>>();
  private readonly instances = new Map<string, unknown>();

  register<T>(id: ServiceIdentifier<T>, factory: ServiceFactory<T>): void {
    if (this.factories.has(id.name)) {
      throw new ServiceResolutionError(`Service already registered: ${id.name}`);
    }

    this.factories.set(id.name, factory);
  }

  resolve<T>(id: ServiceIdentifier<T>): T {
    if (this.instances.has(id.name)) {
      return this.instances.get(id.name) as T;
    }

    const factory = this.factories.get(id.name);
    if (!factory) {
      throw new ServiceResolutionError(`Service not registered: ${id.name}`);
    }

    const instance = factory.create();
    this.instances.set(id.name, instance);
    return instance as T;
  }
}
