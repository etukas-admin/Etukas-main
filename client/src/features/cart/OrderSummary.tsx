/**
 * OrderSummary – Sticky order summary panel.
 *
 * Shows: item count, quantities, subtotal, tax, discount, delivery
 * (all from backend Cart.totals), grand total, and the Checkout CTA.
 */

import { ShoppingBag, Tag, Truck, Receipt, ChevronRight, Lock } from "lucide-react";
import { formatMoney } from "../../lib/utils";
import type { Cart } from "../../services/api";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

interface OrderSummaryProps {
  cart: Cart;
  itemCount: number;
  totalQty: number;
  onCheckout?: () => void;
  checkoutDisabled?: boolean;
  className?: string;
}

function SummaryRow({
  label,
  value,
  bold,
  green,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        large ? "text-base" : "text-sm",
        bold ? "font-bold" : "font-normal"
      )}
    >
      <span className={cn("text-gray-500", bold && "text-etukas-black")}>{label}</span>
      <span className={cn(bold ? "text-etukas-black" : "text-gray-700", green && "text-etukas-green")}>
        {value}
      </span>
    </div>
  );
}

export function OrderSummary({
  cart,
  itemCount,
  totalQty,
  onCheckout,
  checkoutDisabled,
  className,
}: OrderSummaryProps) {
  const { subtotalMinor, taxMinor, discountMinor, totalMinor } = cart.totals;
  // Delivery is free for now (backend does not expose delivery charges in cart totals yet)
  const deliveryMinor = 0;

  const savings = discountMinor > 0 ? discountMinor : null;

  return (
    <aside
      className={cn(
        "h-fit rounded-2xl border border-gray-100 bg-white shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <Receipt size={18} className="text-etukas-red" />
        <h2 className="text-base font-bold text-etukas-black">Order Summary</h2>
      </div>

      {/* Stats pills */}
      <div className="flex gap-2 px-5 pt-4">
        <div className="flex items-center gap-1.5 rounded-full bg-etukas-pink px-3 py-1 text-xs font-semibold text-etukas-red">
          <ShoppingBag size={13} />
          {itemCount} {itemCount === 1 ? "product" : "products"}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {totalQty} units total
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-3 px-5 py-4">
        <SummaryRow label="Subtotal" value={formatMoney(subtotalMinor)} />

        {savings && (
          <SummaryRow
            label="Discount"
            value={`−${formatMoney(savings)}`}
            green
          />
        )}

        <SummaryRow
          label={`Tax (GST ${taxMinor > 0 ? `~${((taxMinor / subtotalMinor) * 100).toFixed(0)}%` : ""})`}
          value={taxMinor > 0 ? formatMoney(taxMinor) : "Included"}
        />

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Truck size={14} className="text-gray-400" />
            Delivery
          </span>
          <span className="font-semibold text-etukas-green">
            {deliveryMinor === 0 ? "FREE" : formatMoney(deliveryMinor)}
          </span>
        </div>

        {/* Promo badge */}
        {savings && savings > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-etukas-green border border-green-100">
            <Tag size={13} />
            You save {formatMoney(savings)} on this order!
          </div>
        )}

        <div className="border-t border-dashed border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-etukas-black">Grand Total</span>
            <span className="text-xl font-extrabold text-etukas-red">
              {formatMoney(totalMinor + deliveryMinor)}
            </span>
          </div>
          <p className="mt-0.5 text-right text-[11px] text-gray-400">
            Incl. all taxes & charges
          </p>
        </div>
      </div>

      {/* Checkout CTA */}
      <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
        <button
          type="button"
          onClick={onCheckout}
          disabled={checkoutDisabled}
          className={cn(
            "group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all",
            checkoutDisabled
              ? "cursor-not-allowed bg-gray-300"
              : "bg-etukas-red hover:bg-red-700 active:scale-[0.98] shadow-sm hover:shadow-md"
          )}
        >
          <Lock size={15} className="opacity-80" />
          Proceed to Checkout
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>

        <Link
          to="/products"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
        >
          <ShoppingBag size={15} />
          Continue Shopping
        </Link>
      </div>

      {/* Trust signals */}
      <div className="border-t border-gray-100 px-5 pb-5 pt-3">
        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Verified sellers
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Secure checkout
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Easy returns
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            24/7 support
          </div>
        </div>
      </div>
    </aside>
  );
}
