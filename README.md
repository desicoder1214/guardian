# Guardian

## Local Development / Testing Guild Setup

1. Install dependencies.

	npm install

2. Configure environment variables.

	Copy `.env.example` to `.env` and fill in all required values.

	Required at startup:

	- `GUARDIAN_RUNTIME_MODE` (`production`, `validation`, `testing`, `certification`)
	- `GUARDIAN_RUNTIME_ID`
	- `GUARDIAN_GUILD_ID`
	- `DISCORD_BOT_TOKEN`
	- `DISCORD_GATEWAY_INTENTS`

3. Build the runtime.

	npm run build

4. Start Guardian.

	npm start

5. Expected startup checks.

	- `.env` is loaded at process bootstrap.
	- Startup fails immediately with a configuration error if required variables are missing or empty.
	- Startup fails immediately with a configuration error if `GUARDIAN_RUNTIME_MODE` is invalid.
	- Discord configuration provider validates required Discord keys before runtime adapter wiring completes.
