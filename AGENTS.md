# Repository Guidelines

## Project Structure & Module Organization

WorkShot is an Electron + Vite + React TypeScript app. Main-process code lives in `src/main/` and handles Git, PostgreSQL commands, persistence, and IPC registration. `src/preload/` exposes the safe `window.workshot` bridge. Renderer UI lives in `src/renderer/src/`, with shared UI in `components/`, workflow panels in `panels/`, and design tokens in `theme.ts` and `styles/tokens.css`. Cross-process types and IPC channel constants are in `src/shared/`. Packaging helpers are in `scripts/`. Generated output and runtime data (`out/`, `dist/`, `workshot.json`, `snapshots/`, `auto-backups/`) should not be committed.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: launch Electron with Vite HMR through `scripts/run-electron-vite.mjs`.
- `npm run typecheck`: run strict TypeScript checks for both Node and web configs.
- `npm run build:bundle`: build app bundles into `out/`.
- `npm run package`: build an unpacked Electron package under `dist/`.
- `npm run build` or `npm run make`: create the production installer/package with `electron-builder`.
- `npm run start`: preview the built app.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, single quotes, semicolons, and explicit shared types where IPC boundaries are involved. React components use PascalCase (`SavePanel`, `TitleBar`); hooks use `useX`; helpers use camelCase. Keep IPC channel names centralized in `src/shared/ipc.ts`, then update main, preload, and renderer API wrappers together. Prefer existing inline style/token patterns over adding new styling libraries.

## Testing Guidelines

No automated test framework is currently configured. Before opening a PR, run `npm run typecheck` and manually verify affected save/restore flows in `npm run dev`. For snapshot or restore changes, test Git validation plus PostgreSQL dump/restore paths. If adding tests later, keep names descriptive, such as `workshot.test.ts` or `SavePanel.test.tsx`, and wire the command into `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, direct summaries, often in Korean, with occasional English documentation subjects. Keep the first line concise and action-oriented, for example `DB restore validation update` or `README.md Update`. PRs should include a short behavior summary, verification steps, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Development requires Node.js 18+, Git CLI, and PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) on `PATH`. Do not log database passwords; pass credentials through environment variables such as `PGPASSWORD`. Restore code is destructive (`git reset --hard`, `pg_restore --clean`), so preserve the existing backup flow and warnings when changing it.
