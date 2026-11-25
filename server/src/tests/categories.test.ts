import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../express-app.js";
import { prisma } from "../config/prisma.js";
import { formatCategoriesResponse, type RawCategoryRecord } from "../modules/categories/categories.routes.js";

describe("Categories API & formatting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatCategoriesResponse", () => {
    it("preserves base category fields, aggregates parent+child productCount, and resolves blank image urls", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const raw: RawCategoryRecord[] = [
        {
          id: "cat-parent",
          name: "Tiles and flooring",
          slug: "tiles-flooring",
          icon: "Layers",
          parentId: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          children: [
            {
              id: "cat-child",
              name: "Vitrified Tiles",
              slug: "vitrified-tiles",
              icon: "Layers",
              parentId: "cat-parent",
              isActive: true
            }
          ],
          products: [
            {
              id: "prod-1",
              images: [{ id: "img-1", productId: "prod-1", url: "", sortOrder: 0 }]
            }
          ]
        },
        {
          id: "cat-child",
          name: "Vitrified Tiles",
          slug: "vitrified-tiles",
          icon: "Layers",
          parentId: "cat-parent",
          isActive: true,
          createdAt: now,
          updatedAt: now,
          children: [],
          products: [
            {
              id: "prod-2",
              images: [{ id: "img-2", productId: "prod-2", url: "https://cdn.example.com/vitrified.webp", sortOrder: 0 }]
            },
            {
              id: "prod-3",
              images: []
            }
          ]
        }
      ];

      const formatted = formatCategoriesResponse(raw);
      expect(formatted).toHaveLength(2);

      const parent = formatted[0];
      expect(parent.id).toBe("cat-parent");
      expect(parent.name).toBe("Tiles and flooring");
      expect(parent.slug).toBe("tiles-flooring");
      expect(parent.icon).toBe("Layers");
      expect(parent.productCount).toBe(3);
      expect(parent.sampleImageUrl).toBe("/api/v1/products/prod-1/images/img-1");
      expect(parent.children).toEqual([
        {
          id: "cat-child",
          name: "Vitrified Tiles",
          slug: "vitrified-tiles",
          icon: "Layers",
          parentId: "cat-parent",
          isActive: true,
          productCount: 2,
          sampleImageUrl: "https://cdn.example.com/vitrified.webp"
        }
      ]);
      expect("products" in parent).toBe(false);
    });
  });

  describe("GET /api/v1/categories", () => {
    it("returns enriched active categories with Cache-Control header", async () => {
      const mockRows = [
        {
          id: "cat-cement",
          name: "Cement",
          slug: "cement",
          icon: "Package",
          parentId: null,
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          children: [],
          products: [
            {
              id: "prod-cem-1",
              images: [{ id: "img-cem-1", productId: "prod-cem-1", url: "", sortOrder: 0 }]
            }
          ]
        }
      ];

      vi.spyOn(prisma.category, "findMany").mockResolvedValueOnce(mockRows as never);

      const response = await request(createApp()).get("/api/v1/categories");
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toContain("max-age=60");
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: "cat-cement",
        name: "Cement",
        slug: "cement",
        icon: "Package",
        productCount: 1,
        sampleImageUrl: "/api/v1/products/prod-cem-1/images/img-cem-1",
        children: []
      });
    });
  });
});
