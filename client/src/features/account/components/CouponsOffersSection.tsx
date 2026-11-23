import { Link } from "react-router-dom";
import { ChevronRight, TicketPercent } from "lucide-react";
import { ETUKAS_COUPONS } from "../data/couponsData";

type CouponsOffersSectionProps = {
  claimedCount: number;
};

export function CouponsOffersSection({ claimedCount }: CouponsOffersSectionProps) {
  return (
    <section aria-labelledby="coupons-offers-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="coupons-offers-heading" className="text-[17px] font-extrabold tracking-tight text-etukas-black">
          Coupons &amp; Offers
        </h2>
        <span className="rounded-full bg-etukas-pink px-2.5 py-0.5 text-[11px] font-bold text-etukas-red">
          {ETUKAS_COUPONS.length} active
        </span>
      </div>

      <Link
        to="/account/coupons"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-etukas-red/15 bg-gradient-to-r from-etukas-pink via-[#FFF5F5] to-rose-50/70 px-4 py-3.5 transition hover:border-etukas-red/40 hover:shadow-sm active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-etukas-red text-white shadow-sm shadow-red-500/20 transition-transform group-hover:rotate-[-6deg]">
            <TicketPercent size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-etukas-black">
              Explore and grab the best deals
            </p>
            <p className="truncate text-xs text-gray-600">
              {claimedCount > 0
                ? `${claimedCount} saved coupon${claimedCount === 1 ? "" : "s"} ready for checkout`
                : "Instant savings on Cement, Steel & local deliveries"}
            </p>
          </div>
        </div>

        <ChevronRight
          size={19}
          className="shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-etukas-red"
        />
      </Link>
    </section>
  );
}
