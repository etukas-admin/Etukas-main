import { describe, expect, it } from "vitest";
import {
  calculateDistanceKm,
  evaluateProductDeliveryRange,
  resolveEffectiveDeliveryRadiusKm
} from "../utils/geo.js";

describe("Product Delivery Radius Filtering", () => {
  // Kakinada coordinates
  const kakinadaLat = 16.9891;
  const kakinadaLng = 82.2475;

  // Samalkot (~12 km from Kakinada)
  const samalkotLat = 17.0531;
  const samalkotLng = 82.1695;

  // Rajahmundry (~52 km from Kakinada)
  const rajahmundryLat = 17.0005;
  const rajahmundryLng = 81.804;

  // Hyderabad (~412 km from Kakinada)
  const hyderabadLat = 17.4849;
  const hyderabadLng = 78.4138;

  it("computes accurate Haversine distances in km", () => {
    const distSamalkot = calculateDistanceKm(kakinadaLat, kakinadaLng, samalkotLat, samalkotLng);
    expect(distSamalkot).toBeGreaterThan(8);
    expect(distSamalkot).toBeLessThan(15);

    const distHyderabad = calculateDistanceKm(kakinadaLat, kakinadaLng, hyderabadLat, hyderabadLng);
    expect(distHyderabad).toBeGreaterThan(390);
    expect(distHyderabad).toBeLessThan(430);
  });

  it("prioritizes product-level deliveryRadiusKm over store default serviceRadiusKm", () => {
    expect(resolveEffectiveDeliveryRadiusKm(10, 30)).toBe(10);
    expect(resolveEffectiveDeliveryRadiusKm(80, 25)).toBe(80);
    expect(resolveEffectiveDeliveryRadiusKm(null, 40)).toBe(40);
    expect(resolveEffectiveDeliveryRadiusKm(undefined, undefined)).toBe(25);
  });

  it("shows product when customer is inside partner-configured radius and hides when outside", () => {
    // Partner in Kakinada sets 15 km radius for bricks
    const nearCustomer = evaluateProductDeliveryRange({
      customerLat: samalkotLat,
      customerLng: samalkotLng,
      storeLat: kakinadaLat,
      storeLng: kakinadaLng,
      productRadiusKm: 15,
      storeRadiusKm: 25
    });
    expect(nearCustomer.isDeliverable).toBe(true);
    expect(nearCustomer.deliveryRadiusKm).toBe(15);
    expect(nearCustomer.distanceKm).toBeLessThanOrEqual(15);

    // Same store, customer in Rajahmundry (~47 km away) should NOT see the 15 km product
    const farCustomer = evaluateProductDeliveryRange({
      customerLat: rajahmundryLat,
      customerLng: rajahmundryLng,
      storeLat: kakinadaLat,
      storeLng: kakinadaLng,
      productRadiusKm: 15,
      storeRadiusKm: 25
    });
    expect(farCustomer.isDeliverable).toBe(false);
    expect(farCustomer.distanceKm).toBeGreaterThan(15);

    // If partner sets 60 km radius on another product (e.g. bulk cement), Rajahmundry customer DOES see it
    const extendedRadius = evaluateProductDeliveryRange({
      customerLat: rajahmundryLat,
      customerLng: rajahmundryLng,
      storeLat: kakinadaLat,
      storeLng: kakinadaLng,
      productRadiusKm: 60,
      storeRadiusKm: 25
    });
    expect(extendedRadius.isDeliverable).toBe(true);
    expect(extendedRadius.deliveryRadiusKm).toBe(60);

    // Hyderabad customer (~412 km) still does not see it
    const veryFarCustomer = evaluateProductDeliveryRange({
      customerLat: hyderabadLat,
      customerLng: hyderabadLng,
      storeLat: kakinadaLat,
      storeLng: kakinadaLng,
      productRadiusKm: 60,
      storeRadiusKm: 25
    });
    expect(veryFarCustomer.isDeliverable).toBe(false);
  });

  it("falls back to city matching for legacy stores missing GPS coordinates", () => {
    const sameCity = evaluateProductDeliveryRange({
      customerLat: kakinadaLat,
      customerLng: kakinadaLng,
      customerCity: "Kakinada",
      storeLat: null,
      storeLng: null,
      storeCity: "Kakinada Rural",
      productRadiusKm: 20
    });
    expect(sameCity.isDeliverable).toBe(true);
    expect(sameCity.distanceKm).toBeNull();

    const differentCity = evaluateProductDeliveryRange({
      customerLat: kakinadaLat,
      customerLng: kakinadaLng,
      customerCity: "Kakinada",
      storeLat: null,
      storeLng: null,
      storeCity: "Hyderabad",
      productRadiusKm: 20
    });
    expect(differentCity.isDeliverable).toBe(false);
  });
});
