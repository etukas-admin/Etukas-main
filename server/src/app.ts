import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cartsRouter } from "./modules/carts/carts.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { sellerEnquiriesRouter } from "./modules/seller-enquiries/seller-enquiries.routes.js";
import { sellerRegistrationRouter } from "./modules/seller-registration/seller-registration.routes.js";
import { sellerRouter } from "./modules/seller-profiles/seller.routes.js";
import { storesRouter } from "./modules/stores/stores.routes.js";
import { prisma } from "./config/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireCsrf } from "./middleware/security.js";
import { HttpError, sendOk } from "./utils/http.js";

export function createApp() {
  const app = express();

  // Normalize incoming URLs from Vercel rewrites or reverse proxies
  app.use((req, _res, next) => {
    const matchedPath =
      (req.headers["x-matched-path"] as string | undefined) ||
      (req.headers["x-vercel-matched-path"] as string | undefined) ||
      (req.headers["x-invoke-path"] as string | undefined) ||
      (req.headers["x-forwarded-uri"] as string | undefined);

    if (
      matchedPath &&
      (req.url === "/api/index" ||
        req.url === "/api" ||
        req.url === "/api/" ||
        req.url.startsWith("/api/index?") ||
        req.url.startsWith("/api?"))
    ) {
      if (matchedPath.includes("?")) {
        req.url = matchedPath;
      } else {
        const queryIdx = req.url.indexOf("?");
        req.url = queryIdx !== -1 ? `${matchedPath}${req.url.slice(queryIdx)}` : matchedPath;
      }
    }
    next();
  });

  const allowedClientUrls = env.CLIENT_URL
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile native apps, curl, or requests without Origin header
        if (!origin) return callback(null, true);

        // Native Capacitor Android/iOS origins
        if (
          origin.startsWith("capacitor://") ||
          origin.startsWith("ionic://") ||
          origin === "http://localhost" ||
          origin === "https://localhost"
        ) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.trim().replace(/\/+$/, "");

        // Allowed web client origins (normalized without trailing slashes)
        if (
          allowedClientUrls.includes(normalizedOrigin) ||
          normalizedOrigin === "http://localhost:5173" ||
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/.test(normalizedOrigin)
        ) {
          return callback(null, true);
        }

        if (env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        return callback(new HttpError(403, "CORS_BLOCKED", `CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"] }));
  app.use(requireCsrf);

  const dbHealthHandler: express.RequestHandler = async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return sendOk(res, { status: "ok", database: "connected" });
    } catch {
      return res.status(503).json({
        ok: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database readiness check failed"
        }
      });
    }
  };

  app.get(["/", "/api", "/api/index"], (_req, res) => sendOk(res, { status: "ok", service: "etukas-api" }));
  app.get("/health", (_req, res) => sendOk(res, { status: "ok", service: "etukas-api" }));
  app.get("/api/v1/health", (_req, res) => sendOk(res, { status: "ok", service: "etukas-api" }));
  app.get("/health/db", dbHealthHandler);
  app.get("/api/v1/health/db", dbHealthHandler);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/products", productsRouter);
  app.use("/api/v1/stores", storesRouter);
  app.use("/api/v1/cart", cartsRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/seller-enquiries", sellerEnquiriesRouter);
  app.use("/api/v1/seller-registration", sellerRegistrationRouter);
  app.use("/api/v1/seller", sellerRouter);
  app.use("/api/v1/admin", adminRouter);
  app.get("/api/v1/search", (req, res) => {
    res.redirect(307, `/api/v1/products?q=${encodeURIComponent(String(req.query.q ?? ""))}`);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
