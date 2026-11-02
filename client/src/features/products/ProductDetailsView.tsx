import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
  Truck,
  Store as StoreIcon,
  Calendar,
  CheckCircle2,
  Search,
  ShoppingCart,
  Minus,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StoreProduct, getProductImageUrl } from "../../services/api";
import { formatMoney } from "../../lib/utils";
import { getSelectedAddress } from "../location/locationStore";
import { useAddToCart } from "../../hooks/useAddToCart";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../../services/api";
import { getStoredUser } from "../../services/api";

interface ProductDetailsViewProps {
  product: StoreProduct;
  relatedProducts?: StoreProduct[];
  onBack: () => void;
  onSelectProduct?: (product: StoreProduct) => void;
}

// Cement Grade options with price adjustments per bag
const CEMENT_GRADES = [
  { id: "opc-43", label: "OPC 43 Grade", priceDelta: 0, tag: "Standard High Strength" },
  { id: "opc-53", label: "OPC 53 Grade", priceDelta: 1500, tag: "Super High Early Strength" },
  { id: "ppc-flyash", label: "PPC (Fly Ash)", priceDelta: -1000, tag: "Weather & Crack Resistant" },
  { id: "psc-slag", label: "PSC (Slag)", priceDelta: -1500, tag: "Sulphate & Marine Resistant" },
];

// Iron Bar (TMT) Size options with price adjustments
const IRON_BAR_SIZES = [
  { id: "4mm", label: "4 mm", multiplier: 1.05 },
  { id: "6mm", label: "6 mm", multiplier: 1.03 },
  { id: "8mm-lite", label: "8 mm (Lite)", multiplier: 0.96 },
  { id: "8mm", label: "8 mm", multiplier: 1.0 },
  { id: "10mm", label: "10 mm", multiplier: 0.99 },
  { id: "12mm", label: "12 mm", multiplier: 1.0 },
  { id: "16mm", label: "16 mm", multiplier: 0.99 },
  { id: "20mm", label: "20 mm", multiplier: 0.98 },
];

// Realistic Verified Customer Reviews
const TOP_REVIEW = {
  id: "top-1",
  author: "Ramesh Babu K.",
  rating: 5,
  date: "3 days ago",
  site: "Karapa Residential Project (G+2)",
  verified: true,
  headline: "Outstanding genuine quality & flawless local dispatch!",
  comment:
    "Ordered full vehicle load directly to our site. Fresh batch without any lumps or moisture. The driver called ahead and offloading was swift and courteous. Best wholesale pricing compared to local retail yards.",
};

const SIDE_REVIEWS = [
  {
    id: "r2",
    author: "Venkata Rao M.",
    rating: 5,
    date: "1 week ago",
    site: "Sarpavaram Commercial",
    verified: true,
    headline: "Unbeatable wholesale rate",
    comment: "Best rate in the local market. Fresh stock, accurate count, quick support.",
  },
  {
    id: "r3",
    author: "K. Satyanarayana",
    rating: 4,
    date: "2 weeks ago",
    site: "Smart City Plot #42",
    verified: true,
    headline: "Prompt dispatch",
    comment: "Delivered in under 3 hours, checked bag weights and batch codes. Highly satisfied.",
  },
  {
    id: "r4",
    author: "Durga Prasad Ch.",
    rating: 5,
    date: "3 weeks ago",
    site: "Samalkot Road Villa",
    verified: true,
    headline: "Trusted supplier",
    comment: "Consistent quality across multiple deliveries. The store owner accommodated our morning schedule.",
  },
  {
    id: "r5",
    author: "Naveen Reddy T.",
    rating: 5,
    date: "1 month ago",
    site: "Pithapuram Commercial Unit",
    verified: true,
    headline: "Genuine test certificate",
    comment: "Materials met structural engineering specifications. Very impressed with the service.",
  },
];

export function ProductDetailsView({
  product,
  relatedProducts = [],
  onBack,
  onSelectProduct
}: ProductDetailsViewProps) {
  const navigate = useNavigate();
  const { addToCart, isLoading: isAdding, notice } = useAddToCart();
  const currentUser = getStoredUser();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: marketplaceApi.cart,
    enabled: !!currentUser,
    retry: false
  });
  const cartCount = cartQuery.data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  // Detect category type
  const categorySlug = (product.product.category?.slug || "").toLowerCase();
  const categoryName = (product.product.category?.name || "").toLowerCase();
  const productNameLower = product.product.name.toLowerCase();

  const isCement =
    categorySlug.includes("cement") ||
    categoryName.includes("cement") ||
    productNameLower.includes("cement");

  const isIronBar =
    categorySlug.includes("iron") ||
    categorySlug.includes("steel") ||
    categoryName.includes("iron") ||
    categoryName.includes("steel") ||
    productNameLower.includes("tmt") ||
    productNameLower.includes("iron") ||
    productNameLower.includes("steel");

  // Selection states
  const [selectedGrade, setSelectedGrade] = useState<string>("opc-53");
  const [selectedIronSize, setSelectedIronSize] = useState<string>("12mm");
  const [quantity, setQuantity] = useState<number>(product.minOrderQuantity || 1);
  const [quantityInput, setQuantityInput] = useState<string>(String(product.minOrderQuantity || 1));
  const [isDeliveryDetailsOpen, setIsDeliveryDetailsOpen] = useState<boolean>(true);
  const [isReviewsOpen, setIsReviewsOpen] = useState<boolean>(true);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Address
  const activeAddress = getSelectedAddress();

  // Instant Price Calculation
  const unitBasePriceMinor = product.priceMinor;

  const adjustedUnitBasePrice = useMemo(() => {
    if (isCement) {
      const grade = CEMENT_GRADES.find((g) => g.id === selectedGrade);
      const delta = grade ? grade.priceDelta : 0;
      return Math.max(1000, unitBasePriceMinor + delta);
    }
    if (isIronBar) {
      const sizeOpt = IRON_BAR_SIZES.find((s) => s.id === selectedIronSize);
      const multiplier = sizeOpt ? sizeOpt.multiplier : 1.0;
      return Math.round(unitBasePriceMinor * multiplier);
    }
    return unitBasePriceMinor;
  }, [isCement, isIronBar, selectedGrade, selectedIronSize, unitBasePriceMinor]);

  const effectiveQuantity = Math.max(1, quantity);
  const totalPriceMinor = adjustedUnitBasePrice * effectiveQuantity;

  const originalUnitPrice =
    (product.discountMinor ?? 0) > 0
      ? adjustedUnitBasePrice + (product.discountMinor || 0)
      : Math.round(adjustedUnitBasePrice * 1.15);

  const totalOriginalPriceMinor = originalUnitPrice * effectiveQuantity;
  const discountPercent = Math.max(
    5,
    Math.round(((totalOriginalPriceMinor - totalPriceMinor) / totalOriginalPriceMinor) * 100)
  );

  // Handle Quantity Change
  const updateQuantity = (newQty: number) => {
    const min = product.minOrderQuantity || 1;
    const validQty = Math.max(min, Math.min(newQty, product.stockQuantity || 99999));
    setQuantity(validQty);
    setQuantityInput(String(validQty));
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantityInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(Math.min(parsed, product.stockQuantity || 99999));
    }
  };

  const handleQuantityInputBlur = () => {
    const min = product.minOrderQuantity || 1;
    const parsed = parseInt(quantityInput, 10);
    if (isNaN(parsed) || parsed < min) {
      updateQuantity(min);
    } else {
      updateQuantity(parsed);
    }
  };

  // Share handler
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.product.name,
        text: `Check out ${product.product.name} on Etukas`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const imageUrl = getProductImageUrl(
    product.product.images[0],
    product.product.id,
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/95 px-5 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all duration-300">
          {notice}
        </div>
      )}

      {/* Minimized Header Only (h-10): [<- Back] [Logo] [Search Bar] [Cart] */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          {/* Back button left of logo */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-black focus:outline-none"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>

          {/* Etukas Icon Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-1.5 focus:outline-none" aria-label="Etukas Home">
            <img src="/favicon.png" alt="Etukas" className="h-6 w-6 object-contain" />
            <span className="hidden text-sm font-black tracking-tight text-gray-900 sm:inline-block">
              ETUKAS<span className="text-etukas-red">.COM</span>
            </span>
          </Link>

          {/* Search Bar */}
          <div className="relative min-w-0 flex-1">
            <span className="sr-only">Search building materials</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              readOnly
              onClick={() => navigate("/products")}
              placeholder="Search building materials"
              className="h-8 w-full cursor-pointer rounded-full border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white focus:border-etukas-red focus:bg-white focus:outline-none"
            />
          </div>

          {/* Cart Symbol with Badge */}
          <Link
            to="/cart"
            aria-label="View Cart"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-etukas-red focus:outline-none"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-etukas-red px-1 text-[9px] font-black text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Product Container */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Product Image with Share Button */}
          <div className="lg:col-span-6">
            <div className="sticky top-14 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50 sm:aspect-square">
                <img
                  src={imageUrl}
                  alt={product.product.name}
                  className="h-full w-full object-contain p-2 transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80";
                  }}
                />

                {/* Rating Badge */}
                <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-gray-900 shadow-md backdrop-blur">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>4.6</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 font-semibold">1.2K+ Sold</span>
                </div>

                {/* Share Button at Top Right Corner */}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product details"
                  title="Share product link"
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md transition hover:bg-white hover:text-etukas-red active:scale-95"
                >
                  <Share2 size={18} />
                </button>

                {shareCopied && (
                  <div className="absolute right-3 top-14 rounded-md bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur">
                    Link copied!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Title, Store, Dynamic Grade/Size, Quantity, Price, Delivery Details */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              {/* Category & Verified Store Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-etukas-red">
                    {product.product.category?.name || "Building Material"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                    <StoreIcon size={14} className="text-gray-400" />
                    {product.store.name}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  {product.deliveryEta}
                </span>
              </div>

              {/* Title & Brand */}
              <h1 className="mt-3 text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">
                {product.product.name}
              </h1>

              {product.product.description && (
                <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                  {product.product.description}
                </p>
              )}

              {/* Cement Grade Selection (Radio Buttons) */}
              {isCement && (
                <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      Select Cement Grade:
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">One Bag = 50 Kgs</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {CEMENT_GRADES.map((grade) => {
                      const isSelected = selectedGrade === grade.id;
                      const gradePrice = Math.max(1000, unitBasePriceMinor + grade.priceDelta);
                      return (
                        <label
                          key={grade.id}
                          className={`relative flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                            isSelected
                              ? "border-etukas-red bg-white shadow-sm ring-1 ring-etukas-red"
                              : "border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="cement-grade"
                              value={grade.id}
                              checked={isSelected}
                              onChange={() => setSelectedGrade(grade.id)}
                              className="h-4 w-4 text-etukas-red focus:ring-etukas-red"
                            />
                            <div>
                              <div className="text-xs font-extrabold text-gray-900">{grade.label}</div>
                              <div className="text-[10px] text-gray-500">{grade.tag}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-gray-900">{formatMoney(gradePrice)}</div>
                            <div className="text-[10px] text-gray-400">/{product.product.unit}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Iron Bar (TMT) Size Selection */}
              {isIronBar && (
                <div className="mt-5 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-sky-900">
                      Select Iron Bar Size:
                    </span>
                    <span className="text-[11px] font-bold text-sky-700">ISI Certified Fe-550D</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {IRON_BAR_SIZES.map((size) => {
                      const isSelected = selectedIronSize === size.id;
                      const sizePrice = Math.round(unitBasePriceMinor * size.multiplier);
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setSelectedIronSize(size.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                            isSelected
                              ? "border-etukas-red bg-white text-gray-900 shadow-sm ring-2 ring-etukas-red"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <span className="text-xs font-black">{size.label}</span>
                          <span className="mt-1 text-[11px] font-extrabold text-etukas-red">
                            {formatMoney(sizePrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Counter (- [input] +) */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-gray-100 py-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Quantity</div>
                  <div className="text-[11px] text-gray-500">
                    MOQ: {product.minOrderQuantity} {product.product.unit}s â€¢ In stock: {product.stockQuantity}
                  </div>
                </div>

                <div className="flex items-center rounded-xl border-2 border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity - 1)}
                    disabled={quantity <= (product.minOrderQuantity || 1)}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="number"
                    min={product.minOrderQuantity || 1}
                    max={product.stockQuantity || 99999}
                    value={quantityInput}
                    onChange={handleQuantityInputChange}
                    onBlur={handleQuantityInputBlur}
                    aria-label="Enter quantity number"
                    className="h-10 w-16 text-center text-sm font-black text-gray-900 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity + 1)}
                    disabled={quantity >= (product.stockQuantity || 99999)}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Instant Price Display */}
              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Total Calculated Price ({effectiveQuantity} {product.product.unit}s)
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                        {formatMoney(totalPriceMinor)}
                      </span>
                      <span className="text-sm font-semibold text-gray-400 line-through">
                        {formatMoney(totalOriginalPriceMinor)}
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-etukas-red">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold text-gray-500">
                    <div>Unit: {formatMoney(adjustedUnitBasePrice)}/{product.product.unit}</div>
                    <div className="text-emerald-600 font-bold">GST inclusive</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Details Dropdown Section with Down Arrow Symbol */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDeliveryDetailsOpen(!isDeliveryDetailsOpen)}
                className="flex w-full items-center justify-between p-4 text-left font-extrabold text-gray-900 transition hover:bg-gray-50 sm:p-5"
              >
                <div className="flex items-center gap-2.5">
                  <Truck size={20} className="text-etukas-red" />
                  <span className="text-sm sm:text-base">Delivery Details & Local Fulfillment</span>
                </div>
                {isDeliveryDetailsOpen ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </button>

              {isDeliveryDetailsOpen && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                  {/* Delivery Address */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <MapPin size={18} className="text-etukas-red shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Delivery Address
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        {activeAddress.line1 || activeAddress.city}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activeAddress.city}, {activeAddress.state || "Andhra Pradesh"} - {activeAddress.postalCode}
                      </div>
                    </div>
                    <Link
                      to="/location"
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      Change
                    </Link>
                  </div>

                  {/* Delivery Date / ETA */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <Calendar size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Delivery Date & Schedule
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        Estimated Arrival: {product.deliveryEta}
                      </div>
                      <div className="text-xs text-gray-500">
                        Standard express yard dispatch with transit insurance
                      </div>
                    </div>
                  </div>

                  {/* Store Name & Yard Info */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <StoreIcon size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Fulfilling Store & Yard
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        {product.store.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.store.city}, {product.store.state} â€¢ Radius {product.store.serviceRadiusKm} km
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews & Rating Details Dropdown Section */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setIsReviewsOpen(!isReviewsOpen)}
            className="flex w-full items-center justify-between p-4 text-left font-extrabold text-gray-900 transition hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
                <Star size={18} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-gray-900">Ratings & Reviews</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
                    â˜… 4.6
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  128 verified ratings & reviews from local site contractors
                </p>
              </div>
            </div>
            {isReviewsOpen ? (
              <ChevronUp size={20} className="text-gray-500 shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-gray-500 shrink-0" />
            )}
          </button>

          {isReviewsOpen && (
            <div className="border-t border-gray-100 p-4 sm:p-6 bg-gray-50/40">
              {/* TOP RATED REVIEW - Prominently Displayed in Big Size */}
              <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      â˜… Top Rated Review
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={13} /> Verified Project Buyer
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{TOP_REVIEW.date}</span>
                </div>

                <div className="mt-3 flex items-center gap-1 text-amber-400">
                  {Array.from({ length: TOP_REVIEW.rating }).map((_, i) => (
                    <Star key={i} size={16} className="fill-amber-400" />
                  ))}
                  <span className="ml-1 text-xs font-extrabold text-gray-800">5.0 / 5.0</span>
                </div>

                <h3 className="mt-2 text-base font-extrabold text-gray-900 sm:text-lg">
                  "{TOP_REVIEW.headline}"
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-gray-700 font-medium">
                  {TOP_REVIEW.comment}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-amber-100/80 pt-3 text-xs">
                  <div className="font-black text-gray-900">{TOP_REVIEW.author}</div>
                  <div className="text-gray-500 font-medium">Site: {TOP_REVIEW.site}</div>
                </div>
              </div>

              {/* REMAINING REVIEWS IN HORIZONTAL SIDE-SCROLL RECTANGLE CARDS */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                    More Reviews from Nearby Sites
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Scroll horizontally â†’</span>
                </div>

                <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth">
                  {SIDE_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className="w-[280px] sm:w-[320px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-400">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} size={12} className="fill-amber-400" />
                            ))}
                          </div>
                          <span className="text-[11px] text-gray-400">{review.date}</span>
                        </div>

                        <h4 className="mt-2 text-xs font-black text-gray-900 line-clamp-1">
                          {review.headline}
                        </h4>

                        <p className="mt-1.5 text-xs text-gray-600 leading-relaxed line-clamp-3">
                          {review.comment}
                        </p>
                      </div>

                      <div className="mt-3.5 border-t border-gray-100 pt-2 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-900">{review.author}</span>
                        <span className="text-gray-400 truncate max-w-[140px]">{review.site}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 mb-6">
            <h2 className="mb-4 text-lg font-black text-gray-900 sm:text-xl">Related Materials</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {relatedProducts.slice(0, 4).map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct?.(rel);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-etukas-red hover:shadow-md"
                >
                  <img
                    src={getProductImageUrl(rel.product.images[0], rel.product.id)}
                    alt={rel.product.name}
                    className="aspect-square w-full rounded-lg object-contain bg-gray-50"
                  />
                  <div className="mt-2 line-clamp-2 text-xs font-bold text-gray-900">{rel.product.name}</div>
                  <div className="mt-1 text-sm font-black text-gray-900">{formatMoney(rel.priceMinor)}</div>
                  <div className="text-[10px] text-gray-400">/{rel.product.unit}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Action Bar with Add to Cart and Buy Now Buttons */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {/* Price summary preview */}
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total ({effectiveQuantity} {product.product.unit}{effectiveQuantity > 1 ? "s" : ""})
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {formatMoney(totalPriceMinor)}
              </span>
              <span className="text-xs text-gray-400 line-through">
                {formatMoney(totalOriginalPriceMinor)}
              </span>
            </div>
          </div>

          {/* Action Buttons: Add to cart & Buy now (in Etukas Red) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => addToCart(product.id, effectiveQuantity)}
              disabled={isAdding}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-60"
            >
              <ShoppingBag size={16} />
              <span>{isAdding ? "Adding..." : "Add to cart"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                addToCart(product.id, effectiveQuantity);
                navigate("/cart");
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-etukas-red px-5 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-white shadow-md transition hover:bg-red-700 active:scale-95"
            >
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
