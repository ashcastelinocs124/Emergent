# Repository Guidelines

## Project Structure & Module Organization

`src/city/` contains the current New Eden game: scene setup, residents, conversations, decisions, and repair state. `src/main.ts` starts the browser app; `index.html` and `src/style.css` define its UI. `server/` hosts the Express endpoints for Jev decisions and optional OpenAI chat. `src/game/`, `src/shared/`, and `src/ui/` retain the earlier wilderness prototype; do not assume they are the active entry point. Put static portraits and textures in `public/`, unit tests in `tests/`, browser tests in `e2e/`, and design notes and reviewed screenshots in `docs/`.

## Build, Test, and Development Commands

Run `npm install`, copy `.env.example` to `.env`, then use `npm run dev` for the Vite client and API server. Open `http://127.0.0.1:5173`. For deterministic development, run `npm run dev:server:test` and `npm run dev:client` in separate terminals; the UI labels this fake Jev mode. `npm test` runs Vitest, `npm run typecheck` checks TypeScript, and `npm run build` typechecks and bundles the client. `npm run e2e` runs Playwright with its own fake API server; stop a running local server first because Playwright reserves port 8787.

## Coding Style & Naming Conventions

Use TypeScript with strict types, two-space indentation, single-quoted imports and strings, and semicolons, following nearby code. Name modules by responsibility (`src/city/conversation.ts`); use `camelCase` for functions and variables, `PascalCase` for types, and kebab-case for asset filenames. No formatter or linter is configured, so keep edits consistent with the touched file and run the typecheck.

## Testing Guidelines

Add focused `tests/*.test.ts` Vitest cases for state or service behavior and `e2e/*.spec.ts` Playwright cases for player flows. Name tests for observable behavior. Browser tests use fake Jev and `?debug=1` for repeatable navigation. There is no configured coverage threshold; run the relevant focused test while developing, then `npm test`, `npm run build`, and `npm run e2e` before proposing a change.

## Commits, Pull Requests & Configuration

Recent commits use short imperative subjects, sometimes prefixed `feat:`, `fix:`, or `docs:`. Keep commits scoped. In a pull request, explain the player-visible change, list validation, link a relevant issue or design note when available, and include before/after screenshots for UI work. Keep `TYPESAFE_API_KEY` and optional `OPENAI_API_KEY` in ignored `.env`; never put keys in client code, commits, logs, or screenshots.
