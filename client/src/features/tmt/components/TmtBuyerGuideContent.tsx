import { useState } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  calcWeightPerMeterKg,
  calcWeightPerRodKg,
  HOUSE_STEEL_ESTIMATES,
  STANDARD_TMT_LENGTH_METERS,
  STANDARD_TMT_SIZE_SPECS,
  TMT_GRADE_COMPARISONS,
  TMT_MASTER_BRANDS,
  type HouseBhkKey,
  type TmtDiameterLabel
} from "../../../types/tmt";
import { cn } from "../../../lib/utils";

interface TmtBuyerGuideContentProps {
  /** Optional active brand slug when opened from the Order Matrix page */
  currentBrandSlug?: string;
  currentBrandName?: string;
  /** Called when user clicks "Auto-Fill Sizes in Order" */
  onAutoFill?: (
    bundles: Partial<Record<TmtDiameterLabel, number>>,
    bhkKey: HouseBhkKey,
    targetBrandSlug: string
  ) => void;
  compact?: boolean;
}

const STRUCTURAL_GUIDE_CARDS = [
  {
    sizes: "6mm & 8mm",
    role: "Stirrups & Rings",
    detail: "Binds main column/beam bars together, prevents buckling, and distributes slab shrinkage stress.",
    badge: "25% – 28% of House Steel",
    accent: "border-amber-200 bg-amber-50/70 text-amber-900",
    pill: "bg-amber-600 text-white"
  },
  {
    sizes: "10mm",
    role: "Roof Slabs & Lintels",
    detail: "Primary reinforcement mesh for 4.5–5 inch residential roof slabs, chajjas, and door lintels.",
    badge: "28% – 32% of House Steel",
    accent: "border-sky-200 bg-sky-50/70 text-sky-900",
    pill: "bg-sky-700 text-white"
  },
  {
    sizes: "12mm & 16mm",
    role: "Columns & Main Beams",
    detail: "Carries vertical load from upper floors down to isolated footings and plinth beams.",
    badge: "40% – 50% of House Steel",
    accent: "border-red-200 bg-etukas-pink/70 text-etukas-black",
    pill: "bg-etukas-red text-white"
  }
] as const;

export function TmtBuyerGuideContent({
  currentBrandSlug,
  currentBrandName,
  onAutoFill,
  compact = false
}: TmtBuyerGuideContentProps) {
  const [selectedBhk, setSelectedBhk] = useState<HouseBhkKey>("2bhk");
  const [targetBrandSlug, setTargetBrandSlug] = useState<string>(
    currentBrandSlug || "tata-tiscon"
  );
  const [showWeightChart, setShowWeightChart] = useState(false);

  const activeEstimate =
    HOUSE_STEEL_ESTIMATES.find((e) => e.key === selectedBhk) ??
    HOUSE_STEEL_ESTIMATES[1];

  const handleAutoFillClick = () => {
    const chosenSlug = currentBrandSlug || targetBrandSlug || "tata-tiscon";
    onAutoFill?.(activeEstimate.recommendedBundles, selectedBhk, chosenSlug);
  };

  return (
    <div className={cn("space-y-6", compact ? "text-xs" : "")}>
      {/* 1. Quick House Steel Estimator (Crimson-to-Navy Gradient Card) */}
      <section
        aria-label="Quick House Steel Estimator"
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#C52228] via-[#7a1632] to-[#0f172a] p-4 text-white shadow-lg sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-200 backdrop-blur-sm">
              <Sparkles size={11} /> Quick House Steel Estimator
            </span>
            <h2 className="mt-1.5 text-lg font-black tracking-tight sm:text-xl">
              Estimate &amp; Auto-Fill TMT Steel for Your Home
            </h2>
            <p className="mt-0.5 text-xs text-white/80">
              Select your house size to see IS 1786 tonnage and bundle breakdown by diameter
            </p>
          </div>

          {/* 1 BHK / 2 BHK / 3 BHK Tabs */}
          <div
            role="tablist"
            aria-label="House size selector"
            className="inline-flex self-start rounded-xl bg-black/30 p-1 backdrop-blur-sm"
          >
            {HOUSE_STEEL_ESTIMATES.map((preset) => {
              const isSelected = preset.key === selectedBhk;
              return (
                <button
                  key={preset.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedBhk(preset.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-all",
                    isSelected
                      ? "bg-white text-etukas-red shadow-sm"
                      : "text-white/80 hover:text-white"
                  )}
                >
                  {preset.key.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimate Highlight Strip */}
        <div className="mt-4 grid gap-3 rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm sm:grid-cols-[1.2fr_2fr] sm:items-center sm:p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
              {activeEstimate.title} • {activeEstimate.areaSqFt}
            </p>
            <div className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {selectedBhk.toUpperCase()}:{" "}
              <span className="text-amber-300">{activeEstimate.tonnageRange}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/80">
              {activeEstimate.summary}
            </p>
          </div>

          {/* Diameter Breakdown */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {activeEstimate.breakdown.map((row) => (
              <div
                key={row.diameterGroup}
                className="rounded-xl border border-white/15 bg-slate-950/45 p-2.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold text-amber-300">
                    {row.diameterGroup}
                  </span>
                  <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {row.sharePercent}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white">
                  {row.estimatedTons}
                </p>
                <p className="mt-0.5 text-[10px] text-white/70">{row.application}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar: Optional Brand Selector + Auto-Fill Button */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {!currentBrandSlug ? (
            <label className="flex items-center gap-2 text-xs text-white/90">
              <span className="shrink-0 font-bold">Order Brand:</span>
              <select
                value={targetBrandSlug}
                onChange={(e) => setTargetBrandSlug(e.target.value)}
                className="rounded-xl border border-white/25 bg-slate-950/75 px-3 py-2 text-xs font-bold text-white outline-none focus:border-amber-300"
              >
                {TMT_MASTER_BRANDS.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name} (₹{b.base_rate_per_ton_inr.toLocaleString("en-IN")}/T)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
              <CheckCircle2 size={14} className="text-emerald-300" />
              <span>
                Pre-fills {selectedBhk.toUpperCase()} bundle quantities for{" "}
                <strong>{currentBrandName || "selected brand"}</strong>
              </span>
            </div>
          )}

          {onAutoFill ? (
            <button
              type="button"
              onClick={handleAutoFillClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-etukas-red shadow-md transition hover:bg-amber-50 active:scale-[0.98] sm:text-sm"
            >
              <span>Auto-Fill Sizes in Order</span>
              <ArrowRight size={15} />
            </button>
          ) : null}
        </div>
      </section>

      {/* 2. Visual Structural Size Guide */}
      <section aria-label="Visual Structural Size Guide" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-etukas-black sm:text-lg">
              <Building2 size={18} className="text-etukas-red" />
              <span>Visual Structural Size Guide</span>
            </h3>
            <p className="text-xs text-gray-500">
              Where each TMT diameter goes in your house frame (12m / 40ft standard rods)
            </p>
          </div>
          <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700 sm:inline-flex">
            IS 1786 Standard
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_1.4fr]">
          {/* Architectural Structural Frame SVG Diagram */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-xs">
            <svg
              viewBox="0 0 360 215"
              className="w-full h-auto"
              role="img"
              aria-label="House structural steel reinforcement diagram mapping 6mm & 8mm to stirrups, 10mm to roof slabs, and 12mm & 16mm to columns and beams"
            >
              {/* Ground / Plinth */}
              <rect x="16" y="182" width="328" height="12" rx="4" fill="#cbd5e1" />
              {/* Footing Pads */}
              <rect x="34" y="176" width="44" height="16" rx="3" fill="#475569" />
              <rect x="158" y="176" width="44" height="16" rx="3" fill="#475569" />
              <rect x="282" y="176" width="44" height="16" rx="3" fill="#475569" />

              {/* Main Vertical Columns (12mm & 16mm) */}
              <rect x="46" y="54" width="20" height="124" rx="2" fill="#fee2e2" stroke="#C52228" strokeWidth="2" />
              <rect x="170" y="54" width="20" height="124" rx="2" fill="#fee2e2" stroke="#C52228" strokeWidth="2" />
              <rect x="294" y="54" width="20" height="124" rx="2" fill="#fee2e2" stroke="#C52228" strokeWidth="2" />

              {/* Column Vertical Rebar Lines */}
              <line x1="52" y1="58" x2="52" y2="174" stroke="#991b1b" strokeWidth="2" />
              <line x1="60" y1="58" x2="60" y2="174" stroke="#991b1b" strokeWidth="2" />
              <line x1="176" y1="58" x2="176" y2="174" stroke="#991b1b" strokeWidth="2" />
              <line x1="184" y1="58" x2="184" y2="174" stroke="#991b1b" strokeWidth="2" />
              <line x1="300" y1="58" x2="300" y2="174" stroke="#991b1b" strokeWidth="2" />
              <line x1="308" y1="58" x2="308" y2="174" stroke="#991b1b" strokeWidth="2" />

              {/* Stirrups / Rings (6mm & 8mm) */}
              {[72, 90, 108, 126, 144, 162].map((y) => (
                <g key={y}>
                  <rect x="48" y={y} width="16" height="4" rx="1.5" fill="#d97706" />
                  <rect x="172" y={y} width="16" height="4" rx="1.5" fill="#d97706" />
                  <rect x="296" y={y} width="16" height="4" rx="1.5" fill="#d97706" />
                </g>
              ))}

              {/* Roof Slab Mesh (10mm) */}
              <rect x="28" y="34" width="304" height="22" rx="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
              <line x1="36" y1="42" x2="324" y2="42" stroke="#0369a1" strokeWidth="1.8" strokeDasharray="6 3" />
              <line x1="36" y1="49" x2="324" y2="49" stroke="#0369a1" strokeWidth="1.8" />

              {/* Callout Labels */}
              <rect x="92" y="8" width="176" height="22" rx="11" fill="#0369a1" />
              <text x="180" y="22.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                10mm • Roof Slabs &amp; Lintels
              </text>

              <rect x="74" y="78" width="90" height="32" rx="8" fill="#d97706" />
              <text x="119" y="92" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">
                6mm &amp; 8mm
              </text>
              <text x="119" y="104" textAnchor="middle" fill="#fef3c7" fontSize="8.5" fontWeight="700">
                Stirrups &amp; Rings
              </text>

              <rect x="198" y="122" width="92" height="34" rx="8" fill="#C52228" />
              <text x="244" y="137" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">
                12mm &amp; 16mm
              </text>
              <text x="244" y="149" textAnchor="middle" fill="#fee2e2" fontSize="8.5" fontWeight="700">
                Columns &amp; Beams
              </text>
            </svg>

            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Info size={13} className="shrink-0 text-etukas-red" />
              <span>
                Always confirm bar diameters with your structural engineer&apos;s Bar Bending Schedule (BBS).
              </span>
            </p>
          </div>

          {/* 3 Structural Role Cards */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {STRUCTURAL_GUIDE_CARDS.map((card) => (
              <div
                key={card.sizes}
                className={cn(
                  "rounded-2xl border p-3.5 transition-shadow hover:shadow-sm",
                  card.accent
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-lg px-2.5 py-0.5 text-xs font-black", card.pill)}>
                      {card.sizes}
                    </span>
                    <span className="text-sm font-extrabold">{card.role}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                    {card.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed opacity-90">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Grade Comparison Cards (Fe 500D vs Fe 550D vs CRS) */}
      <section aria-label="TMT Grade Comparison" className="space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-extrabold text-etukas-black sm:text-lg">
            <ShieldCheck size={18} className="text-etukas-red" />
            <span>TMT Grade Comparison: Fe 500D vs Fe 550D vs CRS</span>
          </h3>
          <p className="text-xs text-gray-500">
            Choose the right strength, seismic ductility, and rust protection for your site
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {TMT_GRADE_COMPARISONS.map((g) => (
            <article
              key={g.grade}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-etukas-pink px-2.5 py-1 text-xs font-black text-etukas-red">
                    <Award size={13} /> {g.grade}
                  </span>
                  <span className="text-[11px] font-bold text-gray-500">
                    {g.priceIndicator}
                  </span>
                </div>
                <h4 className="mt-2.5 text-sm font-extrabold text-etukas-black">
                  {g.headline}
                </h4>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2 border-b border-gray-100 pb-1">
                    <dt className="text-gray-500">Yield Strength</dt>
                    <dd className="font-bold text-gray-900">{g.yieldStrengthMpa}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-gray-100 pb-1">
                    <dt className="text-gray-500">Elongation</dt>
                    <dd className="font-bold text-gray-900">{g.elongationPercent}</dd>
                  </div>
                  <div className="pt-0.5">
                    <dt className="text-[11px] font-bold text-gray-700">Seismic &amp; Rust Safety</dt>
                    <dd className="mt-0.5 text-[11px] leading-relaxed text-gray-600">
                      {g.seismicSafety}. {g.corrosionProtection}.
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-3 flex flex-wrap gap-1 border-t border-gray-100 pt-2.5">
                {g.bestFor.map((use) => (
                  <span
                    key={use}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700"
                  >
                    {use}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Collapsible IS 1786 Weight & Bundle Reference Table */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowWeightChart((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-etukas-red" />
            <div>
              <p className="text-xs font-extrabold text-etukas-black sm:text-sm">
                IS 1786 Weight &amp; Bundle Reference Chart (D² / 162)
              </p>
              <p className="text-[11px] text-gray-500">
                Standard {STANDARD_TMT_LENGTH_METERS}m (40ft) rod weights &amp; pieces/bundle
              </p>
            </div>
          </div>
          {showWeightChart ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showWeightChart ? (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="min-w-[540px] w-full text-left text-xs">
              <thead className="bg-gray-50 font-bold text-gray-700">
                <tr>
                  <th className="px-4 py-2.5">Diameter</th>
                  <th className="px-4 py-2.5">kg / Meter</th>
                  <th className="px-4 py-2.5">kg / 12m Rod</th>
                  <th className="px-4 py-2.5">Typical Pcs / Bundle</th>
                  <th className="px-4 py-2.5">Primary Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {STANDARD_TMT_SIZE_SPECS.map((s) => (
                  <tr key={s.label} className="hover:bg-gray-50/70">
                    <td className="px-4 py-2 font-extrabold text-etukas-black">
                      {s.label}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {s.is_lite ? "~0.298" : calcWeightPerMeterKg(s.diameter_mm).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {s.is_lite ? "~3.58" : calcWeightPerRodKg(s.diameter_mm).toFixed(2)} kg
                    </td>
                    <td className="px-4 py-2 tabular-nums font-semibold">
                      {s.default_pieces_per_bundle} pcs
                    </td>
                    <td className="px-4 py-2 text-gray-600">{s.common_use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
