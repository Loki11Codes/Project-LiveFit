import { test, expect, vi } from 'vitest';
import {
  ApiClientError,
  getClientErrorMessage,
  requestJson,
} from './client-api';

test('requestJson returns parsed JSON for successful responses', async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true, count: 2 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );
  vi.stubGlobal('fetch', mockFetch);

  const data = await requestJson<{ ok: boolean; count: number }>(
    'http://localhost/test'
  );

  expect(data).toEqual({ ok: true, count: 2 });
  vi.unstubAllGlobals();
});

test('requestJson throws ApiClientError with API message for JSON error responses', async () => {
  const mockFetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: 'Unable to load analytics right now',
        }),
        {
          status: 500,
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
        }
      )
    )
  );
  vi.stubGlobal('fetch', mockFetch);

  await expect(requestJson('http://localhost/test')).rejects.toThrow(
    ApiClientError
  );

  try {
    await requestJson('http://localhost/test');
  } catch (error: any) {
    expect(error.status).toBe(500);
    expect(error.message).toBe('Unable to load analytics right now');
  }

  vi.unstubAllGlobals();
});

test('getClientErrorMessage falls back to a generic message for unknown errors', () => {
  expect(getClientErrorMessage({ nope: true })).toBe(
    'Something went wrong. Please try again.'
  );
});
