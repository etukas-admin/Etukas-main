import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getStoredUser, marketplaceApi } from "../services/api";

export function useAddToCart() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [successId, setSuccessId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ storeProductId, quantity = 1 }: { storeProductId: string; quantity?: number }) => {
      const user = getStoredUser();
      if (!user) {
        throw new Error("AUTH_REQUIRED");
      }
      return marketplaceApi.addToCart(storeProductId, quantity);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setSuccessId(variables.storeProductId);
      setNotice("Added to cart!");
      setTimeout(() => {
        setSuccessId(null);
        setNotice(null);
      }, 2500);
    },
    onError: (err: any) => {
      if (err?.message === "AUTH_REQUIRED" || err?.status === 401) {
        setNotice("Please sign in to add items to your cart.");
        setTimeout(() => {
          navigate("/login");
        }, 1200);
      } else {
        setNotice(err?.message || "Failed to add to cart");
        setTimeout(() => setNotice(null), 3000);
      }
    }
  });

  const addToCart = (storeProductId: string, quantity = 1) => {
    mutation.mutate({ storeProductId, quantity });
  };

  return {
    addToCart,
    isLoading: mutation.isPending,
    loadingId: mutation.isPending ? mutation.variables?.storeProductId : null,
    successId,
    notice
  };
}
