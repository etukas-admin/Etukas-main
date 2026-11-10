import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, Check, MapPin, Phone, ShoppingBag, ArrowRight, Truck, ShieldCheck, IndianRupee } from "lucide-react";
import type { OrderRecord } from "../../services/api";
import { DeliveryStepsTracker } from "./DeliveryStepsTracker";
import { formatMoney } from "../../lib/utils";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../utils/imageFallback";

export function OrderConfirmedView({ order }: { order: OrderRecord }) {
  const [copied, setCopied] = useState(false);

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.orderNumber || order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-10 space-y-6">
      {/* ─── Hero Success Banner ─── */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle2 size={36} />
        </div>

        {/* Required H1 & H3 headings */}
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Order placed successfully
        </h1>
        <h3 className="mt-1 text-base sm:text-lg font-bold text-emerald-800">
          Thanks for ordering in Etukas
        </h3>

        {/* Required customer care message */}
        <p className="mt-3 text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
          Your order details are sent to the selected store (<strong className="text-gray-900">{order.storeName}</strong>), our customer care executive will contact for providing the updates on this delivery.
        </p>

        {/* Order ID Display Badge */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50/90 px-4 py-2.5 shadow-xs">
          <span className="text-xs font-semibold text-gray-600">Order ID:</span>
          <span className="font-mono text-base sm:text-lg font-black tracking-wide text-orange-950">
            {order.orderNumber || order.id}
          </span>
          <button
            type="button"
            onClick={copyOrderId}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-600 shadow-2xs hover:bg-orange-100 hover:text-orange-900 transition"
            title="Copy Order ID"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Payment mode badge */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Payment:</span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-bold text-gray-800">
            {order.paymentMethod === "COD" ? "Cash on Delivery (Pay at site)" : order.paymentMethod}
          </span>
          <span>•</span>
          <span className="font-bold text-gray-900">Total: {formatMoney(order.totalMinor)}</span>
        </div>
      </div>

      {/* ─── Live Delivery Process Steps Tracker ─── */}
      <DeliveryStepsTracker order={order} />

      {/* ─── Order Details Card ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">Ordered Materials</h3>
          <span className="text-xs font-bold text-gray-500">{order.items.length} items</span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <div key={item.id || idx} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.imageUrl || FALLBACK_PRODUCT_IMAGE}
                    alt={item.productName}
                    className="h-full w-full object-contain"
                    onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1">
                    {item.productName}
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Quantity: <strong className="text-gray-900">{item.quantity} {item.unit}s</strong>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-gray-900 text-sm">
                  {formatMoney(item.totalMinor)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {formatMoney(item.priceMinor)}/{item.unit}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Address Details */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-1.5 text-xs text-gray-700">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <MapPin size={14} className="text-etukas-red" />
            <span>Delivering to Site: {order.deliveryAddress?.contactName}</span>
          </div>
          <p className="pl-5 text-gray-600">
            {order.deliveryAddress?.line1}
            {order.deliveryAddress?.line2 ? `, ${order.deliveryAddress.line2}` : ""}
            {order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""}
            {order.deliveryAddress?.state ? `, ${order.deliveryAddress.state}` : ""} - {order.deliveryAddress?.postalCode}
          </p>
          <p className="pl-5 text-gray-600 font-mono flex items-center gap-1">
            <Phone size={12} className="text-gray-400" />
            <span>{order.deliveryAddress?.mobile}</span>
          </p>
        </div>
      </div>

      {/* ─── Bottom Navigation Actions ─── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          to="/products"
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-gray-800 shadow-xs hover:bg-gray-50 active:scale-95 transition"
        >
          <ShoppingBag size={16} />
          <span>Continue Shopping</span>
        </Link>
        <Link
          to="/customer"
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-etukas-red px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition"
        >
          <span>View in My Orders</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

