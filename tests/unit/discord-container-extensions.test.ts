import { ApplicationBootstrap } from '../../src/core/runtime/bootstrap';
import { InMemoryDiscordExecutionService } from '../../src/core/runtime/discord/discord-execution-service';
import { DiscordClientAdapterFactory } from '../../src/core/runtime/discord/container-extensions';
import { MockDiscordClientAdapter, TokenValidatingDiscordClientAdapter } from '../../src/core/runtime/discord/client';
import { ProductionDiscordExecutionAdapter } from '../../src/core/runtime/discord/production-discord-execution-adapter';
import { GuardianRuntimeMode } from '../../src/core/runtime/runtime-mode';

function setEnv(overrides: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

test('production mode uses the token-validating client adapter, not the mock adapter', () => {
  const restoreEnv = setEnv({ DISCORD_BOT_TOKEN: 'unit-test-token' });

  try {
    const adapter = new DiscordClientAdapterFactory(GuardianRuntimeMode.PRODUCTION).create();

    expect(adapter).toBeInstanceOf(TokenValidatingDiscordClientAdapter);
    expect(adapter).not.toBeInstanceOf(MockDiscordClientAdapter);
  } finally {
    restoreEnv();
  }
});

test.each([GuardianRuntimeMode.TESTING, GuardianRuntimeMode.VALIDATION])(
  '%s mode uses the mock client adapter',
  (mode) => {
    const adapter = new DiscordClientAdapterFactory(mode).create();

    expect(adapter).toBeInstanceOf(MockDiscordClientAdapter);
  },
);

test.each([GuardianRuntimeMode.PRODUCTION, GuardianRuntimeMode.TESTING, GuardianRuntimeMode.VALIDATION])(
  '%s mode builds the canonical runtime from ApplicationBootstrap',
  (mode) => {
    const restoreEnv = setEnv({
      GUARDIAN_RUNTIME_MODE: mode,
      DISCORD_BOT_TOKEN: 'unit-test-token',
      DISCORD_GATEWAY_INTENTS: 'GUILDS',
    });

    try {
      const bootstrap = new ApplicationBootstrap();
      const runtime = bootstrap.getCanonicalRuntime();
      const executionService = (runtime as unknown as { executionService: unknown }).executionService;

      expect(runtime).toBeDefined();
      if (mode === GuardianRuntimeMode.PRODUCTION) {
        expect(executionService).toBeInstanceOf(ProductionDiscordExecutionAdapter);
        expect(executionService).not.toBeInstanceOf(InMemoryDiscordExecutionService);
      } else {
        expect(executionService).toBeInstanceOf(InMemoryDiscordExecutionService);
      }
    } finally {
      restoreEnv();
    }
  },
);