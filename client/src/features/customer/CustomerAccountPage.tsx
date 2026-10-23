import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Clock,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  UserRound
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";

export function CustomerAccountPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

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
    <main className="min-h-[80vh] bg-gray-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
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
                  <p className="text-xs text-gray-500">📞 {currentUser.mobile}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-etukas-red hover:border-red-200 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Quick Sections */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/orders"
            className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-etukas-red group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <h3 className="mt-3 font-bold text-gray-900 text-sm">My Orders</h3>
            <p className="mt-1 text-xs text-gray-500">Track shipments & past orders</p>
          </Link>

          <Link
            to="/cart"
            className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <ShoppingCart size={20} />
            </div>
            <h3 className="mt-3 font-bold text-gray-900 text-sm">Active Cart</h3>
            <p className="mt-1 text-xs text-gray-500">Review selected building materials</p>
          </Link>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <MapPin size={20} />
            </div>
            <h3 className="mt-3 font-bold text-gray-900 text-sm">Default Site Delivery</h3>
            <p className="mt-1 text-xs text-gray-500">Hyderabad, Telangana</p>
          </div>
        </div>

        {/* Security & Customer Support */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <ShieldCheck size={18} className="text-etukas-red" />
            Customer Protection & Order Support
          </h3>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            All orders placed through Etukas are protected with certified quality assurance, on-time delivery guarantees, and transparent GST invoices.
          </p>
        </div>
      </div>
    </main>
  );
}
