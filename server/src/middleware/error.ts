import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request data", details: error.flatten() }
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      ok: false,
      error: { code: error.code, message: error.message, details: error.details }
    });
  }

  return res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" }
  });
};
