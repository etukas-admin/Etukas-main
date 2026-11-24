import { type RefObject, useEffect, useRef, useState } from "react";

export type HeaderScrollConfig = {
  /** ScrollY below which the header always expands back to full height. */
  topExpandThreshold: number;
  /** Minimum scrollY before the header can minimize while scrolling down. */
  collapseAtY: number;
  /** Minimum downward scroll distance required to trigger minimize. */
  minDownDelta: number;
  /** Minimum deliberate upward scroll distance required to reveal full header mid-page. */
  minUpDelta: number;
  /** Minimum scrollable overflow (scrollHeight - innerHeight) required to allow minimizing. */
  minScrollableOverflow: number;
  /** Cooldown (ms) after toggling compact state to prevent transition-induced oscillation. */
  cooldownMs: number;
  /** ScrollY past which subtle scrolled elevation/shadow is active. */
  scrolledShadowThreshold: number;
};

export const DEFAULT_HEADER_SCROLL_CONFIG: HeaderScrollConfig = {
  topExpandThreshold: 10,
  collapseAtY: 36,
  minDownDelta: 8,
  minUpDelta: 44,
  minScrollableOverflow: 160,
  cooldownMs: 320,
  scrolledShadowThreshold: 6
};

export type HeaderScrollState = {
  isScrolled: boolean;
  isCompact: boolean;
  lastScrollY: number;
  upwardAccumulated: number;
  downwardAccumulated: number;
  lockedUntil: number;
};

export type HeaderScrollInput = {
  scrollY: number;
  maxScrollable: number;
  now: number;
  isPaused?: boolean;
};

export function createInitialHeaderScrollState(initialScrollY = 0): HeaderScrollState {
  const safeY = Math.max(0, initialScrollY);
  return {
    isScrolled: safeY > DEFAULT_HEADER_SCROLL_CONFIG.scrolledShadowThreshold,
    isCompact: false,
    lastScrollY: safeY,
    upwardAccumulated: 0,
    downwardAccumulated: 0,
    lockedUntil: 0
  };
}

/**
 * Pure, deterministic state transition for smooth Amazon/Flipkart-style header minimizing.
 * Prevents jitter via hysteresis, minimum scrollable overflow checks, bottom-bounce guard,
 * and post-toggle transition cooldown.
 */
export function computeNextHeaderScrollState(
  prev: HeaderScrollState,
  input: HeaderScrollInput,
  config: HeaderScrollConfig = DEFAULT_HEADER_SCROLL_CONFIG
): HeaderScrollState {
  const scrollY = Math.max(0, input.scrollY);
  const maxScrollable = Math.max(0, input.maxScrollable);
  const isScrolled = scrollY > config.scrolledShadowThreshold;

  // Always restore full header near the very top (including iOS rubber-band overscroll).
  if (scrollY <= config.topExpandThreshold) {
    return {
      isScrolled,
      isCompact: false,
      lastScrollY: scrollY,
      upwardAccumulated: 0,
      downwardAccumulated: 0,
      lockedUntil: prev.isCompact ? input.now + config.cooldownMs : prev.lockedUntil
    };
  }

  // Never minimize on short pages where shrinking the header would cause scroll clamping bounce.
  if (maxScrollable < config.minScrollableOverflow) {
    return {
      isScrolled,
      isCompact: false,
      lastScrollY: scrollY,
      upwardAccumulated: 0,
      downwardAccumulated: 0,
      lockedUntil: prev.lockedUntil
    };
  }

  // Hold current compact state while paused (e.g. typing in search or navigation drawer open).
  if (input.isPaused) {
    return {
      ...prev,
      isScrolled,
      lastScrollY: scrollY,
      upwardAccumulated: 0,
      downwardAccumulated: 0
    };
  }

  const delta = scrollY - prev.lastScrollY;

  // During the CSS collapse/expand animation, absorb layout-induced scroll shifts cleanly.
  if (input.now < prev.lockedUntil) {
    return {
      ...prev,
      isScrolled,
      lastScrollY: scrollY,
      upwardAccumulated: 0,
      downwardAccumulated: 0
    };
  }

  // Ignore sub-pixel noise.
  if (Math.abs(delta) < 1) {
    return {
      ...prev,
      isScrolled,
      lastScrollY: scrollY
    };
  }

  if (delta > 0) {
    const downwardAccumulated = prev.downwardAccumulated + delta;
    if (
      !prev.isCompact &&
      scrollY >= config.collapseAtY &&
      downwardAccumulated >= config.minDownDelta
    ) {
      return {
        isScrolled,
        isCompact: true,
        lastScrollY: scrollY,
        upwardAccumulated: 0,
        downwardAccumulated: 0,
        lockedUntil: input.now + config.cooldownMs
      };
    }

    return {
      ...prev,
      isScrolled,
      lastScrollY: scrollY,
      downwardAccumulated,
      upwardAccumulated: 0
    };
  }

  // Scrolling up
  const upwardAccumulated = prev.upwardAccumulated + Math.abs(delta);
  const isNearBottomBounce = maxScrollable > 0 && scrollY >= maxScrollable - 12;

  if (prev.isCompact && !isNearBottomBounce && upwardAccumulated >= config.minUpDelta) {
    return {
      isScrolled,
      isCompact: false,
      lastScrollY: scrollY,
      upwardAccumulated: 0,
      downwardAccumulated: 0,
      lockedUntil: input.now + config.cooldownMs
    };
  }

  return {
    ...prev,
    isScrolled,
    lastScrollY: scrollY,
    upwardAccumulated,
    downwardAccumulated: 0
  };
}

export type UseHeaderScrollOptions = {
  paused?: boolean;
  config?: Partial<HeaderScrollConfig>;
};

export type HeaderScrollResult = {
  isScrolled: boolean;
  isCompact: boolean;
};

/**
 * Shared scroll state across all devices (mobile, tablet, desktop) and input methods
 * (touch, wheel, scrollbar, keyboard). Uses rAF coalescing for 60/120fps smoothness.
 */
export function useHeaderScroll(options?: UseHeaderScrollOptions): HeaderScrollResult {
  const paused = options?.paused ?? false;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const configRef = useRef<HeaderScrollConfig>({
    ...DEFAULT_HEADER_SCROLL_CONFIG,
    ...options?.config
  });
  configRef.current = {
    ...DEFAULT_HEADER_SCROLL_CONFIG,
    ...options?.config
  };

  const stateRef = useRef<HeaderScrollState>(
    createInitialHeaderScrollState(typeof window !== "undefined" ? window.scrollY : 0)
  );

  const [result, setResult] = useState<HeaderScrollResult>(() => ({
    isScrolled: stateRef.current.isScrolled,
    isCompact: stateRef.current.isCompact
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;

    const processScroll = () => {
      rafId = null;
      const doc = document.documentElement;
      const maxScrollable = Math.max(0, doc.scrollHeight - window.innerHeight);
      const next = computeNextHeaderScrollState(
        stateRef.current,
        {
          scrollY: window.scrollY,
          maxScrollable,
          now: performance.now(),
          isPaused: pausedRef.current
        },
        configRef.current
      );
      stateRef.current = next;

      setResult((prev) =>
        prev.isScrolled === next.isScrolled && prev.isCompact === next.isCompact
          ? prev
          : { isScrolled: next.isScrolled, isCompact: next.isCompact }
      );
    };

    const scheduleProcess = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(processScroll);
      }
    };

    const handleResize = () => {
      const doc = document.documentElement;
      const maxScrollable = Math.max(0, doc.scrollHeight - window.innerHeight);
      if (maxScrollable < configRef.current.minScrollableOverflow || window.scrollY <= configRef.current.topExpandThreshold) {
        stateRef.current = createInitialHeaderScrollState(window.scrollY);
        setResult((prev) =>
          prev.isScrolled === stateRef.current.isScrolled && prev.isCompact === false
            ? prev
            : { isScrolled: stateRef.current.isScrolled, isCompact: false }
        );
      }
    };

    window.addEventListener("scroll", scheduleProcess, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleProcess);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return result;
}

/**
 * Publishes the live rendered height of a sticky header element to a CSS custom property
 * so downstream sticky bars (e.g. category strips, sub-page headers) align with zero gap or overlap.
 */
export function useHeaderHeightCssVar(
  headerRef: RefObject<HTMLElement | null>,
  cssVarName = "--etukas-header-height"
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = headerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const height = Math.floor(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(cssVarName, `${height}px`);
    };

    updateHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeight);
      observer.observe(el);
    }

    window.addEventListener("resize", updateHeight, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty(cssVarName);
    };
  }, [headerRef, cssVarName]);
}

/**
 * Backwards-compatible hook for components that only need to know whether
 * the mobile header is currently minimized/compact.
 */
export function useMobileScrollState(): boolean {
  const { isCompact } = useHeaderScroll();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobileViewport && isCompact;
}
