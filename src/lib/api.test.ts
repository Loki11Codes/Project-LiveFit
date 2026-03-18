import { test, expect } from 'vitest';
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

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual({
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

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({
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

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.response.status).toBe(400);

    const payload = (await result.response.json()) as {
      error: string;
      details?: {
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

    expect(payload.error).toBe('Invalid request body');
    expect(payload.details?.fieldErrors?.proteinTarget).toEqual([
      'Too small: expected number to be >=0',
    ]);
    expect(payload.details?.fieldErrors?.kcalTarget).toEqual([
      'Invalid input: expected number, received string',
    ]);
  }
});
