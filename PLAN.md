# MockData Foundry MVP — revised plan

## Product and UX

Retain the focused MVP: describe a dataset, define a flat record shape, select 1–50 records, generate and validate data, preview it, and export JSON or CSV. Defer authentication, persistence, history, raw JSON Schema editing, nested fields, model selection, provider fallback, automatic retries, and batch generation.

Use a two-pane workspace: the request form and field builder beside the results on large screens, stacked on smaller ones. Results can be viewed as a table or as the exported JSON. A blank form offers three example presets (Customers, Orders, Employees) under the description box; Clear form, with Undo, resets the request without discarding results; Ctrl/Cmd+Enter in the description generates. A field row contains:

- Unique name: 1–40 characters; starts with a letter, then letters, digits, or underscores (for example `camelCase` or `snake_case`)
- Type: `string`, `number`, `integer`, or `boolean`
- Nullable toggle
- Optional guidance: up to 160 characters

A nullable field is still present on every record. It is either its declared primitive type or `null`; it is not omitted. This matches Groq strict mode’s requirement that all properties be required while allowing null through a union type. [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)

Display null cells as `null` and empty strings as `""` in the preview so users can distinguish them.

## Limits, contract, and exports

Validate these limits on both client and server; server validation is authoritative:

| Input                 |                                                  Limit |
| --------------------- | -----------------------------------------------------: |
| Records               |                                                   1–50 |
| Fields                |                                                    1–8 |
| Dataset description   |                                     1–1,000 characters |
| Field guidance        |                             0–160 characters per field |
| Field name            |                       1–40 ASCII identifier characters |
| JSON request body     |                                                  8 KiB |
| Returned string value |                                64 characters per value |
| Provider completion   | 6,000 tokens maximum, subject to current model support |

Use these types:

```ts
type FieldType = 'string' | 'number' | 'integer' | 'boolean';

type FieldDefinition = {
  name: string;
  type: FieldType;
  nullable: boolean;
  guidance?: string;
};

type GenerateRequest = {
  description: string;
  count: number;
  fields: FieldDefinition[];
};

type PrimitiveValue = string | number | boolean | null;

type GenerateSuccess = {
  records: Array<Record<string, PrimitiveValue>>;
};
```

The server creates a strict schema containing a `records` array. Each field remains required and closed to undeclared properties. A nullable string, for example, is represented as `type: ["string", "null"]`. The server validates the parsed response again, including exact record count, field set, declared types, nullability, and string length.

JSON export preserves JavaScript `null` as JSON `null`.

CSV has no universal null type, so define a stable export convention:

- `null` is an unquoted empty CSV field.
- Strings are always quoted; an empty string is therefore `""`.
- Numbers and booleans are emitted unquoted.
- Quotes in strings are doubled under standard CSV escaping.

For example, a nullable `nickname` of `null` exports as an empty field, while `""` exports as `""`. Document this convention in the results view next to the download actions (an export footer below the preview: each download button above its notes). Also note there that spreadsheet applications may interpret generated strings beginning with `=`, `+`, `-`, or `@` as formulas; values are exported unchanged so the mock data is not altered.

## Architecture, local development, and bounded public usage

- Keep form state, client validation, preview, and browser exports in `src/`.
- Add a root-level `api/generate.ts` Vercel Function. It validates the request, reads `GROQ_API_KEY` only from server-side environment variables, invokes Groq, validates output, and returns either `GenerateSuccess` or a sanitized error envelope.
- Use platform `fetch` and focused hand-written runtime validation for the constrained field model. Do not add an LLM SDK, database, or schema-validation library.
- UI libraries: use `lucide-react` for icons and `motion` (imported from `motion/react`) for animations. Install each only when a task uses it. Keep animations subtle and purposeful, and respect reduced-motion preferences.
- Configure the application model as the server-side constant `openai/gpt-oss-120b`. This is the application's runtime model and is unrelated to the coding assistant used for development.
- Groq’s current documentation lists `openai/gpt-oss-120b` as supporting strict JSON Schema structured outputs. Confirm the model is active for the target account, repeat the smoke test using the final nullable schema, and inspect account-specific quotas before implementation. [Structured Outputs](https://console.groq.com/docs/structured-outputs), [models](https://console.groq.com/docs/models), [rate limits](https://console.groq.com/docs/rate-limits)
- Set `reasoning_effort: "low"` and `include_reasoning: false` on the Groq request (supported by `openai/gpt-oss-120b` per Groq's reasoning docs). Groq's docs do not say whether reasoning tokens count toward `max_completion_tokens`, and strict mode does not document `maxLength`, `minItems`, or `maxItems`; the exact record count and 64-character string cap are therefore enforced only by our own output validation. Measure token usage and the violation rate in the smoke test before deciding whether retries are needed (retries remain deferred until then).
- Add a `tsconfig.api.json` project (referenced from `tsconfig.json`) so `npm run build` type-checks `api/`, which imports the shared contract and validation from `src/lib/`.
- Preserve `npm run dev` as the normal Vite-only frontend server. It does not serve `api/generate.ts`. Until the UI is connected to the API, and afterwards behind a dev-only flag, the UI generates data through a local mock generator behind the same `generate(request)` function, so UI work needs no Vercel or Groq access.
- Add the Vercel CLI as a development dependency and a separate `dev:vercel` script running `vercel dev`. Run this command from the project root when testing the integrated frontend and `/api/generate` together; it starts the configured Vite development command and emulates Vercel Functions. Link the project and obtain local environment variables with Vercel’s supported workflow before live calls. [Vercel local development](https://vercel.com/docs/cli/dev), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- Before public deployment, configure a Vercel Firewall rate-limit rule for `POST /api/generate`: 2 requests per IP per 10-minute fixed window, returning 429. Test it first in logging mode, then enforce it. This needs no application dependency or persistent store. [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- Create and use a Groq project-specific key. Set conservative project limits at or below the organization’s available limits, initially targeting 100 requests/day and a token ceiling compatible with the account’s current free-tier allocation. The exact settings must be confirmed in the account because published limits are not account-specific.
- The record and request limits, Vercel per-IP rule, and Groq project quota form the MVP’s bounded-usage control. An unauthenticated public endpoint cannot guarantee a global per-user usage budget against distributed abuse; do not publicly launch if the account cannot enforce an acceptable project-level quota.

## Implementation milestones

Status: ✅ done · ⏳ not started. Update markers as tasks complete.

1. **Local generator workspace** — ✅ done
   1. ✅ Define the shared request, field, result, validation, and status types; add pure client-side request validation with the defined limits.
      - Acceptance: all invalid boundary values produce field-specific errors without a network request.

   2. ✅ Build the responsive page shell with description, count, and empty field-builder state.
      - Acceptance: initial state clearly explains how to begin; mobile and desktop layouts remain usable.

   3. ✅ Add field-row creation, editing, removal, unique-name checking, primitive type selection, nullable toggle, and guidance input.
      - Acceptance: users can build up to eight valid fields; a ninth is prevented; duplicate and invalid names cannot be submitted.

   4. ✅ Workspace fixes and submit flow.
      - Add Vitest (`npm test`) with unit tests for `validateGenerateRequest` boundaries.
      - Show validation issues only after a field is touched or a submit is attempted, and render the `fields` count issue.
      - Give each field row a stable client-side id (stripped from the request) for React keys and input ids.
      - Read limits and type options from `REQUEST_LIMITS` and `FIELD_TYPES` instead of hard-coding them in components.
      - Move the field builder into the main column with compact rows, leaving the full width below for results.
      - Follow the system color scheme (`prefers-color-scheme`) using the existing light and dark palettes; no toggle. (Superseded by the Foundry visual refresh below: dark is now the default and light is opt-in via `data-theme`.)
      - Enable Generate when the request is valid.
      - Acceptance: a fresh page load shows no errors; removing a middle field keeps focus and values on the right rows; a valid form enables Generate.

   5. ✅ Results panel with typed state and a local mock generator.
      - Add `GenerationStatus` state in `GeneratorWorkspace` and a `ResultsPanel` with idle, loading, success, and error states, disabling duplicate submission while loading.
      - Render a real results table showing null as `null` and empty strings as `""`.
      - Implement `generate(request): Promise<GenerateResponse>` as a local mock (deterministic values per type, nulls for nullable fields, simulated delay, a dev switch to force each error code). Keep it as the dev-mode generator after the API is connected.
      - Acceptance: each state is reachable with `npm run dev` alone and preserves form values after an error; nullable and non-nullable primitive values are visually distinguishable.
   - Checks for each task: `npm run lint`, `npm run build`, `npm test` once added, and a focused browser check of the affected state.

2. **Exports** — ✅ done
   - Add pure `toJson` and `toCsv` functions in `src/lib/export.ts` with unit tests, and the JSON/CSV download actions with the documented null convention and formula note.
   - Decisions: JSON is a pretty-printed array of records (no envelope); CSV has no BOM, a header row of field names, and CRLF row endings per RFC 4180; both files use the submitted field order, which the success state keeps as `columns`; downloads are named `mockdata-records.json` and `mockdata-records.csv`. The dev mock includes a text value with a quote, a comma, and a line break so escaping can be checked in a real download.
   - Acceptance: exported JSON preserves null; CSV distinguishes null from empty strings and escapes commas, quotes, and line breaks.
   - Checks: lint, build, tests, and manual inspection of downloaded files.

2a. **Visual refresh (Foundry theme)** — ✅ done
   - Styling only: graphite and molten-gold palette with a steel-blue focus colour and a new `border-strong` token for control boundaries; solid panel surfaces; a global `focus-visible` outline; system font stack. No behaviour, props, state or layout changes.
   - Dark is the default palette on `:root`. Light applies only under `:root[data-theme="light"]`; the theme no longer follows `prefers-color-scheme`.
   - Acceptance: every ResultsPanel state, the form and the field builder read well in both palettes; text meets 4.5:1 and control boundaries and focus 3:1 against adjacent surfaces.
   - Follow-up, ✅ done in 2b: a light/dark toggle that sets `data-theme` on `<html>` and remembers the choice in `localStorage`; an inline script in `index.html` applies it before first paint.

2b. **Layout refresh (split workbench)** — ✅ done
   - Two-pane workbench: request (description, records, fields, Generate) beside results at lg and above, each pane scrolling within a viewport-height page; stacked below lg with a sticky Generate bar. The header holds the theme toggle (2a follow-up).
   - Results offer Table and Editor views via an accessible tab toggle shown only on success; the header keeps its height in every state. The choice persists until reload.
   - Editor is a read-only, line-numbered, syntax-coloured view of `toJson` output (identical to the JSON download) with a Copy button; colours use existing semantic tokens.
   - Lucide icons; Motion for the pour moment and toggle indicator, respecting reduced motion. No changes to generation, validation, export logic or state ownership.
   - Decisions: the toggle is a compact segmented control in the results header on every width (the header keeps its 44px height in every state); the pour line runs along the pane seam at lg and across the Generate bar when stacked; Copy lives in the Editor's file tab; the Editor does not wrap lines.
   - Acceptance: request and results are both visible at lg; 50 records × 8 fields scroll inside their view in both Table and Editor without breaking layout at 375px or 1440px; Editor text equals the JSON download; the toggle works by keyboard with a visible selected state; every results state reads well in both palettes; the CSV null convention and formula note stay visible in the results view next to the downloads (export footer below the preview, amended in 2c).
   - Checks: lint, build, tests (tokenizer, theme helpers), browser check per step in both palettes and with reduced motion.

2c. **Layout polish and light palette** — ✅ done
   - Command bar: an always-visible bar with Add field and Generate data (equal width); field problems slide up from behind it in a problem tray that lists each problem once with clickable field references and highlights the affected rows. The tray cannot be dismissed; description and record-count messages stay under their own inputs. Disabled-button reasons are exposed via `title` and hidden text, not shown in the bar.
   - Compact one-line field rows (name, type, Nullable, Guidance toggle, remove) at 576px and wider; Remove is icon-only on phones. Styled dropdowns: a native `<select>` with a themed closed state and, in Chromium 135+ with a mouse (`appearance: base-select`), an animated list that opens downward and flips up only when it does not fit; touch devices keep the native picker.
   - Light palette with stepped surfaces (page, card, well), a `--theme-button` token and accent-tinted hovers; the light theme still applies only through the toggle, never `prefers-color-scheme`.
   - Export footer under the preview with both downloads and their notes (null convention, CSV quoting, formula note); a clicked download briefly shows "Downloaded" at a stable width with a polite status message.
   - Example presets (`presets.ts`, three datasets within `REQUEST_LIMITS`) under the description box, shown only while the form is blank; Clear form with Undo in the dataset heading row; Ctrl/Cmd+Enter in the description submits through the normal Generate path; the description counter turns accent from 90% of the limit and danger at the limit.
   - Dev tools (forcing mock outcomes) live in a floating corner widget that exists only in dev builds.
   - Deferred: rework of the export footer layout (single row of buttons, notes as a definition list) is postponed until after the LLM integration, together with any further UI refresh.
   - Acceptance: the request pane stays usable at 375px and 1440px with the command bar always reachable; field problems never shift the rows; presets, Clear/Undo and the shortcut work by keyboard; every state reads well in both palettes and with reduced motion.
   - Checks: lint, build, tests (presets, field and counter helpers, shortcut), and Playwright browser checks in both palettes at desktop and phone widths.

3. **Server generation contract** — ⏳ not started
   - Add `api/generate.ts` and `tsconfig.api.json`, shared authoritative validation, strict-schema generation with nullable union types, Groq request handling (`reasoning_effort: "low"`, `include_reasoning: false`), output validation, completion-token cap, and sanitized error mapping. Unit-test the schema builder and output validator.
   - Acceptance: malformed, oversized, and out-of-range requests fail before Groq; invalid output is never returned; no credential reaches the browser.
   - Checks: lint, build, tests, local endpoint requests through `vercel dev`, and a smoke test recording token usage and count/length violation rates for a maximum-size request.

4. **End-to-end integration and deployment readiness** — ⏳ not started
   - Switch `generate()` to call `/api/generate` (keeping the mock behind a dev-only flag); configure the Vercel local-development command, environment workflow, Vercel Firewall rule, Groq project key and quota, and concise README instructions.
   - Acceptance: a live request through `vercel dev` returns 1–50 validated records using `openai/gpt-oss-120b`; preview and both exports match the response; rate-limit and provider errors produce safe, actionable UI states.
   - Checks: lint, build, tests, Groq structured-output smoke test, local Vercel-function test, and Vercel preview verification.

## Post-MVP ideas

Not part of the MVP; recorded so they are not lost.

- **Choice field type** (a fixed list of allowed values): constrains output to specified values. Verify that Groq strict mode supports `enum` before committing to it.
- **Date / date-time field type**: add a format check in our own output validation, since strict mode may not enforce `format`. Until then, use a `string` field with guidance such as "ISO 8601 date".
- Email, UUID, and phone formats stay as field guidance, not types.

## Remaining decisions and prerequisites

- Confirm the target Groq account can apply the proposed 100-request/day project cap and supports the required output-token budget on its current tier.
- Confirm Vercel Firewall rate limiting is available and acceptable for the target Vercel plan before exposing the endpoint publicly.
- Approve the Vercel CLI (to run and test the root-level Vercel Function locally) as the only new development dependency still to be added; Vitest is already installed. `lucide-react` and `motion` are installed.
- After the Milestone 3 smoke test, revisit whether the 8-field limit and the 2-requests-per-10-minutes firewall rule suit a portfolio demo; neither is changed yet.
