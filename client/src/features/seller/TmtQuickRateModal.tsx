import { useEffect, useMemo, useState } from "react";
import { Calculator, TrendingUp, X } from "lucide-react";
import type { SellerProductListing } from "../../services/api";
import {
  calcBundlePriceInr,
  getSizeExtraPerTon,
  type SellerTmtQuickRateInput
} from "../../types/tmt";

interface TmtQuickRateModalProps {
  listing: SellerProductListing | null;
  isSaving: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSave: (listingId: string, payload: SellerTmtQuickRateInput) => Promise<void> | void;
}

export function TmtQuickRateModal({
  listing,
  isSaving,
  errorMessage,
  onClose,
  onSave
}: TmtQuickRateModalProps) {
  const meta = listing?.product?.tmtMetadata;
  const variants = listing?.product?.variants ?? [];

  const [baseRate, setBaseRate] = useState<string>(
    String(
      meta?.base_rate_per_ton_inr ??
        Math.round((listing?.priceMinor ?? 6300000) / 100)
    )
  );
  const [gstIncluded, setGstIncluded] = useState<boolean>(
    meta?.logistics?.gst_included ?? true
  );

  useEffect(() => {
    setBaseRate(
      String(
        meta?.base_rate_per_ton_inr ??
          Math.round((listing?.priceMinor ?? 6300000) / 100)
      )
    );
    setGstIncluded(meta?.logistics?.gst_included ?? true);
  }, [listing?.id, listing?.priceMinor, meta?.base_rate_per_ton_inr, meta?.logistics?.gst_included]);

  const previewRows = useMemo(() => {
    const rate = Math.max(0, Number(baseRate) || 0);
    const e6 = meta?.logistics?.extra_6mm_per_ton_inr ?? 2000;
    const e8 = meta?.logistics?.extra_8mm_per_ton_inr ?? 800;
    const e8l = meta?.logistics?.extra_8mm_lite_per_ton_inr ?? -1000;

    return variants
      .filter((v) => v.is_active !== false)
      .slice(0, 6)
      .map((v) => {
        const extra = getSizeExtraPerTon(v.label, {
          extra6mm: e6,
          extra8mm: e8,
          extra8mmLite: e8l
        });
        const calc = calcBundlePriceInr(
          rate,
          extra,
          v.approx_weight_per_bundle_kg,
          gstIncluded
        );
        return {
          label: v.label,
          weightKg: v.approx_weight_per_bundle_kg,
          pricePerBundleInr: calc.pricePerBundleInr
        };
      });
  }, [baseRate, gstIncluded, meta, variants]);

  if (!listing) return null;

  const adjustRate = (delta: number) => {
    const next = Math.max(1000, (Number(baseRate) || 0) + delta);
    setBaseRate(String(next));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.round(Number(baseRate) || 0);
    if (parsed < 1000) return;
    await onSave(listing.id, {
      baseRatePerTonInr: parsed,
      gstIncluded
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Daily TMT Rate Update"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Quick Daily Rate Update
              </h3>
              <p className="text-xs font-medium text-gray-500">
                {listing.product.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick rate modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-gray-700">
                Today&apos;s Base Rate (₹ / Ton)
              </label>
              <button
                type="button"
                onClick={() => setGstIncluded((v) => !v)}
                className="text-[11px] font-bold text-orange-600 hover:underline"
              >
                {gstIncluded ? "Incl. 18% GST" : "Excl. GST (+18% applied)"}
              </button>
            </div>
            <input
              type="number"
              required
              min={1000}
              step="50"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 text-lg font-black text-gray-900 outline-none focus:border-orange-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[-500, -200, +200, +500].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => adjustRate(delta)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-700 hover:border-orange-400 hover:bg-orange-50"
                >
                  {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                </button>
              ))}
            </div>
          </div>

          {previewRows.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-gray-600">
                <Calculator size={12} className="text-orange-500" />
                Live Bundle Rate Preview
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {previewRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-gray-100"
                  >
                    <span className="font-extrabold text-gray-800">{row.label}</span>
                    <span className="font-black text-orange-700">
                      ₹{row.pricePerBundleInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-black text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {isSaving ? "Updating..." : "Update Today's Rate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
