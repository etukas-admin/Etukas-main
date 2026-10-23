import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Building2,
  Grid3X3,
  Handshake,
  Home,
  LogIn,
  LogOut,
  Package,
  ShoppingCart,
  Store,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { Logo } from "../common/Logo";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";

type MobileNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

const mainNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: Grid3X3 },
  { label: "Stores", href: "/stores", icon: Store },
  { label: "Rentals", href: "/rentals", icon: Wrench },
  { label: "Real Estate", href: "/real-estate", icon: Building2 },
  { label: "Designs", href: "/designs", icon: Boxes },
  { label: "Cart", href: "/cart", icon: ShoppingCart }
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const currentUser: User | null = getStoredUser();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    await marketplaceApi.logout();
    onClose();
    window.location.href = "/";
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <nav
        className={`fixed left-0 top-0 z-[60] flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <Link to="/" onClick={onClose}>
            <Logo />
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* User Section */}
        {currentUser ? (
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {currentUser.roles.includes("SELLER")
                    ? "Partner"
                    : currentUser.roles.includes("ADMIN")
                      ? "Admin"
                      : "Customer"}
                </p>
              </div>
            </div>
            {currentUser.sellerId && (
              <div className="mt-2 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-mono font-semibold text-orange-700">
                Partner ID: {currentUser.sellerId}
              </div>
            )}
          </div>
        ) : (
          <div className="border-b border-gray-100 px-4 py-3">
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:opacity-90"
            >
              <LogIn size={18} /> Sign In / Create Account
            </Link>
          </div>
        )}

        {/* Scrollable nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {/* Main navigation */}
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Marketplace
          </div>
          <ul className="space-y-0.5">
            {mainNav.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <NavLink
                  to={href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-etukas-pink text-etukas-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Etukas Partner CTA */}
          <div className="mt-4 px-1">
            <Link
              to="/partner-hub"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 transition-all hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm">
                <Handshake size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  Etukas Partner
                </p>
                <p className="text-[11px] text-gray-500">
                  Grow Your Business with Etukas
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-orange-400 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>

          {/* Dashboard links for logged in users */}
          {currentUser && (
            <div className="mt-4">
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Dashboard
              </div>
              <ul className="space-y-0.5">
                {currentUser.roles.includes("SELLER") && (
                  <li>
                    <NavLink
                      to="/seller"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-etukas-pink text-etukas-red"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                    >
                      <Store size={18} />
                      Etukas Partner Dashboard
                    </NavLink>
                  </li>
                )}
                {currentUser.roles.includes("ADMIN") && (
                  <li>
                    <NavLink
                      to="/admin"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-etukas-pink text-etukas-red"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                    >
                      <UserRound size={18} />
                      Admin Dashboard
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3">
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <p className="text-center text-[11px] text-gray-400">
              © 2023 Etukas.com. All rights reserved.
            </p>
          )}
        </div>
      </nav>
    </>
  );
}
