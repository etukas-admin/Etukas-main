import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../services/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: marketplaceApi.categories });
}

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: marketplaceApi.products });
}

export function useStores() {
  return useQuery({ queryKey: ["stores"], queryFn: marketplaceApi.stores });
}
