import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeAlert,
  BadgeCheck,
  Bell,
  Boxes, Wrench,
  Building2, Phone, ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  ImagePlus,
  IndianRupee,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Store as StoreIcon,
  Star,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  LogOut,
  X,
  ZoomIn,
  Crop,
  TrendingUp
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi, API_BASE, getStoredUser, type SellerProductListing } from "../../services/api";
import type { SellerTmtListingInput, SellerTmtQuickRateInput } from "../../types/tmt";
import { isAdminUser, isPartnerUser } from "../../lib/authRoles";
import { queryKeys } from "../../lib/queryKeys";
import {
  DeliveryStepsTracker,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  isOrderTrackingTerminal
} from "../checkout/DeliveryStepsTracker";
import { ImageCropModal } from "./ImageCropModal";
import { TmtSellerConfigurator } from "./TmtSellerConfigurator";
import { TmtQuickRateModal } from "./TmtQuickRateModal";
import { SellerTrackingShareButton } from "../tracking/SellerTrackingShareButton";

// Available construction categories as specified: Cement, Iron, Electricals, Bricks, Sand, Stones, Tiles, etc.
const MATERIAL_CATEGORIES = [
  { id: "all", name: "All Categories", icon: Layers },
  { id: "cement", name: "Cement", unit: "Bags (50kg)", icon: Package },
  { id: "iron", name: "Iron & Steel (TMT)", unit: "Tons / Bundles", icon: Boxes },
  { id: "electricals", name: "Electricals & Wiring", unit: "Units / Rolls", icon: SlidersHorizontal },
  { id: "bricks", name: "Bricks & AAC Blocks", unit: "Pcs / Loads", icon: Boxes },
  { id: "sand", name: "Sand & M-Sand", unit: "Tons / Brass", icon: Layers },
  { id: "stones", name: "Stones & Aggregates", unit: "Brass / Loads", icon: Layers },
  { id: "tiles", name: "Tiles & Flooring", unit: "Boxes / Sq.Ft", icon: Boxes },
  { id: "plumbing", name: "Plumbing & Sanitary", unit: "Units", icon: SlidersHorizontal }
];

const categoryIdBySlug: Record<string, string> = {
  cement: "cement",
  "steel-iron-bars": "iron",
  "electrical-materials": "electricals",
  "bricks-blocks": "bricks",
  "sand-aggregates": "sand",
  "stones-aggregates": "stones",
  "tiles-flooring": "tiles",
  plumbing: "plumbing"
};

type InventoryRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  discount: number;
  stock: number;
  minOrderQuantity: number;
  deliveryRadiusKm: number;
  sku: string;
  isActive: boolean;
  description: string;
};

const DELIVERY_RADIUS_PRESETS = [5, 10, 25, 50, 100] as const;

const VALID_SELLER_TABS = new Set(["overview", "products", "store", "orders"] as const);
type SellerTab = "overview" | "products" | "store" | "orders";

export function SellerDashboard() {
  const currentUser = getStoredUser();
  if (!currentUser) {
    return <Navigate to="/partner-hub" replace />;
  }
  if (!isPartnerUser(currentUser) && !isAdminUser(currentUser)) {
    return <Navigate to="/customer" replace />;
  }
  return <SellerDashboardContent />;
}

function SellerDashboardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab") as SellerTab | null;
  const [activeTab, setActiveTabState] = useState<SellerTab>(
    initialTabParam && VALID_SELLER_TABS.has(initialTabParam) ? initialTabParam : "overview"
  );

  // Keep activeTab in sync when returning from /track/:orderId? -> /partner-dashboard?tab=orders
  useEffect(() => {
    const tabParam = searchParams.get("tab") as SellerTab | null;
    if (tabParam && VALID_SELLER_TABS.has(tabParam) && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams, activeTab]);

  const setActiveTab = (tab: SellerTab) => {
    setActiveTabState(tab);
    setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
  };

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/partner-hub", { replace: true });
  };
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("cement");
  const [newProdUnit, setNewProdUnit] = useState("Bag");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDiscount, setNewProdDiscount] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdMinOrder, setNewProdMinOrder] = useState("1");
  const [newProdDeliveryRadius, setNewProdDeliveryRadius] = useState("25");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImageBase64, setNewProdImageBase64] = useState<string | undefined>(undefined);
  const [newProdImagePreview, setNewProdImagePreview] = useState<string | null>(null);
  const [rawNewProdImage, setRawNewProdImage] = useState<string | null>(null);
  const [showNewCropModal, setShowNewCropModal] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; unit: string; price: string; discount: string; stock: string; minOrder: string; deliveryRadiusKm: string; description: string } | null>(null);
  const [editingTmtListing, setEditingTmtListing] = useState<SellerProductListing | null>(null);
  const [quickRateListing, setQuickRateListing] = useState<SellerProductListing | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [tmtError, setTmtError] = useState<string | null>(null);
  const [quickRateError, setQuickRateError] = useState<string | null>(null);

  // Manage images on existing product
  const [managingImagesFor, setManagingImagesFor] = useState<{ id: string; name: string; images: { id: string; url: string; altText: string; sortOrder: number; metadata?: { imageData?: string; mimeType?: string; sizeBytes?: number } | null }[] } | null>(null);
  const [manageImageBase64, setManageImageBase64] = useState<string | null>(null);
  const [manageImagePreview, setManageImagePreview] = useState<string | null>(null);
  const [rawManageImage, setRawManageImage] = useState<string | null>(null);
  const [showManageCropModal, setShowManageCropModal] = useState<boolean>(false);
  const [manageImageError, setManageImageError] = useState<string | null>(null);
  const manageImageInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Queries (avoid background polling storms on Vercel Free while editing products)
  const { data: dashboardData } = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: ({ signal }) => marketplaceApi.sellerDashboard({ signal }).catch(() => null),
    staleTime: 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: true
  });

  const { data: profileData } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: ({ signal }) => marketplaceApi.sellerProfile({ signal }).catch(() => null),
    staleTime: 60 * 1000
  });

  // Older technician sessions and API responses may not carry the explicit
  // isTechnician marker. Technician partner IDs have a stable TECH prefix.
  const isTechnician = Boolean(
    profileData?.isTechnician ||
    dashboardData?.sellerId?.startsWith("TECH") ||
    profileData?.sellerId?.startsWith("TECH") ||
    getStoredUser()?.sellerId?.startsWith("TECH")
  );

  const technicianProfileQuery = useQuery({
    queryKey: ["technician-profile", profileData?.sellerId],
    queryFn: ({ signal }) => marketplaceApi.getTechnician(profileData!.sellerId, undefined, undefined, { signal }),
    enabled: isTechnician
  });

  const technicianUpdateMutation = useMutation({
    mutationFn: marketplaceApi.updateTechnicianProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["technician-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      await technicianProfileQuery.refetch();
    }
  });

  const [techTab, setTechTab] = useState<"overview" | "bookings" | "profile">("overview");

  const [isRefreshingPartnerTracking, setIsRefreshingPartnerTracking] = useState(false);

  const partnerOrdersQuery = useQuery({
    queryKey: queryKeys.orders.seller(),
    queryFn: ({ signal }) => marketplaceApi.getSellerOrders({ signal }),
    staleTime: 30_000,
    refetchInterval: false,
    refetchOnWindowFocus: true
  });

  const partnerOrders = partnerOrdersQuery.data || [];

  // Partner notifications (including customer order cancellations with reason)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifDropdown) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNotifDropdown(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifDropdown]);
  const sellerNotificationsQuery = useQuery({
    queryKey: ["seller-notifications"],
    queryFn: ({ signal }) => marketplaceApi.sellerNotifications({ signal }).catch(() => []),
    staleTime: 30_000,
    refetchInterval: false,
    refetchOnWindowFocus: true
  });
  const sellerNotifications = sellerNotificationsQuery.data || [];
  const unreadSellerNotifications = sellerNotifications.filter((n) => !n.readAt);
  const unreadCancellationNotifs = unreadSellerNotifications.filter((n) =>
    n.title.toLowerCase().includes("cancel")
  );
  const markSellerNotifsReadMutation = useMutation({
    mutationFn: (ids?: string[]) => marketplaceApi.sellerMarkNotificationsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-notifications"] });
    }
  });

  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>("CONFIRMED");
  const [statusVehicleNo, setStatusVehicleNo] = useState("");
  const [statusDriverName, setStatusDriverName] = useState("");
  const [statusDriverPhone, setStatusDriverPhone] = useState("");
  const [statusRejectionReason, setStatusRejectionReason] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const selectedPartnerOrderId = selectedOrderForStatus
    ? (selectedOrderForStatus.orderNumber || selectedOrderForStatus.id)
    : "";

  const partnerOrderDetailQuery = useQuery({
    queryKey: queryKeys.orders.detail(selectedPartnerOrderId),
    queryFn: ({ signal }) => marketplaceApi.getOrder(selectedPartnerOrderId, { signal }),
    enabled: Boolean(selectedPartnerOrderId),
    placeholderData: selectedOrderForStatus ?? undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // Vercel Free-friendly smart polling: only poll every 30s while modal is open & order is active
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isOrderTrackingTerminal(status)) return false;
      return 30_000;
    },
    refetchIntervalInBackground: false
  });

  const livePartnerOrder = partnerOrderDetailQuery.data ?? selectedOrderForStatus;

  const handleRefreshPartnerOrder = async () => {
    if (!selectedOrderForStatus) return;
    setIsRefreshingPartnerTracking(true);
    try {
      const refreshed = await partnerOrderDetailQuery.refetch();
      const updated = refreshed.data;
      if (updated) {
        setSelectedOrderForStatus(updated);
        const currentStatus = String(updated.status || "");
        const normalized = currentStatus === "ACCEPTED" ? "CONFIRMED"
          : currentStatus === "PREPARING" ? "LOADING_VEHICLE"
          : currentStatus === "DISPATCHED" ? "ASSIGNED_DRIVER"
          : currentStatus === "PLACED" ? "CONFIRMED"
          : updated.status || "CONFIRMED";
        setNewStatus(normalized);
        setStatusVehicleNo(updated.vehicleNumber || "");
        setStatusDriverName(updated.driverName || "");
        setStatusDriverPhone(updated.driverPhone || "");
        setStatusRejectionReason(updated.rejectionReason || "");
        setStatusNote("");
      }
      await partnerOrdersQuery.refetch();
    } catch (err) {
      console.warn("Could not refresh order:", err);
    } finally {
      setIsRefreshingPartnerTracking(false);
    }
  };

  const updateOrderTrackingMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      marketplaceApi.updateSellerOrderTracking(orderId, data),
    onSuccess: (updatedOrder, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.seller() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.admin() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.customer() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      if (updatedOrder?.orderNumber) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(updatedOrder.orderNumber) });
      }
      void queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      setStatusNote("");
      setSelectedOrderForStatus(null);
    },
    onError: (err: any) => {
      alert(`Could not update order status: ${err?.message || "Please check details and try again."}`);
    }
  });

  const technicianBookingsQuery = useQuery({
    queryKey: ["technician-bookings", profileData?.sellerId],
    queryFn: async ({ signal }) => {
      try {
        const res = await marketplaceApi.getTechnicianMyBookings({ signal });
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn("Could not fetch /me/bookings:", err);
      }
      if (profileData?.sellerId) {
        try {
          const res = await marketplaceApi.getTechnicianBookings(profileData.sellerId, { signal });
          if (Array.isArray(res) && res.length > 0) return res;
        } catch (err) {
          console.warn("Could not fetch /bookings by sellerId:", err);
        }
      }
      return [];
    },
    enabled: isTechnician,
    refetchInterval: 15000,
    refetchIntervalInBackground: false
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      marketplaceApi.updateTechnicianBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-bookings"] });
    }
  });

  const sellerProductsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: ({ signal }) => marketplaceApi.sellerProducts({ signal })
  });

  const addProductMutation = useMutation({
    mutationFn: () => marketplaceApi.sellerAddProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      unit: newProdUnit.trim(),
      priceMinor: Math.round(Number(newProdPrice) * 100),
      discountMinor: newProdDiscount ? Math.round(Number(newProdDiscount) * 100) : 0,
      stockQuantity: Number(newProdStock),
      minOrderQuantity: newProdMinOrder ? Math.max(1, Number(newProdMinOrder)) : 1,
      deliveryRadiusKm: Math.min(500, Math.max(1, Math.round(Number(newProdDeliveryRadius) || 25))),
      imageBase64: newProdImageBase64,
      description: newProdDescription.trim() || newProdName.trim()
    }),
    onSuccess: () => {
      setNewProdName("");
      setNewProdPrice("");
      setNewProdDiscount("");
      setNewProdStock("");
      setNewProdMinOrder("1");
      setNewProdDeliveryRadius("25");
      setNewProdDescription("");
      setNewProdImageBase64(undefined);
      setNewProdImagePreview(null);
      setImageError(null);
      setShowAddModal(false);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  const addProductImageMutation = useMutation({
    mutationFn: ({ listingId, imageBase64 }: { listingId: string; imageBase64: string }) =>
      marketplaceApi.sellerAddProductImage(listingId, imageBase64),
    onSuccess: () => {
      setManageImageBase64(null);
      setManageImagePreview(null);
      setManageImageError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      // Re-fetch to refresh managing panel images
      void sellerProductsQuery.refetch().then((result) => {
        if (managingImagesFor && result.data) {
          const updated = result.data.find((l) => l.id === managingImagesFor.id);
          if (updated) setManagingImagesFor({ id: updated.id, name: updated.product.name, images: updated.product.images });
        }
      });
    },
    onError: (err: Error) => {
      setManageImageError(err.message);
    }
  });

  const deleteProductImageMutation = useMutation({
    mutationFn: ({ listingId, imageId }: { listingId: string; imageId: string }) =>
      marketplaceApi.sellerDeleteProductImage(listingId, imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void sellerProductsQuery.refetch().then((result) => {
        if (managingImagesFor && result.data) {
          const updated = result.data.find((l) => l.id === managingImagesFor.id);
          if (updated) setManagingImagesFor({ id: updated.id, name: updated.product.name, images: updated.product.images });
        }
      });
    }
  });

  const toggleProductMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      marketplaceApi.sellerUpdateProduct(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  const editProductMutation = useMutation({
    mutationFn: (vars: { id: string; name: string; unit: string; priceMinor: number; discountMinor?: number; stockQuantity: number; minOrderQuantity?: number; deliveryRadiusKm?: number; description: string }) =>
      marketplaceApi.sellerUpdateProduct(vars.id, {
        name: vars.name,
        unit: vars.unit,
        priceMinor: vars.priceMinor,
        discountMinor: vars.discountMinor,
        stockQuantity: vars.stockQuantity,
        minOrderQuantity: vars.minOrderQuantity,
        deliveryRadiusKm: vars.deliveryRadiusKm,
        description: vars.description
      }),
    onSuccess: () => {
      setEditingProduct(null);
      setEditError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      setEditError(err.message);
    }
  });

  const createTmtListingMutation = useMutation({
    mutationFn: (payload: SellerTmtListingInput) =>
      marketplaceApi.sellerCreateTmtListing(payload),
    onSuccess: () => {
      setTmtError(null);
      setShowAddModal(false);
      setNewProdCategory("cement");
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["tmt"] });
    },
    onError: (err: Error) => {
      setTmtError(err.message);
    }
  });

  const updateTmtListingMutation = useMutation({
    mutationFn: ({ listingId, payload }: { listingId: string; payload: SellerTmtListingInput }) =>
      marketplaceApi.sellerUpdateTmtListing(listingId, payload),
    onSuccess: () => {
      setTmtError(null);
      setEditingTmtListing(null);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["tmt"] });
    },
    onError: (err: Error) => {
      setTmtError(err.message);
    }
  });

  const quickRateMutation = useMutation({
    mutationFn: ({ listingId, payload }: { listingId: string; payload: SellerTmtQuickRateInput }) =>
      marketplaceApi.sellerQuickUpdateTmtRate(listingId, payload),
    onSuccess: () => {
      setQuickRateError(null);
      setQuickRateListing(null);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["tmt"] });
    },
    onError: (err: Error) => {
      setQuickRateError(err.message);
    }
  });

  const inventoryRows: InventoryRow[] = (sellerProductsQuery.data ?? []).map((listing) => ({
    id: listing.id,
    name: listing.product.name,
    category: categoryIdBySlug[listing.product.category.slug] ?? "all",
    unit: listing.product.unit,
    price: listing.priceMinor / 100,
    discount: (listing.discountMinor ?? 0) / 100,
    stock: listing.stockQuantity,
    minOrderQuantity: listing.minOrderQuantity ?? 1,
    deliveryRadiusKm: listing.deliveryRadiusKm ?? listing.store?.serviceRadiusKm ?? 25,
    sku: listing.sku,
    isActive: listing.isActive,
    description: listing.product.description ?? ""
  }));

  const sellerId = dashboardData?.sellerId || profileData?.sellerId || "Pending";
  const businessName = dashboardData?.businessName || profileData?.businessName || "Partner Store";
  const contactPerson = dashboardData?.contactPerson || profileData?.contactPerson || "Partner";
  const verificationStatus = profileData?.verificationStatus || dashboardData?.verificationStatus || "PENDING";
  const primaryStore = profileData?.stores?.[0];

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate();
  };

  const filteredProducts = inventoryRows.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Helper: pick image URL for a listing
  const getProductImageUrl = (listing: NonNullable<typeof sellerProductsQuery.data>[number]) => {
    const imgs = listing.product.images;
    if (!imgs || imgs.length === 0) return null;
    const img = imgs[0];
    if (img.url && img.url !== "") return img.url;
    // Served from backend
    return `${API_BASE}/seller/products/${encodeURIComponent(listing.id)}/images/${encodeURIComponent(img.id)}/data`;
  };

  const handleNewImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setImageError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max 10 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setRawNewProdImage(b64);
      setShowNewCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleManageImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setManageImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setManageImageError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setManageImageError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max 10 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setRawManageImage(b64);
      setShowManageCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

    if (isTechnician) {
    const technician = technicianProfileQuery.data;
    const bookings = technicianBookingsQuery.data ?? [];
    const isApproved = verificationStatus === "APPROVED";

    return (
      <main className="min-h-screen overflow-x-clip bg-gray-50 pb-16">
        {/* Top Banner with Technician ID, Status & Navigation */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-md">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 font-extrabold text-white shadow-lg shadow-orange-500/20 sm:h-14 sm:w-14">
                  <Wrench size={26} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-xl font-black tracking-tight sm:text-2xl">
                      {technician?.businessName || businessName}
                    </h1>
                    <span className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-orange-400 sm:text-xs">
                      Partner ID: {sellerId}
                    </span>
                    <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300 sm:text-xs">
                      Technician &amp; Professional
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                    Welcome, <strong className="text-gray-200">{technician?.name ?? contactPerson}</strong> | Authorized Service Partner
                  </p>
                </div>
              </div>

              {/* Status & Desktop Logout (mobile uses menu drawer) */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {isApproved ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-emerald-400 sm:px-3.5">
                    <BadgeCheck size={19} className="shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">Verified Partner</div>
                      <div className="text-[11px] text-emerald-300/80">Active on marketplace</div>
                    </div>
                  </div>
                ) : verificationStatus === "REJECTED" ? (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-2 text-red-300 sm:px-3.5">
                    <AlertTriangle size={19} className="shrink-0 text-red-400" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">Verification Rejected</div>
                      <div className="text-[11px] text-red-200/80">{profileData?.rejectionReason || "Contact Etukas support"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-amber-300 sm:px-3.5">
                    <Clock size={19} className="shrink-0 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">Verification Pending</div>
                      <div className="text-[11px] text-amber-200/80">Under review by onboarding team</div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/90 px-3.5 py-2 text-xs font-bold text-gray-200 shadow-sm transition-all hover:border-red-600 hover:bg-red-600 hover:text-white md:flex"
                  title="Log out of Partner Dashboard"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Horizontally Side-Scrollable Navigation Tabs */}
            <nav
              aria-label="Technician dashboard sections"
              className="no-scrollbar -mx-4 mt-5 flex items-center gap-2 overflow-x-auto border-t border-gray-700/60 px-4 pb-1 pt-4 sm:mx-0 sm:mt-6 sm:px-0"
            >
              {[
                { id: "overview", label: "Overview", icon: Layers },
                { id: "bookings", label: `Customer Bookings (${bookings.length})`, icon: ShoppingBag },
                { id: "profile", label: "Service Profile & Availability", icon: Wrench }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTechTab(id as typeof techTab)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                    techTab === id
                      ? "bg-orange-500 text-white shadow"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {/* Status Alert Banner */}
          {!isApproved && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <BadgeAlert size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900">
                    Technician Partner Application Under Review
                  </h3>
                  <p className="mt-1 text-sm text-amber-800">
                    Your Partner ID is <strong className="font-mono bg-amber-200/60 px-1.5 py-0.5 rounded">{sellerId}</strong>.
                    Our administrative team is verifying your registration. Once approved by an admin, your profile and service card will be featured on the customer marketplace.
                    You can set up your charges and available hours right now!
                  </p>
                </div>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900">
                    Partner Account Approved & Live!
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Congratulations! Your partner account is fully verified. Customers searching for <strong>{technician?.categories.join(", ") || "Technical"}</strong> services in <strong>{technician?.city || "your area"}</strong> can discover your card and book appointments with you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {techTab === "overview" && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Hourly Rate</span>
                    <div className="rounded-lg bg-orange-50 p-1.5 text-orange-600 sm:p-2">
                      <IndianRupee size={18} />
                    </div>
                  </div>
                  <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                    {technician?.chargePerHour != null ? (
                      <>
                        ₹{technician.chargePerHour}
                        <span className="text-xs font-normal text-gray-500 sm:text-sm">/hr</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 sm:text-xs">Standard service charge</div>
                </div>

                <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Full Day Rate</span>
                    <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 sm:p-2">
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                    {technician?.chargePerDay != null ? (
                      <>
                        ₹{technician.chargePerDay}
                        <span className="text-xs font-normal text-gray-500 sm:text-sm">/day</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-600 sm:text-xs">For 8-hour continuous work</div>
                </div>

                <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Bookings</span>
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 sm:p-2">
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                    {bookings.length}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-blue-600 sm:text-xs">Total customer requests</div>
                </div>

                <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Service Radius</span>
                    <div className="rounded-lg bg-purple-50 p-1.5 text-purple-600 sm:p-2">
                      <MapPin size={18} />
                    </div>
                  </div>
                  <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                    {technician?.serviceRadiusKm != null ? `${technician.serviceRadiusKm} km` : "—"}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-gray-500 sm:text-xs">From {technician?.city || "Registered City"}</div>
                </div>
              </div>

              {/* Skills and working info */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg">Registered Skills & Categories</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {technician?.categories.map((cat) => (
                      <span key={cat} className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-700">
                        ✓ {cat}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg mt-6">Working Hours & Days</h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-orange-500" />
                      <span><strong>Hours:</strong> {technician?.workingHours || "8:00 AM - 6:00 PM"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-orange-500" />
                      <span><strong>Active Days:</strong> {technician?.availableDays.join(", ") || "Mon - Sat"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className={technician?.isAvailableToday ? "text-emerald-500" : "text-gray-400"} />
                      <span><strong>Today's Status:</strong> {technician?.isAvailableToday ? "Available for bookings" : "Unavailable today"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg">Service Address & Geolocation</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {technician?.addressLine1}, {technician?.city}, {technician?.state} - {technician?.postalCode}
                  </p>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <MapPin size={18} className="text-blue-600" />
                      <span>GPS Coordinates</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-blue-950">
                      <div>Latitude: <strong className="text-blue-900">{technician?.latitude !== undefined && technician?.latitude !== null ? Number(technician.latitude).toFixed(6) : "Not set"}</strong></div>
                      <div>Longitude: <strong className="text-blue-900">{technician?.longitude !== undefined && technician?.longitude !== null ? Number(technician.longitude).toFixed(6) : "Not set"}</strong></div>
                    </div>
                    <div className="mt-2 text-[11px] text-blue-700">
                      ✓ Used to sort nearest technicians first for local customers.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKINGS */}
          {techTab === "bookings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Customer Service Bookings</h2>
                  <p className="text-sm text-gray-500">Service requests submitted by customers through the marketplace</p>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                  {bookings.length} Bookings
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">No Bookings Yet</h3>
                  <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                    {isApproved
                      ? "When local customers select your profile and book a service appointment, their details and location will appear right here."
                      : "Once your profile is approved by the admin team, your card will become visible to customers for bookings."}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="sm:hidden flex items-center justify-between bg-orange-50/80 border-b border-orange-100 px-4 py-2 text-[11px] text-orange-900 font-semibold">
                    <span>← Scroll sideways to view all booking details →</span>
                  </div>
                  <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                    <table className="min-w-[880px] w-full divide-y divide-gray-200 text-left text-sm">
                      <thead className="bg-gray-50 font-bold text-gray-700">
                        <tr>
                          <th className="px-6 py-3.5">Request ID & Customer</th>
                          <th className="px-6 py-3.5">Service Requested</th>
                          <th className="px-6 py-3.5">Appointment Slot</th>
                          <th className="px-6 py-3.5">Customer Service Address</th>
                          <th className="px-6 py-3.5">Estimated Charge</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {bookings.map((b: any, idx: number) => {
                          const fullAddress = b.customerAddress || b.address || "Location provided upon confirmation";
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                          const isPending = b.status === "PENDING";
                          const isConfirmed = b.status === "CONFIRMED";
                          const isCompleted = b.status === "COMPLETED";

                          return (
                            <tr key={b.bookingId || b.id || idx} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="inline-flex items-center gap-1 rounded bg-orange-100 border border-orange-300 px-2 py-0.5 font-mono text-xs font-black text-orange-800">
                                    #{b.serviceRequestId || b.bookingId || b.id}
                                  </span>
                                </div>
                                <div className="font-bold text-gray-900 text-sm">{b.customerName || "Customer"}</div>
                                {b.customerPhone ? (
                                  <div className="mt-1 flex items-center gap-2">
                                    <a
                                      href={`tel:${b.customerPhone}`}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 font-mono text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors"
                                    >
                                      <Phone size={13} />
                                      <span>{b.customerPhone}</span>
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">Phone not provided</span>
                                )}
                              </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-md bg-orange-100 border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-900">
                                {b.serviceCategory || "General Service"}
                              </span>
                              {b.bookingType && (
                                <div className="text-[11px] text-gray-500 mt-1 font-medium capitalize">
                                  {b.bookingType.toLowerCase()} service
                                  {b.estimatedHours ? ` (${b.estimatedHours} hrs)` : ""}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              <div className="font-bold text-gray-900">{b.bookingDate || "Today"}</div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                <Clock size={12} className="text-gray-400" />
                                <span>{b.timeSlot || "Standard hours"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-700 max-w-xs">
                              <div className="text-xs font-medium text-gray-800 leading-snug">{fullAddress}</div>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline mt-1 font-semibold"
                              >
                                <MapPin size={12} />
                                <span>Open in Google Maps ↗</span>
                              </a>
                              {b.notes && (
                                <div className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                  &ldquo;{b.notes}&rdquo;
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-black text-gray-900">
                                ₹{Number(b.estimatedTotal || 350).toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-gray-400 font-normal">estimated total</div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                  isCompleted
                                    ? "bg-blue-100 text-blue-800"
                                    : isConfirmed
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isPending
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {b.status || "CONFIRMED"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isCompleted ? (
                                <button
                                  onClick={() =>
                                    updateBookingStatusMutation.mutate({
                                      bookingId: b.bookingId || b.id,
                                      status: "COMPLETED"
                                    })
                                  }
                                  disabled={updateBookingStatusMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                                  title="Mark service completed"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Complete</span>
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 size={14} /> Done
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>
          )}

          {/* TAB 3: SERVICE PROFILE & AVAILABILITY */}
          {techTab === "profile" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Service Profile & Charges</h2>
                <p className="text-sm text-gray-500">Update your rates, available days, hours, and service radius visible to customers</p>
              </div>

              {technician ? (
                <form
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    technicianUpdateMutation.mutate({
                      name: String(form.get("name")),
                      workingHours: String(form.get("workingHours")),
                      availableDays: form.getAll("availableDays").map(String),
                      isAvailableToday: form.get("isAvailableToday") === "on",
                      chargePerHour: Number(form.get("chargePerHour")),
                      chargePerDay: Number(form.get("chargePerDay")),
                      addressLine1: String(form.get("addressLine1")),
                      city: String(form.get("city")),
                      state: String(form.get("state")),
                      postalCode: String(form.get("postalCode")),
                      latitude: Number(form.get("latitude")),
                      longitude: Number(form.get("longitude"))
                    });
                  }}
                >
                  <label className="text-sm font-semibold text-gray-700">
                    Full Name / Contact Person
                    <Input name="name" defaultValue={technician.name} required className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Working Hours
                    <Input name="workingHours" defaultValue={technician.workingHours} required className="mt-1" placeholder="e.g. 8:00 AM - 7:00 PM" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Hourly Service Charge (₹)
                    <Input name="chargePerHour" defaultValue={String(technician.chargePerHour)} required type="number" min={0} className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Daily Service Charge (₹)
                    <Input name="chargePerDay" defaultValue={String(technician.chargePerDay)} required type="number" min={0} className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                    Address Line
                    <Input name="addressLine1" defaultValue={technician.addressLine1} required className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    City / Town
                    <Input name="city" defaultValue={technician.city} required className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    State
                    <Input name="state" defaultValue={technician.state} required className="mt-1" />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Postal Code
                    <Input name="postalCode" defaultValue={technician.postalCode} required className="mt-1" />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Latitude
                      <Input name="latitude" defaultValue={String(technician.latitude)} required type="number" step="any" className="mt-1" />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Longitude
                      <Input name="longitude" defaultValue={String(technician.longitude)} required type="number" step="any" className="mt-1" />
                    </label>
                  </div>

                  <fieldset className="sm:col-span-2 mt-2">
                    <legend className="text-sm font-semibold text-gray-700">Available Days of the Week</legend>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <label key={day} className="flex items-center gap-1.5 text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-orange-50">
                          <input name="availableDays" type="checkbox" value={day} defaultChecked={technician.availableDays.includes(day)} />
                          <span>{day}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2 bg-orange-50/50 p-3 rounded-xl border border-orange-200">
                    <input name="isAvailableToday" type="checkbox" defaultChecked={technician.isAvailableToday} className="h-4 w-4 rounded text-orange-600" />
                    <span>✓ Available for incoming bookings today</span>
                  </label>

                  <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <Button disabled={technicianUpdateMutation.isPending} className="bg-orange-500 hover:bg-orange-600 px-6 py-2.5 font-bold">
                      {technicianUpdateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    {technicianUpdateMutation.isSuccess && (
                      <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={16} /> Changes saved successfully!
                      </span>
                    )}
                    {technicianUpdateMutation.error && (
                      <span role="alert" className="text-sm text-red-700">
                        {technicianUpdateMutation.error.message}
                      </span>
                    )}
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-sm text-gray-500">Loading service profile...</p>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-gray-50 pb-16">
      {/* Top Banner with Partner ID and Status */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 font-extrabold text-white shadow-lg shadow-orange-500/20 sm:h-14 sm:w-14">
                <StoreIcon size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-xl font-black tracking-tight sm:text-2xl">{businessName}</h1>
                  <span className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-orange-400 sm:text-xs">
                    Partner ID: {sellerId}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                  Welcome, <strong className="text-gray-200">{contactPerson}</strong> | Authorized Etukas Partner
                </p>
              </div>
            </div>

            {/* Verification status pill, Notifications Bell & Desktop Logout (mobile Logout stays in menu) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Partner Notifications Bell (Customer Order Cancellations & Updates) */}
              <div className="relative" ref={notifDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifDropdown((prev) => !prev);
                    void sellerNotificationsQuery.refetch();
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800/90 text-gray-200 transition hover:border-orange-400 hover:text-orange-400"
                  title="Partner Notifications"
                  aria-label="Partner Notifications"
                  aria-expanded={showNotifDropdown}
                >
                  <Bell size={18} />
                  {unreadSellerNotifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-etukas-red px-1 text-[10px] font-black text-white shadow">
                      {unreadSellerNotifications.length > 9 ? "9+" : unreadSellerNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute left-0 z-50 mt-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl sm:w-96 md:left-auto md:right-0">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                          Partner Notifications
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {unreadSellerNotifications.length} unread
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadSellerNotifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => markSellerNotifsReadMutation.mutate(undefined)}
                            className="text-[11px] font-bold text-orange-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNotifDropdown(false)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                          aria-label="Close notifications"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                      {sellerNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-500">
                          No notifications yet. Customer order cancellations and alerts will appear here.
                        </div>
                      ) : (
                        sellerNotifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              if (!n.readAt) markSellerNotifsReadMutation.mutate([n.id]);
                              setActiveTab("orders");
                              setShowNotifDropdown(false);
                              void partnerOrdersQuery.refetch();
                            }}
                            className={`w-full px-4 py-3 text-left transition hover:bg-orange-50/60 ${
                              !n.readAt ? "bg-red-50/50" : "bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-extrabold text-gray-900">{n.title}</span>
                              {!n.readAt && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-etukas-red" />
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-gray-600">{n.body}</p>
                            <p className="mt-1 text-[10px] text-gray-400">
                              {new Date(n.createdAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {verificationStatus === "APPROVED" ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-emerald-400 sm:px-3.5">
                  <BadgeCheck size={19} className="shrink-0" />
                  <span className="text-xs font-bold sm:text-sm">Verified Partner</span>
                </div>
              ) : verificationStatus === "REJECTED" ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-2 text-red-300 sm:px-3.5">
                  <AlertTriangle size={19} className="shrink-0 text-red-400" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">Verification Rejected</div>
                    <div className="text-[11px] text-red-200/80">
                      {profileData?.rejectionReason || dashboardData?.rejectionReason || "Contact Etukas support"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-amber-300 sm:px-3.5">
                  <Clock size={19} className="shrink-0 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">Verification Pending</div>
                    <div className="text-[11px] text-amber-200/80">Our team will connect shortly</div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/90 px-3.5 py-2 text-xs font-bold text-gray-200 shadow-sm transition-all hover:border-red-600 hover:bg-red-600 hover:text-white md:flex"
                title="Log out of Partner Dashboard"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Horizontally Side-Scrollable Navigation Tabs (Orders 3rd, Store & Location last) */}
          <nav
            aria-label="Partner dashboard sections"
            className="no-scrollbar -mx-4 mt-5 flex items-center gap-2 overflow-x-auto border-t border-gray-700/60 px-4 pb-1 pt-4 sm:mx-0 sm:mt-6 sm:px-0"
          >
            {[
              { id: "overview", label: "Overview", icon: Layers },
              { id: "products", label: "Products & Materials", icon: Boxes },
              { id: "orders", label: "Orders", icon: ShoppingBag, badge: partnerOrders.length },
              { id: "store", label: "Store & Location", icon: StoreIcon }
            ].map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                  activeTab === id
                    ? "bg-orange-500 text-white shadow"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
                {typeof badge === "number" && badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                      activeTab === id ? "bg-white/25 text-white" : "bg-gray-700 text-gray-200"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Verification Alert Callout */}
            {verificationStatus !== "APPROVED" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="shrink-0 rounded-xl bg-amber-100 p-2.5 text-amber-700">
                    <BadgeAlert size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-amber-900">
                      Thanks for registering with Etukas Partner Hub!
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800 sm:text-sm">
                      Your Partner ID is <strong className="rounded bg-amber-200/60 px-1.5 py-0.5 font-mono">{sellerId}</strong>. Our onboarding team is reviewing your shop documents and store location. You can prepare and organize your product catalog (Cement, Iron, Bricks, Sand, Stones, Tiles, etc.) right now!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metric Cards (computed strictly from real API data, zero hardcoded placeholders) */}
            {(() => {
              const pendingOrdersCount = partnerOrders.filter(
                (o) => !isOrderTrackingTerminal(o.status)
              ).length;
              const deliveredOrdersCount = partnerOrders.filter(
                (o) => o.status === "DELIVERED"
              ).length;
              const activeCategoryCount = new Set(
                inventoryRows.map((p) => p.category).filter((cat) => cat && cat !== "all")
              ).size;
              const lowStockCount = inventoryRows.filter((p) => p.stock < 20).length;
              const totalOrdersCount = dashboardData?.totalOrders ?? partnerOrders.length;
              const totalRevenueMinor = dashboardData?.revenueMinor ?? 0;

              return (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Gross Revenue</span>
                      <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-600 sm:p-2">
                        <IndianRupee size={18} />
                      </div>
                    </div>
                    <div className="mt-2.5 truncate text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                      ₹{(totalRevenueMinor / 100).toLocaleString("en-IN")}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-emerald-600 sm:text-xs">
                      {deliveredOrdersCount} delivered · {pendingOrdersCount} active
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Orders Received</span>
                      <div className="shrink-0 rounded-lg bg-orange-50 p-1.5 text-orange-600 sm:p-2">
                        <ShoppingBag size={18} />
                      </div>
                    </div>
                    <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                      {totalOrdersCount}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                      {pendingOrdersCount} pending fulfillment
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Materials Listed</span>
                      <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600 sm:p-2">
                        <Boxes size={18} />
                      </div>
                    </div>
                    <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                      {inventoryRows.length} <span className="text-sm font-bold text-gray-500 sm:text-base">items</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-blue-600 sm:text-xs">
                      {activeCategoryCount === 0
                        ? "No categories active yet"
                        : `Across ${activeCategoryCount} categor${activeCategoryCount === 1 ? "y" : "ies"}`}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:text-xs">Stock Alerts</span>
                      <div className="shrink-0 rounded-lg bg-red-50 p-1.5 text-red-600 sm:p-2">
                        <AlertTriangle size={18} />
                      </div>
                    </div>
                    <div className="mt-2.5 text-2xl font-black text-gray-900 sm:mt-3 sm:text-3xl">
                      {lowStockCount} <span className="text-sm font-bold text-gray-500 sm:text-base">items</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-red-600 sm:text-xs">
                      {lowStockCount === 0 ? "All stock healthy" : "Low stock (< 20)"}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Category Quick Stats */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 sm:text-lg">Material Categories Supported</h2>
                  <p className="text-xs text-gray-500 sm:text-sm">Etukas buyers search locally for these bulk materials</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className="w-full bg-orange-500 hover:bg-orange-600 sm:w-auto"
                >
                  Manage Catalog
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4 lg:grid-cols-8">
                {MATERIAL_CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                  const count = inventoryRows.filter((p) => p.category === cat.id).length;
                  const Icon = cat.icon;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setActiveTab("products");
                      }}
                      className="cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-center transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-sm"
                    >
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white text-orange-500 shadow-sm">
                        <Icon size={20} />
                      </div>
                      <div className="mt-2 text-xs font-bold text-gray-800">{cat.name}</div>
                      <div className="text-[11px] text-gray-500">{count} listed</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS & MATERIALS TAB */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Product & Inventory Management</h2>
                <p className="text-sm text-gray-500">Sell Cement, Iron, Bricks, Sand, Stones, Tiles, and more to local builders</p>
              </div>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
              >
                <Plus size={18} /> Add New Material
              </Button>
            </div>

            {/* Category Filter Pills (side-scrollable on mobile) */}
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {MATERIAL_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? "bg-orange-500 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by material name or SKU..."
                className="pl-10"
              />
            </div>

            {/* Mobile Product Cards (< md) */}
            <div className="space-y-3 md:hidden">
              {sellerProductsQuery.isLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  Loading saved inventory...
                </div>
              ) : sellerProductsQuery.error ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                  {sellerProductsQuery.error.message}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No materials found matching your filters. Click &ldquo;Add New Material&rdquo; to add your stock!
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const fullListing = (sellerProductsQuery.data ?? []).find((l) => l.id === p.id);
                  const imgUrl = fullListing ? getProductImageUrl(fullListing) : null;
                  const tmtMeta = fullListing?.product?.tmtMetadata;
                  const activeSizesCount = (fullListing?.product?.variants ?? []).filter(
                    (v) => v.is_active !== false
                  ).length;

                  return (
                    <article
                      key={p.id}
                      className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={p.name}
                            className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                            <ImagePlus size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2">{p.name}</h3>
                            <button
                              type="button"
                              disabled={toggleProductMutation.isPending}
                              onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {p.isActive ? "Active" : "Off"}
                            </button>
                          </div>
                          {tmtMeta ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold text-etukas-red">
                                {tmtMeta.grade}
                              </span>
                              <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                                {activeSizesCount} sizes active
                              </span>
                            </div>
                          ) : null}
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="font-black text-gray-900">
                              {tmtMeta
                                ? `₹${tmtMeta.base_rate_per_ton_inr.toLocaleString("en-IN")} / Ton`
                                : `₹${p.price.toLocaleString("en-IN")} / ${p.unit}`}
                            </span>
                            <span className={`font-bold ${p.stock < 20 ? "text-red-600" : "text-emerald-700"}`}>
                              {p.stock} {tmtMeta ? "bundles" : "units"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-2.5">
                        {tmtMeta && fullListing ? (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickRateError(null);
                              setQuickRateListing(fullListing);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-extrabold text-orange-700"
                          >
                            <TrendingUp size={13} /> Quick Rate
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (tmtMeta && fullListing) {
                              setTmtError(null);
                              setEditingTmtListing(fullListing);
                            } else {
                              setEditingProduct({
                                id: p.id,
                                name: p.name,
                                unit: p.unit,
                                price: String(p.price),
                                discount: p.discount ? String(p.discount) : "0",
                                stock: String(p.stock),
                                minOrder: String(p.minOrderQuantity || 1),
                                deliveryRadiusKm: String(p.deliveryRadiusKm || 25),
                                description: p.description
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => fullListing && setManagingImagesFor({ id: fullListing.id, name: fullListing.product.name, images: fullListing.product.images })}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700"
                        >
                          <ImagePlus size={13} /> Photos
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Products Table (Desktop md+) */}
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="min-w-[880px] w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 font-bold text-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Photo</th>
                    <th className="px-6 py-3.5">Material Name & SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Selling Unit</th>
                    <th className="px-6 py-3.5">Price & Discount (₹)</th>
                    <th className="px-6 py-3.5">Stock, Min Order &amp; Range</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sellerProductsQuery.isLoading ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading saved inventory...</td></tr>
                  ) : null}
                  {sellerProductsQuery.error ? (
                    <tr><td colSpan={8} role="alert" className="px-6 py-12 text-center text-red-700">{sellerProductsQuery.error.message}</td></tr>
                  ) : null}
                  {filteredProducts.map((p) => {
                    const fullListing = (sellerProductsQuery.data ?? []).find((l) => l.id === p.id);
                    const imgUrl = fullListing ? getProductImageUrl(fullListing) : null;
                    return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        {imgUrl ? (
                          <div className="relative group">
                            <img
                              src={imgUrl}
                              alt={p.name}
                              className="h-14 w-14 rounded-xl object-cover shadow border border-gray-200"
                            />
                            <button
                              onClick={() => fullListing && setManagingImagesFor({ id: fullListing.id, name: fullListing.product.name, images: fullListing.product.images })}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Manage photos"
                            >
                              <ZoomIn size={18} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fullListing && setManagingImagesFor({ id: fullListing.id, name: fullListing.product.name, images: fullListing.product.images })}
                            className="h-14 w-14 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500 transition-all"
                            title="Add photo"
                          >
                            <ImagePlus size={20} />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="font-mono text-xs text-gray-400">SKU: {p.sku}</div>
                        {fullListing?.product?.tmtMetadata ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold text-etukas-red">
                              {fullListing.product.tmtMetadata.grade}
                            </span>
                            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                              {(fullListing.product.variants ?? []).filter((v) => v.is_active !== false).length} sizes active
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                      <td className="px-6 py-4">
                        {fullListing?.product?.tmtMetadata ? (
                          <>
                            <div className="font-bold text-gray-900">
                              ₹{fullListing.product.tmtMetadata.base_rate_per_ton_inr.toLocaleString("en-IN")} / Ton
                            </div>
                            <div className="text-[11px] font-semibold text-orange-700">
                              Base Rate • Multi-size
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-gray-900">
                              ₹{p.price.toLocaleString("en-IN")}
                            </div>
                            {p.discount > 0 ? (
                              <div className="text-[11px] font-bold text-emerald-600">
                                Discount: ₹{p.discount.toLocaleString("en-IN")} OFF
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400 font-normal">No discount</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${p.stock < 20 ? "text-red-600" : "text-emerald-700"}`}>
                          {p.stock} {fullListing?.product?.tmtMetadata ? "bundles" : "units"}
                          {p.stock < 20 && <AlertTriangle size={14} />}
                        </span>
                        <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
                          Min Order: {p.minOrderQuantity} {p.unit}s
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                          <MapPin size={11} className="text-orange-600" />
                          <span>Delivery Radius: {p.deliveryRadiusKm} km</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={toggleProductMutation.isPending}
                          onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-all ${
                            p.isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-gray-100 text-gray-500 border border-gray-300"
                          }`}
                        >
                          {p.isActive ? "Active (Listed)" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {fullListing?.product?.tmtMetadata ? (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickRateError(null);
                                setQuickRateListing(fullListing);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-extrabold text-orange-700 hover:bg-orange-100"
                              title="Update today's TMT per-ton base rate in 5 seconds"
                            >
                              <TrendingUp size={13} /> Quick Rate
                            </button>
                          ) : null}
                          <button
                            onClick={() => {
                              if (fullListing?.product?.tmtMetadata) {
                                setTmtError(null);
                                setEditingTmtListing(fullListing);
                              } else {
                                setEditingProduct({
                                  id: p.id,
                                  name: p.name,
                                  unit: p.unit,
                                  price: String(p.price),
                                  discount: p.discount ? String(p.discount) : "0",
                                  stock: String(p.stock),
                                  minOrder: String(p.minOrderQuantity || 1),
                                  deliveryRadiusKm: String(p.deliveryRadiusKm || 25),
                                  description: p.description
                                });
                              }
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            title="Edit product details"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            onClick={() => fullListing && setManagingImagesFor({ id: fullListing.id, name: fullListing.product.name, images: fullListing.product.images })}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            title="Manage photos"
                          >
                            <ImagePlus size={14} /> Photos
                          </button>
                          <button
                            disabled={toggleProductMutation.isPending}
                            onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700"
                          >
                            {p.isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {!sellerProductsQuery.isLoading && !sellerProductsQuery.error && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No materials found matching your filters. Click &ldquo;Add New Material&rdquo; to add your stock!
                      </td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>
            </div>
            {toggleProductMutation.error ? <p role="alert" className="text-sm text-red-700">{toggleProductMutation.error.message}</p> : null}

            {/* Modal for adding product */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div
                  className={`w-full rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
                    newProdCategory === "iron" ? "max-w-4xl" : "max-w-lg"
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {newProdCategory === "iron"
                          ? "TMT Bars Yard Listing & Rate Configurator"
                          : "Add Material to Store Catalog"}
                      </h3>
                      {newProdCategory === "iron" ? (
                        <p className="text-xs text-gray-500">
                          Configure all diameters (6mm–32mm) and daily base rate in a single save
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setTmtError(null);
                        setNewProdImageBase64(undefined);
                        setNewProdImagePreview(null);
                        setImageError(null);
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {newProdCategory === "iron" ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Material Category</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => {
                            setNewProdCategory(e.target.value);
                            const found = MATERIAL_CATEGORIES.find((c) => c.id === e.target.value);
                            if (found?.unit) setNewProdUnit(found.unit);
                          }}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold shadow-sm focus:border-orange-500 focus:outline-none"
                        >
                          {MATERIAL_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <TmtSellerConfigurator
                        storeCity={primaryStore?.city}
                        hasStoreCoords={
                          primaryStore?.latitude != null && primaryStore?.longitude != null
                        }
                        isSaving={createTmtListingMutation.isPending}
                        errorMessage={tmtError}
                        onCancel={() => {
                          setShowAddModal(false);
                          setTmtError(null);
                        }}
                        onSubmit={async (payload) => {
                          await createTmtListingMutation.mutateAsync(payload);
                        }}
                      />
                    </div>
                  ) : (
                  <form onSubmit={handleAddProduct} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Material Category</label>
                      <select
                        value={newProdCategory}
                        onChange={(e) => {
                          setNewProdCategory(e.target.value);
                          const found = MATERIAL_CATEGORIES.find((c) => c.id === e.target.value);
                          if (found?.unit) setNewProdUnit(found.unit);
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold shadow-sm focus:border-orange-500 focus:outline-none"
                      >
                        {MATERIAL_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Material Title / Brand</label>
                      <Input
                        required
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="e.g. UltraTech Super 50kg or Tata Tiscon 12mm"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Product Description <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                      <textarea
                        value={newProdDescription}
                        onChange={(e) => setNewProdDescription(e.target.value)}
                        placeholder="Describe this product — grade, specifications, brand, use case, etc. Visible to customers."
                        maxLength={1000}
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none resize-none"
                      />
                      <p className="mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded px-2 py-0.5 inline-block">Note: Enter product related description only</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{newProdDescription.length}/1000 characters</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Unit of Measure</label>
                        <Input
                          required
                          value={newProdUnit}
                          onChange={(e) => setNewProdUnit(e.target.value)}
                          placeholder="e.g. Bag, Ton, Brass, Pcs"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Price (₹)</label>
                        <Input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          placeholder="e.g. 395"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Offering Discount (₹)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newProdDiscount}
                          onChange={(e) => setNewProdDiscount(e.target.value)}
                          placeholder="e.g. 25 (optional)"
                          className="mt-1"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-400">Discount you offer per unit</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Minimum Order</label>
                        <Input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={newProdMinOrder}
                          onChange={(e) => setNewProdMinOrder(e.target.value)}
                          placeholder="e.g. 1 or 10"
                          className="mt-1"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-400">Min quantity buyer must order</p>
                      </div>
                    </div>

                    {Number(newProdPrice) > 0 && Number(newProdDiscount) > 0 && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                        <span>Partner Discount: <strong>₹{Number(newProdDiscount)} OFF</strong> ({Math.round((Number(newProdDiscount) / Number(newProdPrice)) * 100)}%)</span>
                        <span>Customer Net Price: <strong>₹{Math.max(0, Number(newProdPrice) - Number(newProdDiscount))}</strong> / {newProdUnit || "unit"}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Initial Stock Quantity</label>
                      <Input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={newProdStock}
                        onChange={(e) => setNewProdStock(e.target.value)}
                        placeholder="e.g. 100"
                        className="mt-1"
                      />
                    </div>

                    {/* ── Product Display & Delivery Radius Selector ── */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-orange-900">
                          <MapPin size={14} className="text-orange-600" />
                          <span>Product Display &amp; Delivery Radius (km) *</span>
                        </label>
                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-black text-orange-800">
                          {Number(newProdDeliveryRadius) || 25} km
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DELIVERY_RADIUS_PRESETS.map((km) => {
                          const isSelected = Number(newProdDeliveryRadius) === km;
                          return (
                            <button
                              key={km}
                              type="button"
                              onClick={() => setNewProdDeliveryRadius(String(km))}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                isSelected
                                  ? "bg-orange-500 text-white shadow-xs"
                                  : "bg-white text-gray-700 border border-orange-200 hover:border-orange-400"
                              }`}
                            >
                              {km} km
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          required
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          value={newProdDeliveryRadius}
                          onChange={(e) => setNewProdDeliveryRadius(e.target.value)}
                          placeholder="Enter radius in km (1 - 500)"
                          className="bg-white"
                        />
                        <span className="text-xs font-bold text-gray-600 shrink-0">km from store</span>
                      </div>
                      <p className="text-[11px] text-orange-900/90 leading-relaxed">
                        This material will be displayed in the customer marketplace only to buyers within <strong>{Number(newProdDeliveryRadius) || 25} km</strong> of your store{primaryStore?.city ? ` (${primaryStore.city})` : ""}.
                      </p>
                      {primaryStore && (primaryStore.latitude == null || primaryStore.longitude == null) && (
                        <p className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 rounded-lg px-2.5 py-1.5">
                          Tip: Your store GPS coordinates are not set yet. Exact distance matching uses your store coordinates; otherwise buyers in {primaryStore.city} will see this item.
                        </p>
                      )}
                    </div>

                    {/* ── Product Photo Upload ── */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <label className="block text-xs font-bold uppercase text-blue-800 mb-2">Product / Service Photo <span className="text-gray-400 normal-case font-normal">(optional)</span></label>

                      {/* Constraints info */}
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center rounded-lg bg-white border border-blue-100 p-2 text-center">
                          <span className="text-[10px] font-bold uppercase text-gray-500">Max Size</span>
                          <span className="mt-0.5 text-sm font-black text-orange-600">500 KB</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg bg-white border border-blue-100 p-2 text-center">
                          <span className="text-[10px] font-bold uppercase text-gray-500">Aspect Ratio</span>
                          <span className="mt-0.5 text-sm font-black text-orange-600">1:1 or 4:3</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg bg-white border border-blue-100 p-2 text-center">
                          <span className="text-[10px] font-bold uppercase text-gray-500">Formats</span>
                          <span className="mt-0.5 text-sm font-black text-orange-600">JPG/PNG/WebP</span>
                        </div>
                      </div>

                      <p className="mb-3 text-[11px] text-blue-700 leading-relaxed">
                        📸 Upload a clear photo of your product or service. Use a well-lit, product-only image with a clean background. <strong>Images must be product/service related</strong> — branding, invoices, or unrelated photos will be rejected.
                      </p>

                      {newProdImagePreview ? (
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3 rounded-xl bg-orange-50/70 border border-orange-200">
                          <div className="relative group">
                            <img
                              src={newProdImagePreview}
                              alt="Product preview"
                              className="h-32 w-32 rounded-xl object-cover shadow-md border-2 border-orange-400 bg-white"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setShowNewCropModal(true)}
                                className="p-2 rounded-full bg-white text-gray-800 hover:bg-orange-500 hover:text-white shadow transition-colors"
                                title="Adjust 1:1 crop"
                              >
                                <Crop size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center sm:items-start gap-2 flex-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              ✓ 1:1 Square Frame (Card Fit)
                            </span>
                            <p className="text-xs text-gray-600 text-center sm:text-left">
                              Cropped to fixed 1:1 ratio. This exact framing will appear on buyer product cards.
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => setShowNewCropModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm hover:bg-orange-50 transition-colors"
                              >
                                <Crop size={13} className="text-orange-500" />
                                Crop / Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProdImageBase64(undefined);
                                  setNewProdImagePreview(null);
                                  setRawNewProdImage(null);
                                  if (imageInputRef.current) imageInputRef.current.value = "";
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 transition-colors"
                              >
                                <X size={13} />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white/80 py-6 text-blue-500 hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-600 transition-all"
                        >
                          <Upload size={28} />
                          <span className="text-sm font-bold">Click to upload product photo</span>
                          <span className="text-[11px] text-gray-400">JPG, PNG, WebP · Interactive 1:1 crop frame included</span>
                        </button>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleNewImageSelect}
                      />
                      {imageError && (
                        <p className="mt-2 text-xs font-semibold text-red-600">{imageError}</p>
                      )}
                    </div>

                    {addProductMutation.error ? (
                      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{addProductMutation.error.message}</p>
                    ) : null}

                    <div className="flex justify-end gap-3 pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowAddModal(false);
                          setNewProdImageBase64(undefined);
                          setNewProdImagePreview(null);
                          setImageError(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addProductMutation.isPending || !!imageError} className="bg-orange-500 hover:bg-orange-600">
                        {addProductMutation.isPending ? "Saving..." : "Add to Store"}
                      </Button>
                    </div>
                  </form>
                  )}
                </div>
              </div>
            )}

            {/* Edit TMT Listing Configurator Modal */}
            {editingTmtListing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Edit TMT Yard Listing &amp; Variants
                      </h3>
                      <p className="text-xs text-gray-500">{editingTmtListing.product.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTmtListing(null);
                        setTmtError(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-4">
                    <TmtSellerConfigurator
                      editingListing={editingTmtListing}
                      storeCity={primaryStore?.city}
                      hasStoreCoords={
                        primaryStore?.latitude != null && primaryStore?.longitude != null
                      }
                      isSaving={updateTmtListingMutation.isPending}
                      errorMessage={tmtError}
                      onCancel={() => {
                        setEditingTmtListing(null);
                        setTmtError(null);
                      }}
                      onSubmit={async (payload) => {
                        await updateTmtListingMutation.mutateAsync({
                          listingId: editingTmtListing.id,
                          payload
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Daily TMT Rate Modal */}
            {quickRateListing ? (
              <TmtQuickRateModal
                key={quickRateListing.id}
                listing={quickRateListing}
                isSaving={quickRateMutation.isPending}
                errorMessage={quickRateError}
                onClose={() => {
                  setQuickRateListing(null);
                  setQuickRateError(null);
                }}
                onSave={async (listingId, payload) => {
                  await quickRateMutation.mutateAsync({ listingId, payload });
                }}
              />
            ) : null}

            {/* Edit Product Modal */}
            {editingProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <Pencil size={16} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Edit Product Details</h3>
                        <p className="text-xs text-gray-500">Changes will reflect on customer marketplace</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingProduct(null); setEditError(null); }}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editingProduct) return;
                      editProductMutation.mutate({
                        id: editingProduct.id,
                        name: editingProduct.name.trim(),
                        unit: editingProduct.unit.trim(),
                        priceMinor: Math.round(Number(editingProduct.price) * 100),
                        discountMinor: editingProduct.discount ? Math.round(Number(editingProduct.discount) * 100) : 0,
                        stockQuantity: Number(editingProduct.stock),
                        minOrderQuantity: editingProduct.minOrder ? Math.max(1, Number(editingProduct.minOrder)) : 1,
                        deliveryRadiusKm: Math.min(500, Math.max(1, Math.round(Number(editingProduct.deliveryRadiusKm) || 25))),
                        description: editingProduct.description.trim()
                      });
                    }}
                    className="mt-4 space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Material Title / Brand *</label>
                      <input
                        required
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        placeholder="e.g. UltraTech Super 50kg"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Product Description</label>
                      <textarea
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        placeholder="Describe this product or service — quality, grade, specifications, use case, etc."
                        maxLength={1000}
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                      <p className="mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded px-2 py-0.5 inline-block">Note: Enter product related description only</p>
                      <p className="mt-1 text-[11px] text-gray-400">{editingProduct.description.length}/1000 — Visible to customers on product cards & cart.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Unit of Measure *</label>
                        <input
                          required
                          value={editingProduct.unit}
                          onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                          placeholder="e.g. Bag, Ton, Brass"
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Price (₹) *</label>
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                          placeholder="e.g. 395"
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Offering Discount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingProduct.discount}
                          onChange={(e) => setEditingProduct({ ...editingProduct, discount: e.target.value })}
                          placeholder="e.g. 25"
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-400">Discount you offer per unit</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-700">Minimum Order *</label>
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={editingProduct.minOrder}
                          onChange={(e) => setEditingProduct({ ...editingProduct, minOrder: e.target.value })}
                          placeholder="e.g. 1 or 10"
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-400">Min quantity buyer must order</p>
                      </div>
                    </div>

                    {Number(editingProduct.price) > 0 && Number(editingProduct.discount) > 0 && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                        <span>Partner Discount: <strong>₹{Number(editingProduct.discount)} OFF</strong> ({Math.round((Number(editingProduct.discount) / Number(editingProduct.price)) * 100)}%)</span>
                        <span>Customer Net Price: <strong>₹{Math.max(0, Number(editingProduct.price) - Number(editingProduct.discount))}</strong> / {editingProduct.unit}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700">Stock Quantity *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                        placeholder="e.g. 100"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-indigo-900">
                          <MapPin size={14} className="text-indigo-600" />
                          <span>Product Display &amp; Delivery Radius (km) *</span>
                        </label>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-800">
                          {Number(editingProduct.deliveryRadiusKm) || 25} km
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DELIVERY_RADIUS_PRESETS.map((km) => (
                          <button
                            key={km}
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, deliveryRadiusKm: String(km) })}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              Number(editingProduct.deliveryRadiusKm) === km
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white text-gray-700 border border-indigo-200 hover:border-indigo-400"
                            }`}
                          >
                            {km} km
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          required
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          value={editingProduct.deliveryRadiusKm}
                          onChange={(e) => setEditingProduct({ ...editingProduct, deliveryRadiusKm: e.target.value })}
                          placeholder="e.g. 25"
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-600 shrink-0">km</span>
                      </div>
                      <p className="text-[11px] text-indigo-900/80">
                        Only buyers within <strong>{Number(editingProduct.deliveryRadiusKm) || 25} km</strong> of your store will see this material.
                      </p>
                    </div>

                    {editError && (
                      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => { setEditingProduct(null); setEditError(null); }}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editProductMutation.isPending}
                        className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-60"
                      >
                        {editProductMutation.isPending ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Manage Photos Modal for existing product */}
            {managingImagesFor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b p-5">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Manage Product Photos</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{managingImagesFor.name}</p>
                    </div>
                    <button
                      onClick={() => { setManagingImagesFor(null); setManageImageBase64(null); setManageImagePreview(null); setManageImageError(null); }}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Upload constraints info */}
                    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                      <p className="text-[11px] font-bold text-orange-800 mb-1.5">📋 Upload Guidelines</p>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center rounded-lg bg-white border border-orange-100 py-1.5 px-1">
                          <div className="text-[10px] uppercase font-bold text-gray-500">Max Size</div>
                          <div className="text-sm font-black text-orange-600">500 KB</div>
                        </div>
                        <div className="text-center rounded-lg bg-white border border-orange-100 py-1.5 px-1">
                          <div className="text-[10px] uppercase font-bold text-gray-500">Ratio</div>
                          <div className="text-sm font-black text-orange-600">1:1 or 4:3</div>
                        </div>
                        <div className="text-center rounded-lg bg-white border border-orange-100 py-1.5 px-1">
                          <div className="text-[10px] uppercase font-bold text-gray-500">Type</div>
                          <div className="text-sm font-black text-orange-600">JPG/PNG/WebP</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-orange-700">Only product/service related images allowed. Branding or unrelated content will be rejected.</p>
                    </div>

                    {/* Existing images grid */}
                    {managingImagesFor.images.length > 0 ? (
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-600 mb-2">Uploaded Photos ({managingImagesFor.images.length})</p>
                        <div className="grid grid-cols-3 gap-3">
                          {managingImagesFor.images.map((img) => {
                            const imgSrc = img.url && img.url !== ""
                              ? img.url
                              : `${API_BASE}/seller/products/${encodeURIComponent(managingImagesFor.id)}/images/${encodeURIComponent(img.id)}/data`;
                            const sizeMeta = img.metadata?.sizeBytes;
                            return (
                              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                <img src={imgSrc} alt={img.altText} className="h-24 w-full object-cover" />
                                {sizeMeta && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-mono">
                                    {(sizeMeta / 1024).toFixed(0)} KB
                                  </div>
                                )}
                                <button
                                  disabled={deleteProductImageMutation.isPending}
                                  onClick={() => deleteProductImageMutation.mutate({ listingId: managingImagesFor.id, imageId: img.id })}
                                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                                  title="Delete photo"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                        <ImagePlus size={40} className="text-gray-300 mb-2" />
                        <p className="text-sm font-semibold">No photos uploaded yet</p>
                        <p className="text-xs text-gray-400">Add a photo below</p>
                      </div>
                    )}

                    {/* Add new photo */}
                    <div className="border-t pt-4">
                      <p className="text-xs font-bold uppercase text-gray-600 mb-2">Add New Photo</p>
                      {manageImagePreview ? (
                        <div className="flex items-start gap-4 p-3 rounded-xl bg-orange-50/70 border border-orange-200">
                          <div className="relative group">
                            <img
                              src={manageImagePreview}
                              alt="Preview"
                              className="h-24 w-24 rounded-xl object-cover border-2 border-orange-400 shadow bg-white"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setShowManageCropModal(true)}
                                className="p-1.5 rounded-full bg-white text-gray-800 hover:bg-orange-500 hover:text-white shadow transition-colors"
                                title="Adjust crop"
                              >
                                <Crop size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✓ 1:1 Cropped
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setShowManageCropModal(true)}
                                  className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-50"
                                >
                                  <Crop size={11} /> Re-crop
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManageImageBase64(null);
                                    setManageImagePreview(null);
                                    setRawManageImage(null);
                                    if (manageImageInputRef.current) manageImageInputRef.current.value = "";
                                  }}
                                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              className="bg-orange-500 hover:bg-orange-600 w-full"
                              disabled={addProductImageMutation.isPending}
                              onClick={() => manageImageBase64 && addProductImageMutation.mutate({ listingId: managingImagesFor.id, imageBase64: manageImageBase64 })}
                            >
                              {addProductImageMutation.isPending ? "Uploading..." : "Upload Photo"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => manageImageInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-5 text-gray-400 hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-500 transition-all"
                        >
                          <Upload size={24} />
                          <span className="text-sm font-bold">Click to upload photo</span>
                          <span className="text-[11px]">JPG, PNG, WebP · Interactive 1:1 crop frame</span>
                        </button>
                      )}
                      <input
                        ref={manageImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleManageImageSelect}
                      />
                      {manageImageError && (
                        <p className="mt-2 text-xs font-semibold text-red-600">{manageImageError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STORE & LOCATION TAB */}
        {activeTab === "store" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Store Profile & Geolocation</h2>
              <p className="text-sm text-gray-500">
                Customers discover your shop based on GPS proximity and delivery radius
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Store Details Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 text-lg">Store Information</h3>

                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400">Store / Depot Name</span>
                    <div className="font-bold text-gray-900 text-base">{primaryStore?.name || businessName}</div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400">Contact Number</span>
                    <div className="font-semibold text-gray-900">{primaryStore?.phone || "Registered Mobile"}</div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400">Store Address</span>
                    <div className="font-semibold text-gray-900">
                      {primaryStore?.addressLine1 || "Address not configured yet"}
                    </div>
                    <div className="text-gray-600">
                      {primaryStore
                        ? [primaryStore.city, primaryStore.state, primaryStore.postalCode].filter(Boolean).join(", ")
                        : "City & Pincode not configured"}
                    </div>
                  </div>

                  {/* Geolocation Details */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <MapPin size={18} className="text-blue-600" />
                      <span>GPS Coordinates</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-blue-950">
                      <div>Latitude: <strong className="text-blue-900">{primaryStore?.latitude !== undefined && primaryStore?.latitude !== null ? Number(primaryStore.latitude).toFixed(6) : "Not set"}</strong></div>
                      <div>Longitude: <strong className="text-blue-900">{primaryStore?.longitude !== undefined && primaryStore?.longitude !== null ? Number(primaryStore.longitude).toFixed(6) : "Not set"}</strong></div>
                    </div>
                    <div className="mt-2 text-[11px] text-blue-700">
                      ✓ Etukas matches your depot to nearby construction sites based on each product&apos;s delivery radius.
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Image Preview */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 text-lg">Storefront Image</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Compressed and optimized by Etukas engine for fast customer loading
                </p>

                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6">
                  {primaryStore?.storeImageUrl ? (
                    <img
                      src={primaryStore.storeImageUrl}
                      alt="Storefront"
                      className="max-h-64 rounded-lg object-cover shadow"
                    />
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <StoreIcon size={48} className="mx-auto text-gray-300" />
                      <p className="mt-2 text-sm font-semibold text-gray-600">No store photo uploaded</p>
                      <p className="text-xs text-gray-400">Store photo was processed and stored securely</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Material Orders</h2>
                <p className="text-sm text-gray-500">Track and fulfill local site deliveries in real-time</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void partnerOrdersQuery.refetch()}
                  disabled={partnerOrdersQuery.isFetching}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:border-orange-500 hover:text-orange-600 active:scale-95 transition"
                  title="Click to fetch latest customer orders"
                >
                  <RefreshCw size={13} className={partnerOrdersQuery.isFetching ? "animate-spin text-orange-600" : ""} />
                  <span>{partnerOrdersQuery.isFetching ? "Refreshing..." : "Refresh Orders"}</span>
                </button>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                  {partnerOrders.length} Received Orders
                </span>
              </div>
            </div>

            {unreadCancellationNotifs.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-red-900">
                    <AlertTriangle size={18} className="text-etukas-red shrink-0" />
                    <h3 className="text-sm font-extrabold">
                      {unreadCancellationNotifs.length === 1
                        ? "Customer Cancelled an Order"
                        : `${unreadCancellationNotifs.length} Orders Cancelled by Customers`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      markSellerNotifsReadMutation.mutate(unreadCancellationNotifs.map((n) => n.id))
                    }
                    className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1.5">
                  {unreadCancellationNotifs.slice(0, 3).map((n) => (
                    <p key={n.id} className="text-xs text-red-800 leading-relaxed">
                      <strong>{n.title}:</strong> {n.body}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {partnerOrdersQuery.isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
                Loading received customer orders...
              </div>
            ) : partnerOrdersQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center">
                <AlertTriangle className="mx-auto text-etukas-red" size={28} />
                <h3 className="mt-2 text-base font-bold text-red-900">Could not load orders</h3>
                <p className="mt-1 text-xs text-red-700">
                  {(partnerOrdersQuery.error as Error)?.message || "Please try refreshing your orders."}
                </p>
                <button
                  type="button"
                  onClick={() => void partnerOrdersQuery.refetch()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : partnerOrders.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">No Orders Received Yet</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                  When local construction contractors and homeowners place building material orders, they will appear right here instantly.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="sm:hidden flex items-center justify-between bg-orange-50/80 border-b border-orange-100 px-4 py-2 text-[11px] text-orange-900 font-semibold">
                  <span>← Swipe horizontally to view all order columns →</span>
                </div>
                <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="min-w-[980px] w-full divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 font-bold text-gray-700">
                      <tr>
                        <th className="px-4 py-3.5">Order ID</th>
                        <th className="px-4 py-3.5">Customer / Site</th>
                        <th className="px-4 py-3.5">Material Details</th>
                        <th className="px-4 py-3.5">Total (₹)</th>
                        <th className="px-4 py-3.5">Delivery Status</th>
                        <th className="px-4 py-3.5">Live Vehicle &amp; Driver</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {partnerOrders.map((ord: any) => {
                        const displayId = ord.orderNumber || ord.id;
                        return (
                          <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                            {/* Order ID */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex rounded-lg bg-orange-100 border border-orange-200 px-2.5 py-1 font-mono text-xs font-black text-orange-900">
                                #{displayId}
                              </span>
                              <div className="text-[10px] text-gray-400 mt-1">
                                {new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>

                            {/* Customer / Site */}
                            <td className="px-4 py-4">
                              <div className="font-bold text-gray-900 text-sm">
                                {ord.customerName || ord.customer?.name || "Customer"}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">
                                {ord.deliveryAddress?.line1 || ord.address?.line1 || "Delivery Site Address"}
                                {ord.deliveryAddress?.city ? `, ${ord.deliveryAddress.city}` : ""}
                              </p>
                              {(ord.customerPhone || ord.customer?.mobile) && (
                                <a
                                  href={`tel:${ord.customerPhone || ord.customer?.mobile}`}
                                  className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-orange-700 hover:underline"
                                >
                                  <Phone size={12} /> {ord.customerPhone || ord.customer?.mobile}
                                </a>
                              )}
                            </td>

                            {/* Material Details */}
                            <td className="px-4 py-4 text-xs text-gray-700">
                              {ord.items && ord.items.length > 0 ? (
                                <div className="space-y-1">
                                  {ord.items.map((it: any, i: number) => (
                                    <div key={it.id || i} className="line-clamp-1">
                                      <strong className="text-gray-900">{it.quantity} {it.unit}s</strong> • {it.productName}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>Bulk Construction Materials</span>
                              )}
                            </td>

                            {/* Total */}
                            <td className="px-4 py-4 font-black text-gray-900">
                              ₹{((ord.totalMinor || 0) / 100).toLocaleString("en-IN")}
                              <div className="text-[10px] text-gray-400 font-normal">
                                {ord.paymentMethod === "COD" ? "Cash on Delivery" : ord.paymentMethod || "COD"}
                              </div>
                            </td>

                            {/* Delivery Status Badge */}
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getDeliveryStatusBadgeClass(ord.status)}`}>
                                {formatDeliveryStatusLabel(ord.status)}
                              </span>
                              {ord.status === "CANCELLED" && (ord.cancellationReason || ord.rejectionReason) && (
                                <p className="mt-1.5 text-[11px] text-red-700 font-semibold max-w-[190px] leading-snug">
                                  {ord.cancelledBy === "Customer" ? "Cancelled by Customer: " : "Reason: "}
                                  <span className="font-normal">{ord.cancellationReason || ord.rejectionReason}</span>
                                </p>
                              )}
                              {ord.review && (
                                <div className="mt-1.5 flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 border border-amber-200 text-[11px] font-bold text-amber-900">
                                  <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                                  <span>{ord.review.rating}★ Review</span>
                                </div>
                              )}
                              {ord.review?.comment && (
                                <p className="mt-1 text-[10px] text-gray-500 italic line-clamp-2 max-w-[140px]" title={ord.review.comment}>
                                  "{ord.review.comment}"
                                </p>
                              )}
                            </td>

                            {/* Live Vehicle & Driver Details */}
                            <td className="px-4 py-4 text-xs text-gray-600">
                              {ord.vehicleNumber && (
                                <div>Truck: <strong className="font-mono text-gray-900">{ord.vehicleNumber}</strong></div>
                              )}
                              {ord.driverName && (
                                <div className="mt-0.5">Driver: <strong>{ord.driverName}</strong></div>
                              )}
                              {ord.driverPhone && (
                                <a href={`tel:${ord.driverPhone}`} className="text-[11px] text-blue-600 font-mono hover:underline block">
                                  📞 {ord.driverPhone}
                                </a>
                              )}
                              {!ord.vehicleNumber && !ord.driverName && (
                                <span className="text-gray-400 italic">Not assigned yet</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderForStatus(ord);
                                    const normalized = ord.status === "ACCEPTED" ? "CONFIRMED"
                                      : ord.status === "PREPARING" ? "LOADING_VEHICLE"
                                      : ord.status === "DISPATCHED" ? "ASSIGNED_DRIVER"
                                      : ord.status === "PLACED" ? "CONFIRMED"
                                      : ord.status || "CONFIRMED";
                                    setNewStatus(normalized);
                                    setStatusVehicleNo(ord.vehicleNumber || "");
                                    setStatusDriverName(ord.driverName || "");
                                    setStatusDriverPhone(ord.driverPhone || "");
                                    setStatusRejectionReason(ord.rejectionReason || "");
                                    setStatusNote("");
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition"
                                >
                                  <Truck size={13} />
                                  <span>{isOrderTrackingTerminal(ord.status) ? "View Tracking" : "Update Status"}</span>
                                </button>
                                {!isOrderTrackingTerminal(ord.status) && (
                                  <SellerTrackingShareButton
                                    orderId={ord.id}
                                    orderNumber={ord.orderNumber}
                                    driverName={ord.driverName}
                                    driverPhone={ord.driverPhone}
                                    vehicleNumber={ord.vehicleNumber}
                                    compact
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Update Live Status Modal */}
      {selectedOrderForStatus && livePartnerOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="text-etukas-red" size={20} />
                  {isOrderTrackingTerminal(livePartnerOrder.status) ? "Order Delivery Tracking" : "Update Live Delivery Status"}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Order #{livePartnerOrder.orderNumber || livePartnerOrder.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForStatus(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Timeline Preview (includes single Refresh button + Activity Log + Admin notes) */}
            <div className="mt-4">
              <DeliveryStepsTracker
                order={livePartnerOrder}
                onRefresh={handleRefreshPartnerOrder}
                isRefreshing={isRefreshingPartnerTracking || partnerOrderDetailQuery.isFetching}
              />
            </div>

            {/* Customer & Item mini summary */}
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
              <div className="flex justify-between items-center font-bold text-gray-900 mb-1">
                <span>Customer: {livePartnerOrder.customerName || (livePartnerOrder as any).customer?.name}</span>
                <span className="text-etukas-red">₹{((livePartnerOrder.totalMinor || 0) / 100).toLocaleString("en-IN")}</span>
              </div>
              <div className="text-gray-500 text-[11px] truncate">
                Site: {livePartnerOrder.deliveryAddress?.line1 || "Customer Address"}{livePartnerOrder.deliveryAddress?.city ? `, ${livePartnerOrder.deliveryAddress.city}` : ""}
              </div>
            </div>

            {/* Live Driver GPS Share Widget (for non-terminal orders) */}
            {!isOrderTrackingTerminal(livePartnerOrder.status) && (
              <div className="mt-4">
                <SellerTrackingShareButton
                  orderId={livePartnerOrder.id}
                  orderNumber={livePartnerOrder.orderNumber}
                  driverName={livePartnerOrder.driverName || statusDriverName}
                  driverPhone={livePartnerOrder.driverPhone || statusDriverPhone}
                  vehicleNumber={livePartnerOrder.vehicleNumber || statusVehicleNo}
                />
              </div>
            )}

            {isOrderTrackingTerminal(livePartnerOrder.status) ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                This order is already <strong>{formatDeliveryStatusLabel(livePartnerOrder.status)}</strong> and can no longer be edited by store partners. Contact Etukas Admin if an override is needed.
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForStatus(null)}
                    className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Status options */}
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Select Delivery Stage:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                    {[
                      { id: "CONFIRMED", label: "Confirmed by Seller", icon: CheckCircle2, rank: 1 },
                      { id: "LOADING_VEHICLE", label: "Loading on Vehicle", icon: PackageCheck, rank: 2 },
                      { id: "ASSIGNED_DRIVER", label: "Assigned Delivery Partner", icon: Truck, rank: 3 },
                      { id: "DELIVERED", label: "Delivered to Site", icon: BadgeCheck, rank: 4 },
                      { id: "REJECTED", label: "Reject Order", icon: AlertTriangle, rank: -1 }
                    ].map((st) => {
                      const currentRank =
                        livePartnerOrder.status === "CONFIRMED" ? 1
                          : livePartnerOrder.status === "LOADING_VEHICLE" ? 2
                          : livePartnerOrder.status === "ASSIGNED_DRIVER" ? 3
                          : livePartnerOrder.status === "DELIVERED" ? 4
                          : 0;
                      const isBackward = st.rank > 0 && st.rank < currentRank;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          disabled={isBackward}
                          onClick={() => setNewStatus(st.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                            isBackward
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                              : newStatus === st.id
                              ? "border-etukas-red bg-red-50 text-etukas-red ring-2 ring-red-100 font-bold"
                              : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <st.icon size={16} />
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Conditional Fields */}
                <div className="mt-4 space-y-3">
                  {(newStatus === "LOADING_VEHICLE" || newStatus === "ASSIGNED_DRIVER") && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Vehicle Number / Registration: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AP 05 TX 4589 / TS 09 EA 1234"
                        value={statusVehicleNo}
                        onChange={(e) => setStatusVehicleNo(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-etukas-red focus:outline-none"
                      />
                    </div>
                  )}

                  {newStatus === "ASSIGNED_DRIVER" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Driver Name: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Driver full name"
                          value={statusDriverName}
                          onChange={(e) => setStatusDriverName(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-etukas-red focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Driver Contact Phone: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={statusDriverPhone}
                          onChange={(e) => setStatusDriverPhone(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono focus:border-etukas-red focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {newStatus === "REJECTED" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Rejection Reason: <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide reason for rejecting (out of stock, site unserviceable, etc.)"
                        value={statusRejectionReason}
                        onChange={(e) => setStatusRejectionReason(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-etukas-red focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Status Note / Dispatch Note (Visible to customer in live tracking):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dispatched from warehouse"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:border-etukas-red focus:outline-none"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForStatus(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updateOrderTrackingMutation.isPending}
                    onClick={() => {
                      if ((newStatus === "LOADING_VEHICLE" || newStatus === "ASSIGNED_DRIVER") && !statusVehicleNo.trim()) {
                        alert("Please enter the vehicle number.");
                        return;
                      }
                      if (newStatus === "ASSIGNED_DRIVER") {
                        if (!statusDriverName.trim() || !statusDriverPhone.trim()) {
                          alert("Please enter driver name and contact number.");
                          return;
                        }
                        const digits = statusDriverPhone.replace(/\D/g, "");
                        if (digits.length < 10 || digits.length > 15) {
                          alert("Please enter a valid 10-digit driver phone number.");
                          return;
                        }
                      }
                      if (newStatus === "REJECTED" && !statusRejectionReason.trim()) {
                        alert("Please provide the rejection reason.");
                        return;
                      }
                      updateOrderTrackingMutation.mutate({
                        orderId: livePartnerOrder.id,
                        data: {
                          status: newStatus,
                          vehicleNumber: (newStatus === "LOADING_VEHICLE" || newStatus === "ASSIGNED_DRIVER")
                            ? statusVehicleNo.trim()
                            : (statusVehicleNo.trim() || undefined),
                          driverName: newStatus === "ASSIGNED_DRIVER"
                            ? statusDriverName.trim()
                            : (statusDriverName.trim() || undefined),
                          driverPhone: newStatus === "ASSIGNED_DRIVER"
                            ? statusDriverPhone.trim()
                            : (statusDriverPhone.trim() || undefined),
                          rejectionReason: newStatus === "REJECTED" ? statusRejectionReason.trim() : undefined,
                          note: statusNote.trim() || undefined
                        }
                      });
                    }}
                    className="rounded-xl bg-etukas-red px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 active:scale-95 disabled:opacity-50"
                  >
                    {updateOrderTrackingMutation.isPending ? "Updating Live Status..." : "Save & Update Live Status"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 1:1 Image Crop Modals */}
      <ImageCropModal
        isOpen={showNewCropModal}
        imageSrc={rawNewProdImage}
        onCropComplete={(croppedBase64) => {
          setNewProdImageBase64(croppedBase64);
          setNewProdImagePreview(croppedBase64);
          setShowNewCropModal(false);
        }}
        onCancel={() => {
          setShowNewCropModal(false);
          if (!newProdImageBase64) {
            setRawNewProdImage(null);
          }
        }}
      />

      <ImageCropModal
        isOpen={showManageCropModal}
        imageSrc={rawManageImage}
        onCropComplete={(croppedBase64) => {
          setManageImageBase64(croppedBase64);
          setManageImagePreview(croppedBase64);
          setShowManageCropModal(false);
        }}
        onCancel={() => {
          setShowManageCropModal(false);
          if (!manageImageBase64) {
            setRawManageImage(null);
          }
        }}
      />
    </main>
  );
}
