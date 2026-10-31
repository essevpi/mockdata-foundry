import type { GenerateRequest, PrimitiveValue } from '../lib/generation.js';
import { GROQ_TIMEOUT_MS, type GroqRateLimit } from './groq.js';
import type { AvoidValues } from './prompt.js';

// Total time the handler allows itself, below the function's 60-second maxDuration.
export const TIME_BUDGET_MS = 55_000;
// Longest wait for Groq's per-minute token budget before giving up on a top-up.
export const MAX_TOP_UP_WAIT_MS = 15_000;

// How long to wait before a top-up request that needs `neededTokens`, or undefined when it
// cannot fit: not enough per-minute budget within MAX_TOP_UP_WAIT_MS, or not enough time left
// for a full request. Assumes the budget refills linearly until `resetTokensMs`. Without
// rate-limit headers it tries straight away; a 429 is then reported like any other.
export function getTopUpDelayMs(
  rateLimit: GroqRateLimit,
  neededTokens: number,
  elapsedMs: number,
): number | undefined {
  const { limitTokens, remainingTokens, resetTokensMs } = rateLimit;
  let delayMs = 0;

  if (remainingTokens !== undefined && remainingTokens < neededTokens) {
    if (limitTokens === undefined || resetTokensMs === undefined || neededTokens > limitTokens) {
      return undefined;
    }

    const missingShare = (neededTokens - remainingTokens) / (limitTokens - remainingTokens);
    delayMs = Math.ceil(resetTokensMs * missingShare);
  }

  if (delayMs > MAX_TOP_UP_WAIT_MS || elapsedMs + delayMs + GROQ_TIMEOUT_MS > TIME_BUDGET_MS) {
    return undefined;
  }

  return delayMs;
}

// Values of the first string field among the records accepted so far, so a top-up does not
// repeat IDs or names it cannot otherwise see.
export function getAvoidValues(
  request: GenerateRequest,
  records: Array<Record<string, PrimitiveValue>>,
): AvoidValues | undefined {
  const field = request.fields.find((candidate) => candidate.type === 'string');

  if (!field) {
    return undefined;
  }

  const values = records
    .map((record) => record[field.name])
    .filter((value): value is string => typeof value === 'string' && value !== '');

  return values.length > 0 ? { field: field.name, values } : undefined;
}
