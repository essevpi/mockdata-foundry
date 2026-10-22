# MockData Foundry

Portfolio web app that uses an LLM to generate realistic mock data for development and testing. The user describes a dataset and a flat record shape, then previews the generated data and exports it as JSON or CSV.

`PLAN.md` is the source of truth for scope, limits, the request/response contract, export conventions, architecture, milestones, acceptance criteria and per-task progress. Read it before starting any milestone work, and update its status markers when a task is completed.

## Current State

The generator workspace form is built (Milestone 1, tasks 1.1–1.3). Workspace fixes, the results panel with a local mock generator, exports, the server function, provider integration and deployment are planned, not implemented. Groq and Vercel are plans until their integrations are actually added. See `PLAN.md` for exact progress.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 4. Groq is the provisional LLM provider (application model `openai/gpt-oss-120b`, set server-side); Vercel is the intended hosting platform.

## Project Layout

- `src/App.tsx`, `src/main.tsx`: page composition and entry point
- `src/features/generator/components/`: generator UI; `GeneratorWorkspace.tsx` owns the form state
- `src/features/generator/field-utils.ts`: generator-specific helpers
- `src/lib/generation.ts`: shared types, `REQUEST_LIMITS`, and request validation
- `src/index.css`: Tailwind import and theme tokens
- `public/`: static assets
- Planned, not yet present: `ResultsPanel`, a local mock `generate()` (also the dev-mode generator), `src/lib/export.ts` (JSON/CSV), `api/generate.ts` (Vercel Function) and `tsconfig.api.json`

## Code Organization

- Keep `App.tsx` focused on page composition and high-level coordination; do not make it the container for the application's entire UI and logic.
- Place substantial UI components with distinct responsibilities in separate `.tsx` files in an appropriate component directory.
- Keep non-JSX types, constants, and pure logic in `.ts` modules.
- Keep shared React state in its appropriate owning component; pass data and event handlers through props as needed, without duplicating state.
- Extract components when this creates a meaningful responsibility boundary or improves maintainability; avoid splitting trivial markup or introducing premature abstractions.
- When a task introduces a distinct UI responsibility, create or update the appropriate component or module rather than automatically adding everything to `App.tsx`.
- Preserve existing behavior and the established structure unless a concrete reason justifies changing it.

## Styling

Use the semantic Tailwind tokens defined in `src/index.css` (`bg-app`, `text-content`, `bg-action`, `border-border`, and so on) instead of raw palette colors. Light and dark palettes are defined as CSS variables under `:root[data-theme]`; `index.html` currently hard-codes `data-theme="dark"` (following the system color scheme is planned in task 1.4, without a toggle).

## Development and Checks

- `npm run dev` starts the Vite development server.
- `npm run build` runs the TypeScript build checks and creates the production bundle.
- `npm run lint` runs ESLint.
- `npm run preview` serves the built bundle locally.

There is no test runner or test script configured yet (Vitest and `npm test` are planned in task 1.4). TypeScript checks include unused locals and parameters; ESLint applies its recommended JavaScript, TypeScript, React Hooks, and React Refresh rules to `.ts` and `.tsx` files. No formatter is configured, so follow the surrounding code style. After each task, run lint and build and check the affected state in the browser.

## Git

Do not add `Co-Authored-By` or other attribution lines to commit messages or pull request descriptions. Write a subject line and an optional body only.

Make one commit per completed task or logical change. Fold small follow-ups (docs edits, label tweaks, review fixes) into the commit they belong to instead of committing them separately.

## Integration and Credential Safety

Keep LLM provider credentials on the server; never expose secrets in browser code or commit them. Before implementing a provider integration, verify the current provider documentation for API behavior, authentication, and supported models. Treat Groq and Vercel as plans until their integrations are actually added.

Do not add an LLM SDK, database, or schema-validation library (see `PLAN.md`). The Vercel CLI and Vitest are the only new development dependencies proposed; add each only when its task begins.
