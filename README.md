# MockData Foundry

Describe a dataset and a flat record shape, and an LLM generates realistic mock records you can preview as a table or JSON and export as JSON or CSV.

**Built with:** React 19, TypeScript, Vite, Tailwind CSS, Motion and a Vercel Function that calls Groq (`openai/gpt-oss-120b`).

## How it works

- The browser validates the request (1–25 records, 1–8 fields of type string, number, integer or boolean, each optionally nullable) and posts it to `POST /api/generate`.
- The function validates it again, asks the model for JSON Lines (one record per line) and checks every line against the declared fields. Invalid lines are dropped; if records are missing, it makes at most one follow-up call when Groq's per-minute token budget allows it. It returns exactly the requested number of records or an error.
- The browser checks the reply with the same per-record check before showing it. Error messages come from the app, never from the response.
- The Groq API key stays on the server. No LLM SDK or schema library is used; validation is hand-written.

The form and the last result are saved in your browser (`localStorage`), so a reload keeps them; Clear form empties the form. Nothing is stored on a server.

CSV export: `null` is an empty field, strings are always quoted (so an empty string is `""`), numbers and booleans are unquoted.

## Local development

Requires Node.js 24 and npm.

```bash
npm install
npm run dev          # Vite only; uses the built-in mock generator
```

To call the real function locally:

1. Link the folder to the Vercel project: `npx vercel link`.
2. Put a Groq key in `.env` (git-ignored): `GROQ_API_KEY=...`. `vercel dev` passes `.env`, not `.env.local`, to functions.
3. Run `npm run dev:vercel` and open the dev tools widget (flask icon) to switch the generator from **Mock** to **Live API**.

`npm run smoke` sends maximum-size requests to a running `dev:vercel` and uses real Groq tokens.

## Checks

```bash
npm run lint
npm run build        # type-checks the app and the function, then bundles
npm test
```

## Deployment

Deploys are made from the CLI (`npx vercel deploy`, `npx vercel deploy --prod`). `.vercelignore` limits the upload to the files the build needs, so `.env` never leaves the machine.

- **Keys:** a separate Groq key per environment, stored as a Vercel Secret: `npx vercel env add GROQ_API_KEY production --sensitive` (and `preview`).
- **Firewall:** a Vercel WAF rate-limit rule allows 5 `POST /api/generate` requests per IP per 10-minute fixed window.
- **Groq quota:** the Groq project is capped at 100 requests per day and 10 per minute, below the account's free-tier limits (8,000 tokens per minute, 200,000 per day).
