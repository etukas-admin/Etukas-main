/**
 * Cart-specific API hooks and mutations.
 *
 * Wraps the existing marketplaceApi cart endpoints so that cart components
 * don't need to know the underlying fetch/query details.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi } from "../../services/api";
import { api } from "../../services/api";

export const CART_QUERY_KEY = ["cart"] as const;

/** Fetch cart data – returns raw Cart shape including totals */
export function useCartQuery() {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: marketplaceApi.cart,
    retry: false,
  });
}

/** Update the quantity of an existing cart item */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api<{ id: string; quantity: number }>(`/cart/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

/** Remove an item from the cart */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api<{ deleted: boolean }>(`/cart/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

/** Clear all items from the cart by removing them one by one */
export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      await Promise.all(
        itemIds.map((id) =>
          api<{ deleted: boolean }>(`/cart/items/${encodeURIComponent(id)}`, {
            method: "DELETE",
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
