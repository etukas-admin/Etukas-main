import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[PrismaError ${error.code}] ${req.method} ${req.originalUrl}:`, error.message);

    if (error.code === "P2021" || error.code === "P2022") {
      return res.status(500).json({
        ok: false,
        error: {
          code: "DATABASE_SCHEMA_OUT_OF_DATE",
          message: `Database storage is not ready yet (${(error.meta as any)?.table ?? (error.meta as any)?.column ?? "schema updated"}). Please run the latest database migration and try again.`,
          details: env.NODE_ENV === "production" ? undefined : error.meta
        }
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        ok: false,
        error: {
          code: "DUPLICATE_RECORD",
          message: "A record with these unique details already exists. Please check and try again."
        }
      });
    }

    if (error.code === "P2028") {
      return res.status(504).json({
        ok: false,
        error: {
          code: "DATABASE_TIMEOUT",
          message: "The database took too long to save your changes. Please try again in a moment."
        }
      });
    }
  }

  console.error(`[UnhandledError] ${req.method} ${req.originalUrl}:`, error);

  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "Something went wrong" : error instanceof Error ? error.message : "Something went wrong"
    }
  });
};
