import { RuntimeLifecycle } from './lifecycle';
import { Logger } from './logger';

export class SignalHandler {
  constructor(
    private readonly runtime: RuntimeLifecycle,
    private readonly logger: Logger,
  ) {}

  register(): void {
    process.on('SIGINT', () => this.handle('SIGINT'));
    process.on('SIGTERM', () => this.handle('SIGTERM'));
  }

  private async handle(signal: string): Promise<void> {
    this.logger.info(`Received signal: ${signal}`);
    await this.runtime.stop();
  }
}
