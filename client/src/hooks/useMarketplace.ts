import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../services/api";
import { queryKeys } from "../lib/queryKeys";

/**
 * Reusable Marketplace Hooks with AbortSignal cancellation and consistent query keys.
 */

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => marketplaceApi.categories({ signal }),
    staleTime: 10 * 60 * 1000 // Categories are static, keep fresh for 10 minutes
  });
}

export function useProducts(params?: {
  category?: string;
  brand?: string;
  city?: string;
  pageSize?: number;
  q?: string;
  latitude?: number;
  longitude?: number;
}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: ({ signal }) => marketplaceApi.products(params, { signal }),
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

export function useProduct(
  id?: string,
  params?: { latitude?: number; longitude?: number; city?: string }
) {
  return useQuery({
    queryKey: queryKeys.products.detail(id || "", params),
    queryFn: ({ signal }) => marketplaceApi.productById(id || "", params, { signal }),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000
  });
}

export function useStores(params?: { city?: string; latitude?: number; longitude?: number }) {
  return useQuery({
    queryKey: queryKeys.stores.nearby(params),
    queryFn: ({ signal }) => marketplaceApi.stores(params, { signal }),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function usePublicBanners() {
  return useQuery({
    queryKey: queryKeys.banners.public(),
    queryFn: ({ signal }) => marketplaceApi.publicBanners({ signal }),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

export function usePublicAdBanners() {
  return useQuery({
    queryKey: queryKeys.banners.publicAds(),
    queryFn: ({ signal }) => marketplaceApi.publicAdBanners({ signal }),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}
