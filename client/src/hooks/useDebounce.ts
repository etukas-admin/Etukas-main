import { useEffect, useState } from "react";

/**
 * Reusable Debounce Hook
 * Debounces a fast-changing value (e.g. search input keystrokes)
 * to prevent unnecessary API requests.
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

