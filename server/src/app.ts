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
import { sellerRouter } from "./modules/seller-profiles/seller.routes.js";
import { storesRouter } from "./modules/stores/stores.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireCsrf } from "./middleware/security.js";
import { sendOk } from "./utils/http.js";

export function createApp() {
  const app = express();
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

        // Allowed web client origins
        if (
          origin === env.CLIENT_URL ||
          origin === "http://localhost:5173" ||
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/.test(origin)
        ) {
          return callback(null, true);
        }

        if (env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"] }));
  app.use(requireCsrf);

  app.get("/health", (_req, res) => sendOk(res, { status: "ok", service: "etukas-api" }));
  app.get("/api/v1/health", (_req, res) => sendOk(res, { status: "ok", service: "etukas-api" }));
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/products", productsRouter);
  app.use("/api/v1/stores", storesRouter);
  app.use("/api/v1/cart", cartsRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/seller-enquiries", sellerEnquiriesRouter);
  app.use("/api/v1/seller", sellerRouter);
  app.use("/api/v1/admin", adminRouter);
  app.get("/api/v1/search", (req, res) => {
    res.redirect(307, `/api/v1/products?q=${encodeURIComponent(String(req.query.q ?? ""))}`);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
