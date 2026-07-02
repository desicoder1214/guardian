import 'dotenv/config';

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

async function flushStdStreams(): Promise<void> {
	await Promise.all([
		new Promise<void>((resolve) => process.stdout.write('', () => resolve())),
		new Promise<void>((resolve) => process.stderr.write('', () => resolve())),
	]);
}

export function registerGuardianShutdownHandlers(bootstrap: ApplicationBootstrap): void {
	let shuttingDown = false;

	const shutdown = (signal: NodeJS.Signals): void => {
		if (shuttingDown) {
			return;
		}

		shuttingDown = true;
		void (async () => {
			try {
				console.log(`[guardian] received ${signal}; stopping runtime...`);
				await bootstrap.stop();
				await flushStdStreams();
				process.exit(0);
			} catch (error) {
				console.error('[guardian] graceful shutdown failed', error);
				await flushStdStreams();
				process.exit(1);
			}
		})();
	};

	process.once('SIGINT', () => shutdown('SIGINT'));
	process.once('SIGTERM', () => shutdown('SIGTERM'));
}

declare const require: undefined | { main?: unknown };
declare const module: undefined | unknown;

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
	void startGuardianRuntime()
		.then((bootstrap) => {
			registerGuardianShutdownHandlers(bootstrap);
		})
		.catch((error) => {
			console.error('[guardian] startup failed', error);
			process.exit(1);
		});
}
