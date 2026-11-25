import { useEffect, useMemo, useState } from "react";
import {
  recommendTmtVehicle,
  TMT_WEIGHBRIDGE_NOTE,
  type TmtBillingMode,
  type TmtBrandCatalogItem,
  type TmtBrandTier,
  type TmtGrade,
  type TmtUom,
  type TmtVariant
} from "../../types/tmt";

export const TMT_CART_STORAGE_KEY = "etukas_tmt_cart_batches";
export const TMT_CART_CHANGE_EVENT = "etukas_tmt_cart_change";

export interface TmtCartLineItem {
  variantId: string;
  label: string;
  diameterMm: number;
  isLite: boolean;
  piecesPerBundle: number;
  approxWeightPerBundleKg: number;
  pricePerBundleInr: number;
  pricePerTonInr: number;
  commonUse: string;
  bundles: number;
}

export interface TmtCartBatch {
  id: string;
  brandSlug: string;
  brandName: string;
  tier: TmtBrandTier;
  grade: TmtGrade;
  rodLengthMeters: number;
  billingMode: TmtBillingMode;
  uomPreference: TmtUom;
  storeProductId?: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  imageUrl: string;
  weighbridgeNote: string;
  lines: TmtCartLineItem[];
  updatedAt: string;
}

export function readTmtCartBatches(): TmtCartBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TMT_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TmtCartBatch[]) : [];
  } catch {
    return [];
  }
}

export function writeTmtCartBatches(batches: TmtCartBatch[]): void {
  if (typeof window === "undefined") return;
  try {
    if (batches.length === 0) {
      window.localStorage.removeItem(TMT_CART_STORAGE_KEY);
    } else {
      window.localStorage.setItem(TMT_CART_STORAGE_KEY, JSON.stringify(batches));
    }
  } catch {
    // Ignore storage quota errors
  }
  window.dispatchEvent(new Event(TMT_CART_CHANGE_EVENT));
}

export function computeTmtBatchTotals(batch: TmtCartBatch) {
  const totalBundles = batch.lines.reduce((sum, l) => sum + l.bundles, 0);
  const totalWeightKg = batch.lines.reduce(
    (sum, l) => sum + l.bundles * l.approxWeightPerBundleKg,
    0
  );
  const totalTons = Number((totalWeightKg / 1000).toFixed(2));
  const totalInr = batch.lines.reduce(
    (sum, l) => sum + l.bundles * l.pricePerBundleInr,
    0
  );
  const totalMinor = Math.round(totalInr * 100);
  const vehicle = recommendTmtVehicle(totalTons);

  return {
    totalBundles,
    totalWeightKg: Number(totalWeightKg.toFixed(1)),
    totalTons,
    totalInr,
    totalMinor,
    vehicle
  };
}

export function upsertTmtCartBatch(params: {
  brand: TmtBrandCatalogItem;
  grade: TmtGrade;
  uomPreference: TmtUom;
  quantitiesByLabel: Record<string, number>;
  variants: TmtVariant[];
}): TmtCartBatch | null {
  const { brand, grade, uomPreference, quantitiesByLabel, variants } = params;
  const selectedLines: TmtCartLineItem[] = [];

  for (const variant of variants) {
    const qty = Math.max(0, Math.round(quantitiesByLabel[variant.label] ?? 0));
    if (qty <= 0) continue;
    selectedLines.push({
      variantId: variant.id,
      label: variant.label,
      diameterMm: variant.diameter_mm,
      isLite: Boolean(variant.is_lite),
      piecesPerBundle: variant.pieces_per_bundle,
      approxWeightPerBundleKg: variant.approx_weight_per_bundle_kg,
      pricePerBundleInr: variant.price_per_bundle_inr,
      pricePerTonInr: variant.price_per_ton_inr,
      commonUse: variant.common_use,
      bundles: qty
    });
  }

  if (selectedLines.length === 0) return null;

  const storeId = brand.store_id || `tmt-yard-${brand.slug}`;
  const batchId = `${brand.slug}__${grade.toLowerCase().replace(/\s+/g, "-")}__${storeId}`;
  const existing = readTmtCartBatches();
  const prevBatch = existing.find((b) => b.id === batchId);

  const mergedLinesMap = new Map<string, TmtCartLineItem>();
  if (prevBatch) {
    for (const prevLine of prevBatch.lines) {
      mergedLinesMap.set(prevLine.label, { ...prevLine });
    }
  }
  for (const line of selectedLines) {
    mergedLinesMap.set(line.label, line);
  }

  const nextBatch: TmtCartBatch = {
    id: batchId,
    brandSlug: brand.slug,
    brandName: brand.name,
    tier: brand.tier,
    grade,
    rodLengthMeters: brand.rod_length_meters,
    billingMode: brand.billing_mode,
    uomPreference,
    storeProductId: brand.store_product_id,
    storeId,
    storeName: brand.store_name || `${brand.name} Authorized Yard`,
    storeCity: brand.store_city || "Hyderabad",
    imageUrl: brand.suggested_image_url || "/images/pngimages/steel-iron-bars.webp",
    weighbridgeNote: TMT_WEIGHBRIDGE_NOTE,
    lines: Array.from(mergedLinesMap.values()).sort((a, b) => {
      if (a.diameterMm !== b.diameterMm) return a.diameterMm - b.diameterMm;
      return a.isLite === b.isLite ? 0 : a.isLite ? 1 : -1;
    }),
    updatedAt: new Date().toISOString()
  };

  const nextBatches = [...existing.filter((b) => b.id !== batchId), nextBatch];
  writeTmtCartBatches(nextBatches);
  return nextBatch;
}

export function updateTmtBatchLineQuantity(
  batchId: string,
  label: string,
  bundles: number
): void {
  const safeQty = Math.max(0, Math.round(bundles));
  const existing = readTmtCartBatches();
  const next = existing
    .map((batch) => {
      if (batch.id !== batchId) return batch;
      const updatedLines =
        safeQty === 0
          ? batch.lines.filter((l) => l.label !== label)
          : batch.lines.map((l) =>
              l.label === label ? { ...l, bundles: safeQty } : l
            );
      return {
        ...batch,
        lines: updatedLines,
        updatedAt: new Date().toISOString()
      };
    })
    .filter((batch) => batch.lines.length > 0);

  writeTmtCartBatches(next);
}

export function removeTmtCartBatch(batchId: string): void {
  const existing = readTmtCartBatches();
  writeTmtCartBatches(existing.filter((b) => b.id !== batchId));
}

export function clearTmtCartBatches(): void {
  writeTmtCartBatches([]);
}

export function useTmtCart() {
  const [batches, setBatches] = useState<TmtCartBatch[]>(readTmtCartBatches);

  useEffect(() => {
    const sync = () => setBatches(readTmtCartBatches());
    window.addEventListener(TMT_CART_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TMT_CART_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const summary = useMemo(() => {
    let totalBatches = batches.length;
    let totalLines = 0;
    let totalBundles = 0;
    let totalWeightKg = 0;
    let totalMinor = 0;

    for (const batch of batches) {
      const t = computeTmtBatchTotals(batch);
      totalLines += batch.lines.length;
      totalBundles += t.totalBundles;
      totalWeightKg += t.totalWeightKg;
      totalMinor += t.totalMinor;
    }

    const totalTons = Number((totalWeightKg / 1000).toFixed(2));
    return {
      totalBatches,
      totalLines,
      totalBundles,
      totalWeightKg: Number(totalWeightKg.toFixed(1)),
      totalTons,
      totalMinor,
      totalInr: Math.round(totalMinor / 100),
      vehicle: recommendTmtVehicle(totalTons)
    };
  }, [batches]);

  return {
    batches,
    summary,
    upsertBatch: upsertTmtCartBatch,
    updateLineQuantity: updateTmtBatchLineQuantity,
    removeBatch: removeTmtCartBatch,
    clearAll: clearTmtCartBatches
  };
}
