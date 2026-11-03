import type { GenerateRequest, GenerateResponse } from './generation';
import { readGenerateResponse } from './generate-response';
import type { MockOutcome } from './mock-generator';

export const GENERATE_ENDPOINT = '/api/generate';

// Above the function's 60 s maxDuration, so a slow generation ends with the server's own
// answer (or the platform's timeout page) rather than a client-side abort.
const REQUEST_TIMEOUT_MS = 70_000;
const MOCK_DELAY_MS = 900;

export const GENERATOR_SOURCES = ['mock', 'api'] as const;

export type GeneratorSource = (typeof GENERATOR_SOURCES)[number];

export type GenerateOptions = {
  // Honoured only in development builds; production always calls the API.
  source?: GeneratorSource;
  mockOutcome?: MockOutcome;
};

async function generateWithMock(
  request: GenerateRequest,
  mockOutcome: MockOutcome,
): Promise<GenerateResponse> {
  // Loaded on demand, so production bundles never include the mock.
  const { getMockResponse } = await import('./mock-generator');

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  return getMockResponse(request, mockOutcome);
}

// Single entry point for generation. Network failures and timeouts reject; every HTTP
// response, including platform and firewall errors, resolves to a GenerateResponse.
export async function generate(
  request: GenerateRequest,
  { source = 'api', mockOutcome = 'success' }: GenerateOptions = {},
): Promise<GenerateResponse> {
  if (import.meta.env.DEV && source === 'mock') {
    return generateWithMock(request, mockOutcome);
  }

  const response = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return readGenerateResponse(
    { status: response.status, headers: response.headers, bodyText: await response.text() },
    request,
  );
}
