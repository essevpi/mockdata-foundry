# MockData Foundry MVP — revised plan

## Product and UX

Retain the focused MVP: describe a dataset, define a flat record shape, select 1–25 records, generate and validate data, preview it, and export JSON or CSV. Defer authentication, persistence, history, raw JSON Schema editing, nested fields, model selection, provider fallback, general automatic retries (generation makes at most one top-up call for missing records, see Architecture), and batch generation.

Use a two-pane workspace: the request form and field builder beside the results on large screens, stacked on smaller ones. Results can be viewed as a table or as the exported JSON. A blank form offers three example presets (Customers, Orders, Employees) under the description box; Clear form, with Undo, resets the request without discarding results; Ctrl/Cmd+Enter in the description generates. A field row contains:

- Unique name: 1–40 characters; starts with a letter, then letters, digits, or underscores (for example `camelCase` or `snake_case`)
- Type: `string`, `number`, `integer`, or `boolean`
- Nullable toggle
- Optional guidance: up to 160 characters

A nullable field is still present on every record. It is either its declared primitive type or `null`; it is not omitted. The record schema shown to the model marks every field required and allows null through a union type.

Display null cells as `null` and empty strings as `""` in the preview so users can distinguish them.

## Limits, contract, and exports

Validate these limits on both client and server; server validation is authoritative:

| Input                 |                                                  Limit |
| --------------------- | -----------------------------------------------------: |
| Records               |                                                   1–25 |
| Fields                |                                                    1–8 |
| Dataset description   |                                     1–1,000 characters |
| Field guidance        |                             0–160 characters per field |
| Field name            |                       1–40 ASCII identifier characters |
| JSON request body     |                                                  8 KiB |
| Returned string value |  100 characters per value (the prompt asks for at most 64) |
| Provider completion   | 200 + records × (fields × 26 + 10) tokens; 5,650 for 25 × 8 |

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

The model writes JSON Lines: one compact JSON object per line, described by a per-record JSON Schema in the prompt. Each field is required and the record is closed to undeclared properties; a nullable string, for example, is `type: ["string", "null"]`. The server validates every line on its own (field set, declared types, safe integers, nullability, string length), keeps valid records unchanged, skips anything else, and returns exactly the requested number of records or an error.

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
- Do not use Groq Structured Outputs (`response_format`) for generation. Groq documents strict mode as constrained decoding for `openai/gpt-oss-120b`, but measurements in milestone 3 show it only validates afterwards: wrong counts, missing fields, forbidden keys and malformed JSON all reached Groq's check, which then rejects the whole reply (400 `json_validate_failed`), on both Chat Completions and the Responses API. [Structured Outputs](https://console.groq.com/docs/structured-outputs)
- Send the rules as a `developer` message (where gpt-oss's harmony format expects instructions), ending with the record schema in a `# Response Formats` section, and the request as JSON in the user message. Ask for JSON Lines so a slip costs one record, not the reply. [OpenAI harmony format](https://developers.openai.com/cookbook/articles/openai-harmony)
- Set `reasoning_effort: "low"` and `include_reasoning: false`. Groq's API reference states the output cap includes reasoning tokens (about 15–80 per request at `low`), so the cap formula allows for them.
- Generation makes one request for all records, then at most one top-up for the records still missing (asking it not to repeat the first string field's values), only when Groq's `x-ratelimit-*` headers show enough of the per-minute token budget within 15 s and the request still fits a 55 s time budget. Otherwise it fails with `INVALID_GENERATION`.
- Account limits measured from headers (free tier): 8,000 tokens per minute and 1,000 requests per day. Groq's docs add 30 requests per minute and 200,000 tokens per day for `openai/gpt-oss-120b`; the daily token budget is not reported in headers and allows about 80 maximum-size generations a day across the organization. On the free tier, abuse costs availability, not money.
- Add a `tsconfig.api.json` project (referenced from `tsconfig.json`) so `npm run build` type-checks `api/`, which imports the shared contract and validation from `src/lib/`.
- Preserve `npm run dev` as the normal Vite-only frontend server. It does not serve `api/generate.ts`. Development builds default to a local mock generator behind the same `generate(request)` function (switchable to the live API in the dev-only DevTools widget), so UI work needs no Vercel or Groq access.
- Add the Vercel CLI as a development dependency and a separate `dev:vercel` script running `vercel dev`. Run this command from the project root when testing the integrated frontend and `/api/generate` together; it starts the configured Vite development command and emulates Vercel Functions. Link the project and obtain local environment variables with Vercel’s supported workflow before live calls. [Vercel local development](https://vercel.com/docs/cli/dev), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- Before public deployment, configure a Vercel Firewall rate-limit rule for `POST /api/generate`: 5 requests per IP per 10-minute fixed window, returning 429. Test it first in logging mode, then enforce it. This needs no application dependency or persistent store. Hobby allows one rate-limit rule per project with a window of 10 s to 10 minutes, and counters are kept per region. [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- Use Groq project-specific keys (one per environment) and per-model project limits at or below the organization's. The project is capped at 100 requests/day and 10 requests/minute; token limits stay at the account's values. Groq's docs say token limits are organization-only, although the console's project page also shows token fields.
- The record and request limits, Vercel per-IP rule, and Groq project quota form the MVP’s bounded-usage control. An unauthenticated public endpoint cannot guarantee a global per-user usage budget against distributed abuse; the Groq project quota is the global backstop, and on the free tier the worst case is the demo being unavailable until the daily reset.

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

3. **Server generation contract** — ✅ done
   1. ✅ Scaffold: Vercel CLI (`dev:vercel`), `tsconfig.api.json`, `api/generate.ts` delegating to `src/server/handler.ts`, which rejects wrong methods (405), bodies over 8 KiB (413), non-JSON content types (415), malformed JSON and invalid requests (400) before any provider call; error messages shared with the mock via `GENERATION_ERROR_MESSAGES`. Verified under `vercel dev`.
   2. ✅ Schema, prompt and output validator (first version: strict `json_schema` response with a `records` array; replaced in 3.4).
   3. ✅ Groq call and sanitized error mapping: provider 401/403/404 → 500 `CONFIGURATION_ERROR`; 429 → 429 `RATE_LIMITED` with `retryAfterSeconds` and `Retry-After`; other provider errors, timeouts and network failures → 502 `UPSTREAM_ERROR`; too few valid records → 502 `INVALID_GENERATION`. One JSON log line per provider call (outcome, attempt, requested and valid records, skipped lines by problem, finish reason, token usage, counts, duration; never the key, request text or data). Groq answers an invalid key with 401.
      - Key storage: `vercel dev` (CLI 64.1.0) passes functions only `.env`, not `.env.local`, so the development key lives in a git-ignored `.env`. Vercel Secrets cannot be read back for local use, so the Development environment on Vercel stays empty.
   4. ✅ Smoke tests and redesign (`npm run smoke`, stress and realistic requests).
      - With strict `json_schema` at 50 records: the stress request returned the wrong record count in 10 of 11 runs (every count logged was an overshoot, 55–65); `minItems`/`maxItems` and fixed record keys (`r01`…) were not enforced either (Groq rejected after generating), and fixed keys added ~105 prompt tokens per record. Realistic requests passed 9/9.
      - Probes showed strict mode does not constrain gpt-oss on Groq (forbidden keys and empty output under `strict: true`, same behaviour with `strict: false` and via the Responses API).
      - A/B at 25 records: JSON Lines without `response_format` completed 7/7 replies against 6/7 for the strict array, with ~30% fewer output tokens (~65–70 per 8-field record) and ~25% faster; record quality and duplicates were equal (0 duplicates).
      - String length: the model writes 10–25% longer than asked; prompt wording could not keep it under 64 without halving requested lengths, so the hard cap is 100 with 64 as the prompt target (no string over 89 in ~130 records).
      - Final run through `vercel dev` (25 × 8): 8/8 succeeded; 7 on the first call, 1 with a 2-record top-up; ~730 prompt + 1,700–1,850 output tokens, 4–6 s per request.
   - Acceptance: malformed, oversized, and out-of-range requests fail before Groq; invalid output is never returned; no credential reaches the browser.
   - Checks: lint, build, tests, local endpoint requests through `vercel dev`, and smoke tests recording token usage and validity rates.

4. **End-to-end integration and deployment readiness** — ✅ done
   - Decisions (2026-11-03, after checking the Groq and Vercel docs): a dev-only Mock / Live API switch in the DevTools widget instead of an env flag; a firewall limit of 5 requests per IP per 10 minutes (2 would block a visitor after two presets); deployments through the CLI only (`vercel deploy`, `vercel deploy --prod`), with GitHub left unconnected until public launch; a separate Groq key per environment (development, preview, production).
   1. ✅ Connect the UI to `/api/generate`.
      - `generate()` posts to `/api/generate` (70 s client timeout, above the function's 60 s `maxDuration`) and reads the reply with `readGenerateResponse` (`src/lib/generate-response.ts`): a success must hold exactly the requested number of records, each passing `checkRecord` (`src/lib/record-check.ts`, now shared with the server's line parser). Error envelopes keep their code, but the message comes from the client's own `GENERATION_ERROR_MESSAGES`. Replies that are not the envelope map by status: 429 → `RATE_LIMITED` (seconds from `Retry-After`), 404 → `CONFIGURATION_ERROR`, other 4xx → `INVALID_REQUEST`, anything else (including a malformed 200) → `UPSTREAM_ERROR`. No HTTP reply at all (network failure, timeout) shows a "server could not be reached" error.
      - Development builds: DevTools has a Generator choice (Mock, the default, or Live API), remembered in `localStorage`; the mock outcome picker shows only for Mock. Production builds always call the API; the mock is loaded with a dynamic import inside a `DEV` branch, so it is not bundled (checked in `dist/`).
      - Copy: `INVALID_GENERATION` now says a retry was already tried and suggests fewer records or fields; retry delays read "under a minute", "about N minutes" or "about N hours" (Groq's daily cap).
      - Verified through `vercel dev`: 10 and 25 records (the 25-record request used a 2-record top-up); table, Editor, JSON and CSV downloads matched the response; 2/2 smoke runs succeeded (~712 prompt + ~1,800 output tokens, 4–5 s). Under `npm run dev`, Live API gets Vite's 404 and shows the "not available" state.
   2. ✅ Deployment readiness.
      - Groq: Production and Preview keys in the project "mockdata-foundry" (the development key is in the same project). The console's project page offers requests and tokens per minute and per day; the project is capped at 100 requests/day and 10 requests/minute for `openai/gpt-oss-120b`, with tokens left at the account's 8,000/minute and 200,000/day. The cap is shared by all three keys, so smoke tests count against it.
      - Vercel: `GROQ_API_KEY` stored as a Secret for Production and Preview (`npx vercel env add GROQ_API_KEY <env> --sensitive`, run by the owner outside the assistant session). The CLI is a local dev dependency, so it runs through `npx`.
      - `.vercelignore` is an allowlist (`api`, `src`, `public`, `index.html`, package and tsconfig files, `vite.config.ts`): CLI uploads skip `.env.local` by default but not `.env`, which holds the development key.
      - Deployments: Vercel assigns a project's first deployment to production, so the first `vercel deploy` went live at `https://mockdata-foundry.vercel.app` before the firewall rule existed (accepted by the owner, as the URL was not shared). Checked there: a 3-record live generation, no DevTools and no key-like strings in the served JavaScript. A later preview deployment sits behind Vercel Authentication (anonymous requests get a 302 to the login) and returned a live record through `vercel curl`, which confirmed the Preview key.
      - Firewall: rule "Limit generate" (`POST /api/generate`, 5 per IP per 600 s, fixed window). In log mode, 8 invalid POSTs (rejected with 400 before any Groq call) produced 2 log matches, as expected; then enforced. The rule also covers preview deployments, with the same per-IP count. The measured 429 has no `Retry-After` and a JSON body `{"error":{"code":"429","message":"Too Many Requests","id":"…"}}` with `x-vercel-mitigated: deny`; the browser maps it to `RATE_LIMITED` (regression test added). The window starts at the first request, not on the clock (a shared IP, including the assistant's test calls, shares the count).
      - Rate-limit UX: the firewall gives no wait time, so the client mirrors the rule as `DEMO_RATE_LIMIT` in `src/lib/generation.ts` (change both together). A firewall 429 shows "Generation limit reached", the limit (5 generations every 10 minutes from one network) and "You can generate again by HH:MM": a full window from the error, rounded up to the minute, so the time is never early, though often a few minutes pessimistic; Generate stays enabled. Groq's own 429 says the demo's shared budget is used up and gives Groq's `retry-after` ("under a minute" or a clock time). The empty results state mentions the limit up front. The dev mock has a `FIREWALL_LIMIT` outcome that replays the measured reply through `readGenerateResponse`.
      - CLI 64.1.0 quirk: `vercel firewall rules edit --rate-limit-action rate_limit` alone reports "No changes detected"; passing all rate-limit options together stages the change.
      - README rewritten: what the app does, local setup, checks and deployment.
   - Acceptance: a live request through `vercel dev` returns 1–25 validated records using `openai/gpt-oss-120b`; preview and both exports match the response; rate-limit and provider errors produce safe, actionable UI states.
   - Checks: lint, build, tests, smoke test, local Vercel-function test, and Vercel preview verification.
   - State at the start of the milestone: the folder is linked to the Vercel project `mockdata-foundry` (`.vercel/`, git-ignored); `.env` holds the development `GROQ_API_KEY` (Groq project "mockdata-foundry"); no production key exists yet; the GitHub repository is not connected to Vercel, so pushes do not deploy; nothing has been deployed.
   - The 33 `npm audit` findings come from the Vercel CLI's own dependencies (dev-only, never shipped); they were accepted in milestone 3. Re-check when upgrading the CLI (64.1.0 installed, 65.10.0 available in November 2026).

## Post-MVP ideas

Not part of the MVP; recorded so they are not lost.

- **Choice field type** (a fixed list of allowed values): list the values in the record schema and check them in our own validation (Groq strict mode does not enforce schemas for gpt-oss).
- **Date / date-time field type**: add a format check in our own output validation. Until then, use a `string` field with guidance such as "ISO 8601 date".
- Email, UUID, and phone formats stay as field guidance, not types.

## Remaining decisions and prerequisites

- The Groq project cap (100 requests/day, 10/minute) is set. The free tier's 8,000 tokens per minute fits about three 25-record generations per minute.
- The project is on Vercel Hobby, which allows the one rate-limit rule in use. Before sharing the URL publicly, decide whether to connect GitHub for automatic deploys (every push to main would then deploy production).
- The Vercel CLI (development) is installed; no further dependencies are planned.
- The record limit was lowered to 25 after the milestone 3 smoke tests.
- If Groq fixes constrained decoding for gpt-oss, or the model changes, re-measure strict `json_schema` against JSON Lines before switching.
