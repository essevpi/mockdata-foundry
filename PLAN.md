# MockData Foundry MVP — revised plan

## Product and UX

Retain the focused MVP: describe a dataset, define a flat record shape, select 1–50 records, generate and validate data, preview it, and export JSON or CSV. Defer authentication, persistence, history, raw JSON Schema editing, nested fields, model selection, provider fallback, automatic retries, and batch generation.

Use one responsive workspace with the request form and field builder above or beside results. A field row contains:

- Unique name: 1–40 characters; starts with a letter, then letters, digits, or underscores (for example `camelCase` or `snake_case`)
- Type: `string`, `number`, `integer`, or `boolean`
- Nullable toggle
- Optional guidance: up to 160 characters

A nullable field is still present on every record. It is either its declared primitive type or `null`; it is not omitted. This matches Groq strict mode’s requirement that all properties be required while allowing null through a union type. [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)

Display null cells as `null` and empty strings as `""` in the preview so users can distinguish them.

## Limits, contract, and exports

Validate these limits on both client and server; server validation is authoritative:

| Input | Limit |
|---|---:|
| Records | 1–50 |
| Fields | 1–8 |
| Dataset description | 1–1,000 characters |
| Field guidance | 0–160 characters per field |
| Field name | 1–40 ASCII identifier characters |
| JSON request body | 8 KiB |
| Returned string value | 64 characters per value |
| Provider completion | 6,000 tokens maximum, subject to current model support |

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

For example, a nullable `nickname` of `null` exports as an empty field, while `""` exports as `""`. Document this convention beside the CSV download action. Also note there that spreadsheet applications may interpret generated strings beginning with `=`, `+`, `-`, or `@` as formulas; values are exported unchanged so the mock data is not altered.

## Architecture, local development, and bounded public usage

- Keep form state, client validation, preview, and browser exports in `src/`.
- Add a root-level `api/generate.ts` Vercel Function. It validates the request, reads `GROQ_API_KEY` only from server-side environment variables, invokes Groq, validates output, and returns either `GenerateSuccess` or a sanitized error envelope.
- Use platform `fetch` and focused hand-written runtime validation for the constrained field model. Do not add an LLM SDK, database, or schema-validation library.
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
      - Follow the system color scheme (`prefers-color-scheme`) using the existing light and dark palettes; no toggle.
      - Enable Generate when the request is valid.
      - Acceptance: a fresh page load shows no errors; removing a middle field keeps focus and values on the right rows; a valid form enables Generate.

   5. ✅ Results panel with typed state and a local mock generator.
      - Add `GenerationStatus` state in `GeneratorWorkspace` and a `ResultsPanel` with idle, loading, success, and error states, disabling duplicate submission while loading.
      - Render a real results table showing null as `null` and empty strings as `""`.
      - Implement `generate(request): Promise<GenerateResponse>` as a local mock (deterministic values per type, nulls for nullable fields, simulated delay, a dev switch to force each error code). Keep it as the dev-mode generator after the API is connected.
      - Acceptance: each state is reachable with `npm run dev` alone and preserves form values after an error; nullable and non-nullable primitive values are visually distinguishable.

   - Checks for each task: `npm run lint`, `npm run build`, `npm test` once added, and a focused browser check of the affected state.

2. **Exports** — ⏳ not started
   - Add pure `toJson` and `toCsv` functions in `src/lib/export.ts` with unit tests, and the JSON/CSV download actions with the documented null convention and formula note.
   - Acceptance: exported JSON preserves null; CSV distinguishes null from empty strings and escapes commas, quotes, and line breaks.
   - Checks: lint, build, tests, and manual inspection of downloaded files.

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
- Approve the Vercel CLI (to run and test the root-level Vercel Function locally) and Vitest (to test the pure validation, export, and schema logic) as the only new development dependencies.
- After the Milestone 3 smoke test, revisit whether the 8-field limit and the 2-requests-per-10-minutes firewall rule suit a portfolio demo; neither is changed yet.
