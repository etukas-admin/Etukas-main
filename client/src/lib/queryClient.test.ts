import { describe, expect, it, vi, beforeEach } from "vitest";
import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

describe("Phase 5: QueryClient & API Request Optimization Validation", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it("verifies default QueryClient configuration flags", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.refetchIntervalInBackground).toBe(false);
    expect(defaults?.staleTime).toBe(60 * 1000);
    expect(defaults?.gcTime).toBe(5 * 60 * 1000);
  });

  it("deduplicates simultaneous identical requests into a single network call", async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => {
      // Simulate 50ms network delay
      await new Promise((res) => setTimeout(res, 50));
      return [{ id: "cat-1", name: "Cement" }];
    });

    const key = queryKeys.categories.all;

    // Trigger 4 simultaneous queries for the same key
    const [res1, res2, res3, res4] = await Promise.all([
      queryClient.fetchQuery({ queryKey: key, queryFn: fetchSpy }),
      queryClient.fetchQuery({ queryKey: key, queryFn: fetchSpy }),
      queryClient.fetchQuery({ queryKey: key, queryFn: fetchSpy }),
      queryClient.fetchQuery({ queryKey: key, queryFn: fetchSpy })
    ]);

    // All four queries received the same data
    expect(res1).toEqual([{ id: "cat-1", name: "Cement" }]);
    expect(res2).toEqual(res1);
    expect(res3).toEqual(res1);
    expect(res4).toEqual(res1);

    // CRITICAL: fetchSpy was called exactly ONCE, proving deduplication
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses cached data without triggering a network request within staleTime", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      callCount++;
      return { products: [`item-${callCount}`] };
    });

    const key = queryKeys.products.list({ category: "cement" });

    // First fetch: populates cache
    const initial = await queryClient.fetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: 60 * 1000
    });
    expect(initial).toEqual({ products: ["item-1"] });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Immediate second fetch: uses cached data, fetchFn NOT called again
    const cached = await queryClient.fetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: 60 * 1000
    });
    expect(cached).toEqual({ products: ["item-1"] });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("cancels in-flight query and triggers signal abort via queryClient.cancelQueries", async () => {
    let wasAborted = false;
    const abortableFn = vi.fn().mockImplementation(({ signal }: { signal?: AbortSignal }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ ok: true }), 200);
        signal?.addEventListener("abort", () => {
          wasAborted = true;
          clearTimeout(timer);
          const err = new Error("Query was cancelled");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const key = ["test", "cancellation"];
    const promise = queryClient.fetchQuery({
      queryKey: key,
      queryFn: abortableFn
    });

    // Cancel in flight
    await queryClient.cancelQueries({ queryKey: key });

    await expect(promise).rejects.toThrow();
    expect(wasAborted).toBe(true);
  });
});
