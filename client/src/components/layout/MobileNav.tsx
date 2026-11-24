import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  Grid3X3,
  Handshake,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Package,
  ShoppingCart,
  Store,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { Logo } from "../common/Logo";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { getDefaultHomeForUser, isAdminUser, isPartnerUser } from "../../lib/authRoles";
import { ADDRESS_CHANGE_EVENT, getDeliveryLabel } from "../../features/location/locationStore";

type MobileNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MAIN_NAV = [
  { label: "Home", href: "/", icon: Home },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: Grid3X3 },
  { label: "Stores", href: "/stores", icon: Store },
  { label: "Rentals", href: "/rentals", icon: Wrench },
  { label: "Real Estate", href: "/real-estate", icon: Building2 },
  { label: "Designs", href: "/designs", icon: Boxes },
  { label: "Cart", href: "/cart", icon: ShoppingCart }
] as const;

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const syncAuth = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("etukas_auth_change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    const syncLocation = () => setDeliveryLabel(getDeliveryLabel());
    window.addEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
    window.addEventListener("storage", syncLocation);
    return () => {
      window.removeEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
      window.removeEventListener("storage", syncLocation);
    };
  }, []);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

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
    navigate("/");
  };

  const userInitial = currentUser?.name?.trim().charAt(0).toUpperCase() || "U";
  const partnerUser = isPartnerUser(currentUser);
  const adminUser = isAdminUser(currentUser);
  const roleLabel = adminUser ? "Admin" : partnerUser ? "Partner" : "Customer";

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <nav
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-label="Mobile navigation"
        className={`fixed left-0 top-0 z-[60] flex h-full w-[min(300px,86vw)] flex-col bg-white pt-safe pb-safe shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <Link to="/" onClick={onClose} className="focus-ring rounded-md">
            <Logo className="h-8 max-w-[155px]" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* User Section */}
        {currentUser ? (
          <div className="border-b border-gray-100 px-4 py-3">
            <Link
              to={getDefaultHomeForUser(currentUser)}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl p-1 -m-1 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {currentUser.name || "Etukas User"}
                </p>
                <p className="truncate text-xs text-gray-500">{roleLabel}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-gray-400" />
            </Link>
            {currentUser.sellerId ? (
              <div className="mt-2 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-mono font-semibold text-orange-700">
                Partner ID: {currentUser.sellerId}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="border-b border-gray-100 px-4 py-3">
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:opacity-90"
            >
              <LogIn size={18} /> Sign In / Create Account
            </Link>
          </div>
        )}

        {/* Delivery Location Switcher */}
        <div className="border-b border-gray-100 px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/location");
            }}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-etukas-red/20 bg-etukas-pink/55 px-3 py-2 text-left text-xs transition-colors hover:bg-etukas-pink"
          >
            <div className="flex min-w-0 items-center gap-2">
              <MapPin size={15} className="shrink-0 text-etukas-red" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase text-gray-500">
                  Delivering to
                </span>
                <strong className="block truncate text-xs font-extrabold text-etukas-black">
                  {deliveryLabel}
                </strong>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-etukas-red">Change</span>
          </button>
        </div>

        {/* Scrollable nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Marketplace
          </div>
          <ul className="space-y-0.5">
            {MAIN_NAV.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <NavLink
                  to={href}
                  end={href === "/"}
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm">
                <Handshake size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Etukas Partner</p>
                <p className="text-[11px] text-gray-500">Grow Your Business with Etukas</p>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-orange-400 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>

          {/* Account & Dashboard links for logged in users */}
          {currentUser ? (
            <div className="mt-4">
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Account &amp; Dashboards
              </div>
              <ul className="space-y-0.5">
                {!partnerUser && !adminUser ? (
                  <>
                    <li>
                      <NavLink
                        to="/customer"
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
                        My Account
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/orders"
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            isActive
                              ? "bg-etukas-pink text-etukas-red"
                              : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        <ClipboardList size={18} />
                        My Orders
                      </NavLink>
                    </li>
                  </>
                ) : null}
                {partnerUser ? (
                  <li>
                    <NavLink
                      to="/partner-dashboard"
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
                ) : null}
                {adminUser ? (
                  <li>
                    <NavLink
                      to="/admin-dashboard"
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
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3">
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <p className="text-center text-[11px] text-gray-400">
              &copy; {currentYear} Etukas.com. All rights reserved.
            </p>
          )}
        </div>
      </nav>
    </>
  );
}
