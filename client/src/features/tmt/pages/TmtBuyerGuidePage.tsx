import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { TmtBuyerGuideContent } from "../components/TmtBuyerGuideContent";

export function TmtBuyerGuidePage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gray-50/70 pb-20 md:pb-12">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/categories/tmt-steel"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 transition hover:text-etukas-red"
            >
              <ArrowLeft size={14} />
              <span>Browse TMT Brands &amp; Live Rates</span>
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-etukas-pink px-2.5 py-0.5 text-[11px] font-bold text-etukas-red">
              <ShieldCheck size={12} /> IS 1786 Engineering Guide
            </span>
          </div>

          <h1 className="mt-2.5 text-2xl font-black tracking-tight text-etukas-black sm:text-3xl">
            TMT Steel Bars Buyer Guide &amp; House Estimator
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-gray-600 sm:text-sm">
            Understand diameter applications (6mm to 32mm), compare Fe 500D vs Fe 550D vs CRS, and auto-fill bundle quantities for your 1 BHK, 2 BHK, or 3 BHK home.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <TmtBuyerGuideContent
          onAutoFill={(_bundles, bhk, targetBrandSlug) => {
            navigate(
              `/categories/tmt-steel/${encodeURIComponent(
                targetBrandSlug
              )}?autofill=${encodeURIComponent(bhk)}`
            );
          }}
        />
      </div>
    </main>
  );
}
