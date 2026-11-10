/**
 * Safe Image Fallback Utilities
 * Prevents recursive 404/304 HTTP request loops when an image fails to load.
 */

export const INLINE_FALLBACK_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20width%3D%2218%22%20height%3D%2218%22%20x%3D%223%22%20y%3D%223%22%20rx%3D%222%22%2F%3E%3Ccircle%20cx%3D%229%22%20cy%3D%229%22%20r%3D%222%22%2F%3E%3Cpath%20d%3D%22m21%2015-3.086-3.086a2%202%200%200%200-2.828%200L6%2021%22%2F%3E%3C%2Fsvg%3E";

export const FALLBACK_PRODUCT_IMAGE = "/images/pngimages/cement.webp";
export const FALLBACK_TECHNICIAN_IMAGE = "/images/technicians/plumber.webp";

/**
 * Creates a safe onError handler for <img> elements that:
 * 1. Immediately removes the onerror handler to prevent cascading loops.
 * 2. Tries the specified primary fallback image once.
 * 3. If the primary fallback also fails, terminates immediately with an inline SVG data URI.
 * 4. Never makes a repeated or recursive network request.
 */
export function createSafeImageHandler(primaryFallback: string = FALLBACK_PRODUCT_IMAGE) {
  return (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;

    // 1. Immediately remove native onerror handler
    img.onerror = null;

    // 2. Check if current source is already the primary fallback or inline SVG
    const currentSrc = img.getAttribute("src") || img.src;
    if (
      !primaryFallback ||
      currentSrc === primaryFallback ||
      img.src.endsWith(primaryFallback) ||
      img.src.startsWith("data:")
    ) {
      img.src = INLINE_FALLBACK_SVG;
      return;
    }

    // 3. Fallback to primary image, with a secondary guard that terminates to inline SVG
    img.onerror = () => {
      img.onerror = null;
      img.src = INLINE_FALLBACK_SVG;
    };
    img.src = primaryFallback;
  };
}

