import type { GenerateRequest, GenerateResponse } from './generation';
import { getMockResponse, type MockOutcome } from './mock-generator';

const MOCK_DELAY_MS = 900;

export type GenerateOptions = {
  mockOutcome?: MockOutcome;
};

// Single entry point for generation. It currently returns local mock data; Milestone 4
// switches it to call /api/generate and keeps the mock behind a dev-only flag.
export async function generate(
  request: GenerateRequest,
  { mockOutcome = 'success' }: GenerateOptions = {},
): Promise<GenerateResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  return getMockResponse(request, mockOutcome);
}
