type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw buildApiClientError(response.status, body);
  }

  return body as T;
}

export function getClientErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildApiClientError(status: number, body: unknown): ApiClientError {
  if (isApiErrorResponse(body)) {
    return new ApiClientError(body.error, status, body.details);
  }

  return new ApiClientError(`Request failed with status ${status}`, status);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  );
}
