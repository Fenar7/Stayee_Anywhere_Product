export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden access") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict occurred") {
    super("CONFLICT", message, 409);
  }
}

import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      { 
        error: "Validation Error", 
        code: "VALIDATION_ERROR",
        details: error.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled API Error:", error);
  return Response.json(
    { error: "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" },
    { status: 500 }
  );
}
