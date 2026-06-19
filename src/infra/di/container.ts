import { ServiceResolutionError } from '../../shared/errors';

export type ServiceLifetime = 'singleton' | 'transient';

export interface ServiceIdentifier<TService = unknown> {
  readonly name: string;
  readonly __type?: TService;
}

export interface ServiceFactory<TService> {
  create(): TService;
}

export interface ServiceDescriptor<TService> {
  readonly lifetime: ServiceLifetime;
  readonly factory: ServiceFactory<TService>;
}

export class ServiceContainer {
  private readonly descriptors = new Map<string, ServiceDescriptor<unknown>>();
  private readonly instances = new Map<string, unknown>();

  constructor(descriptors?: Map<string, ServiceDescriptor<unknown>>) {
    this.descriptors = descriptors ? new Map(descriptors) : new Map();
  }

  registerSingleton<T>(id: ServiceIdentifier<T>, factory: ServiceFactory<T>): void {
    this.register(id, factory, 'singleton');
  }

  registerTransient<T>(id: ServiceIdentifier<T>, factory: ServiceFactory<T>): void {
    this.register(id, factory, 'transient');
  }

  registerFactory<T>(
    id: ServiceIdentifier<T>,
    factoryFn: () => T,
    lifetime: ServiceLifetime = 'transient',
  ): void {
    this.register(id, { create: factoryFn }, lifetime);
  }

  resolve<T>(id: ServiceIdentifier<T>): T {
    const descriptor = this.descriptors.get(id.name);
    if (!descriptor) {
      throw new ServiceResolutionError(`Service not registered: ${id.name}`);
    }

    if (descriptor.lifetime === 'singleton') {
      if (this.instances.has(id.name)) {
        return this.instances.get(id.name) as T;
      }

      const instance = descriptor.factory.create();
      this.instances.set(id.name, instance);
      return instance as T;
    }

    return descriptor.factory.create() as T;
  }

  createScope(): ServiceContainer {
    return new ServiceContainer(this.descriptors);
  }

  private register<T>(
    id: ServiceIdentifier<T>,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime,
  ): void {
    if (this.descriptors.has(id.name)) {
      throw new ServiceResolutionError(`Service already registered: ${id.name}`);
    }

    this.descriptors.set(id.name, { factory, lifetime });
  }
}
