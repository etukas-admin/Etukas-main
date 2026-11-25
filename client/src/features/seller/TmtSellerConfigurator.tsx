import { useMemo, useRef, useState } from "react";
import {
  Calculator,
  Check,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  X
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { SellerProductListing } from "../../services/api";
import {
  calcBundlePriceInr,
  calcBundleWeightKg,
  calcWeightPerMeterKg,
  findMasterTmtBrandBySlug,
  getSizeExtraPerTon,
  STANDARD_TMT_LENGTH_METERS,
  STANDARD_TMT_SIZE_SPECS,
  TMT_GRADES,
  TMT_MASTER_BRANDS,
  type SellerTmtListingInput,
  type TmtBillingMode,
  type TmtBrandTier,
  type TmtGrade
} from "../../types/tmt";
import { ImageCropModal } from "./ImageCropModal";
import { cn } from "../../lib/utils";

interface VariantFormRow {
  diameterMm: number;
  label: string;
  isLite: boolean;
  commonUse: string;
  isActive: boolean;
  piecesPerBundle: number;
  approxWeightPerBundleKg: number;
  manualWeightOverride: boolean;
  pricePerBundleInr: number;
  pricePerTonInr: number;
  stockBundles: number;
  minOrderQuantity: number;
}

interface TmtSellerConfiguratorProps {
  /** Existing listing when editing a TMT product */
  editingListing?: SellerProductListing | null;
  storeCity?: string;
  hasStoreCoords?: boolean;
  isSaving: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (payload: SellerTmtListingInput) => Promise<void> | void;
}

const DELIVERY_RADIUS_PRESETS = [5, 10, 25, 50, 100] as const;

function buildInitialRows(editingListing?: SellerProductListing | null): VariantFormRow[] {
  const existingVariants = editingListing?.product?.variants ?? [];
  const meta = editingListing?.product?.tmtMetadata;
  const rodLength = meta?.logistics?.rod_length_meters ?? STANDARD_TMT_LENGTH_METERS;
  const baseRate = meta?.base_rate_per_ton_inr ?? 63000;
  const gstIncluded = meta?.logistics?.gst_included ?? true;
  const tier = meta?.tier ?? "primary";

  return STANDARD_TMT_SIZE_SPECS.map((spec) => {
    const match = existingVariants.find((v) => v.label === spec.label);
    if (match) {
      return {
        diameterMm: match.diameter_mm,
        label: match.label,
        isLite: Boolean(match.is_lite),
        commonUse: match.common_use || spec.common_use,
        isActive: match.is_active !== false,
        piecesPerBundle: match.pieces_per_bundle,
        approxWeightPerBundleKg: match.approx_weight_per_bundle_kg,
        manualWeightOverride: false,
        pricePerBundleInr: match.price_per_bundle_inr,
        pricePerTonInr: match.price_per_ton_inr,
        stockBundles: match.stock_bundles,
        minOrderQuantity: match.min_order_quantity ?? 1
      };
    }

    const bundleWeight =
      spec.override_bundle_weight_kg ??
      calcBundleWeightKg(spec.diameter_mm, spec.default_pieces_per_bundle, rodLength);
    const extra = getSizeExtraPerTon(spec.label);
    const { pricePerTonInr, pricePerBundleInr } = calcBundlePriceInr(
      baseRate,
      extra,
      bundleWeight,
      gstIncluded
    );

    const activeDefault = spec.is_lite ? tier === "regional" : true;
    return {
      diameterMm: spec.diameter_mm,
      label: spec.label,
      isLite: spec.is_lite,
      commonUse: spec.common_use,
      isActive: existingVariants.length > 0 ? false : activeDefault,
      piecesPerBundle: spec.default_pieces_per_bundle,
      approxWeightPerBundleKg: bundleWeight,
      manualWeightOverride: Boolean(spec.override_bundle_weight_kg),
      pricePerBundleInr,
      pricePerTonInr,
      stockBundles: spec.default_stock_bundles,
      minOrderQuantity: 1
    };
  });
}

export function TmtSellerConfigurator({
  editingListing,
  storeCity,
  hasStoreCoords = true,
  isSaving,
  errorMessage,
  onCancel,
  onSubmit
}: TmtSellerConfiguratorProps) {
  const existingMeta = editingListing?.product?.tmtMetadata;
  const defaultMaster =
    findMasterTmtBrandBySlug(existingMeta?.brand_slug ?? "radha-tmt") ??
    TMT_MASTER_BRANDS[0];

  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrandSlug, setSelectedBrandSlug] = useState(
    existingMeta?.brand_slug ?? defaultMaster.slug
  );
  const [selectedGrades, setSelectedGrades] = useState<TmtGrade[]>(
    existingMeta?.grade ? [existingMeta.grade] : [defaultMaster.default_grade]
  );
  const [rodLengthMeters, setRodLengthMeters] = useState<string>(
    String(existingMeta?.logistics?.rod_length_meters ?? STANDARD_TMT_LENGTH_METERS)
  );
  const [billingMode, setBillingMode] = useState<TmtBillingMode>(
    existingMeta?.logistics?.billing_mode ?? defaultMaster.billing_mode
  );

  // Smart Base-Rate Calculator state
  const [baseRatePerTon, setBaseRatePerTon] = useState<string>(
    String(existingMeta?.base_rate_per_ton_inr ?? defaultMaster.base_rate_per_ton_inr)
  );
  const [gstIncluded, setGstIncluded] = useState<boolean>(
    existingMeta?.logistics?.gst_included ?? true
  );
  const [extra8mm, setExtra8mm] = useState<string>(
    String(existingMeta?.logistics?.extra_8mm_per_ton_inr ?? 800)
  );
  const [extra6mm, setExtra6mm] = useState<string>(
    String(existingMeta?.logistics?.extra_6mm_per_ton_inr ?? 2000)
  );
  const [extra8mmLite, setExtra8mmLite] = useState<string>(
    String(existingMeta?.logistics?.extra_8mm_lite_per_ton_inr ?? -1000)
  );

  // Logistics & delivery rules
  const [minOrderTons, setMinOrderTons] = useState<string>(
    String(existingMeta?.logistics?.min_order_tons ?? 0.5)
  );
  const [freeDeliveryTons, setFreeDeliveryTons] = useState<string>(
    String(existingMeta?.logistics?.free_delivery_tons ?? 2.5)
  );
  const [loadingChargePerTon, setLoadingChargePerTon] = useState<string>(
    String(existingMeta?.logistics?.loading_charge_per_ton_inr ?? 0)
  );
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<string>(
    String(editingListing?.deliveryRadiusKm ?? 25)
  );
  const [description, setDescription] = useState<string>(
    editingListing?.product?.description ?? ""
  );

  // Variant matrix state
  const [rows, setRows] = useState<VariantFormRow[]>(() => buildInitialRows(editingListing));

  // Image upload / auto-suggested brand banner state
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBrand = useMemo(
    () => findMasterTmtBrandBySlug(selectedBrandSlug) ?? defaultMaster,
    [selectedBrandSlug, defaultMaster]
  );

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return TMT_MASTER_BRANDS;
    return TMT_MASTER_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q) ||
        b.tier.includes(q)
    );
  }, [brandSearch]);

  const handleSelectBrand = (slug: string) => {
    setSelectedBrandSlug(slug);
    const brand = findMasterTmtBrandBySlug(slug);
    if (!brand) return;

    const nextMode: TmtBillingMode =
      brand.tier === "primary" ? "theoretical" : "weighbridge";
    setBillingMode(nextMode);
    setBaseRatePerTon(String(brand.base_rate_per_ton_inr));
    if (!editingListing) {
      setSelectedGrades([brand.default_grade]);
    }

    const parsedLength = Math.max(1, Number(rodLengthMeters) || STANDARD_TMT_LENGTH_METERS);
    const e6 = Number(extra6mm) || 0;
    const e8 = Number(extra8mm) || 0;
    const e8l = Number(extra8mmLite) || 0;

    setRows((prev) =>
      prev.map((row) => {
        const nextActive = row.isLite ? brand.supports_lite_variants : row.isActive;
        const extra = getSizeExtraPerTon(row.label, {
          extra6mm: e6,
          extra8mm: e8,
          extra8mmLite: e8l
        });
        const bundleWeight = row.manualWeightOverride
          ? row.approxWeightPerBundleKg
          : calcBundleWeightKg(row.diameterMm, row.piecesPerBundle, parsedLength);
        const { pricePerTonInr, pricePerBundleInr } = calcBundlePriceInr(
          brand.base_rate_per_ton_inr,
          extra,
          bundleWeight,
          gstIncluded
        );
        return {
          ...row,
          isActive: nextActive,
          approxWeightPerBundleKg: bundleWeight,
          pricePerTonInr,
          pricePerBundleInr
        };
      })
    );
  };

  const toggleGrade = (grade: TmtGrade) => {
    if (editingListing) {
      setSelectedGrades([grade]);
      return;
    }
    setSelectedGrades((prev) => {
      if (prev.includes(grade)) {
        return prev.length > 1 ? prev.filter((g) => g !== grade) : prev;
      }
      return [...prev, grade];
    });
  };

  const handleAutoCalculateAll = () => {
    const base = Math.max(0, Number(baseRatePerTon) || 0);
    const e6 = Number(extra6mm) || 0;
    const e8 = Number(extra8mm) || 0;
    const e8l = Number(extra8mmLite) || 0;
    const len = Math.max(1, Number(rodLengthMeters) || STANDARD_TMT_LENGTH_METERS);

    setRows((prev) =>
      prev.map((row) => {
        const weightKg = row.manualWeightOverride
          ? row.approxWeightPerBundleKg
          : calcBundleWeightKg(row.diameterMm, row.piecesPerBundle, len);
        const extra = getSizeExtraPerTon(row.label, {
          extra6mm: e6,
          extra8mm: e8,
          extra8mmLite: e8l
        });
        const { pricePerTonInr, pricePerBundleInr } = calcBundlePriceInr(
          base,
          extra,
          weightKg,
          gstIncluded
        );
        return {
          ...row,
          approxWeightPerBundleKg: weightKg,
          pricePerTonInr,
          pricePerBundleInr
        };
      })
    );
  };

  const updateRow = (label: string, patch: Partial<VariantFormRow>) => {
    const len = Math.max(1, Number(rodLengthMeters) || STANDARD_TMT_LENGTH_METERS);
    const base = Math.max(0, Number(baseRatePerTon) || 0);
    const e6 = Number(extra6mm) || 0;
    const e8 = Number(extra8mm) || 0;
    const e8l = Number(extra8mmLite) || 0;

    setRows((prev) =>
      prev.map((row) => {
        if (row.label !== label) return row;
        const next = { ...row, ...patch };

        if (patch.piecesPerBundle !== undefined && !next.manualWeightOverride) {
          next.approxWeightPerBundleKg = calcBundleWeightKg(
            next.diameterMm,
            Math.max(1, patch.piecesPerBundle),
            len
          );
          const extra = getSizeExtraPerTon(next.label, {
            extra6mm: e6,
            extra8mm: e8,
            extra8mmLite: e8l
          });
          const calc = calcBundlePriceInr(
            base,
            extra,
            next.approxWeightPerBundleKg,
            gstIncluded
          );
          next.pricePerBundleInr = calc.pricePerBundleInr;
          next.pricePerTonInr = calc.pricePerTonInr;
        } else if (patch.approxWeightPerBundleKg !== undefined) {
          next.manualWeightOverride = true;
          const extra = getSizeExtraPerTon(next.label, {
            extra6mm: e6,
            extra8mm: e8,
            extra8mmLite: e8l
          });
          const calc = calcBundlePriceInr(
            base,
            extra,
            Math.max(0.1, patch.approxWeightPerBundleKg),
            gstIncluded
          );
          next.pricePerBundleInr = calc.pricePerBundleInr;
          next.pricePerTonInr = calc.pricePerTonInr;
        } else if (patch.pricePerBundleInr !== undefined) {
          const w = Math.max(0.1, next.approxWeightPerBundleKg);
          next.pricePerTonInr = Math.round((patch.pricePerBundleInr / w) * 1000);
        } else if (patch.pricePerTonInr !== undefined) {
          const w = Math.max(0.1, next.approxWeightPerBundleKg);
          next.pricePerBundleInr = Math.round((patch.pricePerTonInr / 1000) * w);
        }

        return next;
      })
    );
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be under 10 MB before cropping.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const activeRowCount = rows.filter((r) => r.isActive).length;
  const liteEnabled = rows.some((r) => r.isLite && r.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRowCount === 0) return;

    const payload: SellerTmtListingInput = {
      brandName: selectedBrand.name,
      brandSlug: selectedBrand.slug,
      tier: selectedBrand.tier as TmtBrandTier,
      grades: selectedGrades,
      baseRatePerTonInr: Math.max(1000, Math.round(Number(baseRatePerTon) || 0)),
      supportsLiteVariants: liteEnabled,
      deliveryRadiusKm: Math.min(500, Math.max(1, Math.round(Number(deliveryRadiusKm) || 25))),
      description: description.trim() || undefined,
      imageBase64,
      suggestedImageUrl: imageBase64 ? undefined : selectedBrand.suggested_image_url,
      logistics: {
        rodLengthMeters: Math.max(1, Number(rodLengthMeters) || STANDARD_TMT_LENGTH_METERS),
        billingMode,
        minOrderTons: Math.max(0.1, Number(minOrderTons) || 0.5),
        freeDeliveryTons: Math.max(0.1, Number(freeDeliveryTons) || 2.5),
        loadingChargePerTonInr: Math.max(0, Math.round(Number(loadingChargePerTon) || 0)),
        gstIncluded,
        extra6mmPerTonInr: Math.round(Number(extra6mm) || 0),
        extra8mmPerTonInr: Math.round(Number(extra8mm) || 0),
        extra8mmLitePerTonInr: Math.round(Number(extra8mmLite) || 0)
      },
      variants: rows.map((r) => ({
        diameterMm: r.diameterMm,
        label: r.label,
        isLite: r.isLite,
        piecesPerBundle: Math.max(1, Math.round(r.piecesPerBundle)),
        weightPerMeterKg: calcWeightPerMeterKg(r.diameterMm),
        approxWeightPerBundleKg: Math.max(1, Number(r.approxWeightPerBundleKg.toFixed(1))),
        pricePerBundleInr: Math.max(1, Math.round(r.pricePerBundleInr)),
        pricePerTonInr: Math.max(1, Math.round(r.pricePerTonInr)),
        commonUse: r.commonUse,
        stockBundles: Math.max(0, Math.round(r.stockBundles)),
        minOrderQuantity: Math.max(1, Math.round(r.minOrderQuantity)),
        isActive: r.isActive
      }))
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Brand, Grade & Billing Mode Selection */}
      <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-gray-900">
              1. Brand, Grade &amp; Weight Billing Mode
            </h4>
            <p className="text-xs text-gray-500">
              Select mill brand and grade(s) — auto-fills IS 1786 bundle weights &amp; banner
            </p>
          </div>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
            {selectedBrand.tier === "primary" ? "Tier-1 Primary" : "Telangana / AP Regional"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Searchable Brand Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-gray-700">
              TMT Steel Brand *
            </label>
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search Tata, JSW, Radha, Sugna..."
                className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs font-medium outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={selectedBrandSlug}
              onChange={(e) => handleSelectBrand(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-xs focus:border-orange-500 focus:outline-none"
            >
              <optgroup label="Tier-1 National Primary Brands">
                {filteredBrands
                  .filter((b) => b.tier === "primary")
                  .map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name} — {b.manufacturer}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Telangana & AP Regional Brands">
                {filteredBrands
                  .filter((b) => b.tier === "regional")
                  .map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name} — {b.origin_region}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Grade Multi-Select + Rod Length */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700">
                Grade{editingListing ? " *" : "s (Multi-select creates separate grade listings) *"}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TMT_GRADES.map((grade) => {
                  const active = selectedGrades.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition",
                        active
                          ? "border-orange-500 bg-orange-500 text-white shadow-xs"
                          : "border-gray-300 bg-white text-gray-700 hover:border-orange-400"
                      )}
                    >
                      {active ? <Check size={12} /> : null}
                      <span>{grade}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-700">
                  Standard Rod Length (m)
                </label>
                <Input
                  type="number"
                  min="3"
                  max="24"
                  step="0.5"
                  value={rodLengthMeters}
                  onChange={(e) => setRodLengthMeters(e.target.value)}
                  className="mt-1 h-9 bg-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-700">
                  Billing &amp; Weight Mode
                </label>
                <select
                  value={billingMode}
                  onChange={(e) => setBillingMode(e.target.value as TmtBillingMode)}
                  className="mt-1 h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs font-bold text-gray-800 focus:border-orange-500 focus:outline-none"
                >
                  <option value="theoretical">IS 1786 Theoretical Weight</option>
                  <option value="weighbridge">Actual Weighbridge (Kanta)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Smart Base-Rate & Auto-Pricing Calculator */}
      <section className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50/60 to-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Calculator size={16} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900">
                2. Smart Base-Rate &amp; Auto-Pricing Calculator
              </h4>
              <p className="text-[11px] text-gray-600">
                Enter today&apos;s base rate per Metric Ton (1000 kg) + thin-rod extras to price all sizes instantly
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-lg border border-orange-200 bg-white p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setGstIncluded(true)}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                gstIncluded ? "bg-orange-500 text-white" : "text-gray-600"
              )}
            >
              Incl. GST
            </button>
            <button
              type="button"
              onClick={() => setGstIncluded(false)}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                !gstIncluded ? "bg-orange-500 text-white" : "text-gray-600"
              )}
            >
              Excl. GST (+18%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-700">
              Base Rate (₹ / Ton) *
            </label>
            <Input
              required
              type="number"
              min="1000"
              step="50"
              value={baseRatePerTon}
              onChange={(e) => setBaseRatePerTon(e.target.value)}
              className="mt-1 h-9 bg-white font-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-700">
              8mm Extra (₹ / T)
            </label>
            <Input
              type="number"
              step="50"
              value={extra8mm}
              onChange={(e) => setExtra8mm(e.target.value)}
              className="mt-1 h-9 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-700">
              6mm Extra (₹ / T)
            </label>
            <Input
              type="number"
              step="50"
              value={extra6mm}
              onChange={(e) => setExtra6mm(e.target.value)}
              className="mt-1 h-9 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-700">
              8mm Lite Diff (₹ / T)
            </label>
            <Input
              type="number"
              step="50"
              value={extra8mmLite}
              onChange={(e) => setExtra8mmLite(e.target.value)}
              className="mt-1 h-9 bg-white font-bold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-gray-600">
            Formula: ((Base + Size Extra) / 1000) × Bundle Weight (kg)
            {!gstIncluded ? " × 1.18 GST" : ""}
          </span>
          <button
            type="button"
            onClick={handleAutoCalculateAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-black active:scale-95"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Auto-Calculate All Bundle Prices</span>
          </button>
        </div>
      </section>

      {/* 3. Multi-Size Variant Matrix */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-gray-900">
              3. Multi-Size Variant Matrix ({activeRowCount} of {rows.length} sizes active)
            </h4>
            <p className="text-[11px] text-gray-500">
              Toggle sizes stocked at your yard, adjust pieces/bundle or override bundle rates anytime
            </p>
          </div>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="space-y-2.5 md:hidden">
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                "rounded-xl border p-3 transition",
                row.isActive
                  ? "border-orange-300 bg-white shadow-xs"
                  : "border-gray-200 bg-gray-100/70 opacity-75"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-black text-gray-900">{row.label}</span>
                  <span className="ml-2 text-[11px] text-gray-500">{row.commonUse}</span>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => updateRow(row.label, { isActive: e.target.checked })}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span>{row.isActive ? "In Stock" : "Off"}</span>
                </label>
              </div>

              {row.isActive ? (
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <label>
                    <span className="text-[10px] font-bold text-gray-500">Pcs / Bundle</span>
                    <input
                      type="number"
                      min={1}
                      value={row.piecesPerBundle}
                      onChange={(e) =>
                        updateRow(row.label, {
                          piecesPerBundle: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="mt-0.5 h-8 w-full rounded-lg border border-gray-300 px-2 font-bold"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-bold text-gray-500">Weight / Bdl (kg)</span>
                    <input
                      type="number"
                      min={1}
                      step="0.1"
                      value={row.approxWeightPerBundleKg}
                      onChange={(e) =>
                        updateRow(row.label, {
                          approxWeightPerBundleKg: parseFloat(e.target.value || "1") || 1
                        })
                      }
                      className="mt-0.5 h-8 w-full rounded-lg border border-gray-300 px-2 font-bold"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-bold text-gray-500">Price / Bdl (₹)</span>
                    <input
                      type="number"
                      min={1}
                      value={row.pricePerBundleInr}
                      onChange={(e) =>
                        updateRow(row.label, {
                          pricePerBundleInr: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="mt-0.5 h-8 w-full rounded-lg border border-gray-300 px-2 font-black text-orange-700"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-bold text-gray-500">Stock (Bdl) / MOQ</span>
                    <div className="mt-0.5 flex gap-1">
                      <input
                        type="number"
                        min={0}
                        value={row.stockBundles}
                        onChange={(e) =>
                          updateRow(row.label, {
                            stockBundles: parseInt(e.target.value || "0", 10) || 0
                          })
                        }
                        className="h-8 w-full rounded-lg border border-gray-300 px-2 font-bold"
                      />
                      <input
                        type="number"
                        min={1}
                        value={row.minOrderQuantity}
                        onChange={(e) =>
                          updateRow(row.label, {
                            minOrderQuantity: parseInt(e.target.value || "1", 10) || 1
                          })
                        }
                        className="h-8 w-14 rounded-lg border border-gray-300 px-1.5 text-center font-bold"
                        title="MOQ (bundles)"
                      />
                    </div>
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Desktop Matrix Table (md+) */}
        <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
          <table className="min-w-[780px] w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 font-extrabold uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2.5">Active</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">Pcs / Bdl</th>
                <th className="px-3 py-2.5">Wt / Bdl (kg)</th>
                <th className="px-3 py-2.5">Selling Price (₹/Bdl)</th>
                <th className="px-3 py-2.5">Eff. Rate (₹/Ton)</th>
                <th className="px-3 py-2.5">Stock (Bdl)</th>
                <th className="px-3 py-2.5">MOQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={row.isActive ? "bg-white" : "bg-gray-50/70 opacity-60"}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Sell ${row.label}`}
                      checked={row.isActive}
                      onChange={(e) => updateRow(row.label, { isActive: e.target.checked })}
                      className="h-4 w-4 accent-orange-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-black text-gray-900">{row.label}</div>
                    <div className="text-[10px] text-gray-500">{row.commonUse}</div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      disabled={!row.isActive}
                      value={row.piecesPerBundle}
                      onChange={(e) =>
                        updateRow(row.label, {
                          piecesPerBundle: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="h-8 w-16 rounded-lg border border-gray-300 px-2 font-bold disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      step="0.1"
                      disabled={!row.isActive}
                      value={row.approxWeightPerBundleKg}
                      onChange={(e) =>
                        updateRow(row.label, {
                          approxWeightPerBundleKg: parseFloat(e.target.value || "1") || 1
                        })
                      }
                      className="h-8 w-20 rounded-lg border border-gray-300 px-2 font-bold disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      disabled={!row.isActive}
                      value={row.pricePerBundleInr}
                      onChange={(e) =>
                        updateRow(row.label, {
                          pricePerBundleInr: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="h-8 w-24 rounded-lg border border-gray-300 px-2 font-black text-orange-700 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      disabled={!row.isActive}
                      value={row.pricePerTonInr}
                      onChange={(e) =>
                        updateRow(row.label, {
                          pricePerTonInr: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="h-8 w-24 rounded-lg border border-gray-300 px-2 font-bold disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      disabled={!row.isActive}
                      value={row.stockBundles}
                      onChange={(e) =>
                        updateRow(row.label, {
                          stockBundles: parseInt(e.target.value || "0", 10) || 0
                        })
                      }
                      className="h-8 w-20 rounded-lg border border-gray-300 px-2 font-bold disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      disabled={!row.isActive}
                      value={row.minOrderQuantity}
                      onChange={(e) =>
                        updateRow(row.label, {
                          minOrderQuantity: parseInt(e.target.value || "1", 10) || 1
                        })
                      }
                      className="h-8 w-16 rounded-lg border border-gray-300 px-2 font-bold disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Yard Logistics, Delivery Radius & Product Banner */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-800">
            <Truck size={14} className="text-orange-500" />
            <span>4. Yard Logistics &amp; Delivery Rules</span>
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500">
                Min Order (Tons)
              </label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={minOrderTons}
                onChange={(e) => setMinOrderTons(e.target.value)}
                className="mt-1 h-9 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500">
                Free Deliv. (Tons)
              </label>
              <Input
                type="number"
                min="0.1"
                step="0.5"
                value={freeDeliveryTons}
                onChange={(e) => setFreeDeliveryTons(e.target.value)}
                className="mt-1 h-9 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500">
                Hamali (₹ / Ton)
              </label>
              <Input
                type="number"
                min="0"
                step="50"
                value={loadingChargePerTon}
                onChange={(e) => setLoadingChargePerTon(e.target.value)}
                className="mt-1 h-9 text-xs font-bold"
              />
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-orange-900">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-orange-600" /> Delivery Radius (km)
              </span>
              <span>{Number(deliveryRadiusKm) || 25} km</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DELIVERY_RADIUS_PRESETS.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setDeliveryRadiusKm(String(km))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                    Number(deliveryRadiusKm) === km
                      ? "bg-orange-500 text-white"
                      : "border border-orange-200 bg-white text-gray-700"
                  )}
                >
                  {km} km
                </button>
              ))}
            </div>
            {!hasStoreCoords && storeCity ? (
              <p className="text-[10px] text-amber-800">
                Using city-level matching for {storeCity} until store GPS coordinates are saved.
              </p>
            ) : null}
          </div>
        </div>

        {/* Auto-Suggested Brand Banner / Custom Yard Photo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-800">
            <ShieldCheck size={14} className="text-orange-500" />
            <span>Brand Image &amp; Description</span>
          </h4>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <img
              src={imagePreview || selectedBrand.suggested_image_url}
              alt={selectedBrand.name}
              className="h-16 w-16 rounded-xl border border-gray-200 bg-white object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {imagePreview ? "Custom Yard Photo" : "Official Brand Default"}
              </span>
              <p className="mt-1 text-xs font-bold text-gray-900">
                {selectedBrand.name} ({selectedGrades.join(", ")})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:border-orange-400"
                >
                  <Upload size={11} /> Upload Custom
                </button>
                {imagePreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImageBase64(undefined);
                      setImagePreview(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600"
                  >
                    <X size={11} /> Reset
                  </button>
                ) : null}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageFileSelect}
            />
          </div>
          {imageError ? (
            <p className="text-xs font-semibold text-red-600">{imageError}</p>
          ) : null}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Optional yard note: e.g. Fresh mill batch with test certificate, same-day Kanta dispatch..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-orange-500"
          />
        </div>
      </section>

      {activeRowCount === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          Activate at least one TMT bar diameter before saving.
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || activeRowCount === 0}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {isSaving
            ? "Saving TMT Yard Catalog..."
            : editingListing
            ? "Update TMT Listing"
            : `Publish ${selectedGrades.length > 1 ? `${selectedGrades.length} Grade Listings` : "TMT Yard Listing"}`}
        </Button>
      </div>

      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={rawImage}
        onCropComplete={(cropped) => {
          setImageBase64(cropped);
          setImagePreview(cropped);
          setShowCropModal(false);
        }}
        onCancel={() => setShowCropModal(false)}
      />
    </form>
  );
}
