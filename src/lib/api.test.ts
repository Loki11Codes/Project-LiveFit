import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJsonBody } from './api';
import { GoalSchema } from './validation';

test('parseJsonBody returns parsed data for a valid JSON request body', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      proteinTarget: 160,
      kcalTarget: 2400,
    }),
  });

  const result = await parseJsonBody(request, GoalSchema);

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, {
      proteinTarget: 160,
      kcalTarget: 2400,
    });
  }
});

test('parseJsonBody returns a 400 response when the body is malformed JSON', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"proteinTarget": 160,',
  });

  const result = await parseJsonBody(request, GoalSchema);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.response.status, 400);
    assert.deepEqual(await result.response.json(), {
      error: 'Request body must be valid JSON',
    });
  }
});

test('parseJsonBody returns validation details for invalid payloads', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      proteinTarget: -5,
      kcalTarget: 'a lot',
    }),
  });

  const result = await parseJsonBody(request, GoalSchema);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.response.status, 400);

    const payload = (await result.response.json()) as {
      error: string;
      details?: {
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

    assert.equal(payload.error, 'Invalid request body');
    assert.deepEqual(payload.details?.fieldErrors?.proteinTarget, [
      'Too small: expected number to be >=0',
    ]);
    assert.deepEqual(payload.details?.fieldErrors?.kcalTarget, [
      'Invalid input: expected number, received string',
    ]);
  }
});
