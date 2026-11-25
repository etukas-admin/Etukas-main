import { describe, expect, it, beforeEach } from "vitest";
import {
  buildTmtVariantsForBrand,
  calcBundlePriceInr,
  calcBundleWeightKg,
  calcWeightPerMeterKg,
  HOUSE_STEEL_ESTIMATES,
  recommendTmtVehicle,
  TMT_MASTER_BRANDS
} from "../../types/tmt";
import {
  clearTmtCartBatches,
  computeTmtBatchTotals,
  readTmtCartBatches,
  updateTmtBatchLineQuantity,
  upsertTmtCartBatch
} from "./tmtCartStore";

describe("TMT domain calculations & master data", () => {
  it("computes IS 1786 weight per meter (D^2 / 162) and 12m bundle weights accurately", () => {
    expect(calcWeightPerMeterKg(8)).toBe(0.395);
    expect(calcWeightPerMeterKg(10)).toBe(0.617);
    expect(calcWeightPerMeterKg(12)).toBe(0.889);
    expect(calcWeightPerMeterKg(16)).toBe(1.58);

    // 8mm, 10 pcs, 12m => 0.395 * 12 * 10 = 47.4 kg
    expect(calcBundleWeightKg(8, 10, 12)).toBe(47.4);
    // 10mm, 7 pcs, 12m => 0.617 * 12 * 7 = 51.8 kg
    expect(calcBundleWeightKg(10, 7, 12)).toBe(51.8);
  });

  it("computes bundle prices with size extras and incl/excl GST toggle", () => {
    const incl = calcBundlePriceInr(60000, 800, 50, true);
    expect(incl.pricePerTonInr).toBe(60800);
    expect(incl.pricePerBundleInr).toBe(3040);

    const excl = calcBundlePriceInr(50000, 0, 50, false);
    expect(excl.pricePerTonInr).toBe(59000);
    expect(excl.pricePerBundleInr).toBe(2950);
  });

  it("includes primary and regional brands and supports 8mm Lite only on regional lite brands", () => {
    expect(TMT_MASTER_BRANDS.length).toBeGreaterThanOrEqual(15);

    const tata = TMT_MASTER_BRANDS.find((b) => b.slug === "tata-tiscon");
    const radha = TMT_MASTER_BRANDS.find((b) => b.slug === "radha-tmt");
    expect(tata?.tier).toBe("primary");
    expect(tata?.supports_lite_variants).toBe(false);
    expect(tata?.variants.some((v) => v.label === "8mm Lite")).toBe(false);

    expect(radha?.tier).toBe("regional");
    expect(radha?.supports_lite_variants).toBe(true);
    const liteVariant = radha?.variants.find((v) => v.label === "8mm Lite");
    expect(liteVariant?.approx_weight_per_bundle_kg).toBe(43.0);
    expect(liteVariant?.pieces_per_bundle).toBe(12);

    const builtFe550 = buildTmtVariantsForBrand({
      brandSlug: "radha-tmt",
      grade: "Fe 550D",
      baseRatePerTonInr: 63000,
      supportsLiteVariants: true
    });
    expect(builtFe550.some((v) => v.label === "32mm")).toBe(true);
  });

  it("recommends vehicles dynamically across weight thresholds", () => {
    expect(recommendTmtVehicle(0)).toBeNull();
    expect(recommendTmtVehicle(0.85)?.label).toBe("Tata Ace / Pickup");
    expect(recommendTmtVehicle(1.0)?.label).toBe("Tata Ace / Pickup");
    expect(recommendTmtVehicle(1.72)?.label).toBe("Mini Truck (2.5T)");
    expect(recommendTmtVehicle(4.2)?.label).toBe("DCM / 6-Wheeler");
    expect(recommendTmtVehicle(7.5)?.label).toBe("Heavy Lorry");
  });

  it("exposes 1 BHK, 2 BHK, and 3 BHK house steel estimator presets", () => {
    expect(HOUSE_STEEL_ESTIMATES.map((e) => e.key)).toEqual(["1bhk", "2bhk", "3bhk"]);
    const twoBhk = HOUSE_STEEL_ESTIMATES.find((e) => e.key === "2bhk");
    expect(twoBhk?.tonnageRange).toContain("3.5");
    expect(twoBhk?.recommendedBundles["10mm"]).toBeGreaterThan(0);
  });
});

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    }
  };
}

describe("tmtCartStore batch operations", () => {
  beforeEach(() => {
    const localStorage = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage,
        dispatchEvent: () => true
      },
      configurable: true
    });
    Object.defineProperty(globalThis, "Event", {
      value: class FakeEvent {
        constructor(public type: string) {}
      },
      configurable: true
    });
    clearTmtCartBatches();
  });

  it("groups multi-size selections under parent brand and updates quantities cleanly", () => {
    const radha = TMT_MASTER_BRANDS.find((b) => b.slug === "radha-tmt")!;
    const batch = upsertTmtCartBatch({
      brand: radha,
      grade: "Fe 500D",
      uomPreference: "bundles",
      quantitiesByLabel: {
        "8mm": 10,
        "10mm": 12,
        "12mm": 15
      },
      variants: radha.variants
    });

    expect(batch).not.toBeNull();
    expect(batch!.lines).toHaveLength(3);

    const totals = computeTmtBatchTotals(batch!);
    expect(totals.totalBundles).toBe(37);
    expect(totals.totalTons).toBeGreaterThan(1.5);
    expect(totals.vehicle?.label).toBe("Mini Truck (2.5T)");

    updateTmtBatchLineQuantity(batch!.id, "8mm", 0);
    const updated = readTmtCartBatches();
    expect(updated[0].lines).toHaveLength(2);
  });
});
