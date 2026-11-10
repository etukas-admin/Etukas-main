import { describe, it, expect } from "vitest";
import {
  createSafeImageHandler,
  FALLBACK_PRODUCT_IMAGE,
  FALLBACK_TECHNICIAN_IMAGE,
  INLINE_FALLBACK_SVG
} from "./imageFallback";

interface MockImg {
  src: string;
  onerror: ((event?: unknown) => void) | null;
  getAttribute: (attr: string) => string | null;
}

function createMockImg(initialSrc: string): HTMLImageElement {
  const mock: MockImg = {
    src: initialSrc,
    onerror: null,
    getAttribute(attr: string) {
      if (attr === "src") return this.src;
      return null;
    }
  };
  return mock as unknown as HTMLImageElement;
}

describe("createSafeImageHandler", () => {
  it("replaces a broken image with the primary fallback on first error and arms secondary guard", () => {
    const handler = createSafeImageHandler(FALLBACK_PRODUCT_IMAGE);
    const img = createMockImg("https://broken-domain.local/missing-image.png");

    const mockEvent = {
      currentTarget: img
    } as unknown as React.SyntheticEvent<HTMLImageElement, Event>;

    handler(mockEvent);

    expect(img.src).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(img.onerror).not.toBeNull();

    // Trigger secondary error on the fallback itself
    if (img.onerror) {
      (img.onerror as () => void)();
    }

    // Now it must safely terminate with inline SVG and remove onerror
    expect(img.src).toBe(INLINE_FALLBACK_SVG);
    expect(img.onerror).toBeNull();
  });

  it("never loops if the element already contains the fallback image source", () => {
    const handler = createSafeImageHandler(FALLBACK_TECHNICIAN_IMAGE);
    const img = createMockImg(FALLBACK_TECHNICIAN_IMAGE);

    const mockEvent = {
      currentTarget: img
    } as unknown as React.SyntheticEvent<HTMLImageElement, Event>;

    handler(mockEvent);

    // Immediately switches to inline SVG data URI with 0 network calls
    expect(img.src).toBe(INLINE_FALLBACK_SVG);
    expect(img.onerror).toBeNull();
  });

  it("never loops if the element already contains an inline SVG data URI", () => {
    const handler = createSafeImageHandler(FALLBACK_PRODUCT_IMAGE);
    const img = createMockImg(INLINE_FALLBACK_SVG);

    const mockEvent = {
      currentTarget: img
    } as unknown as React.SyntheticEvent<HTMLImageElement, Event>;

    handler(mockEvent);

    expect(img.src).toBe(INLINE_FALLBACK_SVG);
    expect(img.onerror).toBeNull();
  });
});
