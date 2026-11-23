import { Link } from "react-router-dom";
import { Heart, Package } from "lucide-react";

type AccountQuickActionsProps = {
  ordersCount: number;
  wishlistCount: number;
};

export function AccountQuickActions({ ordersCount, wishlistCount }: AccountQuickActionsProps) {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-2 gap-3">
      <Link
        to="/orders"
        className="group flex items-center justify-center gap-2.5 rounded-xl border border-gray-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition hover:border-etukas-red/50 hover:bg-etukas-pink/40 active:scale-[0.98]"
      >
        <Package size={21} strokeWidth={2} className="shrink-0 text-etukas-red transition-transform group-hover:scale-105" />
        <span className="text-[15px] font-bold text-etukas-black">Orders</span>
        {ordersCount > 0 ? (
          <span className="rounded-full bg-etukas-pink px-2 py-0.5 text-[11px] font-extrabold text-etukas-red">
            {ordersCount}
          </span>
        ) : null}
      </Link>

      <Link
        to="/account/wishlist"
        className="group flex items-center justify-center gap-2.5 rounded-xl border border-gray-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition hover:border-etukas-red/50 hover:bg-etukas-pink/40 active:scale-[0.98]"
      >
        <Heart size={21} strokeWidth={2} className="shrink-0 text-etukas-red transition-transform group-hover:scale-105" />
        <span className="text-[15px] font-bold text-etukas-black">Wishlist</span>
        {wishlistCount > 0 ? (
          <span className="rounded-full bg-etukas-pink px-2 py-0.5 text-[11px] font-extrabold text-etukas-red">
            {wishlistCount}
          </span>
        ) : null}
      </Link>
    </section>
  );
}
