import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiClientError,
  getClientErrorMessage,
  requestJson,
} from './client-api';

test('requestJson returns parsed JSON for successful responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true, count: 2 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  try {
    const data = await requestJson<{ ok: boolean; count: number }>(
      'http://localhost/test'
    );

    assert.deepEqual(data, { ok: true, count: 2 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestJson throws ApiClientError with API message for JSON error responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: 'Unable to load analytics right now',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

  try {
    await assert.rejects(
      requestJson('http://localhost/test'),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.status, 500);
        assert.equal(error.message, 'Unable to load analytics right now');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getClientErrorMessage falls back to a generic message for unknown errors', () => {
  assert.equal(
    getClientErrorMessage({ nope: true }),
    'Something went wrong. Please try again.'
  );
});
