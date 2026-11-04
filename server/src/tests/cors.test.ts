import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../express-app.js";

describe("CORS Configuration", () => {
  const app = createApp();

  describe("Production origins", () => {
    it("allows https://etukas.com with credentials", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "https://etukas.com");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("https://etukas.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    });

    it("allows https://www.etukas.com with credentials", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "https://www.etukas.com");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("https://www.etukas.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    });
  });

  describe("OPTIONS preflight handling", () => {
    it("handles preflight for https://etukas.com with required methods and headers", async () => {
      const res = await request(app)
        .options("/api/v1/auth/login")
        .set("Origin", "https://etukas.com")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type, Authorization, x-csrf-token");

      expect([200, 204]).toContain(res.status);
      expect(res.headers["access-control-allow-origin"]).toBe("https://etukas.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");

      const allowMethods = res.headers["access-control-allow-methods"] || "";
      expect(allowMethods).toContain("GET");
      expect(allowMethods).toContain("POST");
      expect(allowMethods).toContain("PUT");
      expect(allowMethods).toContain("PATCH");
      expect(allowMethods).toContain("DELETE");
      expect(allowMethods).toContain("OPTIONS");

      const allowHeaders = (res.headers["access-control-allow-headers"] || "").toLowerCase();
      expect(allowHeaders).toContain("content-type");
      expect(allowHeaders).toContain("authorization");
      expect(allowHeaders).toContain("x-csrf-token");
    });

    it("handles preflight for https://www.etukas.com", async () => {
      const res = await request(app)
        .options("/api/v1/products")
        .set("Origin", "https://www.etukas.com")
        .set("Access-Control-Request-Method", "GET");

      expect([200, 204]).toContain(res.status);
      expect(res.headers["access-control-allow-origin"]).toBe("https://www.etukas.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
  });

  describe("Development and native origins", () => {
    it("preserves localhost development origins", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("preserves 127.0.0.1 development origins", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://127.0.0.1:5173");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    });

    it("preserves capacitor native app origins", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "capacitor://localhost");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("capacitor://localhost");
    });
  });
});

