import { describe, expect, it, vi, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../express-app.js";
import { prisma } from "../config/prisma.js";

describe("Health endpoints", () => {
  const app = createApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Admin API authorization", () => {
    it("rejects unauthenticated access to partner management", async () => {
      const response = await request(createApp()).get("/api/v1/admin/sellers");
      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("GET /health and GET /api/v1/health", () => {
    it("returns 200 OK with service status for /health", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        data: {
          status: "ok",
          service: "etukas-api"
        }
      });
    });

    it("returns 200 OK with service status for /api/v1/health", async () => {
      const response = await request(app).get("/api/v1/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        data: {
          status: "ok",
          service: "etukas-api"
        }
      });
    });

    it("returns 200 OK for root and fallback API routes", async () => {
      const resRoot = await request(app).get("/");
      expect(resRoot.status).toBe(200);
      expect(resRoot.body.ok).toBe(true);

      const resApi = await request(app).get("/api");
      expect(resApi.status).toBe(200);
      expect(resApi.body.ok).toBe(true);
    });
  });

  describe("GET /health/db and GET /api/v1/health/db", () => {
    it("returns 200 OK when database query succeeds", async () => {
      vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([{ "?column?": 1 }] as never);

      const response = await request(app).get("/health/db");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        data: {
          status: "ok",
          database: "connected"
        }
      });
    });

    it("returns generic 503 error when database query fails, without exposing credentials or stack traces", async () => {
      vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
        new Error("Connection to postgresql://user:secretpass@db.example.com:5432/etukas failed: timeout")
      );

      const response = await request(app).get("/health/db");
      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        ok: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database readiness check failed"
        }
      });

      // Verify no sensitive info is leaked
      const bodyString = JSON.stringify(response.body);
      expect(bodyString).not.toContain("secretpass");
      expect(bodyString).not.toContain("postgresql://");
      expect(bodyString).not.toContain("db.example.com");
      expect(bodyString).not.toContain("stack");
    });
  });

  describe("Vercel rewrite routing support", () => {
    it("correctly resolves /health when rewritten to /api/index with x-matched-path header", async () => {
      const response = await request(app)
        .get("/api/index")
        .set("x-matched-path", "/health");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.status).toBe("ok");
    });

    it("correctly resolves /health/db when rewritten to /api/index with x-matched-path header", async () => {
      vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([{ "?column?": 1 }] as never);

      const response = await request(app)
        .get("/api/index")
        .set("x-matched-path", "/health/db");

      expect(response.status).toBe(200);
      expect(response.body.data.database).toBe("connected");
    });
  });
});
