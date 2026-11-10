import { useQuery } from "@tanstack/react-query";
import { marketplaceApi, type RequestOptions } from "../services/api";
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

export function useStores(params?: { city?: string }) {
  return useQuery({
    queryKey: queryKeys.stores.nearby(params?.city),
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
