# Project Restructure: Components, Services, Stores, Hooks → src/

This project uses a single canonical `src/` directory for all runtime code. The following conventions are now followed:

- `src/components/` — All React components grouped by domain:
  - `src/components/chat/`, `src/components/layout/`, `src/components/preview/`, `src/components/editor/`, `src/components/ui/`, `src/components/sidebar/`, etc.
- `src/stores/` — Zustand stores (`appStore.ts`, `conversationStore.ts`, `projectStore.ts`, `codeIntelligenceStore.ts`, ...).
- `src/services/` — External services and domain services (AI clients, file/database adapters, monitoring, storage, etc.).
- `src/hooks/` — Custom React hooks, grouped as needed (e.g., `useEditorHandlers`, `useConversation`, voice hooks under `voice/`).
- `src/utils/` — Utility functions and helpers (logger, storage manager, performance utils, etc.).
- `src/types/` — Shared TypeScript types and interfaces.

Why this structure?
- Improves discoverability and onboarding ✅
- Encourages modular, domain-based grouping ✅
- Simplifies path aliases (`@/`, `@components/`, `@services/`, `@stores/`, `@utils/`) ✅

---

## Migration details (what was done)
- Verified the repository contains the canonical `src/` layout and aliases are configured in `tsconfig.json` and `vite.config.ts`.
- Removed the empty root-level `components/` directory (it contained no tracked files). A full repository snapshot was created as a Git branch before any changes (branch name: `backup/pre-migration-<timestamp>`).
- Ensured `src/stores` uses Zustand for state management (e.g., `useAppStore`, `useConversationStore`).

---

## Restore from backup (if needed)
If you need to restore the project to the pre-migration state:
1. Checkout the backup branch: `git checkout backup/pre-migration-<timestamp>`
2. Create a new branch to work from: `git checkout -b restore/pre-migration-<timestamp>`
3. Copy any files you want back into the `main` branch or adjust as needed.

If you need the entire snapshot as a directory rather than a branch, you can create an archive before switching branches or use `git archive`:

- Create a zip from the backup branch:
  - `git archive -o ../g-studio-backup-<timestamp>.zip backup/pre-migration-<timestamp>`

---

## Next recommended steps
1. Run `npm run type-check` and `npm run lint` and fix remaining type/lint issues.
2. Run the test suite: `npm test` and address failing tests.
3. Review `scripts/tmp_rovodev_migrate.ps1` and other migration helpers — keep them for future moves if needed.
4. If you want, I can:
   - Run a search-and-replace to ensure all imports use aliases like `@components`/`@services` (non-invasive PR with preview first).
   - Create a cleanup PR to remove other empty/legacy directories after verification.

---

If you'd like, I can open a small pull request with these doc changes and the cleanup commit, or proceed to do a deeper audit for leftover references and create an automated script to rewrite any legacy imports.
