// Smoke test for POST /api/generate with a maximum-size request (25 records × 8 fields).
// Run `npm run dev:vercel` first, then `npm run smoke`. Token usage and failure reasons are
// in the server's `"event":"generate"` log lines; this script prints status and timing.
//
// SMOKE_REQUEST picks the request: "stress" (default; long strings at the size limit) or
// "customers" (the Customers preset at 25 records, a typical request).
// SMOKE_RUNS (default 8), SMOKE_DELAY_SECONDS (default 35) and SMOKE_URL can be overridden.
// The delay keeps requests (and any top-up) within Groq's 8,000 tokens per minute.

const url = process.env.SMOKE_URL ?? 'http://localhost:3000/api/generate';
const runs = Number(process.env.SMOKE_RUNS ?? 8);
const delaySeconds = Number(process.env.SMOKE_DELAY_SECONDS ?? 35);

// Long string guidance on purpose, to probe the token cap and the 64-character limit.
const stressRequest = {
  description:
    'Product catalogue of an online outdoor equipment store: tents, backpacks, footwear, ' +
    'clothing and climbing gear from a range of brands, with realistic prices and stock levels.',
  count: 25,
  fields: [
    { name: 'sku', type: 'string', nullable: false, guidance: 'Three uppercase letters, a dash, six digits' },
    { name: 'productName', type: 'string', nullable: false, guidance: 'Brand and descriptive name, 40 to 60 characters' },
    { name: 'summary', type: 'string', nullable: true, guidance: 'One marketing sentence, 50 to 64 characters' },
    { name: 'category', type: 'string', nullable: false, guidance: 'Tents, Backpacks, Footwear, Clothing or Climbing' },
    { name: 'priceEur', type: 'number', nullable: false, guidance: 'Two decimals, 5 to 900' },
    { name: 'stock', type: 'integer', nullable: false, guidance: '0 to 500' },
    { name: 'rating', type: 'number', nullable: true, guidance: 'One decimal, 1.0 to 5.0; null when unrated' },
    { name: 'discontinued', type: 'boolean', nullable: false },
  ],
};

const customersRequest = {
  description:
    'Customers of a European online homeware shop, with a mix of new and long-standing accounts, ' +
    'varied countries and realistic contact details.',
  count: 25,
  fields: [
    { name: 'customerId', type: 'string', nullable: false, guidance: 'CUS- followed by six digits' },
    { name: 'fullName', type: 'string', nullable: false },
    { name: 'email', type: 'string', nullable: false, guidance: 'Lowercase, based on the full name, varied domains' },
    { name: 'phone', type: 'string', nullable: true, guidance: 'International format' },
    { name: 'country', type: 'string', nullable: false, guidance: 'ISO 3166-1 alpha-2 code, European countries' },
    { name: 'signupDate', type: 'string', nullable: false, guidance: 'ISO 8601 date between 2019 and 2025' },
    { name: 'lifetimeValue', type: 'number', nullable: false, guidance: 'Euros with two decimals, from 0 to 5000' },
    { name: 'newsletterOptIn', type: 'boolean', nullable: false },
  ],
};

const request = process.env.SMOKE_REQUEST === 'customers' ? customersRequest : stressRequest;

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

for (let run = 1; run <= runs; run += 1) {
  const startedAt = Date.now();
  let summary;
  let retryAfterSeconds;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const body = await response.json();

    if (response.ok) {
      const longest = Math.max(
        ...body.records.flatMap((record) =>
          Object.values(record).map((value) => (typeof value === 'string' ? Array.from(value).length : 0)),
        ),
      );
      const nulls = body.records.flatMap(Object.values).filter((value) => value === null).length;

      summary = `200 records=${body.records.length} longestString=${longest} nulls=${nulls}`;
    } else {
      retryAfterSeconds = body.error?.retryAfterSeconds;
      summary = `${response.status} ${body.error?.code}${retryAfterSeconds ? ` retryAfter=${retryAfterSeconds}s` : ''}`;
    }
  } catch (error) {
    summary = `request failed: ${error.message}`;
  }

  console.log(`run ${run}/${runs}: ${summary} (${((Date.now() - startedAt) / 1000).toFixed(1)} s)`);

  if (run < runs) {
    await sleep(Math.max(delaySeconds, retryAfterSeconds ?? 0));
  }
}
