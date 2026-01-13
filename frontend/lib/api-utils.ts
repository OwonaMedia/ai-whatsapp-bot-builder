import { NextResponse } from 'next/server';
import { getErrorMessage } from './utils';

/**
 * Standard API error response
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse {
  console.error(`[API Error ${status}]`, message, details);
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details: String(details) } : {}),
    },
    { status }
  );
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Handle API errors safely
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, error);
  
  // Check for known error types
  if (error instanceof Error) {
    // Supabase errors
    if (message.includes('JWT') || message.includes('auth')) {
      return apiError('unauthorized', 401);
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return apiError('not_found', 404);
    }
    if (message.includes('duplicate') || message.includes('unique')) {
      return apiError('conflict', 409);
    }
  }
  
  return apiError('internal_error', 500, message);
}

/**
 * Validate request method
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[]
): boolean {
  const method = request.method;
  if (!allowedMethods.includes(method)) {
    return false;
  }
  return true;
}

/**
 * Create method not allowed response
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse {
  return NextResponse.json(
    {
      error: 'method_not_allowed',
      allowed: allowedMethods,
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(', '),
      },
    }
  );
}

