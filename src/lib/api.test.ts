 
import { test, expect } from 'vitest';
import { parseJsonBody, unauthorized, conflict, internalError, badRequest, success } from './api';
import { GoalSchema } from './validation';
import { z } from 'zod';

test('parseJsonBody returns parsed data for a valid JSON request body', async () => {
  const request = new Request('https://localhost/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proteinTarget: 160, kcalTarget: 2400 }),
  });
  const result = await parseJsonBody(request, GoalSchema);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual(expect.objectContaining({ proteinTarget: 160, kcalTarget: 2400 }));
  }
});

test('parseJsonBody returns a 400 response when the body is malformed JSON', async () => {
  const request = new Request('https://localhost/api/goals', {
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
  const request = new Request('https://localhost/api/goals', {
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

test('badRequest returns 400', async () => {
  const response = badRequest('Bad Request', { foo: 'bar' });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Bad Request');
  expect(body.details).toEqual({ foo: 'bar' });
});

test('success returns 200', async () => {
  const response = success('Success', { data: 123 });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.message).toBe('Success');
  expect(body.details).toEqual({ data: 123 });
});

test('parseJsonBody returns badRequest on schema mismatch', async () => {
  const req = new Request('https://test', {
    method: 'POST',
    body: JSON.stringify({ age: 'not-a-number' }),
  });
  const schema = z.object({ age: z.number() });
  const result = await parseJsonBody(req, schema);
  expect(result.success).toBe(false);
});

test('badRequest returns default message', async () => {
  const response = badRequest();
  const body = await response.json();
  expect(body.error).toBe('Invalid request');
});

test('conflict returns default message', async () => {
  const response = conflict();
  const body = await response.json();
  expect(body.error).toBe('Conflict');
});

test('internalError returns default message', async () => {
  const response = internalError();
  const body = await response.json();
  expect(body.error).toBe('Internal Server Error');
});

import { apiError } from './api';
test('apiError returns default 500 status', () => {
  const response = apiError('Test Error');
  expect(response.status).toBe(500);
});

