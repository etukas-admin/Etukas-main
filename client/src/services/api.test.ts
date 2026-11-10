import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeApiBase, parseJsonResponse, ApiError, marketplaceApi } from "./api";

describe("api service", () => {
  describe("normalizeApiBase", () => {
    it("defaults to /api/v1 when undefined or empty string", () => {
      expect(normalizeApiBase(undefined)).toBe("/api/v1");
      expect(normalizeApiBase("")).toBe("/api/v1");
      expect(normalizeApiBase("   ")).toBe("/api/v1");
    });

    it("normalizes relative paths to end with /api/v1", () => {
      expect(normalizeApiBase("/api/v1")).toBe("/api/v1");
      expect(normalizeApiBase("/api/v1/")).toBe("/api/v1");
      expect(normalizeApiBase("/api")).toBe("/api/v1");
      expect(normalizeApiBase("/api/")).toBe("/api/v1");
    });

    it("normalizes absolute URLs to include /api/v1", () => {
      expect(normalizeApiBase("https://backend.vercel.app")).toBe("https://backend.vercel.app/api/v1");
      expect(normalizeApiBase("https://backend.vercel.app/")).toBe("https://backend.vercel.app/api/v1");
      expect(normalizeApiBase("https://backend.vercel.app/api")).toBe("https://backend.vercel.app/api/v1");
      expect(normalizeApiBase("https://backend.vercel.app/api/")).toBe("https://backend.vercel.app/api/v1");
      expect(normalizeApiBase("https://backend.vercel.app/api/v1")).toBe("https://backend.vercel.app/api/v1");
      expect(normalizeApiBase("https://backend.vercel.app/api/v1/")).toBe("https://backend.vercel.app/api/v1");
    });
  });

  describe("parseJsonResponse", () => {
    it("parses valid JSON response", async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true, data: { status: "ok" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      const result = await parseJsonResponse(mockResponse, "https://example.com/api/v1/health");
      expect(result).toEqual({ ok: true, data: { status: "ok" } });
    });

    it("detects HTML responses and throws diagnostic ApiError instead of syntax error", async () => {
      const htmlBody = `<!doctype html>
<html>
  <head><title>Etukas Marketplace</title></head>
  <body><div id="root"></div></body>
</html>`;

      const makeHtmlResponse = () =>
        new Response(htmlBody, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });

      await expect(
        parseJsonResponse(makeHtmlResponse(), "https://frontend.vercel.app/api/v1/auth/login")
      ).rejects.toThrowError(
        /Backend API returned an HTML page \(HTTP 200\) instead of JSON/
      );

      let caughtError: unknown;
      try {
        await parseJsonResponse(makeHtmlResponse(), "https://frontend.vercel.app/api/v1/auth/login");
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).toBeInstanceOf(ApiError);
      const apiErr = caughtError as ApiError;
      expect(apiErr.code).toBe("NON_JSON_RESPONSE");
      expect(apiErr.status).toBe(200);
      expect(apiErr.message).toContain("VITE_API_URL");
    });

    it("reports HTTP status when a non-JSON error page is returned", async () => {
      const mockResponse = new Response("404 Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain" }
      });

      await expect(
        parseJsonResponse(mockResponse, "https://backend.vercel.app/api/v1/unknown")
      ).rejects.toThrowError(/Invalid JSON response \(HTTP 404\)/);
    });
  });

  describe("login error handling", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      if (typeof localStorage !== "undefined") localStorage.clear();
    });

    it("handles HTML responses during login with informative error message", async () => {
      // Mock fetch returning HTML (e.g. frontend SPA rewrite)
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("<!doctype html><html><body>Frontend SPA</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" }
        })
      );

      await expect(
        marketplaceApi.login({ identifier: "seller.demo@etukas.local", password: "Password@123" })
      ).rejects.toThrowError(/Backend API returned an HTML page/);
    });
  });

  describe("AbortSignal and request cancellation", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("immediately rejects with AbortError when signal is pre-aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        marketplaceApi.categories({ signal: controller.signal })
      ).rejects.toThrowError(/aborted/);
    });

    it("forwards AbortSignal to fetch and propagates AbortError when aborted in-flight", async () => {
      const controller = new AbortController();

      vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

      const promise = marketplaceApi.products(undefined, { signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toThrowError(/aborted/);
    });
  });
});
