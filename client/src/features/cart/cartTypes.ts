/**
 * Etukas Cart – Extended Type Definitions
 *
 * These types extend the existing Cart / StoreProduct types from api.ts with
 * product-category-specific variant and quantity-management configuration.
 *
 * The backend does NOT yet expose `variants` or `quantityConfig` fields.
 * When the backend is updated to support them, these types will naturally
 * align with the API response.  Until then the frontend derives sensible
 * defaults from the existing StoreProduct data (unit, minOrderQuantity,
 * stockQuantity).
 */

import type { Cart, StoreProduct } from "../../services/api";

// ─── Quantity Configuration ───────────────────────────────────────────────────

/**
 * Product-category quantity behaviour.
 *
 * Sellers configure this through Etukas Partner Hub.
 * For now defaults are derived from the product's `unit` field.
 */
export type QuantityConfig =
  | {
      type: "step"; // Cement bags, paints, tiles, electrical, plumbing…
      unit: string; // "bag", "litre", "box", "piece", "roll", "length"…
      step: number; // increment / decrement step (usually 1)
      min: number; // minimum order quantity
      max?: number; // seller-configured max, undefined = unlimited
    }
  | {
      type: "bulk"; // Red bricks, sand, aggregates…
      unit: string; // "brick", "tonne", "cubic feet"
      quickOptions: number[]; // seller-configured preset quantities
      min: number; // minimum order quantity
      step: number; // quantity increment
      max?: number;
    }
  | {
      type: "variants"; // Steel / iron bars with diameter-wise entries
      unit: string; // "piece", "length", "kg", "bundle"
      variants: SteelVariant[];
    };

export type SteelVariant = {
  /** Seller-assigned variant ID (or derived key like "8mm") */
  id: string;
  /** Human-readable label, e.g. "8 mm" */
  label: string;
  /** Diameter in mm (for steel) */
  diameterMm?: number;
  /** Price per unit in minor currency (paise) */
  priceMinor: number;
  /** Available stock */
  stockQuantity: number;
  /** Minimum order quantity for this variant */
  minOrderQuantity: number;
  /** Currently selected quantity (0 = not in cart) */
  quantity: number;
};

// ─── Cart Item with derived config ───────────────────────────────────────────

export type CartItemData = Cart["items"][number] & {
  quantityConfig: QuantityConfig;
};

/** Grouped by seller store */
export type SellerGroup = {
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  items: CartItemData[];
  subtotalMinor: number;
};

// ─── Category classification ──────────────────────────────────────────────────

export type ProductCategoryKey =
  | "steel"
  | "iron"
  | "bricks"
  | "cement"
  | "sand"
  | "stones"
  | "aggregates"
  | "tiles"
  | "paints"
  | "electrical"
  | "plumbing"
  | "other";

/**
 * Classify a store-product into one of the known category keys based on the
 * product category slug or product name.  This drives which quantity-control
 * component is rendered.
 */
export function classifyProduct(storeProduct: StoreProduct): ProductCategoryKey {
  const slug = (storeProduct.product.category?.slug ?? "").toLowerCase();
  const name = (storeProduct.product.name ?? "").toLowerCase();
  const combined = `${slug} ${name}`;

  if (combined.includes("steel") || combined.includes("tmt") || combined.includes("iron") || combined.includes("rebar")) {
    return "steel";
  }
  if (combined.includes("brick")) return "bricks";
  if (combined.includes("cement") || combined.includes("mortar")) return "cement";
  if (combined.includes("sand")) return "sand";
  if (combined.includes("stone") || combined.includes("aggregate") || combined.includes("gravel") || combined.includes("jelly")) {
    return "aggregates";
  }
  if (combined.includes("tile") || combined.includes("flooring") || combined.includes("granite") || combined.includes("marble")) {
    return "tiles";
  }
  if (combined.includes("paint") || combined.includes("primer") || combined.includes("enamel") || combined.includes("putty")) {
    return "paints";
  }
  if (combined.includes("wire") || combined.includes("switch") || combined.includes("electrical") || combined.includes("mcb") || combined.includes("conduit")) {
    return "electrical";
  }
  if (combined.includes("pipe") || combined.includes("plumb") || combined.includes("fitting") || combined.includes("tap") || combined.includes("faucet")) {
    return "plumbing";
  }
  return "other";
}

/**
 * Build a QuantityConfig from the existing StoreProduct fields.
 *
 * Once the backend exposes `variants` and `quantityConfig` these can be read
 * directly from the API response.  For now we derive them from:
 *   - product category (via classifyProduct)
 *   - product.unit
 *   - storeProduct.minOrderQuantity
 *   - storeProduct.stockQuantity
 */
export function deriveQuantityConfig(storeProduct: StoreProduct): QuantityConfig {
  const category = classifyProduct(storeProduct);
  const unit = storeProduct.product.unit || "piece";
  const min = Math.max(1, storeProduct.minOrderQuantity ?? 1);

  switch (category) {
    case "steel":
    case "iron":
      // Steel products should ideally have variants from the backend.
      // Until then, render as step-type with a note.
      return {
        type: "step",
        unit,
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "bricks":
      return {
        type: "bulk",
        unit: "brick",
        // Seller-configurable: default quick options for bricks
        quickOptions: [2000, 5000, 10000, 15000, 20000],
        min: min < 100 ? 500 : min,
        step: min < 100 ? 500 : min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "cement":
      return {
        type: "step",
        unit: "bag (50 kg)",
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "sand":
    case "aggregates":
      return {
        type: "bulk",
        unit: unit.includes("ton") ? "tonne" : "cubic feet",
        quickOptions: [1, 2, 5, 10, 20],
        min,
        step: min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "tiles":
      return {
        type: "step",
        unit: unit.includes("sq") ? "sq. ft." : "box",
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "paints":
      return {
        type: "step",
        unit: unit.includes("litre") || unit.includes("ltr") || unit.includes("l") ? "litre" : "bucket",
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "electrical":
      return {
        type: "step",
        unit: unit.includes("roll") ? "roll" : unit.includes("length") ? "length" : "piece",
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    case "plumbing":
      return {
        type: "step",
        unit: unit.includes("length") ? "length" : "piece",
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };

    default:
      return {
        type: "step",
        unit,
        step: 1,
        min,
        max: storeProduct.stockQuantity || undefined,
      };
  }
}

/**
 * Enrich raw cart items with derived quantity configuration.
 */
export function enrichCartItems(items: Cart["items"]): CartItemData[] {
  return items.map((item) => ({
    ...item,
    quantityConfig: deriveQuantityConfig(item.storeProduct),
  }));
}

/**
 * Group enriched cart items by seller store.
 */
export function groupByStore(items: CartItemData[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const item of items) {
    const { store } = item.storeProduct;
    let group = map.get(store.id);
    if (!group) {
      group = {
        storeId: store.id,
        storeName: store.name,
        storeCity: store.city,
        storeState: store.state,
        items: [],
        subtotalMinor: 0,
      };
      map.set(store.id, group);
    }
    group.items.push(item);
    group.subtotalMinor += item.storeProduct.priceMinor * item.quantity;
  }
  return Array.from(map.values());
}
