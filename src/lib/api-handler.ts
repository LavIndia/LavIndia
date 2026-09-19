/**
 * Shared wrapper for API route handlers.
 *
 * Routes stay thin — parse, call a domain service, return — and every failure
 * is translated the same way: a domain error keeps its specific code and
 * status, a validation error reports which field, an authorisation failure
 * gives 401/403, and anything unexpected is logged server-side and returned
 * as a generic 500 rather than leaking a stack trace.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { toErrorResponse } from "@/modules/_shared/errors";
import { UnauthorizedError } from "@/lib/require-admin";

export function toApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message, code: error.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED" },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid request",
        code: "VALIDATION_FAILED",
        details: { issues: error.issues },
      },
      { status: 400 },
    );
  }

  const { body, status } = toErrorResponse(error);
  return NextResponse.json(body, { status });
}

/**
 * Wraps a handler so it never has to write its own try/catch. Business rules
 * throw; this turns the throw into the right response.
 */
export function apiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toApiError(error);
    }
  };
}
