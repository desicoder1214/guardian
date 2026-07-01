export * from './core/config/index';
export * from './core/event/index';
export * from './infra/di/container';
export * from './shared/types/index';
export * from './shared/interfaces/index';
export * from './shared/errors/index';

import { ApplicationBootstrap } from './core/runtime/bootstrap';

export async function startGuardianRuntime(): Promise<ApplicationBootstrap> {
	const bootstrap = new ApplicationBootstrap();
	await bootstrap.start();
	return bootstrap;
}

declare const require: undefined | { main?: unknown };
declare const module: undefined | unknown;

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
	void startGuardianRuntime();
}
