import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../services/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: marketplaceApi.categories });
}

export function useProducts(params?: { category?: string; pageSize?: number; q?: string }) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => marketplaceApi.products(params)
  });
}

export function useStores() {
  return useQuery({ queryKey: ["stores"], queryFn: marketplaceApi.stores });
}
