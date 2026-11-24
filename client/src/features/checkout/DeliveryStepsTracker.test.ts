import { describe, expect, it } from "vitest";
import {
  haversineDistanceMeters,
  interpolateBearing,
  minDistanceToPolylineMeters
} from "@etukas/shared";
import {
  canCustomerCancelOrder,
  canTrackVehicleLive,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  isOrderTrackingTerminal
} from "./DeliveryStepsTracker";
import { formatEtaDuration, formatLastSeenAgo } from "../tracking/osrm";

describe("DeliveryStepsTracker helpers", () => {
  it("identifies terminal statuses to stop Vercel background polling", () => {
    expect(isOrderTrackingTerminal("PLACED")).toBe(false);
    expect(isOrderTrackingTerminal("CONFIRMED")).toBe(false);
    expect(isOrderTrackingTerminal("LOADING_VEHICLE")).toBe(false);
    expect(isOrderTrackingTerminal("ASSIGNED_DRIVER")).toBe(false);

    expect(isOrderTrackingTerminal("DELIVERED")).toBe(true);
    expect(isOrderTrackingTerminal("REJECTED")).toBe(true);
    expect(isOrderTrackingTerminal("CANCELLED")).toBe(true);
  });

  it("formats enum statuses into human-readable labels", () => {
    expect(formatDeliveryStatusLabel("PLACED")).toBe("Order Placed");
    expect(formatDeliveryStatusLabel("LOADING_VEHICLE")).toBe("Loading on Vehicle");
    expect(formatDeliveryStatusLabel("ASSIGNED_DRIVER")).toBe("Assigned Delivery Partner");
    expect(formatDeliveryStatusLabel("DELIVERED")).toBe("Delivered");
    expect(formatDeliveryStatusLabel("REJECTED")).toBe("Rejected");
    expect(formatDeliveryStatusLabel("CANCELLED")).toBe("Cancelled");
  });

  it("colors rejected and cancelled orders in red, delivered in emerald", () => {
    expect(getDeliveryStatusBadgeClass("DELIVERED")).toContain("emerald");
    expect(getDeliveryStatusBadgeClass("REJECTED")).toContain("red");
    expect(getDeliveryStatusBadgeClass("CANCELLED")).toContain("red");
    expect(getDeliveryStatusBadgeClass("LOADING_VEHICLE")).toContain("purple");
    expect(getDeliveryStatusBadgeClass("ASSIGNED_DRIVER")).toContain("blue");
  });

  it("allows customer cancellation strictly before vehicle loading", () => {
    expect(canCustomerCancelOrder("PLACED")).toBe(true);
    expect(canCustomerCancelOrder("CONFIRMED")).toBe(true);

    expect(canCustomerCancelOrder("LOADING_VEHICLE")).toBe(false);
    expect(canCustomerCancelOrder("ASSIGNED_DRIVER")).toBe(false);
    expect(canCustomerCancelOrder("DELIVERED")).toBe(false);
    expect(canCustomerCancelOrder("REJECTED")).toBe(false);
    expect(canCustomerCancelOrder("CANCELLED")).toBe(false);
  });

  it("enables live vehicle map tracking once a delivery partner is assigned", () => {
    expect(canTrackVehicleLive("PLACED")).toBe(false);
    expect(canTrackVehicleLive("CONFIRMED")).toBe(false);
    expect(canTrackVehicleLive("LOADING_VEHICLE")).toBe(false);

    expect(canTrackVehicleLive("ASSIGNED_DRIVER")).toBe(true);
    expect(canTrackVehicleLive("DISPATCHED")).toBe(true);

    expect(canTrackVehicleLive("DELIVERED")).toBe(false);
    expect(canTrackVehicleLive("CANCELLED")).toBe(false);
    expect(canTrackVehicleLive("REJECTED")).toBe(false);
  });

  it("computes Haversine distance, shortest-arc bearing interpolation, and ETA/last-seen formatting", () => {
    expect(haversineDistanceMeters(16.9891, 82.2475, 16.9891, 82.2475)).toBe(0);
    // ~111 meters per 0.001 degree latitude
    const moved = haversineDistanceMeters(16.9891, 82.2475, 16.9901, 82.2475);
    expect(moved).toBeGreaterThan(100);
    expect(moved).toBeLessThan(120);

    // Crossing North (350 deg -> 10 deg) should interpolate through 0 deg, not 180 deg
    expect(Math.round(interpolateBearing(350, 10, 0.5))).toBe(0);
    expect(Math.round(interpolateBearing(10, 350, 0.5))).toBe(0);

    const distToLine = minDistanceToPolylineMeters(
      { lat: 17.0, lng: 82.2 },
      [
        [82.2, 17.0],
        [82.3, 17.0]
      ]
    );
    expect(distToLine).toBe(0);

    expect(formatEtaDuration(1)).toBe("Arriving soon");
    expect(formatEtaDuration(42)).toBe("~42 mins");
    expect(formatEtaDuration(135)).toBe("~2h 15m");

    const now = 1_700_000_000_000;
    expect(formatLastSeenAgo(now - 30_000, now)).toBe("Just now");
    expect(formatLastSeenAgo(now - 5 * 60_000, now)).toBe("Last seen 5 mins ago");
  });
});
