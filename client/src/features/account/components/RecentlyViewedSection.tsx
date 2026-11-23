import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Store as StoreIcon, Trash2 } from "lucide-react";
import { useProducts, useStores } from "../../../hooks/useMarketplace";
import { getSelectedAddress } from "../../location/locationStore";
import { getProductImageUrl } from "../../../services/api";
import { formatMoney } from "../../../lib/utils";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { useRecentlyViewed } from "../store/recentlyViewedStore";
import type { RecentlyViewedItem } from "../types";

export function RecentlyViewedSection() {
  const { items: trackedItems, clear } = useRecentlyViewed();
  const activeAddress = getSelectedAddress();

  const shouldLoadFallback = trackedItems.length === 0;

  const nearbyProducts = useProducts(
    shouldLoadFallback
      ? {
          city: activeAddress?.city || activeAddress?.district,
          latitude: activeAddress?.latitude,
          longitude: activeAddress?.longitude,
          pageSize: 6
        }
      : { pageSize: 1 }
  );

  const nearbyStores = useStores(
    shouldLoadFallback
      ? {
          city: activeAddress?.city || activeAddress?.district,
          latitude: activeAddress?.latitude,
          longitude: activeAddress?.longitude
        }
      : undefined
  );

  const displayItems: RecentlyViewedItem[] = useMemo(() => {
    if (trackedItems.length > 0) {
      return trackedItems.slice(0, 12);
    }

    const fallbackProducts: RecentlyViewedItem[] = (nearbyProducts.data ?? []).slice(0, 5).map((item) => ({
      id: `product:${item.id}`,
      type: "product",
      title: item.product.name,
      subtitle: item.store.name,
      imageUrl: getProductImageUrl(item.product.images[0], item.product.id, FALLBACK_PRODUCT_IMAGE),
      href: `/product/${item.id}`,
      priceMinor: item.priceMinor,
      unit: item.product.unit,
      viewedAt: ""
    }));

    const fallbackStores: RecentlyViewedItem[] = (nearbyStores.data ?? []).slice(0, 3).map((store) => ({
      id: `store:${store.id}`,
      type: "store",
      title: store.name,
      subtitle: store.city,
      imageUrl: FALLBACK_PRODUCT_IMAGE,
      href: `/products?q=${encodeURIComponent(store.name)}`,
      viewedAt: ""
    }));

    return [...fallbackProducts, ...fallbackStores];
  }, [trackedItems, nearbyProducts.data, nearbyStores.data]);

  const isUsingFallback = trackedItems.length === 0;

  return (
    <section aria-labelledby="recently-viewed-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="recently-viewed-heading" className="text-[17px] font-extrabold tracking-tight text-etukas-black">
            Recently Viewed Stores &amp; Products
          </h2>
          {isUsingFallback && displayItems.length > 0 ? (
            <p className="text-[11px] font-medium text-gray-500">
              Popular nearby materials &amp; stores in {activeAddress.city || "your area"}
            </p>
          ) : null}
        </div>

        {!isUsingFallback ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-etukas-pink hover:text-etukas-red"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        ) : (
          <Link to="/stores" className="text-xs font-bold text-etukas-red hover:underline">
            View stores
          </Link>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-center">
          <p className="text-xs font-semibold text-gray-600">
            Stores and materials you view will appear here for quick access.
          </p>
          <Link
            to="/products"
            className="mt-2 inline-block text-xs font-bold text-etukas-red hover:underline"
          >
            Explore Building Materials →
          </Link>
        </div>
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="group w-[112px] shrink-0 sm:w-[126px]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50 p-2 transition group-hover:border-etukas-red/40 group-hover:shadow-sm">
                {item.type === "store" && item.imageUrl === FALLBACK_PRODUCT_IMAGE ? (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-etukas-pink via-white to-rose-50 text-etukas-red">
                    <StoreIcon size={30} strokeWidth={1.8} />
                    <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-etukas-red/80">
                      Store
                    </span>
                  </div>
                ) : (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                  />
                )}

                <span
                  className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-xs ${
                    item.type === "store"
                      ? "bg-etukas-black/85 text-white"
                      : "bg-white/90 text-etukas-red border border-etukas-red/15"
                  }`}
                >
                  {item.type === "store" ? "Store" : "Item"}
                </span>
              </div>

              <p className="mt-2 truncate text-[13px] font-semibold text-gray-800 group-hover:text-etukas-red">
                {item.title}
              </p>
              {item.priceMinor ? (
                <p className="truncate text-[11px] font-bold text-etukas-black">
                  {formatMoney(item.priceMinor)}
                  {item.unit ? <span className="font-normal text-gray-400">/{item.unit}</span> : null}
                </p>
              ) : item.subtitle ? (
                <p className="truncate text-[11px] text-gray-500">{item.subtitle}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
