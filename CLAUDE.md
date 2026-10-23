# MockData Foundry

Portfolio web app that uses an LLM to generate realistic mock data for development and testing. The user describes a dataset and a flat record shape, previews the generated data, and exports it as JSON or CSV.

`PLAN.md` is the source of truth for scope, limits, the request/response contract, export conventions, architecture, milestones, acceptance criteria and per-task progress. Read it before starting any milestone work, and update its status markers when a task is completed.

When a change affects the commands, project layout, conventions or dependency rules described in this file, update it in the same commit and keep it concise. Feature scope and progress belong in PLAN.md, not here.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Vitest. Approved UI libraries, to be installed only when a task uses them: `lucide-react` (icons) and `motion` (animations, imported from `motion/react`). Groq is the provisional LLM provider (application model `openai/gpt-oss-120b`, set server-side); Vercel is the intended hosting platform. Neither is integrated yet: treat both as plans until the server function and integrations are added (progress in `PLAN.md`).

## Project Layout

- `src/features/generator/components/`: generator UI. `GeneratorWorkspace.tsx` owns the form, generation state and the two-pane layout; `GenerateBar.tsx` holds the submit button, request issues and the dev mock control; `ResultsPanel.tsx` renders the idle/loading/error/success states and owns the Table/Editor view choice, using `ResultsViewToggle.tsx`, `ResultsTable.tsx` or `JsonEditorView.tsx` (JSON from `toJson`), and `ExportActions.tsx` on success; `MockOutcomeControl.tsx` is a dev-only picker for forcing mock outcomes.
- `src/features/generator/field-utils.ts`: field drafts with stable ids, request building, issue visibility, record-count stepping
- `src/features/generator/result-utils.ts`: cell display formatting and results view helpers
- `src/features/generator/json-tokens.ts`: splits JSON export text into typed tokens per line (for the Editor view)
- `src/lib/generation.ts`: shared types, `REQUEST_LIMITS`, request validation
- `src/lib/generate.ts`: the single `generate(request)` entry point, currently backed by `src/lib/mock-generator.ts`. UI code calls only `generate()`; swapping the mock for the real provider happens behind it.
- `src/lib/export.ts`, `src/lib/download.ts`: pure JSON/CSV serialization (CSV null convention in `PLAN.md`) and the browser download helper
- `src/features/theme/`: `ThemeToggle.tsx` and pure `theme-utils.ts` (stored-theme parsing)
- `src/index.css`: Tailwind import and theme tokens
- Planned, not yet present: `api/generate.ts` (Vercel Function) and `tsconfig.api.json`

## Code Organization

- Keep `App.tsx` limited to page composition; put new UI responsibilities in their own components under the relevant feature directory.
- Keep types, constants and pure logic in `.ts` modules, separate from JSX.

## Styling

Use the semantic Tailwind tokens from `src/index.css` (`bg-app`, `text-content`, `bg-action`, `border-border`, etc.), never raw palette colors. Dark is the default palette on `:root`; the light palette applies under `:root[data-theme="light"]`. Theme does not follow `prefers-color-scheme`. The header toggle (`src/features/theme/`) sets `data-theme` and stores the choice in `localStorage`; an inline script in `index.html` applies it before first paint. Use `border-border-strong` for form-control boundaries (`border-border` is for decorative dividers). A global `focus-visible` outline in `src/index.css` covers buttons, selects and checkboxes; text inputs keep their ring. New UI must work in both palettes. When changing palette values, keep text at 4.5:1 or more and control borders (`border-strong`) and focus at 3:1 or more against the surfaces they sit on, in both palettes. Use `lucide-react` for icons and Motion for animations; keep animations subtle and purposeful, and respect reduced-motion preferences.

## Commands

- `npm run dev`: Vite dev server
- `npm run build`: TypeScript checks and production bundle
- `npm run lint`: ESLint
- `npm test`: Vitest unit tests, single run
- `npx vitest run <path>`: run a single test file
- `npm run preview`: serve the built bundle

## Checks and Tests

- TypeScript flags unused locals and parameters; ESLint applies the recommended JavaScript, TypeScript, React Hooks and React Refresh rules.
- No formatter is configured; match the surrounding code style.
- Tests are `*.test.ts` files covering pure `.ts` modules; there are no component tests. Add or update tests when changing pure logic.
- After each task, run lint, build and tests and fix any failures, then tell me which UI states to check in the browser (including dark mode where relevant).

## Git

- Make one commit per completed task or logical change, after checks pass. Fold small follow-ups (docs edits, label tweaks, review fixes) into the commit they belong to.
- Never push unless I ask.

## Integration and Credential Safety

- Keep LLM provider credentials server-side; never expose secrets in browser code or commit them.
- Before implementing a provider integration, check the current provider documentation for API behavior, authentication and supported models.
- Treat LLM output as untrusted: validate provider responses against the contract in `PLAN.md` with hand-written checks before they reach the UI.
- Do not add an LLM SDK, database, or schema-validation library (see `PLAN.md`). Approved additions: `lucide-react` and `motion` (UI) and the Vercel CLI (development); add each only when a task needs it. No other new dependencies.
