import type { NextFunction, Request, Response } from "express";
import { isAppError } from "../errors.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isAppError(error)) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? undefined,
      },
    });
    return;
  }

  const parserError = error as { type?: unknown; status?: unknown } | null;
  if (parserError && typeof parserError.type === "string" && typeof parserError.status === "number") {
    const tooLarge = parserError.type === "entity.too.large";
    res.status(parserError.status).json({
      error: {
        code: tooLarge ? "payload_too_large" : "invalid_body",
        message: tooLarge ? "That upload is too large." : "The request body could not be read.",
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Something went wrong",
    },
  });
}
