import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Package,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Lock,
  Sparkles,
  Info,
  Check,
  ShoppingBag,
  Clock
} from "lucide-react";
import {
  marketplaceApi,
  getStoredUser,
  type OrderRecord,
  type CheckoutInput
} from "../../services/api";
import { useCartQuery } from "../cart/useCart";
import { getSelectedAddress, DEFAULT_CONSTRUCTION_SITE, type DeliveryAddress } from "../location/locationStore";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../utils/imageFallback";
import { formatMoney } from "../../lib/utils";
import { OrderConfirmedView } from "./OrderConfirmedView";

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cartQuery = useCartQuery();
  const storedUser = getStoredUser();

  // ─── Step State: 1 = Address, 2 = Confirm details, 3 = Payments ───
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);

  // ─── Address State ───
  const initialAddress = useMemo(() => {
    const loc = getSelectedAddress() || DEFAULT_CONSTRUCTION_SITE;
    return {
      contactName: storedUser?.name || loc.recipient || "Nagu Bandaru",
      mobile: storedUser?.mobile || "6303686125",
      line1: loc.line1 || "2-7, Gidajam, Gidajam",
      line2: loc.line2 || "Near Nagu Kirana & Cool Drinks Shop",
      landmark: loc.landmark || "Near Main Road",
      city: loc.city || "Kakinada",
      state: loc.state || "Andhra Pradesh",
      postalCode: loc.postalCode || "533462",
      label: (loc.label as string) || "Home"
    };
  }, [storedUser]);

  const [address, setAddress] = useState(initialAddress);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // ─── Item Quantities State ───
  const initialItems = useMemo(() => {
    if (cartQuery.data && cartQuery.data.items.length > 0) {
      return cartQuery.data.items.map((item) => ({
        id: item.id,
        storeProductId: item.storeProduct.id,
        productName: item.storeProduct.product.name,
        unit: item.storeProduct.product.unit || "piece",
        quantity: item.quantity,
        priceMinor: item.storeProduct.priceMinor,
        originalPriceMinor: Math.round(item.storeProduct.priceMinor * 1.3),
        imageUrl: item.storeProduct.product.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE,
        category: item.storeProduct.product.category?.name || "Building Material",
        storeId: item.storeProduct.store.id,
        storeName: "Etukas Verified Partner Store"
      }));
    }
    // Fallback item for demo if cart was empty
    return [
      {
        id: "demo-item-1",
        storeProductId: "sp-cement-1",
        productName: "UltraTech Super Cement (Grade 53 PPC)",
        unit: "bag",
        quantity: 25,
        priceMinor: 38500,
        originalPriceMinor: 48000,
        imageUrl: FALLBACK_PRODUCT_IMAGE,
        category: "Cement",
        storeId: "store-kakinada-1",
        storeName: "Sri Lakshmi Building Materials"
      }
    ];
  }, [cartQuery.data]);

  const [items, setItems] = useState(initialItems);

  // Sync items when cart data arrives
  useEffect(() => {
    if (cartQuery.data && cartQuery.data.items.length > 0) {
      setItems(
        cartQuery.data.items.map((item) => ({
          id: item.id,
          storeProductId: item.storeProduct.id,
          productName: item.storeProduct.product.name,
          unit: item.storeProduct.product.unit || "piece",
          quantity: item.quantity,
          priceMinor: item.storeProduct.priceMinor,
          originalPriceMinor: Math.round(item.storeProduct.priceMinor * 1.3),
          imageUrl: item.storeProduct.product.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE,
          category: item.storeProduct.product.category?.name || "Building Material",
          storeId: item.storeProduct.store.id,
          storeName: "Etukas Verified Partner Store"
        }))
      );
    }
  }, [cartQuery.data]);

  const updateItemQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: newQty } : it))
    );
  };

  // ─── GSTIN & Notes State ───
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [gstinNumber, setGstinNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // ─── Payment Selection State (COD Enabled & Active First!) ───
  const [selectedPayment, setSelectedPayment] = useState<
    "COD" | "UPI" | "CARD" | "EMI" | "NET_BANKING"
  >("COD");
  const [isCodExpanded, setIsCodExpanded] = useState(true);

  // ─── Placed Order State ───
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);

  // ─── Calculations ───
  const sellingPriceMinor = useMemo(
    () => items.reduce((sum, it) => sum + it.originalPriceMinor * it.quantity, 0),
    [items]
  );
  const discountedPriceMinor = useMemo(
    () => items.reduce((sum, it) => sum + it.priceMinor * it.quantity, 0),
    [items]
  );
  const discountMinor = sellingPriceMinor - discountedPriceMinor;
  const protectPromiseFeeMinor = 4900; // ₹49 nominal protection & site inspection fee
  const deliveryFeeMinor = discountedPriceMinor > 500000 ? 0 : 25000; // Free delivery above ₹5000
  const totalAmountMinor = discountedPriceMinor + protectPromiseFeeMinor + deliveryFeeMinor;
  const totalSavingsMinor = discountMinor;

  // ─── Order Creation Mutation ───
  const orderMutation = useMutation({
    mutationFn: async (payload: CheckoutInput) => {
      const res = await marketplaceApi.createOrder(payload);
      return res;
    },
    onSuccess: (data) => {
      setPlacedOrder(data.order);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  const handlePlaceOrder = () => {
    const payload: CheckoutInput = {
      paymentMethod: selectedPayment === "COD" ? "COD" : "MOCK_ONLINE",
      deliveryAddress: {
        contactName: address.contactName,
        mobile: address.mobile,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        landmark: address.landmark,
        label: address.label
      },
      items: items.map((it) => ({
        storeProductId: it.storeProductId,
        productName: it.productName,
        unit: it.unit,
        quantity: it.quantity,
        priceMinor: it.priceMinor,
        imageUrl: it.imageUrl,
        category: it.category,
        storeId: it.storeId,
        storeName: it.storeName
      })),
      gstin: gstinNumber || undefined,
      notes: orderNotes || undefined
    };

    orderMutation.mutate(payload);
  };

  // If order is placed, show OrderConfirmedView
  if (placedOrder) {
    return <OrderConfirmedView order={placedOrder} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f2f4] pb-28 sm:pb-16 text-gray-900">
      {/* ─── Top Header (Flipkart Style matching Screenshot 1 & 3) ─── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-2xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 3) setCurrentStep(2);
                else if (currentStep === 2) setCurrentStep(1);
                else navigate(-1);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:scale-95 transition"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-gray-900">
                {currentStep === 1
                  ? "Select Delivery Address"
                  : currentStep === 2
                  ? "Confirm details"
                  : "Payments"}
              </h1>
              {currentStep === 3 && (
                <p className="text-[11px] font-semibold text-gray-500">Step 3 of 3</p>
              )}
            </div>
          </div>

          {currentStep === 3 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <Lock size={13} className="text-emerald-600" />
              <span>100% Secure</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <img src="/etukas-logo.png" alt="Etukas" className="h-6 w-auto object-contain hidden sm:block" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
              <span className="font-mono text-xs font-black text-etukas-red uppercase">Etukas Checkout</span>
            </div>
          )}
        </div>

        {/* ─── 3-Step Stepper Header (Flipkart Style matching Screenshot 1) ─── */}
        <div className="bg-white border-t border-gray-100 px-4 py-2.5">
          <div className="mx-auto flex max-w-md items-center justify-between text-xs">
            {/* Step 1: Address */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  currentStep > 1
                    ? "bg-emerald-600 text-white"
                    : currentStep === 1
                    ? "bg-etukas-red text-white ring-2 ring-red-100"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {currentStep > 1 ? <Check size={13} /> : "1"}
              </div>
              <span className={`text-[11px] font-bold ${currentStep === 1 ? "text-etukas-red" : "text-gray-700"}`}>
                Address
              </span>
            </button>

            {/* Connecting Line 1-2 */}
            <div className={`h-0.5 flex-1 mx-2 transition ${currentStep >= 2 ? "bg-etukas-red" : "bg-gray-200"}`} />

            {/* Step 2: Confirm details */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  currentStep > 2
                    ? "bg-emerald-600 text-white"
                    : currentStep === 2
                    ? "bg-etukas-red text-white ring-2 ring-red-100"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {currentStep > 2 ? <Check size={13} /> : "2"}
              </div>
              <span className={`text-[11px] font-bold ${currentStep === 2 ? "text-etukas-red" : "text-gray-700"}`}>
                Confirm details
              </span>
            </button>

            {/* Connecting Line 2-3 */}
            <div className={`h-0.5 flex-1 mx-2 transition ${currentStep >= 3 ? "bg-etukas-red" : "bg-gray-200"}`} />

            {/* Step 3: Payment */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  currentStep === 3
                    ? "bg-etukas-red text-white ring-2 ring-red-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                3
              </div>
              <span className={`text-[11px] font-bold ${currentStep === 3 ? "text-etukas-red" : "text-gray-400"}`}>
                Payment
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <main className="mx-auto max-w-4xl px-2.5 py-4 sm:px-6 space-y-4">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: ADDRESS SELECTION & EDITING                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-extrabold text-gray-900 mb-3">
                Select or Edit Delivery Address
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  setAddress({
                    contactName: String(form.get("contactName") || address.contactName),
                    mobile: String(form.get("mobile") || address.mobile),
                    line1: String(form.get("line1") || address.line1),
                    line2: String(form.get("line2") || address.line2),
                    landmark: String(form.get("landmark") || address.landmark),
                    city: String(form.get("city") || address.city),
                    state: String(form.get("state") || address.state),
                    postalCode: String(form.get("postalCode") || address.postalCode),
                    label: String(form.get("label") || address.label)
                  });
                  setIsEditingAddress(false);
                  setCurrentStep(2);
                }}
                className="space-y-3.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-gray-700">
                    Contact Person Name *
                    <input
                      name="contactName"
                      required
                      defaultValue={address.contactName}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                      placeholder="e.g. Nagu Bandaru / Site Engineer"
                    />
                  </label>
                  <label className="block text-xs font-bold text-gray-700">
                    Phone Number *
                    <input
                      name="mobile"
                      type="tel"
                      required
                      defaultValue={address.mobile}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                      placeholder="e.g. 6303686125"
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold text-gray-700">
                  Flat, House no., Building, Company, Site *
                  <input
                    name="line1"
                    required
                    defaultValue={address.line1}
                    className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                    placeholder="e.g. 2-7, Gidajam, Near Cool Drinks Shop"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-gray-700">
                    Area, Street, Sector, Village
                    <input
                      name="line2"
                      defaultValue={address.line2}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                      placeholder="e.g. Karapa Road, Gidajam"
                    />
                  </label>
                  <label className="block text-xs font-bold text-gray-700">
                    Landmark
                    <input
                      name="landmark"
                      defaultValue={address.landmark}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                      placeholder="e.g. Near Panchayat Bhavan"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-xs font-bold text-gray-700">
                    City *
                    <input
                      name="city"
                      required
                      defaultValue={address.city}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                    />
                  </label>
                  <label className="block text-xs font-bold text-gray-700">
                    State *
                    <input
                      name="state"
                      required
                      defaultValue={address.state}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                    />
                  </label>
                  <label className="block text-xs font-bold text-gray-700">
                    Pincode *
                    <input
                      name="postalCode"
                      required
                      defaultValue={address.postalCode}
                      className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-xs outline-none focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-etukas-red py-3 text-sm font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition"
                  >
                    Deliver to this address &amp; Continue →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: CONFIRM DETAILS (Flipkart Style matching Screenshot 1 & 2) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Section: Delivering to Card (Screenshot 1) */}
            <div className="space-y-1.5">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                Delivering to
              </h2>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                      <Building2 size={15} />
                    </span>
                    <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">
                      {address.contactName}
                    </h3>
                  </div>

                  {/* Change Button in Blue (Screenshot 1) */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {address.line1}, {address.line2 ? `${address.line2}, ` : ""}
                  {address.landmark ? `${address.landmark}, ` : ""}
                  {address.city}, {address.state} - {address.postalCode}
                </p>

                <div className="mt-2 flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-700">
                  <Phone size={13} className="text-gray-500" />
                  <span>{address.mobile}</span>
                </div>
              </div>
            </div>

            {/* Product Item Cards (Screenshot 1) */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5"
                >
                  {/* Top discount / assured banner */}
                  <div className="text-[11px] font-extrabold text-emerald-700">
                    Top Discount of the Sale
                  </div>

                  <div className="flex gap-3.5">
                    {/* Product Image */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-contain"
                        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">
                        {item.productName}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Unit: {item.unit} • {item.category}
                      </p>

                      {/* Rating and Assured Pill (Screenshot 1) */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-700 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                          4.5 ★
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          19.8K+
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700">
                          <ShieldCheck size={14} className="fill-blue-600 text-white" />
                          <span>Assured</span>
                        </span>
                      </div>

                      {/* Pricing Row (Screenshot 1) */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-xs font-black text-emerald-700">
                          ↓ 20%
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatMoney(item.originalPriceMinor * item.quantity)}
                        </span>
                        <span className="text-sm sm:text-base font-black text-gray-900">
                          {formatMoney(item.priceMinor * item.quantity)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500">
                        +₹49 Protect Promise &amp; Unloading Fee &gt;
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper (Screenshot 1: [ - ] 1 [ + ]) */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1 rounded-xl border border-gray-300 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:scale-95"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-black text-xs text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="text-right text-xs font-bold text-gray-500">
                      Total: <span className="font-black text-gray-900">{formatMoney(item.priceMinor * item.quantity)}</span>
                    </div>
                  </div>

                  {/* Delivery Date Notice (Screenshot 1) */}
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 text-xs font-medium text-gray-700">
                    <Truck size={16} className="text-etukas-red shrink-0" />
                    <span>
                      Delivery by <strong>Tomorrow, 4:00 PM</strong> (Direct Site Unloading)
                    </span>
                  </div>

                  {/* Open Box Delivery will be done (Screenshot 1) */}
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <Package size={15} className="text-gray-600 shrink-0" />
                      <span className="font-semibold">Site Quality Inspection will be done</span>
                    </div>
                    <span className="text-gray-400 font-bold">&gt;</span>
                  </div>
                </div>
              ))}
            </div>

            {/* WOW! Savings Zone (Screenshot 1) */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    WOW!
                  </span>
                  <span className="text-xs font-bold text-gray-900">Savings zone</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Coupon 'ETUKAS10' auto-applied! 10% discount included.")}
                  className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>View all coupons and offers</span>
                  <span>&gt;</span>
                </button>
              </div>
            </div>

            {/* Price Details Section (Screenshot 2) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 border-b border-gray-100 pb-2.5">
                Price Details
              </h3>

              <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Selling Price (incl. of all taxes)</span>
                  <span className="font-semibold text-gray-900">{formatMoney(sellingPriceMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protect Promise &amp; Handling Fee (1)</span>
                  <span className="font-semibold text-gray-900">{formatMoney(protectPromiseFeeMinor)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount on Selling Price</span>
                  <span className="font-bold">-{formatMoney(discountMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-emerald-700">
                    {deliveryFeeMinor === 0 ? "FREE" : formatMoney(deliveryFeeMinor)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-gray-200 pt-2.5 text-sm sm:text-base font-black text-gray-900">
                  <span>Total Amount</span>
                  <span>{formatMoney(totalAmountMinor)}</span>
                </div>
              </div>

              {/* Green Savings Banner (Screenshot 2) */}
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                <Sparkles size={14} className="text-emerald-600" />
                <span>You'll Save {formatMoney(totalSavingsMinor)} on this order</span>
              </div>

              {/* Safe and secure payments trust badge (Screenshot 2) */}
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 text-[11px] text-gray-600">
                <ShieldCheck size={18} className="text-gray-500 shrink-0" />
                <span>Safe and secure site fulfillment. 100% Authentic building materials.</span>
              </div>

              {/* GST Input Credit Option (Screenshot 2) */}
              <div className="rounded-xl border border-dashed border-gray-300 p-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      Claim up to 28% GST input credit on business purchases
                    </p>
                    {gstinNumber && (
                      <p className="font-mono text-xs font-bold text-emerald-700 mt-0.5">
                        GSTIN: {gstinNumber}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const input = window.prompt("Enter GSTIN Number for B2B input tax invoice:", gstinNumber || "37AAAAA0000A1Z5");
                      if (input !== null) setGstinNumber(input.trim());
                    }}
                    className="text-xs font-bold text-blue-700 underline shrink-0 ml-2"
                  >
                    {gstinNumber ? "Change GSTIN" : "Add GSTIN number"}
                  </button>
                </div>
              </div>

              {/* Terms of Use Disclaimer (Screenshot 2) */}
              <p className="text-[10px] text-gray-400 text-center leading-normal">
                By proceeding, you confirm that you agree to Etukas{" "}
                <Link to="/terms" className="text-blue-600 underline">Terms of Use</Link> and{" "}
                <Link to="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: PAYMENTS (Screenshot 3 - Cash on Delivery FIRST & ACTIVE) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Total Amount Dropdown Banner (Screenshot 3) */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-xs flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1">
                <span>Total Amount</span>
                <ChevronDown size={16} className="text-gray-500" />
              </span>
              <span className="text-base sm:text-lg font-black text-gray-900">
                {formatMoney(totalAmountMinor)}
              </span>
            </div>

            {/* Instant discount promo banner (Screenshot 3) */}
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold">
              <Tag size={15} className="text-emerald-700 shrink-0" />
              <div>
                <strong>Special Etukas Offer Applied:</strong> Zero upfront payment required on Cash on Delivery orders!
              </div>
            </div>

            {/* Payment Options Accordion */}
            <div className="space-y-2.5">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* REQUIREMENT 2: Cash on Delivery FIRST, ENABLED & ADJUSTED    */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div
                className={`rounded-2xl border-2 transition-all overflow-hidden ${
                  selectedPayment === "COD"
                    ? "border-etukas-red bg-white shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment("COD");
                    setIsCodExpanded(!isCodExpanded);
                  }}
                  className="flex w-full items-center justify-between p-4 text-left font-bold"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                      <Banknote size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-gray-900">Cash on Delivery</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                        Pay cash or UPI directly to driver at site after unloading
                      </p>
                    </div>
                  </div>
                  {isCodExpanded ? (
                    <ChevronUp size={18} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-500" />
                  )}
                </button>

                {isCodExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/70 p-4 space-y-3.5">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Due to handling costs, a nominal fee of ₹49 is included for orders placed using Cash on Delivery. Pay at your construction site once material is inspected and unloaded.
                    </p>

                    {/* Prominent Yellow/Red "Place Order" CTA Button (Screenshot 3) */}
                    <button
                      type="button"
                      disabled={orderMutation.isPending}
                      onClick={handlePlaceOrder}
                      className="w-full rounded-2xl bg-[#ffd814] hover:bg-[#f7ca00] text-gray-950 py-3.5 px-6 font-black text-sm sm:text-base shadow-md active:scale-98 transition flex items-center justify-center gap-2"
                    >
                      {orderMutation.isPending ? (
                        <>
                          <Clock size={16} className="animate-spin" />
                          <span>Placing Your Order...</span>
                        </>
                      ) : (
                        <span>Place Order</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* REMAINING PAYMENT OPTIONS: Placed after COD & Disabled        */}
              {/* ───────────────────────────────────────────────────────────── */}

              {/* UPI */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-gray-700">UPI (GPay / PhonePe / Paytm)</span>
                        <span className="rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Online gateway integration in progress • Use Cash on Delivery
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit / Debit Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Credit / Debit / ATM Card</span>
                        <span className="rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Add &amp; secure cards as per RBI guidelines
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* EMI */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-gray-700">EMI &amp; Pay Later</span>
                        <span className="rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Cardless and bank EMIs for bulk site orders
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Banking */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-gray-700">Net Banking</span>
                        <span className="rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        All Indian Banks supported
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Floating Sticky Bar (Flipkart Style matching Screenshot 1 & 2) ─── */}
      {currentStep === 2 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
          {/* Green Savings Banner Strip (Screenshot 1 & 2) */}
          <div className="bg-emerald-50/90 border-b border-emerald-100 px-4 py-1.5 text-center text-[11px] font-bold text-emerald-800">
            You'll save {formatMoney(totalSavingsMinor)} on this order
          </div>

          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <div className="text-xs text-gray-400 line-through">
                {formatMoney(sellingPriceMinor)}
              </div>
              <div className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                {formatMoney(totalAmountMinor)}
              </div>
            </div>

            {/* Yellow / Etukas Red "Continue" Button (Screenshot 1 & 2) */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="rounded-2xl bg-[#ffd814] hover:bg-[#f7ca00] text-gray-950 px-8 sm:px-12 py-3 text-sm font-black shadow-md transition active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

