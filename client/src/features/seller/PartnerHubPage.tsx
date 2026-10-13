import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Factory,
  Handshake,
  HelpCircle,
  LocateFixed,
  MapPin,
  Phone,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Upload,
  User,
  Wrench,
  X
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  sellerRegStep1Schema,
  sellerRegStep2Schema,
  type SellerRegStep1Input,
  type SellerRegStep2Input
} from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError, marketplaceApi } from "../../services/api";
import type { SellerRegistrationResult } from "../../services/api";

// ---------- step labels ----------

const steps = [
  { label: "Contact Info", icon: Phone },
  { label: "Business Details", icon: Building2 }
];

// ---------- partner categories ----------

const partnerCategories = [
  { id: "seller", label: "Seller", icon: Store, desc: "List and sell building materials" },
  { id: "technician", label: "Technician", icon: Wrench, desc: "Offer repair & installation services" },
  { id: "manufacturer", label: "Manufacturer", icon: Factory, desc: "Supply products at scale" },
  { id: "equipment-owner", label: "Equipment Owner", icon: Settings2, desc: "Rent out construction equipment" }
];

// ---------- success stories (mock) ----------

const successStories = [
  {
    name: "Rajesh Kumar",
    store: "Sri Lakshmi Cement Depot",
    quote: "Etukas helped me reach 3x more customers in just 2 months!",
    location: "Hyderabad",
    category: "Seller"
  },
  {
    name: "Priya Constructions",
    store: "Priya Building Supplies",
    quote: "Easy onboarding, amazing support. My sales grew by 40%.",
    location: "Bangalore",
    category: "Manufacturer"
  },
  {
    name: "Suresh Electricals",
    store: "Suresh Expert Services",
    quote: "Getting regular service requests through the Etukas Partner Network!",
    location: "Chennai",
    category: "Technician"
  }
];

// ---------- material categories (for sellers) ----------

const materialCategories = [
  "Cement",
  "Iron & Steel",
  "Electricals",
  "Bricks",
  "Sand",
  "Stones",
  "Tiles",
  "Plumbing",
  "Paint",
  "Hardware"
];

// ---------- benefits ----------

const benefits = [
  { icon: TrendingUp, title: "Grow Sales", desc: "Reach thousands of local customers" },
  { icon: Shield, title: "Secure Payments", desc: "Guaranteed on-time settlements" },
  { icon: Truck, title: "Logistics Support", desc: "Delivery coordination assistance" },
  { icon: BadgeCheck, title: "Verified Badge", desc: "Build trust with verification" }
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Quick Registration",
    desc: "Submit your contact and business details online in under 2 minutes. No paperwork hassles.",
    badge: "Instant"
  },
  {
    step: "02",
    title: "Partner ID Generation",
    desc: "Receive your unique Partner ID and access to the dedicated Etukas Partner Dashboard.",
    badge: "Auto Generated"
  },
  {
    step: "03",
    title: "Fast Verification",
    desc: "Our local network team connects to quickly verify your GSTIN/documents and store location.",
    badge: "24-48 Hours"
  },
  {
    step: "04",
    title: "Receive Orders & Grow",
    desc: "List products, accept contractor bulk orders, receive logistics support, and enjoy weekly payouts.",
    badge: "Start Earning"
  }
];

const faqs = [
  {
    q: "Who is eligible to join the Etukas Partner Network?",
    a: "Any verified building material merchant, certified electrical/plumbing technician, material manufacturing factory, or construction equipment owner can partner with Etukas."
  },
  {
    q: "Is there any upfront fee or registration charge?",
    a: "No! Joining the Etukas Partner Network is 100% free with zero upfront charges or hidden subscription fees. You only pay a standard nominal fee upon successful orders."
  },
  {
    q: "How are payments settled to partners?",
    a: "All payments are credited directly into your verified bank account via automated weekly NEFT/RTGS settlement cycles upon successful order dispatch and delivery."
  },
  {
    q: "Do I need a commercial vehicle or transport for deliveries?",
    a: "No. If you don't have dedicated transportation, Etukas coordinates with verified on-demand local truck & transport fleets to pick up materials and deliver directly to the client's construction site."
  },
  {
    q: "Can I sell multiple categories of materials?",
    a: "Yes! Sellers and manufacturers can list multiple construction material categories, including cement, steel (TMT), electricals, plumbing, tiles, sand, and bricks."
  }
];

// ---------- main component ----------

export function PartnerHubPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] =
    useState<SellerRegistrationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccessPass, setShowSuccessPass] = useState(false);
  const [selectedPartnerCategory, setSelectedPartnerCategory] = useState<string>("seller");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Step 1: Contact info
  const step1Form = useForm<SellerRegStep1Input>({
    resolver: zodResolver(sellerRegStep1Schema),
    defaultValues: { contactPerson: "", mobile: "", email: "" }
  });

  const step1Mutation = useMutation({
    mutationFn: marketplaceApi.sellerRegStep1,
    onSuccess: (data) => {
      setUserId(data.userId ?? null);
      setRegistrationResult(data);
      if (data.registrationStep === 2) {
        // Already completed step 2 before
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details && typeof error.details === "object" && "fieldErrors" in error.details) {
        const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          const message = messages[0];
          if (message) step1Form.setError(field as keyof SellerRegStep1Input, { type: "server", message });
        }
      }
    }
  });

  // Step 2: Business details
  const step2Form = useForm<SellerRegStep2Input>({
    resolver: zodResolver(sellerRegStep2Schema),
    defaultValues: {
      businessName: "",
      businessType: "RETAILER",
      gstin: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      storeName: "",
      storePhone: "",
      latitude: undefined,
      longitude: undefined,
      storeImageBase64: undefined
    }
  });

  const step2Mutation = useMutation({
    mutationFn: (values: SellerRegStep2Input) =>
      marketplaceApi.sellerRegStep2({ ...values, userId }),
    onSuccess: (data) => {
      setRegistrationResult((prev) => ({
        ...prev,
        ...data,
        tempPassword: prev?.tempPassword || data.tempPassword
      }));
      setCurrentStep(2);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details && typeof error.details === "object" && "fieldErrors" in error.details) {
        const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          const message = messages[0];
          if (message) step2Form.setError(field as keyof SellerRegStep2Input, { type: "server", message });
        }
      }
    }
  });

  // Location
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [locationErr, setLocationErr] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const useCurrentLocation = useCallback(() => {
    setLocationMsg(null);
    setLocationErr(null);
    if (!navigator.geolocation) {
      setLocationErr("Geolocation not supported. Enter coordinates manually.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        step2Form.setValue("latitude", Number(pos.coords.latitude.toFixed(7)), { shouldDirty: true, shouldValidate: true });
        step2Form.setValue("longitude", Number(pos.coords.longitude.toFixed(7)), { shouldDirty: true, shouldValidate: true });
        setLocationMsg("Location captured! Confirm it matches your store.");
        setIsLocating(false);
      },
      (err) => {
        setLocationErr(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : "Could not detect location. Enter manually."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [step2Form]);

  // Image upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        step2Form.setValue("storeImageBase64", base64);
      };
      reader.readAsDataURL(file);
    },
    [step2Form]
  );

  const removeImage = () => {
    setImagePreview(null);
    step2Form.setValue("storeImageBase64", undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Copy helper
  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Hero banner */}
      <section id="overview" className="relative overflow-hidden bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-4 py-12 text-white md:py-20">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, #e94560 0%, transparent 50%), radial-gradient(circle at 75% 50%, #f97316 0%, transparent 50%)" }} />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                <Handshake size={16} /> Etukas Partner Network
              </div>
              <h1 className="text-3xl font-extrabold leading-tight md:text-4xl lg:text-5xl">
                Become an{" "}
                <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Etukas Partner
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-lg font-medium text-orange-300">
                Grow Your Business with Etukas.
              </p>
              <p className="mt-2 max-w-lg text-gray-300">
                Join the Etukas Partner Network as a Seller, Technician, Manufacturer, or Equipment Owner.
                Reach lakhs of customers across India.
              </p>

              {/* Partner category pills */}
              <div className="mt-6 flex flex-wrap gap-2">
                {partnerCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedPartnerCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      selectedPartnerCategory === cat.id
                        ? "bg-white text-gray-900 shadow-lg"
                        : "border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10"
                    }`}
                  >
                    <cat.icon size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Selected category description */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <p className="text-sm text-gray-300">
                  {partnerCategories.find(c => c.id === selectedPartnerCategory)?.desc}
                </p>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/10"
                  >
                    <item.icon size={24} className="text-orange-400" />
                    <p className="mt-2 text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content - Partner Registration Form */}
      <div id="partner-registration" className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: registration form */}
          <div>
            {/* Section header */}
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">Partner Registration</h2>
              <p className="mt-1 text-gray-500">Complete the steps below to join the Etukas Partner Network</p>
            </div>

            {/* Stepper */}
            <div className="mb-8 flex items-center gap-4">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                      i < currentStep
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                        : i === currentStep
                          ? "bg-gradient-to-br from-[#e94560] to-[#f97316] text-white shadow-lg shadow-orange-500/30"
                          : "border-2 border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {i < currentStep ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <step.icon size={18} />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-sm font-semibold ${
                        i <= currentStep ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      Step {i + 1} of {steps.length}
                    </p>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`mx-2 hidden h-0.5 w-16 rounded-full sm:block ${
                        i < currentStep
                          ? "bg-gradient-to-r from-green-400 to-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Contact Info */}
            {currentStep === 0 && (
              <form
                onSubmit={step1Form.handleSubmit((values) =>
                  step1Mutation.mutate(values)
                )}
                className="animate-fadeIn rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50 md:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#e94560] to-[#f97316] text-white">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">
                      Contact Information
                    </h2>
                    <p className="text-sm text-gray-500">
                      Enter your details to become an Etukas Partner
                    </p>
                  </div>
                </div>

                {/* Partner category selector in form */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Partner Category *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {partnerCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedPartnerCategory(cat.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
                          selectedPartnerCategory === cat.id
                            ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <cat.icon size={20} />
                        <span className="text-xs font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Note:</strong> OTP verification is disabled for now. Your mobile
                  number will be saved directly.
                </p>

                <div className="space-y-5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Your Name *
                    <Input
                      className="mt-2"
                      placeholder="e.g. Rajesh Kumar"
                      {...step1Form.register("contactPerson")}
                    />
                    <span className="mt-1 block text-sm text-red-500">
                      {step1Form.formState.errors.contactPerson?.message}
                    </span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Mobile Number *
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        +91
                      </span>
                      <Input
                        className="pl-12"
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        maxLength={10}
                        {...step1Form.register("mobile")}
                      />
                    </div>
                    <span className="mt-1 block text-sm text-red-500">
                      {step1Form.formState.errors.mobile?.message}
                    </span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address *
                    <Input
                      className="mt-2"
                      type="email"
                      placeholder="partner@example.com"
                      {...step1Form.register("email")}
                    />
                    <span className="mt-1 block text-sm text-red-500">
                      {step1Form.formState.errors.email?.message}
                    </span>
                  </label>
                </div>

                {step1Mutation.error && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {step1Mutation.error.message}
                  </p>
                )}

                <Button
                  className="mt-6 w-full bg-gradient-to-r from-[#e94560] to-[#f97316] text-white hover:opacity-90"
                  disabled={step1Mutation.isPending}
                >
                  {step1Mutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      Register & Continue <ArrowRight size={18} />
                    </>
                  )}
                </Button>

                <p className="mt-4 text-center text-xs text-gray-400">
                  By continuing, you agree to Etukas{" "}
                  <a href="#" className="text-blue-500 underline">Terms of Use</a>{" "}
                  &amp;{" "}
                  <a href="#" className="text-blue-500 underline">Privacy Policy</a>
                </p>
              </form>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 1 && (
              <form
                onSubmit={step2Form.handleSubmit((values) =>
                  step2Mutation.mutate(values)
                )}
                className="animate-fadeIn rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50 md:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#e94560] to-[#f97316] text-white">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">
                      Business Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      Tell us about your business or service
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Business Name *
                    <Input className="mt-2" placeholder="e.g. Sri Lakshmi Cement Depot" {...step2Form.register("businessName")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.businessName?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Business Type *
                    <select
                      className="focus-ring mt-2 h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none"
                      {...step2Form.register("businessType")}
                    >
                      <option value="RETAILER">Retailer</option>
                      <option value="WHOLESALER">Wholesaler</option>
                      <option value="MANUFACTURER">Manufacturer</option>
                    </select>
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.businessType?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    GSTIN <span className="font-normal text-gray-400">(optional)</span>
                    <Input className="mt-2" placeholder="22ABCDE1234F1Z5" {...step2Form.register("gstin")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.gstin?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Store / Office Name *
                    <Input className="mt-2" placeholder="e.g. Sai Building Materials" {...step2Form.register("storeName")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.storeName?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Business Phone *
                    <Input className="mt-2" type="tel" placeholder="9876543210" {...step2Form.register("storePhone")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.storePhone?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700 md:col-span-2">
                    Business Address *
                    <Input className="mt-2" placeholder="Shop No. 12, Market Road" {...step2Form.register("addressLine1")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.addressLine1?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    City *
                    <Input className="mt-2" placeholder="Hyderabad" {...step2Form.register("city")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.city?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    State *
                    <Input className="mt-2" placeholder="Telangana" {...step2Form.register("state")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.state?.message}</span>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Postal Code *
                    <Input className="mt-2" placeholder="500001" {...step2Form.register("postalCode")} />
                    <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.postalCode?.message}</span>
                  </label>
                </div>

                {/* Location */}
                <section className="mt-8 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <MapPin size={20} className="text-blue-500" />
                    Business Location
                    <span className="text-sm font-normal text-gray-400">(recommended)</span>
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Helps customers find your business nearby. You can use GPS or enter manually.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Latitude
                      <Input className="mt-2" inputMode="decimal" placeholder="17.3850440" {...step2Form.register("latitude")} />
                      <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.latitude?.message}</span>
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      Longitude
                      <Input className="mt-2" inputMode="decimal" placeholder="78.4866710" {...step2Form.register("longitude")} />
                      <span className="mt-1 block text-sm text-red-500">{step2Form.formState.errors.longitude?.message}</span>
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={useCurrentLocation}
                    disabled={isLocating}
                  >
                    <LocateFixed size={18} />
                    {isLocating ? "Detecting..." : "Use My Live Location"}
                  </Button>

                  {locationMsg && (
                    <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{locationMsg}</p>
                  )}
                  {locationErr && (
                    <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{locationErr}</p>
                  )}
                </section>

                {/* Store Image Upload */}
                <section className="mt-6 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Camera size={20} className="text-purple-500" />
                    Business Photo
                    <span className="text-sm font-normal text-gray-400">(optional)</span>
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Upload a photo of your store or business. Etukas will automatically optimize the image size.
                  </p>

                  {imagePreview ? (
                    <div className="relative mt-4 inline-block">
                      <img
                        src={imagePreview}
                        alt="Store preview"
                        className="h-48 w-auto rounded-xl border border-gray-200 object-cover shadow-md"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="mt-4 flex h-48 w-full max-w-xs cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-white transition hover:border-purple-400 hover:bg-purple-50/50"
                    >
                      <div className="text-center">
                        <Upload size={32} className="mx-auto text-purple-400" />
                        <p className="mt-2 text-sm font-medium text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                      </div>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </section>

                {step2Mutation.error && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {step2Mutation.error.message}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCurrentStep(0)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#e94560] to-[#f97316] text-white hover:opacity-90"
                    disabled={step2Mutation.isPending}
                  >
                    {step2Mutation.isPending ? (
                      "Submitting..."
                    ) : (
                      <>
                        Submit & Register <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Success */}
            {currentStep === 2 && registrationResult && (
              <div className="animate-fadeIn rounded-2xl border border-green-100 bg-white p-6 shadow-xl shadow-green-100/50 md:p-8">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30">
                    <CheckCircle2 size={40} className="text-white" />
                  </div>
                  <h2 className="mt-5 text-2xl font-extrabold text-gray-900">
                    Welcome to the Etukas Partner Network! 🎉
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Our team will connect with you shortly for verification.
                  </p>
                </div>

                <div className="mt-8 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
                  <h3 className="text-lg font-bold text-gray-900">Your Partner Credentials</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-400">Partner ID</p>
                        <p className="mt-1 text-xl font-extrabold tracking-wider text-blue-600">
                          {registrationResult.sellerId}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(registrationResult.sellerId, "sellerId")}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        <Copy size={14} />
                        {copiedField === "sellerId" ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-400">Username (Email)</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {registrationResult.email || registrationResult.username}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(registrationResult.email || registrationResult.username || "", "email")}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        <Copy size={14} />
                        {copiedField === "email" ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    {registrationResult.tempPassword && (
                      <div className="flex items-center justify-between rounded-lg bg-amber-50 p-4 shadow-sm">
                        <div>
                          <p className="text-xs font-medium uppercase text-amber-600">
                            Temporary Password
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="font-mono text-lg font-bold text-gray-900">
                              {showSuccessPass ? registrationResult.tempPassword : "••••••••••"}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowSuccessPass(!showSuccessPass)}
                              className="text-amber-800 hover:text-black p-1"
                              aria-label="Toggle password view"
                            >
                              {showSuccessPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-amber-600">
                            Save this! You'll need it to login.
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(registrationResult.tempPassword!, "password")}
                          className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          <Copy size={14} />
                          {copiedField === "password" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event("open_partner_login"));
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e94560] to-[#f97316] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:opacity-90 cursor-pointer"
                >
                  Login & Explore Etukas Partner Dashboard{" "}
                  <ExternalLink size={18} />
                </button>

                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>What happens next?</strong>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>✅ Our team will verify your details within 24-48 hours</li>
                    <li>✅ You'll get a call/WhatsApp for document verification</li>
                    <li>✅ Once approved, you can start your partnership and grow!</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            {/* Partner Network Stats */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-100/50">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <Handshake size={18} className="text-orange-500" />
                Etukas Partner Network
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-orange-50 p-3 text-center">
                  <p className="text-2xl font-black text-orange-600">500+</p>
                  <p className="text-[11px] font-semibold text-gray-600">Active Partners</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-2xl font-black text-green-600">25+</p>
                  <p className="text-[11px] font-semibold text-gray-600">Cities</p>
                </div>
              </div>
            </div>

            {/* Partner Success Stories */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-100/50">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <TrendingUp size={18} className="text-green-500" />
                Partner Success Stories
              </h3>
              <div className="mt-4 space-y-4">
                {successStories.map((story) => (
                  <div key={story.name} className="rounded-xl bg-gradient-to-br from-gray-50 to-orange-50/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-400 text-sm font-bold text-white">
                        {story.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{story.name}</p>
                        <p className="text-xs text-gray-500">{story.store}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm italic text-gray-600">"{story.quote}"</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-400">📍 {story.location}</p>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">{story.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories for Sellers */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-100/50">
              <h3 className="font-bold text-gray-900">Popular Material Categories</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {materialCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-6 text-white shadow-lg">
              <h3 className="font-bold">Need Help?</h3>
              <p className="mt-2 text-sm text-gray-300">
                Call our partner support team
              </p>
              <a
                href="tel:+911234567890"
                className="mt-3 flex items-center gap-2 text-lg font-bold text-orange-400"
              >
                <Phone size={18} /> 1800-XXX-XXXX
              </a>
              <p className="mt-1 text-xs text-gray-400">
                Mon-Sat, 9 AM - 9 PM
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* SECTION: Categories */}
      <section id="categories" className="border-t border-gray-100 bg-white py-16 px-4 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-orange-700">
              <Sparkles size={14} /> Four Ways to Partner
            </span>
            <h2 className="mt-3 text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">
              Partner Categories Tailored for Your Trade
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Whether you sell bricks, repair plumbing, manufacture steel, or rent earthmovers — Etukas Partner Network is built to scale your business.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Seller */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition-all duration-300 hover:border-orange-300 hover:bg-white hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <Store size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">1. Sellers & Retailers</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Cement, TMT Steel, AAC Blocks, Bricks, Tiles, Electricals, and Hardware stores. Get direct bulk orders from local builders and homeowners.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Digital Storefront & Pricing Control</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Direct Site Bulk Dispatch</span>
                </li>
              </ul>
            </div>

            {/* 2. Technician */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition-all duration-300 hover:border-orange-300 hover:bg-white hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Wrench size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">2. Technicians & Pros</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Plumbers, Master Electricians, Civil Supervisors, Carpenters, and Tile Layers. Receive qualified client bookings with guaranteed fair rates.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Steady Daily Service Calls</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>No Middleman Broker Commission</span>
                </li>
              </ul>
            </div>

            {/* 3. Manufacturer */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition-all duration-300 hover:border-orange-300 hover:bg-white hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <Factory size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">3. Manufacturers</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Direct manufacturing mills, block factories, UPVC pipe makers, and paint brands. Distribute in large truckload volumes pan-India.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>B2B Guaranteed Purchase Orders</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Wide Regional Distribution Reach</span>
                </li>
              </ul>
            </div>

            {/* 4. Equipment Owner */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition-all duration-300 hover:border-orange-300 hover:bg-white hover:shadow-xl hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <Settings2 size={24} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">4. Equipment Owners</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                Concrete Mixers, JCB Earthmovers, Scaffolding systems, Cranes, and Core Cutters. Keep machinery rented out with verified contractors.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Zero Idle Downtime</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                  <span>Verified Security & Rental Escrow</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Benefits */}
      <section id="benefits" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 py-16 px-4 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">
              <ShieldCheck size={14} /> Why Etukas Partner
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Grow Your Business with India's Modern Building Network
            </h2>
            <p className="mt-3 text-base text-slate-300">
              We empower partners with verified demand, automated settlements, and technology built specifically for the construction trade.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                <TrendingUp size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Massive High-Intent Demand</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Connect with thousands of builders, civil engineers, and property owners seeking materials in your immediate pin codes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                <Shield size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Guaranteed Payout Security</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Zero bad debt. Enjoy automated weekly direct-to-bank disbursements upon delivery verification without chasing payments.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <Truck size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Site Logistics Fleet</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Don't own heavy delivery trucks? Our integrated transport fleet picks up orders directly from your yard and delivers to the job site.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <BadgeCheck size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Verified Partner Status</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Earn the Etukas Verified badge to build instant trust with large residential builders, commercial contractors, and architects.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <Store size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Real-Time Partner Dashboard</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Manage stock levels, update pricing, accept incoming order pings, and view performance metrics from any phone or PC.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <Handshake size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Dedicated Partner Manager</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Get assigned a personal onboarding specialist who speaks your local language and assists with catalog setup and dispute resolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: How It Works */}
      <section id="how-it-works" className="py-16 px-4 bg-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-orange-700">
              <CheckCircle2 size={14} /> Easy Onboarding
            </span>
            <h2 className="mt-3 text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">
              How to Become an Etukas Partner in 4 Steps
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Start receiving orders and inquiries within 24 to 48 hours of submitting your registration.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map(({ step, title, desc, badge }) => (
              <div
                key={step}
                className="relative rounded-2xl border border-gray-200/80 bg-gray-50/70 p-6 transition-all hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xl font-black text-orange-500/70">{step}</span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: Success Stories */}
      <section id="stories" className="border-t border-gray-100 bg-gray-50/60 py-16 px-4 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3.5 py-1 text-xs font-bold text-green-700">
              <TrendingUp size={14} /> Partner Testimonials
            </span>
            <h2 className="mt-3 text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">
              Trusted by Hundreds of Construction Businesses
            </h2>
            <p className="mt-3 text-base text-gray-600">
              See what verified sellers, contractors, and manufacturers say about partnering with Etukas.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {successStories.map((story) => (
              <div
                key={story.name}
                className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 font-bold text-white shadow-md shadow-orange-500/20">
                    {story.name[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{story.name}</h4>
                    <p className="text-xs text-gray-500">{story.store}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm italic text-gray-700 leading-relaxed">
                  "{story.quote}"
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400">📍 {story.location}</span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
                    {story.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: FAQs */}
      <section id="faqs" className="bg-white py-16 px-4 lg:px-8 border-t border-gray-100">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3.5 py-1 text-xs font-bold text-orange-700">
              <HelpCircle size={14} /> Got Questions?
            </span>
            <h2 className="mt-3 text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Quick answers to common questions about joining the Etukas Partner Network.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={faq.q}
                className="overflow-hidden rounded-xl border border-gray-200 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="flex w-full items-center justify-between bg-gray-50/70 px-5 py-4 text-left text-sm font-bold text-gray-900 hover:bg-gray-100/70"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp size={18} className="text-orange-500 shrink-0 ml-3" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 shrink-0 ml-3" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="border-t border-gray-100 bg-white px-5 py-4 text-xs leading-relaxed text-gray-600 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Call to Action */}
          <div className="mt-14 rounded-3xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 text-center text-white shadow-xl sm:p-12">
            <h3 className="text-2xl font-black sm:text-3xl">
              Ready to Grow Your Business with Etukas?
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-300">
              Join India's dedicated construction ecosystem today. Submit your registration in under 2 minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const regEl = document.getElementById("partner-registration");
                  if (regEl) regEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e94560] to-[#f97316] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all"
              >
                <span>Register as an Etukas Partner</span>
                <ArrowRight size={16} />
              </button>
              <a
                href="tel:18001234567"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                <Phone size={16} />
                <span>Call Partner Support</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Inline animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </main>
  );
}
