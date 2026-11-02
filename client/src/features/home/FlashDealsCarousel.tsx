import { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { StoreProduct, getProductImageUrl } from "../../services/api";
import { formatMoney } from "../../lib/utils";
import { Skeleton } from "../../components/ui/Skeleton";

interface FlashDealsCarouselProps {
  products?: StoreProduct[];
  isLoading?: boolean;
  onProductSelect?: (product: StoreProduct) => void;
}

export function FlashDealsCarousel({ products, isLoading, onProductSelect }: FlashDealsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Filter flash deal categories: cement, steel, bricks, sand, or products with discounts
  const flashProducts = products?.filter((item) => {
    const slug = item.product.category?.slug;
    return (
      slug === "cement" ||
      slug === "steel-iron-bars" ||
      slug === "bricks-blocks" ||
      slug === "sand-aggregates" ||
      (item.discountMinor && item.discountMinor > 0)
    );
  }) ?? products ?? [];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* Header with Title and Scroll Controls */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-etukas-red">
              <Sparkles size={12} className="animate-pulse" /> FLASH DEALS & ESSENTIALS
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Yard Rates
            </span>
          </div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            Fast-Moving Building Materials
          </h2>
          <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">
            Cement bags, steel TMT bars, and red bricks from nearby local yards in Hyderabad
          </p>
        </div>

        {/* Desktop Controls & View All */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            to="/products"
            className="text-xs font-bold text-etukas-red hover:underline sm:text-sm"
          >
            View all deals &rarr;
          </Link>
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-etukas-red active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-etukas-red active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Popular categories and flash deals carousel"
        className="no-scrollbar flex gap-3.5 overflow-x-auto scroll-smooth py-1 snap-x snap-mandatory focus:outline-none focus-visible:ring-2 focus-visible:ring-etukas-red/20 rounded-xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="w-[230px] shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:w-[260px]"
              >
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ))
          : flashProducts.map((item) => {
              const discountMinor = item.discountMinor ?? 0;
              const originalMrp = discountMinor > 0 ? item.priceMinor + discountMinor : Math.round(item.priceMinor * 1.15);
              const discountPercent = Math.max(
                5,
                Math.round(((originalMrp - item.priceMinor) / originalMrp) * 100)
              );

              return (
                <article
                  key={item.id}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onProductSelect?.(item);
                    }
                  }}
                  onClick={() => onProductSelect?.(item)}
                  className="group relative flex w-[230px] shrink-0 snap-start cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-etukas-red/40 sm:w-[260px] md:w-[275px]"
                >
                  {/* Top Image & Floating Badges */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-50">
                    <img
                      src={getProductImageUrl(
                        item.product.images[0],
                        item.product.id,
                        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80"
                      )}
                      alt={item.product.images[0]?.altText || item.product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80";
                      }}
                    />

                    {/* Discount Badge */}
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      <span className="inline-flex items-center rounded-md bg-etukas-red px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                        {discountPercent}% OFF
                      </span>
                    </div>

                    {/* Live Updated Price Tag */}
                    <div className="absolute bottom-1.5 left-2 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                      <Clock size={10} className="text-yellow-400" />
                      <span>Updated today</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="mt-3 flex flex-1 flex-col justify-between">
                    <div>
                      {/* Local Seller Tag */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex max-w-[150px] items-center gap-1 truncate font-medium">
                          <MapPin size={11} className="shrink-0 text-etukas-red" />
                          <span className="truncate">{item.store.name}</span>
                        </span>
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                          {item.deliveryEta}
                        </span>
                      </div>

                      {/* Product Title */}
                      <span
                        className="mt-1.5 block line-clamp-2 text-xs font-bold leading-snug text-gray-900 transition-colors group-hover:text-etukas-red sm:text-sm"
                        title={item.product.name}
                      >
                        {item.product.name}
                      </span>

                      {/* Product Description */}
                      {item.product.description && item.product.description !== item.product.name && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                          {item.product.description}
                        </p>
                      )}

                      {/* Stock status indicator */}
                      <div className="mt-1 text-[11px] text-gray-500">
                        {item.stockQuantity > 50 ? (
                          <span className="text-emerald-600 font-medium">● Available in local yard</span>
                        ) : (
                          <span className="text-amber-600 font-medium">● Low stock: {item.stockQuantity} left</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mt-3.5 border-t border-gray-100 pt-2.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-extrabold text-gray-900 sm:text-lg">
                          {formatMoney(item.priceMinor)}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500">
                          /{item.product.unit}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 line-through">
                        MRP {formatMoney(originalMrp)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
}
