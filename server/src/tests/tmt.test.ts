import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  sellerTmtListingSchema,
  sellerTmtQuickRateSchema,
  TMT_MASTER_BRANDS
} from "@etukas/shared";
import { createApp } from "../express-app.js";

describe("TMT Steel Catalog & Validation", () => {
  const app = createApp();

  it("GET /api/v1/tmt/brands returns all primary and regional brands with variants", async () => {
    const res = await request(app).get("/api/v1/tmt/brands");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(TMT_MASTER_BRANDS.length);
  });

  it("filters TMT brands by tier and grade", async () => {
    const res = await request(app).get("/api/v1/tmt/brands?tier=regional&grade=CRS");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    for (const brand of res.body.data) {
      expect(brand.tier).toBe("regional");
      expect(brand.available_grades).toContain("CRS");
    }
  });

  it("GET /api/v1/tmt/brands/:slug returns brand variants and 404 for unknown slug", async () => {
    const okRes = await request(app).get("/api/v1/tmt/brands/radha-tmt?grade=Fe%20550D");
    expect(okRes.status).toBe(200);
    expect(okRes.body.ok).toBe(true);
    expect(okRes.body.data.brand.slug).toBe("radha-tmt");
    expect(okRes.body.data.brand.default_grade).toBe("Fe 550D");
    expect(okRes.body.data.brand.variants.some((v: any) => v.label === "8mm Lite")).toBe(true);

    const notFoundRes = await request(app).get("/api/v1/tmt/brands/nonexistent-steel-mill");
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.ok).toBe(false);
  });

  it("validates seller TMT listing and quick rate payloads with Zod", () => {
    const validListing = sellerTmtListingSchema.safeParse({
      brandName: "Radha TMT",
      brandSlug: "radha-tmt",
      tier: "regional",
      grades: ["Fe 500D", "Fe 550D"],
      baseRatePerTonInr: 63000,
      supportsLiteVariants: true,
      deliveryRadiusKm: 35,
      logistics: {
        rodLengthMeters: 12,
        billingMode: "weighbridge",
        minOrderTons: 0.5,
        freeDeliveryTons: 2.5,
        loadingChargePerTonInr: 0,
        gstIncluded: true,
        extra6mmPerTonInr: 2000,
        extra8mmPerTonInr: 800,
        extra8mmLitePerTonInr: -1000
      },
      variants: [
        {
          diameterMm: 8,
          label: "8mm Lite",
          isLite: true,
          piecesPerBundle: 12,
          approxWeightPerBundleKg: 43,
          pricePerBundleInr: 2666,
          pricePerTonInr: 62000,
          commonUse: "Economy Rings",
          stockBundles: 50,
          minOrderQuantity: 1,
          isActive: true
        }
      ]
    });
    expect(validListing.success).toBe(true);

    const validQuickRate = sellerTmtQuickRateSchema.safeParse({
      baseRatePerTonInr: 64500,
      gstIncluded: true
    });
    expect(validQuickRate.success).toBe(true);
  });
});
