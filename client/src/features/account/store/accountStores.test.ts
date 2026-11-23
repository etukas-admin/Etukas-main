import { beforeEach, describe, expect, it } from "vitest";
import type { Store, StoreProduct } from "../../../services/api";
import {
  clearWishlist,
  getWishlistItems,
  isProductWishlisted,
  removeFromWishlist,
  toggleWishlistProduct
} from "./wishlistStore";
import {
  clearRecentlyViewed,
  getRecentlyViewed,
  recordRecentlyViewedProduct,
  recordRecentlyViewedStore
} from "./recentlyViewedStore";
import {
  getAccountPreferences,
  setAccountLanguage,
  toggleClaimCoupon,
  updateNotificationPreferences
} from "./accountPreferencesStore";

const mockStore: Store = {
  id: "store-1",
  name: "Sri Lakshmi Building Materials",
  city: "Kakinada",
  state: "Andhra Pradesh",
  serviceRadiusKm: 25
};

const mockProduct: StoreProduct = {
  id: "sp-101",
  priceMinor: 39500,
  currency: "INR",
  discountMinor: 2500,
  stockQuantity: 250,
  minOrderQuantity: 5,
  deliveryEta: "Same day",
  store: mockStore,
  product: {
    id: "prod-101",
    name: "UltraTech OPC 53 Cement",
    description: "Fresh factory stock cement",
    unit: "bag",
    images: [{ url: "https://example.com/cement.jpg", altText: "Cement" }],
    category: { id: "cat-1", name: "Cement", slug: "cement", icon: "cement" }
  }
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    }
  };
}

describe("Account feature stores", () => {
  beforeEach(() => {
    const localStorage = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage,
        dispatchEvent: () => true
      },
      configurable: true
    });
    clearWishlist();
    clearRecentlyViewed();
  });

  it("toggles and removes products in wishlist", () => {
    expect(getWishlistItems()).toHaveLength(0);
    const added = toggleWishlistProduct(mockProduct);
    expect(added.wishlisted).toBe(true);
    expect(isProductWishlisted(mockProduct.id)).toBe(true);
    expect(getWishlistItems()[0].name).toBe("UltraTech OPC 53 Cement");

    removeFromWishlist(mockProduct.id);
    expect(isProductWishlisted(mockProduct.id)).toBe(false);
    expect(getWishlistItems()).toHaveLength(0);
  });

  it("records recently viewed products and stores without duplicates", () => {
    recordRecentlyViewedProduct(mockProduct);
    recordRecentlyViewedStore(mockStore);
    recordRecentlyViewedProduct(mockProduct);

    const recent = getRecentlyViewed();
    expect(recent).toHaveLength(2);
    expect(recent[0].type).toBe("product");
    expect(recent[1].type).toBe("store");
  });

  it("updates language, notifications, and claimed coupons", () => {
    setAccountLanguage("తెలుగు");
    updateNotificationPreferences({ couponsAndOffers: false });
    toggleClaimCoupon("etukas-bulk-500");

    const prefs = getAccountPreferences();
    expect(prefs.language).toBe("తెలుగు");
    expect(prefs.notifications.couponsAndOffers).toBe(false);
    expect(prefs.claimedCouponIds).toContain("etukas-bulk-500");
  });
});
