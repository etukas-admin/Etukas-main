import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../services/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: marketplaceApi.categories });
}

export function useProducts(params?: {
  category?: string;
  pageSize?: number;
  q?: string;
  latitude?: number;
  longitude?: number;
}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => marketplaceApi.products(params)
  });
}

export function useStores(params?: { city?: string }) {
  return useQuery({
    queryKey: ["stores", params?.city],
    queryFn: () => marketplaceApi.stores(params)
  });
}

