import { describe, expect, it } from "vitest";
import {
  computeNextHeaderScrollState,
  createInitialHeaderScrollState,
  DEFAULT_HEADER_SCROLL_CONFIG
} from "./useMobileScrollState";

describe("Header smooth scroll-minimizing state machine", () => {
  it("minimizes smoothly when scrolling down past the collapse threshold", () => {
    let state = createInitialHeaderScrollState(0);

    // Small initial movement should set isScrolled but not yet collapse
    state = computeNextHeaderScrollState(state, {
      scrollY: 20,
      maxScrollable: 1200,
      now: 100
    });
    expect(state.isScrolled).toBe(true);
    expect(state.isCompact).toBe(false);

    // Continuing down past collapseAtY (36px) collapses the header
    state = computeNextHeaderScrollState(state, {
      scrollY: 48,
      maxScrollable: 1200,
      now: 130
    });
    expect(state.isCompact).toBe(true);
  });

  it("does not minimize on short pages where height shrink could cause scroll bounce", () => {
    let state = createInitialHeaderScrollState(0);

    state = computeNextHeaderScrollState(state, {
      scrollY: 80,
      maxScrollable: 100, // less than minScrollableOverflow (160)
      now: 200
    });
    expect(state.isCompact).toBe(false);
  });

  it("ignores transition-induced scroll jitter during cooldown window", () => {
    let state = createInitialHeaderScrollState(0);
    state = computeNextHeaderScrollState(state, {
      scrollY: 60,
      maxScrollable: 1200,
      now: 100
    });
    expect(state.isCompact).toBe(true);

    // Layout shrinks mid-animation, shifting scroll slightly upward within cooldownMs
    state = computeNextHeaderScrollState(state, {
      scrollY: 20,
      maxScrollable: 1200,
      now: 200
    });
    expect(state.isCompact).toBe(true);
  });

  it("reveals full header on deliberate upward scroll after cooldown (Flipkart/Amazon behavior)", () => {
    let state = createInitialHeaderScrollState(0);
    state = computeNextHeaderScrollState(state, {
      scrollY: 300,
      maxScrollable: 1500,
      now: 100
    });
    expect(state.isCompact).toBe(true);

    const afterCooldown = 100 + DEFAULT_HEADER_SCROLL_CONFIG.cooldownMs + 20;

    // Small upward thumb jitter (< 44px) should NOT expand
    state = computeNextHeaderScrollState(state, {
      scrollY: 280,
      maxScrollable: 1500,
      now: afterCooldown
    });
    expect(state.isCompact).toBe(true);

    // Deliberate upward scroll (>= 44px total) expands smoothly
    state = computeNextHeaderScrollState(state, {
      scrollY: 240,
      maxScrollable: 1500,
      now: afterCooldown + 20
    });
    expect(state.isCompact).toBe(false);
  });

  it("ignores bottom-of-page rubber-band bounce so header stays minimized", () => {
    let state = createInitialHeaderScrollState(0);
    state = computeNextHeaderScrollState(state, {
      scrollY: 1200,
      maxScrollable: 1200,
      now: 100
    });
    expect(state.isCompact).toBe(true);

    // Slight upward bounce right at the bottom edge
    state = computeNextHeaderScrollState(state, {
      scrollY: 1192,
      maxScrollable: 1200,
      now: 600
    });
    expect(state.isCompact).toBe(true);
  });

  it("always restores full header when scrolling back to the top (including negative iOS overscroll)", () => {
    let state = createInitialHeaderScrollState(0);
    state = computeNextHeaderScrollState(state, {
      scrollY: 150,
      maxScrollable: 1200,
      now: 100
    });
    expect(state.isCompact).toBe(true);

    state = computeNextHeaderScrollState(state, {
      scrollY: -4,
      maxScrollable: 1200,
      now: 150
    });
    expect(state.isCompact).toBe(false);
    expect(state.isScrolled).toBe(false);
  });

  it("holds compact state steady when paused (e.g. search input focused)", () => {
    let state = createInitialHeaderScrollState(0);
    state = computeNextHeaderScrollState(state, {
      scrollY: 120,
      maxScrollable: 1200,
      now: 100,
      isPaused: true
    });
    expect(state.isCompact).toBe(false);
  });
});
