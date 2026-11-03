# MockData Foundry

Portfolio web app that uses an LLM to generate realistic mock data for development and testing. The user describes a dataset and a flat record shape, previews the generated data, and exports it as JSON or CSV.

`PLAN.md` is the source of truth for scope, limits, the request/response contract, export conventions, architecture, milestones, acceptance criteria and per-task progress. Read it before starting any milestone work, and update its status markers when a task is completed.

When a change affects the commands, project layout, conventions or dependency rules described in this file, update it in the same commit and keep it concise. Feature scope and progress belong in PLAN.md, not here.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Vitest. UI libraries: `lucide-react` (icons) and `motion` (animations, imported from `motion/react`). Groq is the LLM provider (application model `openai/gpt-oss-120b`, set server-side); Vercel is the intended hosting platform. The UI calls the Vercel Function, which calls Groq; development builds can switch to a local mock (progress in `PLAN.md`).

## Project Layout

- `src/features/generator/components/`: generator UI. `GeneratorWorkspace.tsx` owns the form, generation state (including the Clear form undo snapshot) and the two-pane layout; `DatasetDetailsPanel.tsx` holds the description and record count, with slots for `ExamplePresets.tsx` (blank-form presets under the description) and `FormResetButton.tsx` (Clear form / Undo clear beside the heading); `CommandBar.tsx` is the always-visible action bar (Add field, Generate data); `ProblemTray.tsx` slides field problems up from behind it; `SelectField.tsx` wraps a native `<select>` (themed closed state, styled animated list where `appearance: base-select` is supported; styles in `src/index.css`); `PourLine.tsx` is the gold loading line along the pane seam; `ResultsPanel.tsx` renders the idle/loading/error/success states and owns the Table/Editor view choice, using `ResultsViewToggle.tsx`, `ResultsTable.tsx` or `JsonEditorView.tsx` (JSON from `toJson`), `ExportFooter.tsx` (download buttons with their null/CSV/formula notes) on success; `DevTools.tsx` is a dev-only corner widget (rendered only when `import.meta.env.DEV`) whose popover holds `GeneratorSourceControl.tsx` (Mock or Live API, remembered via `generator-source.ts`) and, for Mock, `MockOutcomeControl.tsx`, the picker for forcing mock outcomes.
- `src/features/generator/field-utils.ts`: field drafts with stable ids, request building, issue visibility, record-count stepping, blank-form check, generate shortcut and counter tone
- `src/features/generator/presets.ts`: the example presets (each must pass request validation; see its test)
- `src/features/generator/field-row-layout.ts`: grid template shared by the field list header and its rows
- `src/features/generator/result-utils.ts`: cell display formatting, results view helpers and retry-delay wording
- `src/features/generator/json-tokens.ts`: splits JSON export text into typed tokens per line (for the Editor view)
- `src/lib/generation.ts`: shared types, `REQUEST_LIMITS`, request validation, and `DEMO_RATE_LIMIT`, which mirrors the Vercel Firewall rule (change both together)
- `src/lib/generate.ts`: the single `generate(request)` entry point. UI code calls only `generate()`. It posts to `/api/generate` and checks the reply with `generate-response.ts`; in development builds it can use `mock-generator.ts` instead (dynamically imported inside a `DEV` branch, so production never bundles it).
- `src/lib/record-check.ts`: the per-record check (field set, types, nulls, string cap) shared by the server's line parser and the browser's response check
- `src/lib/storage.ts`: `localStorage` access that tolerates blocked storage
- `src/lib/export.ts`, `src/lib/download.ts`: pure JSON/CSV serialization (CSV null convention in `PLAN.md`) and the browser download helper
- `src/features/theme/`: `ThemeToggle.tsx` and pure `theme-utils.ts` (stored-theme parsing)
- `src/index.css`: Tailwind import and theme tokens
- `api/generate.ts`: the Vercel Function entry (`POST /api/generate`); only reads `process.env` and delegates to `src/server/`. Every file in `api/` becomes a function, so keep shared code out of it.
- `src/server/`: environment-free server logic, unit-tested with an injected `fetch`. `handler.ts` validates requests, calls Groq through `groq.ts`, maps outcomes to the error envelope and logs one usage line per provider call; `prompt.ts` builds the developer/user messages (JSON Lines, with the `record-schema.ts` schema as a `# Response Formats` section); `record-lines.ts` validates the reply line by line; `top-up.ts` decides whether one follow-up call for missing records fits Groq's per-minute budget. Generation does not use Groq's `response_format` (see `PLAN.md`). Type-checked by `tsconfig.api.json` (Node ESM), not `tsconfig.app.json`: relative imports here and in `api/` need `.js` extensions, as Vercel's runtime requires.

## Code Organization

- Keep `App.tsx` limited to page composition; put new UI responsibilities in their own components under the relevant feature directory.
- Keep types, constants and pure logic in `.ts` modules, separate from JSX.

## Styling

Use the semantic Tailwind tokens from `src/index.css` (`bg-app`, `text-content`, `bg-action`, `bg-button`, `border-border`, etc.), never raw palette colors. Surfaces step from page (`bg-app`) to card (`bg-surface`) to well (`bg-surface-inset`, `bg-input`); secondary buttons use `bg-button` with an accent-tinted hover. Dark is the default palette on `:root`; the light palette applies under `:root[data-theme="light"]`. Theme does not follow `prefers-color-scheme`. The header toggle (`src/features/theme/`) sets `data-theme` and stores the choice in `localStorage`; an inline script in `index.html` applies it before first paint. Use `border-border-strong` for form-control boundaries (`border-border` is for decorative dividers). A global `focus-visible` outline in `src/index.css` covers buttons, selects and checkboxes; text inputs keep their ring. New UI must work in both palettes. When changing palette values, keep text at 4.5:1 or more and control borders (`border-strong`) and focus at 3:1 or more against the surfaces they sit on, in both palettes. Use `lucide-react` for icons and Motion for animations; keep animations subtle and purposeful, and respect reduced-motion preferences. `MotionConfig reducedMotion="user"` in `App.tsx` only skips transform animations; for height or opacity, set the duration to 0 via `useReducedMotion()`. An unlayered `font: inherit` on form controls in `src/index.css` overrides Tailwind text sizes, so use `text-sm!`/`text-xs!` where a control's size must win.

## Commands

- `npm run dev`: Vite dev server; does not serve `/api`, so use the mock (DevTools default)
- `npm run dev:vercel`: `vercel dev` on the linked project, serving the app and `/api/generate`. Function variables come only from `.env` (git-ignored, holds the development `GROQ_API_KEY`), not `.env.local` (which holds the CLI's `VERCEL_OIDC_TOKEN`). Switch DevTools to Live API to call it
- `npm run smoke`: sends maximum-size requests to `/api/generate` on a running `dev:vercel` (`SMOKE_REQUEST=stress|customers`, `SMOKE_RUNS`); results are in the server's `"event":"generate"` log lines. Uses real Groq tokens
- `npm run build`: TypeScript checks and production bundle
- `npm run lint`: ESLint
- `npm test`: Vitest unit tests, single run
- `npx vitest run <path>`: run a single test file
- `npm run preview`: serve the built bundle
- The Vercel CLI is a local dev dependency: run it as `npx vercel …`

## Checks and Tests

- TypeScript flags unused locals and parameters; ESLint applies the recommended JavaScript, TypeScript, React Hooks and React Refresh rules.
- No formatter is configured; match the surrounding code style.
- Tests are `*.test.ts` files covering pure `.ts` modules; there are no component tests. Add or update tests when changing pure logic.
- After each task, run lint, build and tests and fix any failures, then tell me which UI states to check in the browser (including dark mode where relevant).

## Git

- Make one commit per completed task or logical change, after checks pass. Fold small follow-ups (docs edits, label tweaks, review fixes) into the commit they belong to.
- Never push unless I ask.

## Integration and Credential Safety

- Keep LLM provider credentials server-side; never expose secrets in browser code or commit them. Vite exposes `VITE_`-prefixed variables to the browser, so never give a server secret that prefix. Locally the key lives in `.env`; in deployments it is a Vercel Secret, with a separate Groq key per environment.
- Before implementing a provider integration, check the current provider documentation for API behavior, authentication and supported models.
- Treat LLM output as untrusted: validate provider responses against the contract in `PLAN.md` with hand-written checks before they reach the UI.
- Do not add an LLM SDK, database, or schema-validation library (see `PLAN.md`). The Vercel CLI (development, pinned) is the last approved addition; no other new dependencies.
- Deploy only from the CLI (`npx vercel deploy`, `--prod` only when I ask). `.vercelignore` is an allowlist of what the build needs, because CLI uploads skip `.env.local` but not `.env`; extend it when the build needs a new root file.
