import { test, expect, vi } from 'vitest';
import {
  ApiClientError,
  getClientErrorMessage,
  requestJson,
} from './client-api';

test('requestJson returns parsed JSON for successful responses', async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', mockFetch);
  const data = await requestJson<{ ok: boolean }>('http://localhost/test');
  expect(data).toEqual({ ok: true });
  vi.unstubAllGlobals();
});

test('requestJson throws ApiClientError for error responses', async () => {
  const mockFetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ error: 'API Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
  vi.stubGlobal('fetch', mockFetch);
  await expect(requestJson('http://localhost/test')).rejects.toThrow(ApiClientError);
  try {
    await requestJson('http://localhost/test');
  } catch (e: unknown) {
    if (e instanceof Error) {
      expect(e.message).toBe('API Error');
    }
  }
  vi.unstubAllGlobals();
});

test('requestJson handles non-JSON errors', async () => {
  const mockFetch = vi.fn().mockResolvedValue(new Response('Direct Error', { status: 500, headers: { 'Content-Type': 'text/plain' } }));
  vi.stubGlobal('fetch', mockFetch);
  await expect(requestJson('http://localhost')).rejects.toThrow('Request failed with status 500');
  vi.unstubAllGlobals();
});

test('requestJson handles JSON without error field', async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ foo: 'bar' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  );
  vi.stubGlobal('fetch', mockFetch);
  await expect(requestJson('http://localhost')).rejects.toThrow('Request failed with status 400');
  vi.unstubAllGlobals();
});

test('requestJson handles invalid JSON', async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response('{"invalid":', {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  );
  vi.stubGlobal('fetch', mockFetch);
  await expect(requestJson('http://localhost')).rejects.toThrow('Request failed with status 400');
  vi.unstubAllGlobals();
});

test('getClientErrorMessage handles Error instances', () => {
  expect(getClientErrorMessage(new Error('Test message'))).toBe('Test message');
});

test('getClientErrorMessage fallback', () => {
  expect(getClientErrorMessage({} as unknown)).toBe('Something went wrong. Please try again.');  
});

test('requestJson handles missing content-type header', async () => {
  const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', mockFetch);
  const data = await requestJson('http://localhost');
  expect(data).toBeNull();
  vi.unstubAllGlobals();
});


