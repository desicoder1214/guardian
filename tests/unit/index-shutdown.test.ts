import { ApplicationBootstrap } from '../../src/core/runtime/bootstrap';
import { registerGuardianShutdownHandlers } from '../../src/index';

test('registerGuardianShutdownHandlers registers SIGINT and SIGTERM handlers', () => {
  const onceSpy = jest
    .spyOn(process, 'once')
    .mockImplementation(((
      _event: NodeJS.Signals,
      _listener: () => void,
    ) => process) as typeof process.once);

  try {
    registerGuardianShutdownHandlers({ stop: jest.fn() } as unknown as ApplicationBootstrap);

    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  } finally {
    onceSpy.mockRestore();
  }
});

test('SIGTERM handler stops runtime and exits successfully', async () => {
  const handlers = new Map<string, () => void>();
  const onceSpy = jest
    .spyOn(process, 'once')
    .mockImplementation(((event: NodeJS.Signals, listener: () => void) => {
      handlers.set(event, listener);
      return process;
    }) as typeof process.once);
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  const stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(((
    _chunk: unknown,
    _encoding?: unknown,
    callback?: (() => void) | undefined,
  ) => {
    callback?.();
    return true;
  }) as typeof process.stdout.write);
  const stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation(((
    _chunk: unknown,
    _encoding?: unknown,
    callback?: (() => void) | undefined,
  ) => {
    callback?.();
    return true;
  }) as typeof process.stderr.write);
  const bootstrap = {
    stop: jest.fn(async () => undefined),
  } as unknown as ApplicationBootstrap;

  try {
    registerGuardianShutdownHandlers(bootstrap);

    const handler = handlers.get('SIGTERM');
    expect(handler).toBeDefined();

    handler?.();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect((bootstrap.stop as unknown as jest.Mock).mock.calls.length).toBe(1);
  } finally {
    onceSpy.mockRestore();
    exitSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  }
});
