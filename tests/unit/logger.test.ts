import { ConsoleTransport, FileTransport, LoggerFactory } from '../../src/core/runtime/logger';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(__dirname, 'logger-test.log');

afterEach(() => {
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
});

test('LoggerFactory creates logger and logs to console', () => {
  const transport = new ConsoleTransport();
  const factory = new LoggerFactory([transport]);
  const logger = factory.createLogger();

  expect(typeof logger.info).toBe('function');
  logger.info('test message', { key: 'value' });
});

test('FileTransport writes log entries to a file', () => {
  const transport = new FileTransport(logFile);
  transport.log('info', 'test file message', { test: true });

  const contents = fs.readFileSync(logFile, 'utf8');
  expect(contents).toContain('test file message');
  expect(contents).toContain('"test":true');
});
