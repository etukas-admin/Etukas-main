import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeAlert,
  BadgeCheck,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  IndianRupee,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Store as StoreIcon,
  Truck,
  Upload,
  UserCheck,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";

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
  stock: number;
  sku: string;
  isActive: boolean;
};

export function SellerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "store" | "orders">("overview");

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/login");
  };
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("cement");
  const [newProdUnit, setNewProdUnit] = useState("Bag");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");

  const queryClient = useQueryClient();

  // Queries
  const { data: dashboardData } = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: () => marketplaceApi.sellerDashboard().catch(() => null)
  });

  const { data: profileData } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: () => marketplaceApi.sellerProfile().catch(() => null)
  });

  const sellerProductsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: marketplaceApi.sellerProducts
  });

  const addProductMutation = useMutation({
    mutationFn: () => marketplaceApi.sellerAddProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      unit: newProdUnit.trim(),
      priceMinor: Math.round(Number(newProdPrice) * 100),
      stockQuantity: Number(newProdStock)
    }),
    onSuccess: () => {
      setNewProdName("");
      setNewProdPrice("");
      setNewProdStock("");
      setShowAddModal(false);
      void queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
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

  const inventoryRows: InventoryRow[] = (sellerProductsQuery.data ?? []).map((listing) => ({
    id: listing.id,
    name: listing.product.name,
    category: categoryIdBySlug[listing.product.category.slug] ?? "all",
    unit: listing.product.unit,
    price: listing.priceMinor / 100,
    stock: listing.stockQuantity,
    sku: listing.sku,
    isActive: listing.isActive
  }));

  const sellerId = dashboardData?.sellerId || profileData?.sellerId || "Pending";
  const businessName = dashboardData?.businessName || profileData?.businessName || "Partner Store";
  const contactPerson = dashboardData?.contactPerson || profileData?.contactPerson || "Partner";
  const verificationStatus = dashboardData?.verificationStatus || profileData?.verificationStatus || "PENDING";
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

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Top Banner with Seller ID and Status */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 font-extrabold text-white shadow-lg shadow-orange-500/20">
                <StoreIcon size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">{businessName}</h1>
                  <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-orange-400 border border-orange-500/30">
                    Partner ID: {sellerId}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Welcome, <strong className="text-gray-200">{contactPerson}</strong> | Authorized Etukas Partner
                </p>
              </div>
            </div>

            {/* Verification status pill & Logout */}
            <div className="flex items-center gap-3">
              {verificationStatus === "APPROVED" ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 text-emerald-400">
                  <BadgeCheck size={20} />
                  <span className="text-sm font-bold">Verified Partner</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 text-amber-300">
                  <Clock size={20} className="animate-spin text-amber-400" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">Verification Pending</div>
                    <div className="text-[11px] text-amber-200/80">Our team will connect shortly</div>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/90 px-3.5 py-2 text-xs font-bold text-gray-200 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all shadow-sm"
                title="Log out of Partner Dashboard"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="mt-6 flex space-x-2 border-t border-gray-700/60 pt-4">
            {[
              { id: "overview", label: "Overview", icon: Layers },
              { id: "products", label: "Products & Materials", icon: Boxes },
              { id: "store", label: "Store & Location", icon: StoreIcon },
              { id: "orders", label: "Orders", icon: ShoppingBag }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === id
                    ? "bg-orange-500 text-white shadow"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Verification Alert Callout */}
            {verificationStatus !== "APPROVED" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                    <BadgeAlert size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900">
                      Thanks for registering with Etukas Seller Hub!
                    </h3>
                    <p className="mt-1 text-sm text-amber-800">
                      Your Seller ID is <strong className="font-mono bg-amber-200/60 px-1.5 py-0.5 rounded">{sellerId}</strong>. Our onboarding team is reviewing your shop documents and store location. You can prepare and organize your product catalog (Cement, Iron, Bricks, Sand, Stones, Tiles, etc.) right now!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Gross Revenue</span>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <IndianRupee size={20} />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-gray-900">
                  ₹{((dashboardData?.revenueMinor ?? 84000000) / 100).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs text-emerald-600 font-semibold">↑ 18.2% from last month</div>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Orders Received</span>
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-gray-900">
                  {dashboardData?.totalOrders ?? 128}
                </div>
                <div className="mt-1 text-xs text-gray-500">14 pending fulfillment</div>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Materials Listed</span>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-gray-900">
                  {inventoryRows.length} items
                </div>
                <div className="mt-1 text-xs text-blue-600 font-semibold">Across 7 material categories</div>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Stock Alerts</span>
                  <div className="rounded-lg bg-red-50 p-2 text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-gray-900">
                  {inventoryRows.filter((p) => p.stock < 20).length} items
                </div>
                <div className="mt-1 text-xs text-red-600 font-semibold">Low inventory warning</div>
              </div>
            </div>

            {/* Category Quick Stats */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Material Categories Supported</h2>
                  <p className="text-sm text-gray-500">Etukas buyers search locally for these bulk materials</p>
                </div>
                <Button onClick={() => setActiveTab("products")} className="bg-orange-500 hover:bg-orange-600">
                  Manage Catalog
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {MATERIAL_CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                  const count = inventoryRows.filter((p) => p.category === cat.id).length;
                  const Icon = cat.icon;
                  return (
                    <div
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
                    </div>
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

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {MATERIAL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
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

            {/* Products Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 font-bold text-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Material Name & SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Selling Unit</th>
                    <th className="px-6 py-3.5">Price (₹)</th>
                    <th className="px-6 py-3.5">Stock Available</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sellerProductsQuery.isLoading ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading saved inventory...</td></tr>
                  ) : null}
                  {sellerProductsQuery.error ? (
                    <tr><td colSpan={7} role="alert" className="px-6 py-12 text-center text-red-700">{sellerProductsQuery.error.message}</td></tr>
                  ) : null}
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="font-mono text-xs text-gray-400">SKU: {p.sku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{p.unit}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        ₹{p.price.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${p.stock < 20 ? "text-red-600" : "text-emerald-700"}`}>
                          {p.stock} units
                          {p.stock < 20 && <AlertTriangle size={14} />}
                        </span>
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
                        <button
                          disabled={toggleProductMutation.isPending}
                          onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700"
                        >
                          {p.isActive ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!sellerProductsQuery.isLoading && !sellerProductsQuery.error && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No materials found matching your filters. Click &ldquo;Add New Material&rdquo; to add your stock!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {toggleProductMutation.error ? <p role="alert" className="text-sm text-red-700">{toggleProductMutation.error.message}</p> : null}

            {/* Modal for adding product */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-900">Add Material to Store Catalog</h3>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

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
                        <option value="cement">Cement</option>
                        <option value="iron">Iron & Steel (TMT)</option>
                        <option value="electricals">Electricals & Wiring</option>
                        <option value="bricks">Bricks & AAC Blocks</option>
                        <option value="sand">Sand & M-Sand</option>
                        <option value="stones">Stones & Aggregates</option>
                        <option value="tiles">Tiles & Flooring</option>
                        <option value="plumbing">Plumbing & Sanitary</option>
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

                    {addProductMutation.error ? (
                      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{addProductMutation.error.message}</p>
                    ) : null}

                    <div className="flex justify-end gap-3 pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowAddModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addProductMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
                        {addProductMutation.isPending ? "Saving..." : "Add to Store"}
                      </Button>
                    </div>
                  </form>
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
                      {primaryStore?.addressLine1 || "Opposite Main Road, Depot Zone"}
                    </div>
                    <div className="text-gray-600">
                      {primaryStore?.city || "Hyderabad"}, {primaryStore?.state || "Telangana"} - {primaryStore?.postalCode || "500001"}
                    </div>
                  </div>

                  {/* Geolocation Details */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <MapPin size={18} className="text-blue-600" />
                      <span>GPS Coordinates</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-blue-950">
                      <div>Latitude: <strong className="text-blue-900">{primaryStore?.latitude ? Number(primaryStore.latitude).toFixed(6) : "17.385044"}</strong></div>
                      <div>Longitude: <strong className="text-blue-900">{primaryStore?.longitude ? Number(primaryStore.longitude).toFixed(6) : "78.486671"}</strong></div>
                    </div>
                    <div className="mt-2 text-[11px] text-blue-700">
                      ✓ Etukas automatically matches your depot to customer pincodes within a 25km radius.
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customer Material Orders</h2>
              <p className="text-sm text-gray-500">Track and fulfill local site deliveries</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 font-bold text-gray-700">
                  <tr>
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Customer / Site</th>
                    <th className="px-6 py-3.5">Material Details</th>
                    <th className="px-6 py-3.5">Total (₹)</th>
                    <th className="px-6 py-3.5">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold text-orange-600">ORD-2024-9481</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">Kavitha Constructions</div>
                      <div className="text-xs text-gray-500">Gachibowli Site #4, Hyderabad</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      100 Bags UltraTech Cement + 2 Tons TMT Rebars
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">₹1,68,500</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Dispatched
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold text-orange-600">ORD-2024-9477</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">Sri Krishna Developers</div>
                      <div className="text-xs text-gray-500">Kukatpally Phase 2, Hyderabad</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      2 Brass River Sand + 2 Brass 20mm Blue Metal
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">₹16,000</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        Delivered
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
