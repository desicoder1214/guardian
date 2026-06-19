import * as fs from 'fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface LogTransport {
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}

export class ConsoleTransport implements LogTransport {
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const output = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };
    console.log(JSON.stringify(output));
  }
}

export class FileTransport implements LogTransport {
  constructor(private readonly filePath: string) {}

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const output = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };
    const formatted = `${JSON.stringify(output)}\n`;
    fs.appendFileSync(this.filePath, formatted, { encoding: 'utf8' });
  }
}

export class LoggerFactory {
  constructor(private readonly transports: LogTransport[] = [new ConsoleTransport()]) {}

  createLogger(): Logger {
    return {
      debug: (message, metadata) => this.log('debug', message, metadata),
      info: (message, metadata) => this.log('info', message, metadata),
      warn: (message, metadata) => this.log('warn', message, metadata),
      error: (message, metadata) => this.log('error', message, metadata),
    };
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    for (const transport of this.transports) {
      transport.log(level, message, metadata);
    }
  }
}
