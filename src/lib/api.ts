import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

type ParsedJsonBody<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse<ApiErrorResponse> };

export function apiError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

export function unauthorized() {
  return apiError('Unauthorized', 401);
}

export function badRequest(message = 'Invalid request', details?: unknown) {
  return apiError(message, 400, details);
}

export function conflict(message = 'Conflict', details?: unknown) {
  return apiError(message, 409, details);
}

export function internalError(message: string = 'Internal Server Error') {
  return apiError(message, 500);
}

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>
): Promise<ParsedJsonBody<T>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      response: badRequest('Request body must be valid JSON'),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: badRequest('Invalid request body', result.error.issues),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
