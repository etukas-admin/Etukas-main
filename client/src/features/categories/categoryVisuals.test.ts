import { describe, expect, it } from "vitest";
import type { Category, StoreProduct } from "../../services/api";
import {
  buildOrderedMaterialCategories,
  computeDiscountPercent,
  extractBrandsFromProducts,
  extractStoresFromProducts,
  filterCategoriesByQuery,
  filterServicesByQuery,
  getCategoryIconComponent,
  getCategoryLocalImage,
  getTopLevelCategories,
  MACHINERY_SERVICES,
  MACHINERY_TAB_SLUG,
  resolveCategoryImage,
  TECHNICIAN_SERVICES
} from "./categoryVisuals";

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-1",
  name: "Cement",
  slug: "cement",
  icon: "Package",
  parentId: null,
  productCount: 4,
  sampleImageUrl: null,
  children: [],
  ...overrides
});

const makeProduct = (overrides: Partial<StoreProduct> = {}): StoreProduct => ({
  id: "sp-1",
  priceMinor: 38500,
  currency: "INR",
  discountMinor: 5500,
  stockQuantity: 100,
  minOrderQuantity: 1,
  deliveryEta: "2-3 hrs",
  distanceKm: 4.2,
  store: {
    id: "store-1",
    name: "Sri Sai Traders",
    city: "Hyderabad",
    state: "Telangana",
    serviceRadiusKm: 25
  },
  product: {
    id: "prod-1",
    name: "UltraTech Super Cement 50kg",
    description: "OPC/PPC grade cement",
    unit: "bag",
    brand: "UltraTech",
    images: [{ id: "img-1", productId: "prod-1", url: "/api/v1/products/prod-1/images/img-1", altText: "Cement" }],
    category: makeCategory()
  },
  ...overrides
});

describe("categoryVisuals", () => {
  it("resolves known category slugs to verified local assets rather than external URLs", () => {
    const slugs = [
      "bricks-blocks",
      "cement",
      "sand-aggregates",
      "stones-aggregates",
      "steel-iron-bars",
      "tiles-flooring",
      "paints",
      "plumbing",
      "electrical-materials",
      "cement-poles",
      MACHINERY_TAB_SLUG
    ];

    for (const slug of slugs) {
      const localImage = getCategoryLocalImage(slug);
      expect(localImage).toMatch(/^\/images\/.+\.webp$/);
      expect(localImage).not.toContain("unsplash.com");
      expect(localImage).not.toContain("cloudfront.net");
    }

    expect(getCategoryIconComponent("cement")).not.toBeNull();
    expect(getCategoryIconComponent("unknown-slug")).toBeNull();
  });

  it("orders all 10 building materials exactly as the Homepage side-scroll strip even when DB is empty", () => {
    const ordered = buildOrderedMaterialCategories([]);
    expect(ordered.map((c) => c.slug)).toEqual([
      "bricks-blocks",
      "cement",
      "sand-aggregates",
      "stones-aggregates",
      "steel-iron-bars",
      "tiles-flooring",
      "paints",
      "plumbing",
      "electrical-materials",
      "cement-poles"
    ]);
    expect(ordered.map((c) => c.name)).toEqual([
      "Bricks & Blocks",
      "Cement",
      "Sand",
      "Stone / Aggregate",
      "Iron Bars",
      "Tiles / Marbles",
      "Paints",
      "Plumbing",
      "Electricals",
      "Cement Articles"
    ]);
  });

  it("merges partial DB categories into exact side-scroll order, appends custom DB categories, and excludes machinery", () => {
    const partialDb: Category[] = [
      makeCategory({ id: "db-cem", slug: "cement", name: "Cement", productCount: 7, sampleImageUrl: "/img/c.webp" }),
      makeCategory({ id: "db-mach", slug: MACHINERY_TAB_SLUG, name: "Construction machinery", productCount: 2 }),
      makeCategory({ id: "db-custom", slug: "waterproofing", name: "Waterproofing", productCount: 3 })
    ];

    const ordered = buildOrderedMaterialCategories(partialDb);
    expect(ordered.some((c) => c.slug === MACHINERY_TAB_SLUG)).toBe(false);
    expect(ordered[0].slug).toBe("bricks-blocks");
    expect(ordered[1]).toMatchObject({
      id: "db-cem",
      slug: "cement",
      name: "Cement",
      productCount: 7,
      sampleImageUrl: "/img/c.webp"
    });
    expect(ordered[ordered.length - 1]).toMatchObject({
      id: "db-custom",
      slug: "waterproofing",
      name: "Waterproofing",
      productCount: 3
    });
  });

  it("includes all 8 technician trades and all 8 machinery services with local assets and query filtering", () => {
    expect(TECHNICIAN_SERVICES).toHaveLength(8);
    expect(MACHINERY_SERVICES).toHaveLength(8);

    for (const item of [...TECHNICIAN_SERVICES, ...MACHINERY_SERVICES]) {
      expect(item.image).toMatch(/^\/images\/.+\.webp$/);
    }

    expect(filterServicesByQuery(TECHNICIAN_SERVICES, "plumb").map((i) => i.slug)).toEqual(["plumber"]);
    expect(filterServicesByQuery(MACHINERY_SERVICES, "excavation").map((i) => i.slug)).toEqual(["jcb"]);
  });

  it("falls back to sampleImageUrl or null for unknown category slugs", () => {
    expect(
      resolveCategoryImage({ slug: "roofing-sheets", sampleImageUrl: "/api/v1/products/p1/images/i1" })
    ).toBe("/api/v1/products/p1/images/i1");
    expect(resolveCategoryImage({ slug: "roofing-sheets", sampleImageUrl: null })).toBeNull();
  });

  it("extracts top-level categories and filters by parent or child query", () => {
    const parent = makeCategory({
      id: "parent-1",
      name: "Tiles and flooring",
      slug: "tiles-flooring",
      children: [
        makeCategory({ id: "child-1", name: "Vitrified Tiles", slug: "vitrified-tiles", parentId: "parent-1" })
      ]
    });
    const child = makeCategory({ id: "child-1", name: "Vitrified Tiles", slug: "vitrified-tiles", parentId: "parent-1" });
    const standalone = makeCategory({ id: "cat-2", name: "Paints", slug: "paints", parentId: null });

    const topLevel = getTopLevelCategories([parent, child, standalone]);
    expect(topLevel.map((c) => c.id)).toEqual(["parent-1", "cat-2"]);

    expect(filterCategoriesByQuery(topLevel, "vitrified").map((c) => c.id)).toEqual(["parent-1"]);
    expect(filterCategoriesByQuery(topLevel, "paints").map((c) => c.id)).toEqual(["cat-2"]);
    expect(filterCategoriesByQuery(topLevel, "")).toHaveLength(2);
  });

  it("extracts sorted unique brands and distance-ordered stores from live products", () => {
    const p1 = makeProduct({
      id: "sp-1",
      distanceKm: 12,
      store: { id: "s2", name: "Zeta Yard", city: "Hyderabad", state: "TS", serviceRadiusKm: 25 },
      product: { ...makeProduct().product, brand: "Ramco" }
    });
    const p2 = makeProduct({
      id: "sp-2",
      distanceKm: 3.5,
      store: { id: "s1", name: "Alpha Traders", city: "Hyderabad", state: "TS", serviceRadiusKm: 25 },
      product: { ...makeProduct().product, brand: "ACC" }
    });
    const p3 = makeProduct({
      id: "sp-3",
      distanceKm: 8,
      store: { id: "s2", name: "Zeta Yard", city: "Hyderabad", state: "TS", serviceRadiusKm: 25 },
      product: { ...makeProduct().product, brand: "ramco" }
    });
    const p4 = makeProduct({
      id: "sp-4",
      distanceKm: null,
      store: { id: "s3", name: "Beta Depot", city: "Hyderabad", state: "TS", serviceRadiusKm: 25 },
      product: { ...makeProduct().product, brand: "  " }
    });

    expect(extractBrandsFromProducts([p1, p2, p3, p4])).toEqual(["ACC", "Ramco"]);
    expect(extractStoresFromProducts([p1, p2, p3, p4]).map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("computes real discount percentage only when discountMinor is positive", () => {
    expect(computeDiscountPercent(38500, 5500)).toBe(13);
    expect(computeDiscountPercent(38500, 0)).toBeNull();
    expect(computeDiscountPercent(38500, undefined)).toBeNull();
    expect(computeDiscountPercent(0, 500)).toBeNull();
  });
});
