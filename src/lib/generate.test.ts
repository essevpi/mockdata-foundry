import { afterEach, describe, expect, it, vi } from 'vitest';
import { GENERATE_ENDPOINT, generate } from './generate';
import type { GenerateRequest } from './generation';
import { createMockSuccess } from './mock-generator';

const request: GenerateRequest = {
  description: 'Customers',
  count: 2,
  fields: [{ name: 'name', type: 'string', nullable: false }],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('generate with the mock (development builds)', () => {
  it('resolves after a delay with the chosen outcome', async () => {
    vi.useFakeTimers();

    const pending = generate(request, { source: 'mock', mockOutcome: 'RATE_LIMITED' });
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await pending).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('defaults to success', async () => {
    vi.useFakeTimers();

    const pending = generate(request, { source: 'mock' });
    await vi.advanceTimersByTimeAsync(2_000);

    expect(await pending).toEqual(createMockSuccess(request));
  });
});

describe('generate with the API', () => {
  it('posts the request as JSON and returns the checked records', async () => {
    const records = [{ name: 'Ada' }, { name: 'Grace' }];
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ records }));

    vi.stubGlobal('fetch', fetchMock);

    expect(await generate(request)).toEqual({ records });
    expect(fetchMock).toHaveBeenCalledWith(
      GENERATE_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }),
    );
  });

  it('resolves an error response to a known error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Too Many Requests', { status: 429 })),
    );

    expect(await generate(request, { source: 'api' })).toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('rejects when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(generate(request)).rejects.toThrow('Failed to fetch');
  });
});
