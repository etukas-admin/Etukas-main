import { useEffect, useState } from "react";
import type { Store, StoreProduct } from "../../../services/api";
import { getProductImageUrl } from "../../../services/api";
import { FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import type { RecentlyViewedItem } from "../types";

const RECENTLY_VIEWED_KEY = "etukas_recently_viewed_v1";
export const RECENTLY_VIEWED_EVENT = "etukas_recently_viewed_change";
const MAX_RECENT_ITEMS = 16;

function readRecentlyViewed(): RecentlyViewedItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecentlyViewed(items: RecentlyViewedItem[]) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items.slice(0, MAX_RECENT_ITEMS)));
      window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
    }
  } catch {
    // Ignore storage errors
  }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readRecentlyViewed();
}

export function recordRecentlyViewedProduct(product: StoreProduct): void {
  const imageUrl = getProductImageUrl(product.product.images[0], product.product.id, FALLBACK_PRODUCT_IMAGE);
  const productEntry: RecentlyViewedItem = {
    id: `product:${product.id}`,
    type: "product",
    title: product.product.name,
    subtitle: product.store.name,
    imageUrl,
    href: `/product/${product.id}`,
    priceMinor: product.priceMinor,
    unit: product.product.unit,
    viewedAt: new Date().toISOString()
  };

  const existing = readRecentlyViewed().filter((item) => item.id !== productEntry.id);
  writeRecentlyViewed([productEntry, ...existing]);
}

export function recordRecentlyViewedStore(store: Store, imageUrl?: string): void {
  const storeEntry: RecentlyViewedItem = {
    id: `store:${store.id}`,
    type: "store",
    title: store.name,
    subtitle: `${store.city}, ${store.state}`,
    imageUrl: imageUrl || FALLBACK_PRODUCT_IMAGE,
    href: `/products?q=${encodeURIComponent(store.name)}`,
    viewedAt: new Date().toISOString()
  };

  const existing = readRecentlyViewed().filter((item) => item.id !== storeEntry.id);
  writeRecentlyViewed([storeEntry, ...existing]);
}

export function clearRecentlyViewed(): void {
  writeRecentlyViewed([]);
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(getRecentlyViewed);

  useEffect(() => {
    const sync = () => setItems(getRecentlyViewed());
    window.addEventListener(RECENTLY_VIEWED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    items,
    clear: clearRecentlyViewed
  };
}
