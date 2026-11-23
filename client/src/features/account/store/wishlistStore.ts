import { useEffect, useState } from "react";
import type { StoreProduct } from "../../../services/api";
import { getProductImageUrl } from "../../../services/api";
import type { WishlistItem } from "../types";

const WISHLIST_STORAGE_KEY = "etukas_customer_wishlist_v1";
export const WISHLIST_CHANGE_EVENT = "etukas_wishlist_change";

function readWishlist(): WishlistItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export function getWishlistItems(): WishlistItem[] {
  return readWishlist();
}

export function isProductWishlisted(storeProductId: string): boolean {
  return readWishlist().some((item) => item.id === storeProductId);
}

export function addToWishlist(product: StoreProduct): WishlistItem[] {
  const existing = readWishlist();
  const nextItem: WishlistItem = {
    id: product.id,
    productId: product.product.id,
    name: product.product.name,
    priceMinor: product.priceMinor,
    discountMinor: product.discountMinor,
    unit: product.product.unit || "unit",
    minOrderQuantity: product.minOrderQuantity || 1,
    stockQuantity: product.stockQuantity ?? 0,
    imageUrl: getProductImageUrl(product.product.images[0], product.product.id),
    storeId: product.store.id,
    storeName: product.store.name,
    categoryName: product.product.category?.name,
    addedAt: new Date().toISOString()
  };

  const filtered = existing.filter((item) => item.id !== product.id);
  const next = [nextItem, ...filtered];
  writeWishlist(next);
  return next;
}

export function removeFromWishlist(storeProductId: string): WishlistItem[] {
  const next = readWishlist().filter((item) => item.id !== storeProductId);
  writeWishlist(next);
  return next;
}

export function toggleWishlistProduct(product: StoreProduct): { wishlisted: boolean; items: WishlistItem[] } {
  if (isProductWishlisted(product.id)) {
    return { wishlisted: false, items: removeFromWishlist(product.id) };
  }
  return { wishlisted: true, items: addToWishlist(product) };
}

export function clearWishlist(): void {
  writeWishlist([]);
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>(getWishlistItems);

  useEffect(() => {
    const sync = () => setItems(getWishlistItems());
    window.addEventListener(WISHLIST_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    items,
    count: items.length,
    isWishlisted: (id: string) => items.some((item) => item.id === id),
    toggle: toggleWishlistProduct,
    remove: removeFromWishlist,
    clear: clearWishlist
  };
}
