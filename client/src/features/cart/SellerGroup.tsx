/**
 * SellerGroup – Groups cart items from the same seller store.
 *
 * Displays:
 *   • Seller badge (store name, city, delivery info)
 *   • All CartItemCards for that seller
 *   • Seller subtotal footer
 */

import { Store, MapPin, Truck, ChevronRight } from "lucide-react";
import { CartItemCard } from "./CartItemCard";
import { formatMoney } from "../../lib/utils";
import type { SellerGroup as SellerGroupType } from "./cartTypes";

interface SellerGroupProps {
  group: SellerGroupType;
  index: number;
}

export function SellerGroupSection({ group, index }: SellerGroupProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
      {/* Seller header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Seller avatar / icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <Store size={18} className="text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
              Seller {index + 1}
            </p>
            <h2 className="truncate text-sm font-bold text-etukas-black">{group.storeName}</h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={11} className="shrink-0 text-etukas-red" />
              <span>{group.storeCity}, {group.storeState}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <Truck size={13} />
          <span>Ships in 2–4 hrs</span>
        </div>
      </div>

      {/* Item cards */}
      <div className="space-y-3 p-4">
        {group.items.map((item) => (
          <CartItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Seller subtotal footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium">{group.items.length} {group.items.length === 1 ? "item" : "items"}</span>
          <span>from {group.storeName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Subtotal:</span>
          <span className="text-sm font-bold text-etukas-black">
            {formatMoney(group.subtotalMinor)}
          </span>
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>
    </section>
  );
}
