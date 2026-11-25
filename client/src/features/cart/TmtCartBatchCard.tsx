import { Info, MapPin, Minus, Plus, Store, Trash2, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMoney } from "../../lib/utils";
import { computeTmtBatchTotals, type TmtCartBatch } from "../tmt/tmtCartStore";

interface TmtCartBatchCardProps {
  batch: TmtCartBatch;
  onUpdateLineQuantity: (batchId: string, label: string, bundles: number) => void;
  onRemoveBatch: (batchId: string) => void;
}

export function TmtCartBatchCard({
  batch,
  onUpdateLineQuantity,
  onRemoveBatch
}: TmtCartBatchCardProps) {
  const totals = computeTmtBatchTotals(batch);

  return (
    <section className="overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-sm">
      {/* Parent TMT Brand Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-gradient-to-r from-etukas-pink/75 to-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-etukas-red text-xs font-black text-white shadow-xs">
            TMT
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate text-sm font-black text-etukas-black sm:text-base">
                {batch.brandName} ({batch.grade})
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-etukas-red ring-1 ring-etukas-red/20">
                {batch.rodLengthMeters}m Standard
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Store size={11} className="text-orange-500" />
                {batch.storeName}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} className="text-etukas-red" />
                {batch.storeCity}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/categories/tmt-steel/${encodeURIComponent(
              batch.brandSlug
            )}?grade=${encodeURIComponent(batch.grade)}`}
            className="rounded-xl border border-etukas-red/30 bg-white px-3 py-1.5 text-xs font-bold text-etukas-red transition hover:bg-etukas-pink"
          >
            Edit Sizes
          </Link>
          <button
            type="button"
            onClick={() => onRemoveBatch(batch.id)}
            aria-label={`Remove ${batch.brandName} batch from cart`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-etukas-red"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Diameter Lines */}
      <div className="divide-y divide-gray-100 px-4">
        {batch.lines.map((line) => {
          const lineWeightTons = (
            (line.bundles * line.approxWeightPerBundleKg) /
            1000
          ).toFixed(2);
          const lineTotalMinor = line.bundles * line.pricePerBundleInr * 100;

          return (
            <div
              key={line.label}
              className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-etukas-black">
                    {line.label}
                  </span>
                  {line.isLite ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                      LITE
                    </span>
                  ) : null}
                  <span className="text-xs text-gray-500">• {line.commonUse}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {line.piecesPerBundle} Pcs/Bundle • approx.{" "}
                  {line.approxWeightPerBundleKg.toFixed(1)} kg •{" "}
                  <strong className="text-gray-800">
                    ₹{line.pricePerBundleInr.toLocaleString("en-IN")}/bdl
                  </strong>
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="inline-flex items-center">
                  <button
                    type="button"
                    aria-label={`Decrease ${line.label} bundles`}
                    onClick={() =>
                      onUpdateLineQuantity(batch.id, line.label, line.bundles - 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-l-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-etukas-pink hover:text-etukas-red"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="flex h-8 min-w-10 items-center justify-center border-y border-gray-200 bg-white px-2 text-xs font-black tabular-nums">
                    {line.bundles}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${line.label} bundles`}
                    onClick={() =>
                      onUpdateLineQuantity(batch.id, line.label, line.bundles + 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-r-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-etukas-pink hover:text-etukas-red"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                <div className="text-right">
                  <span className="block text-[11px] font-semibold text-gray-500">
                    {lineWeightTons} Tons
                  </span>
                  <span className="text-sm font-black tabular-nums text-etukas-black">
                    {formatMoney(lineTotalMinor)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Vehicle Recommendation + Weighbridge Slip Note */}
      <div className="space-y-2 border-t border-gray-100 bg-gray-50/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-extrabold text-etukas-black ring-1 ring-gray-200">
              {totals.totalBundles} Bundles • {totals.totalTons.toFixed(2)} Tons
            </span>
            {totals.vehicle ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-200">
                <Truck size={12} /> Fit: {totals.vehicle.label}
              </span>
            ) : null}
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Brand Subtotal: </span>
            <span className="text-base font-black text-etukas-red">
              {formatMoney(totals.totalMinor)}
            </span>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Info size={12} className="shrink-0 text-etukas-red" />
          <span>{batch.weighbridgeNote}</span>
        </p>
      </div>
    </section>
  );
}
