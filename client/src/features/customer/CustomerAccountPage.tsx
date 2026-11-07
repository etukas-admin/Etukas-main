import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Wrench
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";

export function CustomerAccountPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<"orders" | "services" | "overview">("orders");

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  const { data: customerOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => marketplaceApi.getCustomerOrders().catch(() => []),
    enabled: Boolean(currentUser)
  });

  const { data: serviceBookings = [], isLoading: loadingServices } = useQuery({
    queryKey: ["customer-service-bookings"],
    queryFn: () => marketplaceApi.getCustomerServiceBookings().catch(() => []),
    enabled: Boolean(currentUser),
    refetchInterval: 5000
  });

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/login");
  };

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-etukas-red">
          <UserRound size={32} />
        </div>
        <h1 className="mt-4 text-2xl font-black text-gray-900 sm:text-3xl">
          Customer Account
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          Sign in to your account to track orders, manage construction site delivery addresses, and view invoices.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            className="w-full sm:w-auto rounded-xl bg-etukas-red px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 transition-colors"
          >
            Sign in as Customer
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-gray-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Profile Header Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 font-black text-2xl text-white shadow-md shadow-red-500/20">
                {currentUser.name?.[0] || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">
                    {currentUser.name}
                  </h1>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-etukas-red">
                    Customer
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{currentUser.email}</p>
                {currentUser.mobile && (
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">📞 {currentUser.mobile}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ShoppingCart size={15} />
                <span>Shop Materials</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-etukas-red hover:border-red-200 transition-colors"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex border-b border-gray-200 gap-2">
            {[
              { id: "orders", label: `Ordered Products (${customerOrders.length})`, icon: Package },
              { id: "services", label: `Booked Services (${serviceBookings.length})`, icon: Wrench },
              { id: "overview", label: "Account Info", icon: UserRound }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
                  activeTab === id
                    ? "border-etukas-red text-etukas-red"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: ORDERED PRODUCTS */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Ordered Building Materials</h2>
                <p className="text-xs text-gray-500">Track shipments, view supplier stores, and download invoices</p>
              </div>
              <Link
                to="/"
                className="text-xs font-bold text-etukas-red hover:underline flex items-center gap-1"
              >
                <span>Browse Products</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading your orders...
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-etukas-red">
                  <Package size={28} />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900">No Orders Placed Yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Browse Cement, Steel, Bricks, Sand, Electricals, and other building materials directly from verified manufacturers.
                </p>
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition"
                >
                  <ShoppingCart size={15} />
                  <span>Start Shopping</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900">Order #{order.id.slice(0, 8)}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {order.status || "PLACED"}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-gray-900">
                          ₹{((order.totalMinor || 0) / 100).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-gray-400">{order.store?.name || "Verified Seller Store"}</div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="divide-y divide-gray-50">
                      {order.items?.map((item: any, i: number) => (
                        <div key={item.id || i} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-800">{item.productName}</span>
                            <span className="text-gray-400 ml-2">× {item.quantity} {item.unit || "units"}</span>
                          </div>
                          <div className="font-mono font-semibold text-gray-700">
                            ₹{((item.totalMinorSnapshot || (item.priceMinorSnapshot * item.quantity)) / 100).toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOKED SERVICES */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Booked Technician Services</h2>
                <p className="text-xs text-gray-500">Service appointments booked with local plumbers, electricians, masons, and technicians</p>
              </div>
              <Link
                to="/technicians"
                className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
              >
                <span>Find Technicians</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {loadingServices ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading your service appointments...
              </div>
            ) : serviceBookings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Wrench size={28} />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900">No Services Booked Yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Need a Plumber, Electrician, Painter, Mason, or Structural Engineer for your site? Book trusted local professionals in seconds.
                </p>
                <Link
                  to="/technicians"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition"
                >
                  <Wrench size={15} />
                  <span>Book a Technician</span>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {serviceBookings.map((booking: any, idx: number) => {
                  const isCompleted = booking.status === "COMPLETED";
                  const reqId = booking.serviceRequestId || booking.bookingId || booking.id;
                  return (
                    <div
                      key={reqId || idx}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">Service Request ID:</span>
                          <span className="font-mono text-xs font-black text-orange-700 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded">
                            #{reqId}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {booking.status || "CONFIRMED"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                            {booking.serviceCategory || "General Technician"}
                          </span>
                          <h4 className="mt-1 font-bold text-gray-900 text-sm">
                            {booking.technicianName || "Professional Technician"}
                          </h4>
                          {booking.technicianPhone && (
                            <a
                              href={`tel:${booking.technicianPhone}`}
                              className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-orange-600 hover:underline"
                            >
                              <Phone size={11} /> {booking.technicianPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-2.5">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-gray-400" />
                          <span><strong>Date:</strong> {booking.bookingDate || "Today"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span><strong>Slot:</strong> {booking.timeSlot || "Standard hours"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong>Address:</strong> {booking.customerAddress || booking.address || "On-site"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs">
                        <div>
                          <span className="text-gray-500">Estimated Total: </span>
                          <strong className="text-gray-900">₹{Number(booking.estimatedTotal || 350).toLocaleString("en-IN")}</strong>
                        </div>
                        {booking.technicianPhone && (
                          <a
                            href={`tel:${booking.technicianPhone}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-700 transition"
                          >
                            <Phone size={11} />
                            <span>Call Partner</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT DETAILS */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div
                onClick={() => setActiveTab("orders")}
                className="cursor-pointer group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-etukas-red group-hover:scale-105 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Material Orders</h3>
                <p className="mt-1 text-xs text-gray-500">{customerOrders.length} past orders</p>
              </div>

              <div
                onClick={() => setActiveTab("services")}
                className="cursor-pointer group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:scale-105 transition-transform">
                  <Wrench size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Booked Services</h3>
                <p className="mt-1 text-xs text-gray-500">{serviceBookings.length} appointments</p>
              </div>

              <Link
                to="/cart"
                className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <ShoppingCart size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Active Cart</h3>
                <p className="mt-1 text-xs text-gray-500">Review materials in cart</p>
              </Link>
            </div>

            {/* Security & Support info */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <ShieldCheck size={18} className="text-etukas-red" />
                Customer Protection & Order Support
              </h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                All building materials and technician services booked through Etukas are protected with certified quality assurance, on-time delivery guarantees, and direct operator assistance.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
