import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Search,
  Sparkles,
  TicketPercent,
  X
} from "lucide-react";
import { AccountSubPageHeader } from "../components/AccountSubPageHeader";
import { ETUKAS_COUPONS } from "../data/couponsData";
import { useAccountPreferences } from "../store/accountPreferencesStore";
import type { CouponCategory } from "../types";

type CouponFilter = CouponCategory | "saved";

const COUPON_CHIPS: { id: CouponFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "bulk", label: "Bulk Orders" },
  { id: "first_order", label: "Welcome" },
  { id: "delivery", label: "Delivery" },
  { id: "festive", label: "Finishing" }
];

export function MyCouponsPage() {
  const { preferences, toggleClaimCoupon } = useAccountPreferences();
  const [activeFilter, setActiveFilter] = useState<CouponFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ETUKAS_COUPONS.filter((coupon) => {
      if (activeFilter === "saved" && !preferences.claimedCouponIds.includes(coupon.id)) {
        return false;
      }
      if (activeFilter !== "all" && activeFilter !== "saved" && coupon.category !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        coupon.code.toLowerCase().includes(q) ||
        coupon.title.toLowerCase().includes(q) ||
        coupon.description.toLowerCase().includes(q)
      );
    });
  }, [activeFilter, searchQuery, preferences.claimedCouponIds]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Fallback silent
    }
    setCopiedCode(code);
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-12">
      <AccountSubPageHeader
        title="My Coupons"
        subtitle={`${ETUKAS_COUPONS.length} available deals`}
        backTo="/customer"
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Top Etukas Promo Banner (Same structure as My Orders page) */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A1A1A] via-[#7A1419] to-etukas-red p-5 text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-100">
                <Sparkles size={11} />
                <span>Etukas Deals &amp; Offers</span>
              </span>
              <h2 className="mt-2 text-lg font-black leading-snug sm:text-xl">
                Unlock Extra Savings on Every Material Order
              </h2>
              <p className="mt-0.5 text-xs text-red-50/90">
                Copy any eligible code below and apply it at checkout for instant savings.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-center backdrop-blur-xs">
              <p className="text-lg font-black text-white">{preferences.claimedCouponIds.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-100">Saved</p>
            </div>
          </div>
        </section>

        {/* Search Input (Same style as My Orders) */}
        <label className="relative block">
          <span className="sr-only">Search coupons and offers</span>
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coupon code or category (e.g. ETUKAS10, Cement)"
            className="h-11 w-full rounded-xl border border-gray-300/90 bg-white pl-10 pr-9 text-sm text-etukas-black placeholder:text-gray-400 focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-etukas-pink"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        {/* Filter Chips Row (Same style as My Orders) */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {COUPON_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  isActive
                    ? "border-etukas-black bg-etukas-black text-white shadow-xs"
                    : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red/40 hover:text-etukas-red"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Coupons List */}
        {filteredCoupons.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
              <TicketPercent size={24} />
            </div>
            <h3 className="mt-3 text-base font-extrabold text-etukas-black">No coupons match your filter</h3>
            <p className="mt-1 text-xs text-gray-500">
              Try switching categories or clearing your search to view all active Etukas offers.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl bg-etukas-red px-4 py-2 text-xs font-extrabold text-white hover:bg-red-700"
            >
              Show All Coupons
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredCoupons.map((coupon) => {
              const isSaved = preferences.claimedCouponIds.includes(coupon.id);
              const isCopied = copiedCode === coupon.code;
              const isExpanded = expandedCouponId === coupon.id;

              return (
                <article
                  key={coupon.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition hover:border-etukas-red/40"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Left Etukas Red Ticket Stub */}
                    <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-etukas-red to-[#9E161B] px-4 py-3 text-white sm:w-40 sm:flex-col sm:justify-center sm:text-center">
                      <TicketPercent size={22} className="hidden opacity-90 sm:block" />
                      <div>
                        <p className="text-base font-black tracking-tight sm:text-lg">
                          {coupon.discountBadge}
                        </p>
                        <p className="text-[11px] font-semibold text-red-100">{coupon.minOrderText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleClaimCoupon(coupon.id)}
                        aria-label={isSaved ? "Remove saved coupon" : "Save coupon"}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition sm:mt-1 ${
                          isSaved
                            ? "bg-white text-etukas-red"
                            : "bg-white/15 text-white hover:bg-white/25"
                        }`}
                      >
                        <Bookmark size={11} className={isSaved ? "fill-etukas-red" : ""} />
                        <span>{isSaved ? "Saved" : "Save"}</span>
                      </button>
                    </div>

                    {/* Right Coupon Body */}
                    <div className="flex-1 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-extrabold text-etukas-black sm:text-[15px]">
                            {coupon.title}
                          </h3>
                          <p className="mt-0.5 text-xs font-medium text-etukas-green">
                            {coupon.subtitle}
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                            {coupon.description}
                          </p>
                        </div>
                      </div>

                      {/* Code Copy + Shop Action Bar */}
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-dashed border-etukas-red/50 bg-etukas-pink/70 px-3 py-1 font-mono text-xs font-black tracking-wider text-etukas-red">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopyCode(coupon.code)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                              isCopied
                                ? "bg-emerald-50 text-etukas-green"
                                : "bg-gray-100 text-gray-700 hover:bg-etukas-pink hover:text-etukas-red"
                            }`}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? "Copied!" : "Copy"}</span>
                          </button>
                        </div>

                        <Link
                          to={coupon.applicableHref}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-etukas-red hover:underline"
                        >
                          <span>View Products</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>

                      {/* Validity & Expandable Terms */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>{coupon.validTill}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedCouponId(isExpanded ? null : coupon.id)}
                          className="inline-flex items-center gap-0.5 font-semibold text-gray-500 hover:text-etukas-red"
                        >
                          <span>T&amp;C</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                      {isExpanded ? (
                        <ul className="mt-2 list-disc space-y-1 rounded-xl bg-gray-50 p-3 pl-6 text-[11px] text-gray-600">
                          {coupon.terms.map((term, idx) => (
                            <li key={idx}>{term}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
