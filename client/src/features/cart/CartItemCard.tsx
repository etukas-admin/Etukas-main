/**
 * CartItem – Renders a single product card inside the cart.
 *
 * Displays:
 *   • Product image, name, category, seller
 *   • Product specifications (unit, delivery ETA, stock)
 *   • Category-appropriate quantity control
 *   • Unit price, item subtotal
 *   • Remove button with confirmation dialog
 */

import { useState } from "react";
import { Trash2, Store, Package2, Truck, AlertCircle } from "lucide-react";
import { QuantityControl } from "./QuantityControl";
import { ConfirmDialog } from "./ConfirmDialog";
import { useUpdateCartItem, useRemoveCartItem } from "./useCart";
import { getProductImageUrl } from "../../services/api";
import { formatMoney as fmtMoney } from "../../lib/utils";
import type { CartItemData } from "./cartTypes";
import { cn } from "../../lib/utils";

interface CartItemCardProps {
  item: CartItemData;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80";

export function CartItemCard({ item }: CartItemCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();

  const { storeProduct, quantity } = item;
  const { product, store, priceMinor, stockQuantity, deliveryEta } = storeProduct;
  const subtotal = priceMinor * quantity;
  const isLowStock = stockQuantity > 0 && stockQuantity <= 5;
  const isOutOfStock = stockQuantity === 0;

  const handleQuantityChange = (newQty: number) => {
    if (newQty === quantity) return;
    updateMutation.mutate({ itemId: item.id, quantity: newQty });
  };

  const handleRemove = () => {
    removeMutation.mutate(item.id, {
      onSuccess: () => setShowConfirm(false),
    });
  };

  const isMutating = updateMutation.isPending || removeMutation.isPending;

  return (
    <>
      <article
        className={cn(
          "group relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200",
          "hover:shadow-md hover:border-gray-200",
          isMutating && "opacity-70 pointer-events-none"
        )}
      >
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="relative shrink-0">
            <img
              className="h-24 w-24 rounded-xl object-cover bg-gray-50"
              src={getProductImageUrl(product.images[0], product.id, FALLBACK_IMG)}
              alt={product.images[0]?.altText || product.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {/* Category badge */}
                <span className="inline-block rounded-full bg-etukas-pink px-2 py-0.5 text-[11px] font-semibold text-etukas-red mb-1">
                  {product.category?.name ?? "Product"}
                </span>
                <h3 className="truncate text-sm font-bold text-etukas-black leading-snug">
                  {product.name}
                </h3>
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                aria-label={`Remove ${product.name} from cart`}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition hover:bg-red-50 hover:text-etukas-red"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Seller info */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Store size={12} className="shrink-0 text-orange-400" />
              <span className="truncate font-medium">{store.name}</span>
              <span className="text-gray-300">•</span>
              <span>{store.city}</span>
            </div>

            {/* Specs row */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Package2 size={12} className="text-gray-400" />
                Unit: <span className="font-medium text-gray-700">{product.unit}</span>
              </span>
              <span className="flex items-center gap-1">
                <Truck size={12} className="text-gray-400" />
                ETA: <span className="font-medium text-gray-700">{deliveryEta}</span>
              </span>
            </div>

            {/* Stock warning */}
            {isLowStock && !isOutOfStock && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <AlertCircle size={12} />
                Only {stockQuantity} left in stock!
              </div>
            )}
            {isOutOfStock && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
                <AlertCircle size={12} />
                Currently out of stock – seller will confirm availability.
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: quantity + price */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {/* Quantity control */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Quantity
            </p>
            <QuantityControl
              config={item.quantityConfig}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={isMutating || isOutOfStock}
            />
          </div>

          {/* Price block */}
          <div className="text-right">
            <p className="text-xs text-gray-400">
              {fmtMoney(priceMinor)} × {quantity}
            </p>
            <p className="text-xl font-extrabold text-etukas-black">
              {fmtMoney(subtotal)}
            </p>
          </div>
        </div>

        {/* Loading overlay */}
        {isMutating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-etukas-red border-t-transparent" />
          </div>
        )}
      </article>

      <ConfirmDialog
        open={showConfirm}
        title="Remove this item?"
        description={`"${product.name}" will be removed from your cart.`}
        confirmLabel="Yes, remove"
        variant="danger"
        loading={removeMutation.isPending}
        onConfirm={handleRemove}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
