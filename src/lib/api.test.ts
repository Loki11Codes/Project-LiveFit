import { test, expect } from 'vitest';
import { parseJsonBody, unauthorized, conflict, internalError } from './api';
import { GoalSchema } from './validation';
import { z } from 'zod';

test('parseJsonBody returns parsed data for a valid JSON request body', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proteinTarget: 160, kcalTarget: 2400 }),
  });
  const result = await parseJsonBody(request, GoalSchema);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual({ proteinTarget: 160, kcalTarget: 2400 });
  }
});

test('parseJsonBody returns a 400 response when the body is malformed JSON', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid":',
  });
  const result = await parseJsonBody(request, GoalSchema);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.response.status).toBe(400);
    const body = await result.response.json();
    expect(body.error).toBe('Request body must be valid JSON');
  }
});

test('parseJsonBody returns validation details for invalid payloads', async () => {
  const request = new Request('http://localhost/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proteinTarget: -5, kcalTarget: 'invalid' }),
  });
  const result = await parseJsonBody(request, GoalSchema);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.response.status).toBe(400);
    const payload = await result.response.json();
    expect(payload.error).toBe('Invalid request body');
  }
});

test('unauthorized returns 401', () => {
  const response = unauthorized();
  expect(response.status).toBe(401);
});

test('conflict returns 409', () => {
  const response = conflict();
  expect(response.status).toBe(409);
});

test('internalError returns 500', () => {
  const response = internalError();
  expect(response.status).toBe(500);
});

test('parseJsonBody returns badRequest on schema mismatch', async () => {
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ age: 'not-a-number' }),
  });
  const schema = z.object({ age: z.number() });
  const result = await parseJsonBody(req, schema);
  expect(result.success).toBe(false);
});
