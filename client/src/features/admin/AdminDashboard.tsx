import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, BadgeAlert, BadgeCheck, CheckCircle2, Clock, ExternalLink, Handshake, Headphones, ImagePlus, LayoutDashboard, LogOut, MapPin, MessageSquareText, PackageCheck, PanelsTopLeft, Phone, Search, ShoppingBag, Trash2, Truck, UserCheck, X } from "lucide-react";
import { marketplaceApi, clearSession, getStoredUser, type AdminSeller, type HomepageBanner, type HomepageBannerInput, type OrderRecord, type SellerEnquiry, type User } from "../../services/api";
import { DeliveryStepsTracker } from "../checkout/DeliveryStepsTracker";
import { AdminNotificationsDropdown } from "./AdminNotificationsDropdown";
import { AdminLiveChat } from "./AdminLiveChat";

const emptyBanner: HomepageBannerInput = {
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
  mobileImageUrl: null,
  linkUrl: null,
  sortOrder: 0,
  isActive: true
};

const validSections = ["dashboard", "partners", "orders", "banners", "enquiries"];

function coordinate(value: AdminSeller["stores"][number]["latitude"]) {
  return value === null || value === undefined ? null : String(value);
}

function mapUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const delimiter = result.indexOf(",");
      if (delimiter < 0) reject(new Error("Could not read the selected image."));
      else resolve(result.slice(delimiter + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: async () => {
      const user = await marketplaceApi.login({ identifier: identifier.trim(), password });
      if (!user.roles.includes("ADMIN")) {
        await marketplaceApi.logout();
        throw new Error("This account does not have administrator access.");
      }
      return user;
    },
    onSuccess: onLogin
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <form
        className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <h1 className="text-2xl font-extrabold">Etukas Admin</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in with an administrator account to manage partners and homepage banners.</p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input
            required
            autoComplete="username"
            type="email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            required
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        {login.error ? <p role="alert" className="mt-4 text-sm text-red-700">{login.error.message}</p> : null}
        <button disabled={login.isPending} className="mt-5 w-full rounded-md bg-etukas-red px-4 py-2 font-bold text-white disabled:opacity-60">
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function SellerCard({ seller, onStatusChange, isPending }: {
  seller: AdminSeller;
  onStatusChange: (seller: AdminSeller, status: "PENDING" | "APPROVED" | "REJECTED") => void;
  isPending: boolean;
}) {
  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{seller.businessName || seller.contactPerson}</h3>
          <p className="mt-1 text-sm text-gray-600">{seller.contactPerson} · {seller.businessType}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          seller.verificationStatus === "APPROVED"
            ? "bg-green-100 text-green-800 border border-green-300"
            : seller.verificationStatus === "REJECTED"
            ? "bg-red-100 text-red-800 border border-red-300"
            : "bg-amber-100 text-amber-800 border border-amber-300"
        }`}>
          {seller.verificationStatus === "APPROVED" ? "✓ APPROVED" : seller.verificationStatus === "REJECTED" ? "✕ REJECTED" : "⏳ PENDING"}
        </span>
      </div>
      <p className="mt-3 text-sm">{seller.user.email} · {seller.user.mobile}</p>
      {seller.sellerId ? <p className="mt-1 text-xs text-gray-500">Partner ID: {seller.sellerId}</p> : null}
      {seller.gstin ? <p className="mt-1 text-xs text-gray-500">GSTIN: {seller.gstin}</p> : null}
      {seller.rejectionReason ? <p className="mt-2 text-sm text-red-700">Reason: {seller.rejectionReason}</p> : null}
      <div className="mt-4 space-y-3">
        {seller.stores.map((store) => {
          const latitude = coordinate(store.latitude);
          const longitude = coordinate(store.longitude);
          return (
            <div key={store.id} className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="font-semibold">{store.name} <span className="font-normal text-gray-500">({store.isActive ? "active" : "inactive"})</span></p>
              <p className="mt-1 text-gray-600">{store.addressLine1}, {store.city}, {store.state} {store.postalCode}</p>
              <p className="text-gray-600">{store.phone}</p>
              {latitude && longitude ? (
                <a className="mt-2 inline-flex items-center gap-1 font-semibold text-etukas-red" href={mapUrl(latitude, longitude)} target="_blank" rel="noreferrer">
                  Open location <ExternalLink size={14} />
                </a>
              ) : <p className="mt-2 text-xs text-gray-500">Coordinates not provided</p>}
            </div>
          );
        })}
        {seller.stores.length === 0 ? <p className="text-sm text-gray-500">No store location has been submitted.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={isPending} onClick={() => onStatusChange(seller, "APPROVED")} className="rounded-md bg-green-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve partner</button>
        <button disabled={isPending} onClick={() => onStatusChange(seller, "REJECTED")} className="rounded-md bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Reject</button>
        {seller.verificationStatus !== "PENDING" ? (
          <button disabled={isPending} onClick={() => onStatusChange(seller, "PENDING")} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-bold disabled:opacity-50">Set pending</button>
        ) : null}
      </div>
    </article>
  );
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { section: routeSection } = useParams<{ section?: string }>();
  const activeSection = validSections.includes(routeSection ?? "") ? routeSection! : "dashboard";
  const [sessionUser, setSessionUser] = useState<User | null>(() => getStoredUser());
  const [draft, setDraft] = useState<HomepageBannerInput>(emptyBanner);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [adBannerSection, setAdBannerSection] = useState(1);
  const [adBannerNumber, setAdBannerNumber] = useState(1);
  const [adBannerFile, setAdBannerFile] = useState<File | null>(null);
  const [adBannerFileError, setAdBannerFileError] = useState<string | null>(null);
  const [adBannerPreview, setAdBannerPreview] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState("");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [enquiryTab, setEnquiryTab] = useState<"chat" | "leads">("chat");
  const [chatInitialSessionId, setChatInitialSessionId] = useState<string | null>(null);

  // Orders & live tracking
  const [orderFilter, setOrderFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<OrderRecord | null>(null);
  const [adminNewStatus, setAdminNewStatus] = useState<string>("CONFIRMED");
  const [adminVehicleNo, setAdminVehicleNo] = useState("");
  const [adminDriverName, setAdminDriverName] = useState("");
  const [adminDriverPhone, setAdminDriverPhone] = useState("");
  const [adminRejectionReason, setAdminRejectionReason] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const adminOrders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => marketplaceApi.getAdminOrders().catch(() => []),
    enabled: Boolean(sessionUser),
    refetchInterval: 5000
  });

  const updateAdminOrderTracking = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      marketplaceApi.updateAdminOrderTracking(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setSelectedAdminOrder(null);
    }
  });

  const me = useQuery({ queryKey: ["admin", "me"], queryFn: marketplaceApi.me, enabled: Boolean(sessionUser), retry: false });
  const sellers = useQuery({ queryKey: ["admin", "sellers"], queryFn: marketplaceApi.adminSellers, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const banners = useQuery({ queryKey: ["admin", "banners"], queryFn: marketplaceApi.adminBanners, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const adBanners = useQuery({ queryKey: ["admin", "ad-banners"], queryFn: marketplaceApi.adminAdBanners, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const enquiries = useQuery({ queryKey: ["admin", "seller-enquiries"], queryFn: marketplaceApi.adminSellerEnquiries, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const chatSessions = useQuery({
    queryKey: ["admin", "chat", "sessions"],
    queryFn: marketplaceApi.adminChatSessions,
    enabled: Boolean(me.data?.roles.includes("ADMIN")),
    refetchInterval: 5000
  });
  const selectedEnquiry = useQuery({
    queryKey: ["admin", "seller-enquiries", selectedEnquiryId],
    queryFn: () => marketplaceApi.adminSellerEnquiry(selectedEnquiryId!),
    enabled: Boolean(me.data?.roles.includes("ADMIN") && selectedEnquiryId)
  });

  useEffect(() => {
    if (!adBannerFile) {
      setAdBannerPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(adBannerFile);
    setAdBannerPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [adBannerFile]);

  const handleNotificationNavigate = (section: string, detailId?: string) => {
    navigate(`/admin-dashboard/${section}`);
    if (section === "enquiries") {
      if (detailId) {
        const isEnquiry = enquiries.data?.some((e) => e.id === detailId);
        if (isEnquiry) {
          setEnquiryTab("leads");
          setSelectedEnquiryId(detailId);
        } else {
          setEnquiryTab("chat");
          setChatInitialSessionId(detailId);
        }
      } else {
        setEnquiryTab("chat");
      }
    }
  };

  useEffect(() => {
    if (me.isError) {
      clearSession();
      setSessionUser(null);
    }
  }, [me.isError]);
  useEffect(() => {
    if (!validSections.includes(routeSection ?? "")) navigate("/admin-dashboard/dashboard", { replace: true });
    window.scrollTo({ top: 0 });
  }, [navigate, routeSection]);
  useEffect(() => {
    if (me.data && !me.data.roles.includes("ADMIN")) {
      clearSession();
      setSessionUser(null);
    }
  }, [me.data]);

  const sellerStatus = useMutation({
    mutationFn: ({ seller, status }: { seller: AdminSeller; status: "PENDING" | "APPROVED" | "REJECTED" }) => {
      const rejectionReason = status === "REJECTED" ? window.prompt("Optional rejection reason:") : undefined;
      if (status === "REJECTED" && rejectionReason === null) return Promise.reject(new Error("Rejection cancelled."));
      return marketplaceApi.adminUpdateSellerStatus(seller.id, status, rejectionReason ?? undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] })
  });

  const saveBanner = useMutation({
    mutationFn: async () => {
      if (imageFile && imageFile.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
      let imageUrl = draft.imageUrl;
      if (imageFile) {
        const imageData = await imageToBase64(imageFile);
        imageUrl = (await marketplaceApi.adminUploadBannerImage({ contentType: imageFile.type, imageData })).url;
      }
      if (!imageUrl) throw new Error("Select a banner image before saving.");
      const input = {
        ...draft,
        title: draft.title.trim(),
        imageUrl,
        mobileImageUrl: draft.mobileImageUrl || null,
        linkUrl: draft.linkUrl || null,
        sortOrder: Number(draft.sortOrder)
      };
      return editingId ? marketplaceApi.adminUpdateBanner(editingId, input) : marketplaceApi.adminCreateBanner(input);
    },
    onSuccess: () => {
      setDraft(emptyBanner);
      setEditingId(null);
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "banners"] });
    }
  });
  const deleteBanner = useMutation({
    mutationFn: marketplaceApi.adminDeleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "banners"] });
    }
  });
  const saveAdBanner = useMutation({
    mutationFn: async () => {
      if (!adBannerFile) throw new Error("Choose an image to upload.");
      if (adBannerFile.size > 500 * 1024) throw new Error("Choose an image that is 500 KB or smaller.");
      return marketplaceApi.adminCreateAdBanner({
        section: adBannerSection,
        bannerNumber: adBannerNumber,
        contentType: adBannerFile.type,
        imageData: await imageToBase64(adBannerFile)
      });
    },
    onSuccess: () => {
      setAdBannerFile(null);
      setAdBannerFileError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "ad-banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "ad-banners"] });
    }
  });
  const deleteAdBanner = useMutation({
    mutationFn: marketplaceApi.adminDeleteAdBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ad-banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "ad-banners"] });
    }
  });

  if (!sessionUser) return <LoginForm onLogin={setSessionUser} />;
  if (me.isLoading || !me.data) {
    return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-gray-600">Verifying administrator access...</main>;
  }
  if (!me.data.roles.includes("ADMIN")) {
    return <LoginForm onLogin={setSessionUser} />;
  }

  const updateDraft = (updates: Partial<HomepageBannerInput>) => setDraft((current) => ({ ...current, ...updates }));
  const startEditing = (banner: HomepageBanner) => {
    setDraft({
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      linkUrl: banner.linkUrl,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive
    });
    setImageFile(null);
    setEditingId(banner.id);
  };
  const searchTerm = partnerFilter.trim().toLowerCase();
  const filteredSellers = sellers.data?.filter((seller) =>
    `${seller.businessName} ${seller.contactPerson} ${seller.user.email} ${seller.stores.map((store) => `${store.city} ${store.state} ${store.postalCode}`).join(" ")}`
      .toLowerCase()
      .includes(searchTerm)
  );
  const filteredOrders = (adminOrders.data || []).filter((ord: any) => {
    if (orderStatusFilter !== "ALL" && ord.status !== orderStatusFilter) return false;
    if (!orderFilter.trim()) return true;
    const term = orderFilter.trim().toLowerCase();
    const ss = [ord.id, ord.orderNumber, ord.customerName, ord.customerPhone, ord.storeName, ord.sellerId, ord.deliveryAddress?.city, ord.deliveryAddress?.line1].filter(Boolean).join(" ").toLowerCase();
    return ss.includes(term);
  });
  const approvedPartners = sellers.data?.filter((seller) => seller.verificationStatus === "APPROVED").length ?? 0;
  const pendingPartners = sellers.data?.filter((seller) => seller.verificationStatus === "PENDING").length ?? 0;
  const openChatCount = chatSessions.data?.filter((s) => s.status === "OPEN").length ?? 0;
  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "partners", label: "Partners", icon: Handshake },
    { id: "orders", label: "Orders & Live Tracking", icon: ShoppingBag, badge: (adminOrders.data || []).filter((o: any) => o.status !== "DELIVERED" && o.status !== "REJECTED").length },
    { id: "banners", label: "Homepage banners", icon: PanelsTopLeft },
    { id: "enquiries", label: "Enquiries & Live Chat", icon: MessageSquareText, badge: openChatCount }
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-etukas-black md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <Link to="/admin-dashboard/dashboard" className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
          <img src="/etukas-logo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-xl font-extrabold tracking-tight">Etukas <span className="text-etukas-red">Admin</span></span>
        </Link>
        <nav aria-label="Admin navigation" className="space-y-1 px-3 py-5">
          {navigation.map(({ id, label, icon: Icon, badge }) => (
            <Link key={id} to={`/admin-dashboard/${id}`} className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${activeSection === id ? "bg-etukas-red text-white shadow-sm" : "text-gray-600 hover:bg-etukas-pink hover:text-etukas-red"}`}>
              <span className="flex items-center gap-3">
                <Icon size={18} /> {label}
              </span>
              {badge !== undefined && badge > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeSection === id ? "bg-white text-etukas-red" : "bg-rose-100 text-rose-700"}`}>
                  {badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-gray-100 p-4">
          <p className="truncate text-sm font-semibold">{me.data.name}</p>
          <p className="truncate text-xs text-gray-500">{me.data.email}</p>
          <button onClick={() => { void marketplaceApi.logout(); setSessionUser(null); }} className="mt-4 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-etukas-pink hover:text-etukas-red">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link to="/admin-dashboard/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
              <img src="/etukas-logo.png" alt="" className="h-8 w-8 object-contain" />
              <span className="truncate font-extrabold">Etukas <span className="text-etukas-red">Admin</span></span>
            </Link>
            <h1 className="hidden text-xl font-extrabold md:block">Administration</h1>

            {/* Top Right: User info, Notification bell icon, and Sign out */}
            <div className="flex items-center gap-3">
              <p className="hidden truncate text-sm text-gray-500 lg:block">Signed in as {me.data.name} · {me.data.email}</p>

              {/* Top right notification icon for live chats, partner doubts, new partners */}
              <AdminNotificationsDropdown onNavigate={handleNotificationNavigate} />

              <button onClick={() => { void marketplaceApi.logout(); setSessionUser(null); }} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-etukas-red hover:text-etukas-red">
                <LogOut size={16} /><span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
          <nav aria-label="Admin navigation" className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {navigation.map(({ id, label, icon: Icon, badge }) => (
              <Link key={id} to={`/admin-dashboard/${id}`} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${activeSection === id ? "bg-etukas-red text-white" : "bg-gray-100 text-gray-600"}`}>
                <Icon size={15} />{label}
                {badge !== undefined && badge > 0 ? (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSection === id ? "bg-white text-etukas-red" : "bg-rose-600 text-white"}`}>
                    {badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 md:px-8 md:py-8">
          {activeSection === "dashboard" ? <section id="dashboard" className="scroll-mt-32">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-etukas-red">Overview</p>
                <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {me.data.name.split(" ")[0]}</h2>
                <p className="mt-1 text-sm text-gray-600">Manage your Etukas partner network and homepage content.</p>
              </div>
              <Link to="/admin-dashboard/partners" className="inline-flex items-center gap-2 rounded-lg bg-etukas-red px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-800">
                <Handshake size={17} /> Manage partners
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
              {[
                { label: "Total partners", value: sellers.data?.length ?? 0, detail: "Registered businesses", icon: Handshake },
                { label: "Total Orders", value: adminOrders.data?.length ?? 0, detail: "Customer orders", icon: ShoppingBag },
                { label: "Active Deliveries", value: (adminOrders.data || []).filter((o: any) => o.status !== "DELIVERED" && o.status !== "REJECTED").length, detail: "In transit", icon: Truck },
                { label: "Live support chats", value: openChatCount, detail: "Customer & partner chats", icon: Headphones },
                { label: "Awaiting review", value: pendingPartners, detail: "Partner applications", icon: Search },
                { label: "Seller enquiries", value: enquiries.data?.length ?? 0, detail: "Pre-registration leads", icon: MessageSquareText }
              ].map(({ label, value, detail, icon: Icon }) => (
                <article key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-500 sm:text-sm">{label}</p>
                    <span className="rounded-lg bg-etukas-pink p-2 text-etukas-red"><Icon size={17} /></span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold sm:text-3xl">{value}</p>
                  <p className="mt-1 text-xs text-gray-500">{detail}</p>
                </article>
              ))}
            </div>
          </section> : null}

      {sellerStatus.error || saveBanner.error || deleteBanner.error ? (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {(sellerStatus.error || saveBanner.error || deleteBanner.error)?.message}
        </p>
      ) : null}

      {activeSection === "partners" ? <section id="partners" className="mt-8 scroll-mt-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-etukas-red">Partner network</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Partners and locations</h2>
            <p className="mt-1 text-sm text-gray-600">Review applications, manage partner status, and view store locations.</p>
          </div>
          <label className="w-full text-sm font-semibold sm:max-w-xs">
            <span className="sr-only">Filter partners</span>
            <span className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input aria-label="Filter by partner, city, state, or postal code" placeholder="Search partners or locations" value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 font-normal outline-none transition focus:border-etukas-red focus:ring-2 focus:ring-etukas-pink" />
            </span>
          </label>
        </div>
        {sellers.isLoading ? <p className="mt-3 text-sm text-gray-500">Loading partner applications...</p> : null}
        {sellers.error ? <p role="alert" className="mt-3 text-sm text-red-700">{sellers.error.message}</p> : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filteredSellers?.map((seller) => (
            <SellerCard key={seller.id} seller={seller} onStatusChange={(selected, status) => sellerStatus.mutate({ seller: selected, status })} isPending={sellerStatus.isPending} />
          ))}
        </div>
        {sellers.data?.length === 0 || filteredSellers?.length === 0 ? <p className="mt-3 text-sm text-gray-500">No partners match this filter.</p> : null}
      </section> : null}

      {activeSection === "orders" ? (
        <section id="orders" className="mt-8 scroll-mt-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-etukas-red">Order Management</p>
              <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Customer Orders &amp; Live Delivery Tracking</h2>
              <p className="mt-1 text-sm text-gray-600">Monitor all received customer orders across partner stores. Track live delivery stages and intervene directly.</p>
            </div>
            <div className="relative sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search Order ID, customer, partner..." value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-etukas-red" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3 text-xs font-semibold">
            {["ALL","PLACED","CONFIRMED","LOADING_VEHICLE","ASSIGNED_DRIVER","DELIVERED","REJECTED"].map((s) => (
              <button key={s} type="button" onClick={() => setOrderStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 transition ${orderStatusFilter === s ? "bg-etukas-red text-white" : "bg-gray-100 text-gray-600"}`}>
                {s === "ALL" ? "All Orders" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {adminOrders.isLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto text-gray-300" size={40} />
              <h3 className="mt-3 text-sm font-bold text-gray-700">No Orders Found</h3>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Order ID / Date</th>
                    <th className="px-4 py-3">Customer &amp; Site</th>
                    <th className="px-4 py-3">Partner Store / ID</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Vehicle / Driver</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredOrders.map((ord: any) => {
                    const displayId = ord.orderNumber || ord.id;
                    const isDelivered = ord.status === "DELIVERED";
                    const isRejected = ord.status === "REJECTED" || ord.status === "CANCELLED";
                    return (
                      <tr key={ord.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex rounded-lg bg-orange-100 border border-orange-200 px-2 py-0.5 font-mono text-xs font-black text-orange-900">#{displayId}</span>
                          <div className="text-[10px] text-gray-400 mt-1">{new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <div className="font-bold text-gray-900">{ord.customerName || "Customer"}</div>
                          <p className="text-[11px] text-gray-600 truncate">{(ord.deliveryAddress?.line1 || "") + (ord.deliveryAddress?.city ? ", " + ord.deliveryAddress.city : "")}</p>
                          {ord.customerPhone && (<a href={"tel:" + ord.customerPhone} className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-etukas-red hover:underline"><Phone size={11} /> {ord.customerPhone}</a>)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900">{ord.storeName || "Etukas Store"}</div>
                          <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] font-bold text-gray-700">{ord.sellerId || "ETPARTNER001"}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[160px]">
                          {(ord.items || []).slice(0, 2).map((it: any, idx: number) => (<div key={idx} className="text-[11px] truncate"><strong>{it.quantity}</strong> {it.unit}s · {it.productName}</div>))}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-black">₹{((ord.totalMinor || 0) / 100).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={"inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold " + (isDelivered ? "bg-emerald-100 text-emerald-800" : isRejected ? "bg-red-100 text-red-800" : ord.status === "ASSIGNED_DRIVER" ? "bg-blue-100 text-blue-800" : ord.status === "LOADING_VEHICLE" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800")}>
                            {ord.status || "PLACED"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                          {ord.vehicleNumber && <div className="font-mono font-bold text-gray-900">🚛 {ord.vehicleNumber}</div>}
                          {ord.driverName && <div>Driver: <strong>{ord.driverName}</strong></div>}
                          {ord.driverPhone && (<a href={"tel:" + ord.driverPhone} className="text-blue-600 hover:underline font-mono inline-flex items-center gap-1"><Phone size={10} /> {ord.driverPhone}</a>)}
                          {!ord.vehicleNumber && !ord.driverName && <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button type="button" onClick={() => { setSelectedAdminOrder(ord); setAdminNewStatus(ord.status || "CONFIRMED"); setAdminVehicleNo(ord.vehicleNumber || ""); setAdminDriverName(ord.driverName || ""); setAdminDriverPhone(ord.driverPhone || ""); setAdminRejectionReason(ord.rejectionReason || ""); setAdminNote(""); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-etukas-red transition">
                            <Truck size={12} /><span>Live Tracking</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedAdminOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Truck className="text-etukas-red" size={20} /> Admin Live Tracking</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Order #{selectedAdminOrder.orderNumber || selectedAdminOrder.id} · Partner: {selectedAdminOrder.sellerId}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedAdminOrder(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="mt-4"><DeliveryStepsTracker order={selectedAdminOrder} /></div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <span className="font-bold text-gray-700 block uppercase tracking-wider text-[10px]">Customer Details</span>
                    <p className="mt-1 font-bold text-gray-900">{selectedAdminOrder.customerName}</p>
                    <p className="text-gray-600">{selectedAdminOrder.deliveryAddress?.line1}{selectedAdminOrder.deliveryAddress?.city ? ", " + selectedAdminOrder.deliveryAddress.city : ""}</p>
                    {selectedAdminOrder.customerPhone && (<a href={"tel:" + selectedAdminOrder.customerPhone} className="inline-flex items-center gap-1 font-mono font-bold text-etukas-red hover:underline"><Phone size={11} /> {selectedAdminOrder.customerPhone}</a>)}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <span className="font-bold text-gray-700 block uppercase tracking-wider text-[10px]">Store &amp; Partner</span>
                    <p className="mt-1 font-bold text-gray-900">{selectedAdminOrder.storeName || "Etukas Partner Store"}</p>
                    <p className="font-mono text-gray-600">Partner ID: <strong>{selectedAdminOrder.sellerId}</strong></p>
                    {selectedAdminOrder.sellerPhone && (<a href={"tel:" + selectedAdminOrder.sellerPhone} className="inline-flex items-center gap-1 font-mono font-bold text-gray-700 hover:underline"><Phone size={11} /> {selectedAdminOrder.sellerPhone}</a>)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">Override Delivery Stage (Admin Intervention):</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[{ id: "CONFIRMED", label: "Confirmed" }, { id: "LOADING_VEHICLE", label: "Loading Vehicle" }, { id: "ASSIGNED_DRIVER", label: "Assigned Delivery" }, { id: "DELIVERED", label: "Delivered" }, { id: "REJECTED", label: "Rejected" }].map((st) => (
                      <button key={st.id} type="button" onClick={() => setAdminNewStatus(st.id)}
                        className={"p-2 rounded-lg border text-center transition " + (adminNewStatus === st.id ? "bg-etukas-red text-white border-etukas-red font-bold" : "bg-white text-gray-700 border-gray-200")}>
                        {st.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    {(adminNewStatus === "LOADING_VEHICLE" || adminNewStatus === "ASSIGNED_DRIVER") && (
                      <div>
                        <label className="block font-semibold text-gray-700 mb-0.5">Vehicle Number:</label>
                        <input type="text" placeholder="e.g. AP 05 TX 4589" value={adminVehicleNo} onChange={(e) => setAdminVehicleNo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 font-mono uppercase focus:border-etukas-red focus:outline-none" />
                      </div>
                    )}
                    {adminNewStatus === "ASSIGNED_DRIVER" && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-0.5">Driver Name:</label>
                          <input type="text" placeholder="Driver Name" value={adminDriverName} onChange={(e) => setAdminDriverName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-etukas-red focus:outline-none" />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-0.5">Driver Phone:</label>
                          <input type="tel" placeholder="10-digit phone" value={adminDriverPhone} onChange={(e) => setAdminDriverPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 font-mono focus:border-etukas-red focus:outline-none" />
                        </div>
                      </div>
                    )}
                    {adminNewStatus === "REJECTED" && (
                      <div>
                        <label className="block font-semibold text-gray-700 mb-0.5">Rejection Reason:</label>
                        <textarea rows={2} placeholder="Reason" value={adminRejectionReason} onChange={(e) => setAdminRejectionReason(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-etukas-red focus:outline-none" />
                      </div>
                    )}
                    <div>
                      <label className="block font-semibold text-gray-700 mb-0.5">Admin Note (Optional):</label>
                      <input type="text" placeholder="e.g. Issue resolved" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-etukas-red focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                  <button type="button" onClick={() => setSelectedAdminOrder(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100">Close</button>
                  <button type="button" disabled={updateAdminOrderTracking.isPending}
                    onClick={() => { updateAdminOrderTracking.mutate({ id: selectedAdminOrder.id, data: { status: adminNewStatus, vehicleNumber: adminVehicleNo.trim() || undefined, driverName: adminDriverName.trim() || undefined, driverPhone: adminDriverPhone.trim() || undefined, rejectionReason: adminRejectionReason.trim() || undefined, note: adminNote.trim() || undefined } }); }}
                    className="rounded-lg bg-etukas-red px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50">
                    {updateAdminOrderTracking.isPending ? "Saving..." : "Save & Update Live Tracking"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {activeSection === "banners" ? <section id="banners" className="mt-6 scroll-mt-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-etukas-red">Content</p>
        <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Homepage banners and AdBanners</h2>
        <div className="mt-4 rounded-lg border border-gray-200 p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-bold">AdBanners</h3>
            <p className="mt-1 text-sm text-gray-600">Choose one of the three homepage sections and one of its three banner slots. Replacing a slot keeps its previous image in history.</p>
          </div>
          <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            <strong>Image requirements:</strong> JPEG, PNG, or WebP; maximum 500 KB; recommended dimensions 1600 × 900 px. The full image is shown without cropping.
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); saveAdBanner.mutate(); }}>
            <label className="text-sm font-semibold">Homepage section
              <select value={adBannerSection} onChange={(event) => setAdBannerSection(Number(event.target.value))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal">
                <option value={1}>Section 1 · First banner</option>
                <option value={2}>Section 2 · Second banner</option>
                <option value={3}>Section 3 · Third banner</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Banner slot
              <select value={adBannerNumber} onChange={(event) => setAdBannerNumber(Number(event.target.value))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal">
                <option value={1}>Banner 1</option>
                <option value={2}>Banner 2</option>
                <option value={3}>Banner 3</option>
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">Banner image
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                if (file && file.size > 500 * 1024) {
                  setAdBannerFile(null);
                  setAdBannerFileError("This image is larger than 500 KB. Choose a smaller image.");
                  event.currentTarget.value = "";
                  return;
                }
                if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  setAdBannerFile(null);
                  setAdBannerFileError("Choose a JPEG, PNG, or WebP image.");
                  event.currentTarget.value = "";
                  return;
                }
                setAdBannerFile(file);
                setAdBannerFileError(null);
              }} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-normal" />
            </label>
            {adBannerPreview ? <img src={adBannerPreview} alt="Selected ad banner preview" className="max-h-36 w-full rounded border border-gray-200 bg-gray-50 object-contain sm:col-span-2 lg:col-span-4" /> : null}
            {adBannerFileError || saveAdBanner.error ? <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">{adBannerFileError ?? saveAdBanner.error?.message}</p> : null}
            <button type="submit" disabled={!adBannerFile || saveAdBanner.isPending} className="inline-flex w-fit items-center gap-2 rounded-md bg-etukas-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-4">
              <ImagePlus size={16} /> {saveAdBanner.isPending ? "Uploading..." : "Upload AdBanner"}
            </button>
          </form>
          {adBanners.error || deleteAdBanner.error ? <p role="alert" className="mt-3 text-sm text-red-700">{adBanners.error?.message ?? deleteAdBanner.error?.message}</p> : null}
          {adBanners.isLoading ? <p className="mt-4 text-sm text-gray-500">Loading uploaded ad banners...</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adBanners.data?.map((image) => (
              <article key={image.id} className="overflow-hidden rounded-lg border border-gray-200">
                <img src={image.imageUrl} alt={`Section ${image.section}, banner ${image.bannerNumber}`} className="h-36 w-full bg-gray-50 object-contain" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm font-bold">Section {image.section} · Banner {image.bannerNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">{image.isCurrent ? "Current" : "Previous"} · {(image.sizeBytes / 1024).toFixed(0)} KB · {new Date(image.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button type="button" disabled={deleteAdBanner.isPending} onClick={() => {
                    if (window.confirm(`Delete this ${image.isCurrent ? "current" : "previous"} banner image?`)) deleteAdBanner.mutate(image.id);
                  }} className="inline-flex shrink-0 items-center gap-1 rounded border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!adBanners.isLoading && adBanners.data?.length === 0 ? <p className="mt-4 text-sm text-gray-500">No ad banner images have been uploaded.</p> : null}
        </div>
        <h3 className="mt-6 text-lg font-bold">Homepage promotions</h3>
        <p className="mt-1 text-sm text-gray-600">Upload JPEG, PNG, or WebP images up to 5 MB. Active banners appear on the homepage.</p>
        <form
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2"
          onSubmit={(event) => { event.preventDefault(); saveBanner.mutate(); }}
        >
          <label className="text-sm font-semibold">Eyebrow
            <input value={draft.eyebrow} onChange={(event) => updateDraft({ eyebrow: event.target.value })} maxLength={100} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold">Headline
            <input required value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} maxLength={160} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold md:col-span-2">Description
            <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} maxLength={300} rows={2} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold md:col-span-2">Banner image
            <input required={!draft.imageUrl && !imageFile} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-normal" />
            {draft.imageUrl && !imageFile ? <span className="mt-1 block text-xs text-gray-500">Current image retained unless you choose a new file.</span> : null}
          </label>
          <label className="text-sm font-semibold">Link path (optional)
            <input value={draft.linkUrl ?? ""} onChange={(event) => updateDraft({ linkUrl: event.target.value || null })} placeholder="/products" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold">Display order
            <input type="number" min="0" max="10000" value={draft.sortOrder} onChange={(event) => updateDraft({ sortOrder: Number(event.target.value) })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={draft.isActive} onChange={(event) => updateDraft({ isActive: event.target.checked })} />
            Active
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button disabled={saveBanner.isPending} className="inline-flex items-center gap-2 rounded-md bg-etukas-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <ImagePlus size={16} /> {saveBanner.isPending ? "Saving..." : editingId ? "Save banner" : "Add banner"}
            </button>
            {editingId ? <button type="button" onClick={() => { setDraft(emptyBanner); setEditingId(null); setImageFile(null); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel edit</button> : null}
          </div>
        </form>
        {banners.error ? <p role="alert" className="mt-3 text-sm text-red-700">{banners.error.message}</p> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banners.data?.map((banner) => (
            <article key={banner.id} className="overflow-hidden rounded-lg border border-gray-200">
              <img src={banner.imageUrl} alt={banner.title} className="h-36 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{banner.title}</h3>
                  <span className="text-xs font-semibold">{banner.isActive ? "Active" : "Hidden"}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{banner.eyebrow}</p>
                <p className="mt-1 text-xs text-gray-500">Order {banner.sortOrder}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEditing(banner)} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold">Edit</button>
                  <button type="button" disabled={deleteBanner.isPending} onClick={() => { if (window.confirm("Delete this homepage banner and its uploaded image?")) deleteBanner.mutate(banner.id); }} className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                    <Trash2 size={13} /> Delete banner image
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section> : null}

      {activeSection === "enquiries" ? <section id="enquiries" className="mt-6 scroll-mt-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-etukas-red">Inquiries & Communication</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Enquiries & Live Support</h2>
            <p className="mt-1 text-sm text-gray-600">Resolve customer & partner doubts in real-time or review submitted seller leads.</p>
          </div>

          {/* Sub-tabs: Live Support Chats vs Seller Enquiries */}
          <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              id="admin-enquiries-chat-tab"
              onClick={() => setEnquiryTab("chat")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                enquiryTab === "chat" ? "bg-white text-etukas-red shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Headphones size={15} />
              <span>Live Support Chats</span>
              {openChatCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-700 font-extrabold">
                  {openChatCount}
                </span>
              )}
            </button>
            <button
              type="button"
              id="admin-enquiries-leads-tab"
              onClick={() => setEnquiryTab("leads")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                enquiryTab === "leads" ? "bg-white text-etukas-red shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MessageSquareText size={15} />
              <span>Seller Enquiries</span>
              {enquiries.data && enquiries.data.length > 0 && (
                <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700 font-extrabold">
                  {enquiries.data.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {enquiryTab === "chat" ? (
          <div className="mt-4">
            <AdminLiveChat initialSessionId={chatInitialSessionId} />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-2">
              {enquiries.isLoading ? <p className="text-sm text-gray-500">Loading enquiries...</p> : null}
              {enquiries.error ? <p role="alert" className="text-sm text-red-700">{enquiries.error.message}</p> : null}
              {enquiries.data?.map((enquiry) => (
                <button key={enquiry.id} type="button" onClick={() => setSelectedEnquiryId(enquiry.id)} className={`block w-full rounded-md border p-3 text-left ${selectedEnquiryId === enquiry.id ? "border-etukas-red bg-etukas-pink" : "border-gray-200 bg-white"}`}>
                  <span className="font-bold">{enquiry.businessName}</span>
                  <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{enquiry.status}</span>
                  <p className="mt-1 text-sm text-gray-600">{enquiry.contactPerson} · {enquiry.city}, {enquiry.state}</p>
                </button>
              ))}
              {enquiries.data?.length === 0 ? <p className="text-sm text-gray-500">No seller enquiries yet.</p> : null}
            </div>
            <aside className="h-fit rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-bold">Enquiry detail</h3>
              {selectedEnquiry.data ? <EnquiryDetails enquiry={selectedEnquiry.data} /> : <p className="mt-2 text-sm text-gray-500">Select an enquiry to review submitted contact and location details.</p>}
            </aside>
          </div>
        )}
      </section> : null}
        </div>
      </div>
    </main>
  );
}

function EnquiryDetails({ enquiry }: { enquiry: SellerEnquiry }) {
  const latitude = enquiry.latitude === null || enquiry.latitude === undefined ? null : String(enquiry.latitude);
  const longitude = enquiry.longitude === null || enquiry.longitude === undefined ? null : String(enquiry.longitude);
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p><strong>Business:</strong> {enquiry.businessName}</p>
      <p><strong>Contact:</strong> {enquiry.contactPerson}</p>
      <p><strong>Email:</strong> {enquiry.email}</p>
      <p><strong>Mobile:</strong> {enquiry.mobile}</p>
      <p><strong>Address:</strong> {enquiry.addressLine1}, {enquiry.city}, {enquiry.state} {enquiry.postalCode}</p>
      {latitude && longitude ? <a className="inline-flex items-center gap-1 font-semibold text-etukas-red" href={mapUrl(latitude, longitude)} target="_blank" rel="noreferrer">View on map <ExternalLink size={14} /></a> : <p className="text-gray-500">Location coordinates not provided.</p>}
    </div>
  );
}
