import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Info,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  ADDRESS_CHANGE_EVENT,
  getDeliveryLabel,
  getSelectedAddress
} from "../../location/locationStore";
import {
  HOUSE_STEEL_ESTIMATES,
  recommendTmtVehicle,
  STANDARD_TMT_LENGTH_FEET,
  STANDARD_TMT_LENGTH_METERS,
  TMT_WEIGHBRIDGE_NOTE,
  type HouseBhkKey,
  type TmtDiameterLabel,
  type TmtGrade,
  type TmtUom,
  type TmtVariant
} from "../../../types/tmt";
import { TmtBrandBadge } from "../components/TmtBrandBadge";
import { TmtBuyerGuideDrawer } from "../components/TmtBuyerGuideDrawer";
import { upsertTmtCartBatch } from "../tmtCartStore";
import { useTmtBrandDetail } from "../useTmtCatalog";
import { cn } from "../../../lib/utils";

export function TmtOrderMatrixPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeAddress, setActiveAddress] = useState(getSelectedAddress);
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);
  const [uom, setUom] = useState<TmtUom>("bundles");
  const [quantitiesByLabel, setQuantitiesByLabel] = useState<Record<string, number>>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [appliedPresetLabel, setAppliedPresetLabel] = useState<string | null>(null);

  const requestedGrade = searchParams.get("grade") as TmtGrade | null;
  const autofillParam = searchParams.get("autofill") as HouseBhkKey | null;

  useEffect(() => {
    const syncLocation = () => {
      setActiveAddress(getSelectedAddress());
      setDeliveryLabel(getDeliveryLabel());
    };
    window.addEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
    window.addEventListener("storage", syncLocation);
    return () => {
      window.removeEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
      window.removeEventListener("storage", syncLocation);
    };
  }, []);

  const { brand, isLoading } = useTmtBrandDetail(brandSlug, {
    grade: requestedGrade ?? undefined,
    city: activeAddress?.city || activeAddress?.district,
    latitude: activeAddress?.latitude,
    longitude: activeAddress?.longitude
  });

  const activeGrade: TmtGrade =
    requestedGrade && brand?.available_grades.includes(requestedGrade)
      ? requestedGrade
      : brand?.default_grade ?? "Fe 500D";

  const variants: TmtVariant[] = useMemo(() => {
    if (!brand) return [];
    return brand.variants.filter((v) => v.is_active !== false);
  }, [brand]);

  // Apply ?autofill=1bhk|2bhk|3bhk if passed from Buyer Guide / Brand Selection
  useEffect(() => {
    if (!autofillParam || !brand || variants.length === 0) return;
    const preset = HOUSE_STEEL_ESTIMATES.find((e) => e.key === autofillParam);
    if (!preset) return;

    const nextQuantities: Record<string, number> = {};
    for (const v of variants) {
      const rec = preset.recommendedBundles[v.label as TmtDiameterLabel];
      if (rec && rec > 0) {
        nextQuantities[v.label] = rec;
      }
    }
    setQuantitiesByLabel(nextQuantities);
    setAppliedPresetLabel(preset.key.toUpperCase());
  }, [autofillParam, brand, variants]);

  const setVariantBundles = (label: string, bundles: number, maxStock?: number) => {
    const clamped = Math.max(0, Math.round(bundles));
    const finalQty =
      typeof maxStock === "number" && maxStock > 0 ? Math.min(clamped, maxStock) : clamped;
    setQuantitiesByLabel((prev) => ({
      ...prev,
      [label]: finalQty
    }));
    setCartNotice(null);
  };

  const setVariantTons = (variant: TmtVariant, tonsInput: number) => {
    if (!Number.isFinite(tonsInput) || tonsInput <= 0) {
      setVariantBundles(variant.label, 0, variant.stock_bundles);
      return;
    }
    const bundlesFromTons = Math.max(
      1,
      Math.round((tonsInput * 1000) / Math.max(1, variant.approx_weight_per_bundle_kg))
    );
    setVariantBundles(variant.label, bundlesFromTons, variant.stock_bundles);
  };

  const handleGradeChange = (grade: TmtGrade) => {
    const next = new URLSearchParams(searchParams);
    next.set("grade", grade);
    setSearchParams(next, { replace: true });
    setCartNotice(null);
  };

  const handleAutoFill = (
    bundles: Partial<Record<TmtDiameterLabel, number>>,
    bhkKey: HouseBhkKey
  ) => {
    const nextQuantities: Record<string, number> = {};
    for (const v of variants) {
      const rec = bundles[v.label as TmtDiameterLabel];
      if (rec && rec > 0) {
        nextQuantities[v.label] = rec;
      }
    }
    setQuantitiesByLabel(nextQuantities);
    setAppliedPresetLabel(bhkKey.toUpperCase());
    setCartNotice(null);
  };

  const totals = useMemo(() => {
    let selectedRows = 0;
    let totalBundles = 0;
    let totalWeightKg = 0;
    let grandTotalInr = 0;

    for (const v of variants) {
      const qty = Math.max(0, quantitiesByLabel[v.label] ?? 0);
      if (qty <= 0) continue;
      selectedRows += 1;
      totalBundles += qty;
      totalWeightKg += qty * v.approx_weight_per_bundle_kg;
      grandTotalInr += qty * v.price_per_bundle_inr;
    }

    const totalTons = Number((totalWeightKg / 1000).toFixed(2));
    const vehicle = recommendTmtVehicle(totalTons);

    return {
      selectedRows,
      totalBundles,
      totalWeightKg: Number(totalWeightKg.toFixed(1)),
      totalTons,
      grandTotalInr,
      vehicle
    };
  }, [variants, quantitiesByLabel]);

  const handleBatchAddToCart = () => {
    if (!brand || totals.totalBundles === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const batch = upsertTmtCartBatch({
        brand,
        grade: activeGrade,
        uomPreference: uom,
        quantitiesByLabel,
        variants
      });

      if (batch) {
        setCartNotice(
          `Added ${totals.totalBundles} bundles (${totals.totalTons.toFixed(
            2
          )} Tons) of ${brand.name} ${activeGrade} to your cart.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !brand) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </main>
    );
  }

  if (!brand) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-black text-etukas-black">TMT Brand Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t find that steel brand. Browse all verified Primary &amp; Regional TMT brands below.
        </p>
        <Link
          to="/categories/tmt-steel"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
        >
          <ArrowLeft size={15} /> Back to TMT Brands
        </Link>
      </main>
    );
  }

  const rodFeet = Math.round((brand.rod_length_meters / 12) * STANDARD_TMT_LENGTH_FEET);

  return (
    <main className="min-h-screen bg-gray-50/70 pb-52 md:pb-32">
      {/* Top Breadcrumb + Brand Context Header */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/categories/tmt-steel"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 transition hover:text-etukas-red"
            >
              <ArrowLeft size={14} />
              <span>All TMT Brands</span>
            </Link>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
              <MapPin size={12} className="text-etukas-red" />
              <span>{deliveryLabel}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <TmtBrandBadge brand={brand} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-etukas-black sm:text-2xl">
                    {brand.name}
                  </h1>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                      brand.tier === "primary"
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                    )}
                  >
                    {brand.tier === "primary" ? "Primary Mill" : "Regional Mill"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-700">
                    {brand.rod_length_meters || STANDARD_TMT_LENGTH_METERS}m ({rodFeet} ft) Standard
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-gray-500">
                  {brand.manufacturer} •{" "}
                  {brand.billing_mode === "theoretical"
                    ? "IS 1786 Theoretical Weight"
                    : "Actual Weighbridge (Kanta) Billing"}
                  {brand.store_name ? ` • Yard: ${brand.store_name}` : ""}
                </p>

                {/* Grade Selector Pills */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-400">Grade:</span>
                  {brand.available_grades.map((grade) => {
                    const selected = grade === activeGrade;
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => handleGradeChange(grade)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-extrabold transition",
                          selected
                            ? "border-etukas-red bg-etukas-red text-white shadow-xs"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-etukas-red/50"
                        )}
                      >
                        {grade}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Controls: Buyer Guide Drawer Trigger + UOM Toggle */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-etukas-red/30 bg-etukas-pink/70 px-3.5 py-2 text-xs font-extrabold text-etukas-red transition hover:bg-etukas-pink"
              >
                <Calculator size={14} />
                <span>Buyer Guide &amp; Estimator</span>
              </button>

              {/* UOM Toggle (Bundles default | Metric Tons) */}
              <div
                role="group"
                aria-label="Order unit of measurement"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-100 p-1"
              >
                <span className="px-2 text-[11px] font-bold text-gray-500">
                  Order by:
                </span>
                <button
                  type="button"
                  onClick={() => setUom("bundles")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-extrabold transition",
                    uom === "bundles"
                      ? "bg-white text-etukas-red shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Bundles
                </button>
                <button
                  type="button"
                  onClick={() => setUom("tons")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-extrabold transition",
                    uom === "tons"
                      ? "bg-white text-etukas-red shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Metric Tons
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 lg:px-6">
        {/* Preset / Cart Confirmation Banners */}
        {appliedPresetLabel ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-700 shrink-0" />
              <span>
                <strong>{appliedPresetLabel} House Steel Estimate</strong> pre-filled below. Adjust any diameter before adding to cart.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuantitiesByLabel({});
                setAppliedPresetLabel(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <RotateCcw size={11} /> Clear All
            </button>
          </div>
        ) : null}

        {cartNotice ? (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-xs sm:flex-row sm:items-center">
            <div className="flex items-start gap-2.5 text-emerald-950">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-extrabold sm:text-sm">{cartNotice}</p>
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  {TMT_WEIGHBRIDGE_NOTE}
                </p>
              </div>
            </div>
            <Link
              to="/cart"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800"
            >
              <ShoppingCart size={14} />
              <span>View Cart &amp; Checkout</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : null}

        {/* Yard Logistics & Weighbridge Note Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[11px] text-gray-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
              <ShieldCheck size={13} className="text-etukas-red" />
              All rates include 18% GST
            </span>
            {brand.logistics ? (
              <>
                <span>
                  Min Order: <strong>{brand.logistics.min_order_tons} Tons</strong>
                </span>
                <span>
                  Free Delivery above{" "}
                  <strong>{brand.logistics.free_delivery_tons} Tons</strong>
                </span>
              </>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Info size={12} className="text-etukas-red shrink-0" />
            {TMT_WEIGHBRIDGE_NOTE}
          </span>
        </div>

        {/* ================= MOBILE MULTI-SIZE SELECTOR CARDS (< md) ================= */}
        <div className="space-y-3 md:hidden">
          {variants.map((v) => {
            const bundles = quantitiesByLabel[v.label] ?? 0;
            const tonsValue = Number(
              ((bundles * v.approx_weight_per_bundle_kg) / 1000).toFixed(2)
            );
            const rowSubtotalInr = bundles * v.price_per_bundle_inr;
            const isSelected = bundles > 0;

            return (
              <article
                key={v.id}
                className={cn(
                  "rounded-2xl border bg-white p-3.5 shadow-xs transition-all",
                  isSelected
                    ? "border-etukas-red/60 ring-2 ring-etukas-red/10"
                    : "border-gray-200/90"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-base font-black text-etukas-black">
                        {v.label}
                      </h2>
                      {v.is_lite ? (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          LITE
                        </span>
                      ) : null}
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                        {v.common_use}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      {v.pieces_per_bundle} Pcs/Bundle • approx.{" "}
                      <strong className="text-gray-800">
                        {v.approx_weight_per_bundle_kg.toFixed(1)} kg
                      </strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black tabular-nums text-etukas-black">
                      ₹
                      {(uom === "bundles"
                        ? v.price_per_bundle_inr
                        : v.price_per_ton_inr
                      ).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] font-semibold text-gray-500">
                      / {uom === "bundles" ? "Bundle" : "Ton"} (incl. GST)
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                  {/* Stepper + Numeric Input */}
                  {uom === "bundles" ? (
                    <div className="flex items-center">
                      <button
                        type="button"
                        aria-label={`Decrease ${v.label} bundles`}
                        onClick={() =>
                          setVariantBundles(v.label, bundles - 1, v.stock_bundles)
                        }
                        disabled={bundles <= 0}
                        className="flex h-9 w-9 items-center justify-center rounded-l-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={v.stock_bundles}
                        aria-label={`${v.label} bundle quantity`}
                        value={bundles}
                        onChange={(e) =>
                          setVariantBundles(
                            v.label,
                            parseInt(e.target.value || "0", 10) || 0,
                            v.stock_bundles
                          )
                        }
                        className="h-9 w-16 border-y border-gray-200 bg-white text-center text-sm font-extrabold tabular-nums text-etukas-black outline-none focus:bg-red-50/40"
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${v.label} bundles`}
                        onClick={() =>
                          setVariantBundles(v.label, bundles + 1, v.stock_bundles)
                        }
                        disabled={bundles >= v.stock_bundles}
                        className="flex h-9 w-9 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-label={`Decrease ${v.label} metric tons`}
                          onClick={() => setVariantTons(v, Math.max(0, tonsValue - 0.5))}
                          disabled={bundles <= 0}
                          className="flex h-9 w-8 items-center justify-center rounded-l-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.1"
                          aria-label={`${v.label} metric tons`}
                          value={tonsValue || ""}
                          placeholder="0.0"
                          onChange={(e) =>
                            setVariantTons(v, parseFloat(e.target.value || "0"))
                          }
                          className="h-9 w-16 border-y border-gray-200 bg-white px-1 text-center text-sm font-extrabold tabular-nums text-etukas-black outline-none focus:bg-red-50/40"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${v.label} metric tons`}
                          onClick={() => setVariantTons(v, tonsValue + 0.5)}
                          disabled={bundles >= v.stock_bundles}
                          className="flex h-9 w-8 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500">
                        T ({bundles} bdl)
                      </span>
                    </div>
                  )}

                  {/* Row Subtotal */}
                  <div className="text-right">
                    <span className="block text-[10px] font-semibold text-gray-400">
                      {isSelected
                        ? `${tonsValue.toFixed(2)} T (${bundles} bdl)`
                        : `Stock: ${v.stock_bundles} bdl`}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums",
                        isSelected ? "text-etukas-red" : "text-gray-400"
                      )}
                    >
                      ₹{rowSubtotalInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ================= DESKTOP MULTI-SIZE MATRIX TABLE (md+) ================= */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs md:block">
          <table className="w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-extrabold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-3.5">Diameter &amp; Use</th>
                <th className="px-5 py-3.5">Bundle Specs (12m / 40ft)</th>
                <th className="px-5 py-3.5">
                  Rate ({uom === "bundles" ? "₹ / Bundle" : "₹ / Ton"} incl. GST)
                </th>
                <th className="px-5 py-3.5">
                  Quantity ({uom === "bundles" ? "Bundles" : "Metric Tons"})
                </th>
                <th className="px-5 py-3.5 text-right">Est. Weight</th>
                <th className="px-5 py-3.5 text-right">Row Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants.map((v) => {
                const bundles = quantitiesByLabel[v.label] ?? 0;
                const rowWeightKg = bundles * v.approx_weight_per_bundle_kg;
                const tonsValue = Number((rowWeightKg / 1000).toFixed(2));
                const rowSubtotalInr = bundles * v.price_per_bundle_inr;
                const isSelected = bundles > 0;

                return (
                  <tr
                    key={v.id}
                    className={cn(
                      "transition-colors",
                      isSelected ? "bg-etukas-pink/35" : "hover:bg-gray-50/80"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-etukas-black">
                          {v.label}
                        </span>
                        {v.is_lite ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                            LITE
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        {v.common_use}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-gray-700">
                      <div className="font-bold text-gray-900">
                        {v.pieces_per_bundle} Pcs/Bundle • approx.{" "}
                        {v.approx_weight_per_bundle_kg.toFixed(1)} kg
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {v.weight_per_meter_kg.toFixed(3)} kg/m • Stock:{" "}
                        {v.stock_bundles} bundles
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-black tabular-nums text-etukas-black">
                        ₹
                        {(uom === "bundles"
                          ? v.price_per_bundle_inr
                          : v.price_per_ton_inr
                        ).toLocaleString("en-IN")}
                        <span className="text-xs font-semibold text-gray-500">
                          {" "}
                          / {uom === "bundles" ? "Bundle" : "Ton"}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {uom === "bundles"
                          ? `₹${v.price_per_ton_inr.toLocaleString("en-IN")} / Ton`
                          : `₹${v.price_per_bundle_inr.toLocaleString("en-IN")} / Bundle`}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {uom === "bundles" ? (
                        <div className="inline-flex items-center">
                          <button
                            type="button"
                            aria-label={`Decrease ${v.label} bundles`}
                            onClick={() =>
                              setVariantBundles(v.label, bundles - 1, v.stock_bundles)
                            }
                            disabled={bundles <= 0}
                            className="flex h-9 w-9 items-center justify-center rounded-l-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={v.stock_bundles}
                            aria-label={`${v.label} bundle quantity`}
                            value={bundles}
                            onChange={(e) =>
                              setVariantBundles(
                                v.label,
                                parseInt(e.target.value || "0", 10) || 0,
                                v.stock_bundles
                              )
                            }
                            className="h-9 w-16 border-y border-gray-200 bg-white text-center text-sm font-extrabold tabular-nums text-etukas-black outline-none focus:bg-red-50/40"
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${v.label} bundles`}
                            onClick={() =>
                              setVariantBundles(v.label, bundles + 1, v.stock_bundles)
                            }
                            disabled={bundles >= v.stock_bundles}
                            className="flex h-9 w-9 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <div className="inline-flex items-center">
                            <button
                              type="button"
                              aria-label={`Decrease ${v.label} metric tons`}
                              onClick={() => setVariantTons(v, Math.max(0, tonsValue - 0.5))}
                              disabled={bundles <= 0}
                              className="flex h-9 w-9 items-center justify-center rounded-l-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.1"
                              aria-label={`${v.label} metric tons`}
                              value={tonsValue || ""}
                              placeholder="0.0"
                              onChange={(e) =>
                                setVariantTons(v, parseFloat(e.target.value || "0"))
                              }
                              className="h-9 w-16 border-y border-gray-200 bg-white px-1 text-center text-sm font-extrabold tabular-nums text-etukas-black outline-none focus:bg-red-50/40"
                            />
                            <button
                              type="button"
                              aria-label={`Increase ${v.label} metric tons`}
                              onClick={() => setVariantTons(v, tonsValue + 0.5)}
                              disabled={bundles >= v.stock_bundles}
                              className="flex h-9 w-9 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-etukas-pink hover:text-etukas-red disabled:opacity-40"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-gray-500">
                            T ({bundles} bdl)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right text-xs tabular-nums">
                      <span className="font-bold text-gray-900">
                        {tonsValue.toFixed(2)} Tons
                      </span>
                      <div className="text-[11px] text-gray-400">
                        {rowWeightKg.toFixed(1)} kg
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={cn(
                          "text-base font-black tabular-nums",
                          isSelected ? "text-etukas-red" : "text-gray-400"
                        )}
                      >
                        ₹{rowSubtotalInr.toLocaleString("en-IN")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Buyer Guide Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs">
          <span className="text-gray-600">
            Need help verifying stirrup vs slab sizes or grade selection?
          </span>
          <Link
            to="/guides/tmt-bars"
            className="inline-flex items-center gap-1.5 font-extrabold text-etukas-red hover:underline"
          >
            <BookOpen size={14} />
            <span>Open Standalone TMT Buyer Guide</span>
          </Link>
        </div>
      </div>

      {/* ================= LIVE STICKY SUMMARY & VEHICLE FIT BAR ================= */}
      <div
        role="region"
        aria-label="Live TMT order summary"
        className="fixed inset-x-0 bottom-[calc(3.55rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-red-900/40 bg-gradient-to-r from-[#8f1419] via-[#C52228] to-[#9e141a] text-white shadow-[0_-6px_24px_rgba(0,0,0,0.22)] md:bottom-0 md:pb-safe"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 md:flex-row md:items-center md:justify-between lg:px-6">
          {/* Metrics Row: Total Weight, Vehicle Fit, Grand Total */}
          <div className="grid grid-cols-3 items-center gap-2 md:flex md:items-center md:gap-6">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-red-100/80">
                Total Weight
              </span>
              <strong className="text-sm font-black tabular-nums sm:text-lg">
                {totals.totalTons.toFixed(2)} Tons
              </strong>
              <span className="hidden text-[11px] text-red-100/80 sm:inline">
                {" "}
                ({totals.totalBundles} bdl)
              </span>
            </div>

            <div className="border-l border-white/20 pl-2 md:pl-5">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-100/80">
                <Truck size={11} /> Vehicle Fit
              </span>
              <strong className="line-clamp-1 text-xs font-extrabold text-amber-200 sm:text-sm">
                {totals.vehicle ? totals.vehicle.label : "Select sizes"}
              </strong>
            </div>

            <div className="border-l border-white/20 pl-2 text-right md:pl-5 md:text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-red-100/80">
                Grand Total
              </span>
              <strong className="text-sm font-black tabular-nums sm:text-xl">
                ₹{totals.grandTotalInr.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={totals.totalBundles === 0 || isSubmitting}
              onClick={() => void handleBatchAddToCart()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-md transition sm:text-sm md:w-auto",
                totals.totalBundles === 0
                  ? "cursor-not-allowed bg-white/25 text-white/70"
                  : "bg-white text-etukas-red hover:bg-amber-50 active:scale-[0.98]"
              )}
            >
              <span>
                {isSubmitting
                  ? "Adding to Cart..."
                  : totals.totalBundles === 0
                  ? "Select Sizes to Order"
                  : `Add Selected to Cart (${totals.selectedRows} sizes)`}
              </span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <TmtBuyerGuideDrawer
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentBrandSlug={brand.slug}
        currentBrandName={brand.name}
        onAutoFill={(bundles, bhk) => handleAutoFill(bundles, bhk)}
      />
    </main>
  );
}
