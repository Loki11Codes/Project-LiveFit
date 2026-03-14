import { NextResponse } from 'next/server';

export type ApiErrorResponse = {
  error: string;
  details?: any;
};

export function apiError(message: string, status: number = 500, details?: any) {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

export function unauthorized() {
  return apiError('Unauthorized', 401);
}

export function badRequest(message: string = 'Invalid request', details?: any) {
  return apiError(message, 400, details);
}

export function internalError(message: string = 'Internal Server Error') {
  return apiError(message, 500);
}
