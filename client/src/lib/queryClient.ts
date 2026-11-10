import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized TanStack Query Client for Etukas.
 *
 * Configured with:
 * - 60s staleTime default to prevent rapid duplicate fetches.
 * - 5m cache gcTime for instant UI restoration on navigation.
 * - refetchOnWindowFocus: false to avoid sudden refetch storms when switching windows.
 * - refetchIntervalInBackground: false to halt all polling when the browser tab is inactive.
 * - Smart retry: skips 4xx HTTP client errors and AbortSignal cancellation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      refetchIntervalInBackground: false,
      retry: (failureCount, error) => {
        // Never retry intentional user cancellations
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }
        // Never retry 4xx client errors (401, 403, 404, etc.)
        if (typeof error === "object" && error !== null && "status" in error) {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 1;
      }
    },
    mutations: {
      retry: false
    }
  }
});

