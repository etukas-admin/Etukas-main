import { describe, expect, it } from "vitest";
import {
  canCustomerCancelOrder,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  isOrderTrackingTerminal
} from "./DeliveryStepsTracker";

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
});
