import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Handshake, LogOut, MapPin, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMobileScrollState } from "../../hooks/useMobileScrollState";
import { Logo } from "../common/Logo";
import { Input } from "../ui/Input";
import { MobileNav } from "./MobileNav";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { ADDRESS_CHANGE_EVENT, getDeliveryLabel } from "../../features/location/locationStore";

const nav = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Rentals", "/rentals"],
  ["Real Estate", "/real-estate"],
  ["Designs", "/designs"]
] as const;

export function Header() {
  const navigate = useNavigate();
  const isMobileScrolled = useMobileScrollState();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: marketplaceApi.cart,
    enabled: !!currentUser,
    retry: false
  });
  const cartCount = cartQuery.data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  useEffect(() => {
    const updateDeliveryLabel = () => setDeliveryLabel(getDeliveryLabel());
    window.addEventListener(ADDRESS_CHANGE_EVENT, updateDeliveryLabel);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, updateDeliveryLabel);
  }, []);

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/");
  };

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[height,padding] duration-300 ease-in-out lg:px-6 ${isMobileScrolled ? "h-10 py-0" : "h-16 py-0"}`}>
          <button
            className="focus-ring rounded-md p-2 lg:hidden"
            aria-label="Open menu"
            onClick={openMobileNav}
          >
            <Menu size={22} />
          </button>
          <Link to="/" className={`shrink-0 ${isMobileScrolled ? "hidden md:block" : "block"}`}>
            <Logo />
          </Link>
          {isMobileScrolled ? (
            <>
              <Link to="/" className="grid h-8 w-8 shrink-0 place-items-center md:hidden" aria-label="Etukas.com home">
                <img src="/favicon.png" alt="" className="h-8 w-8 object-contain" />
              </Link>
              <label className="relative min-w-0 flex-1 md:hidden">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input className="h-9 pl-10" placeholder="Search building materials" />
              </label>
            </>
          ) : null}
          <button
            onClick={() => navigate("/location")}
            className="focus-ring hidden items-center gap-2 rounded-xl border border-gray-200/80 bg-stone-50/60 px-3 py-1.5 text-left text-xs hover:border-etukas-red hover:bg-etukas-pink/50 transition-colors md:flex"
            title="Change construction site or delivery location"
          >
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-etukas-pink text-etukas-red">
              <MapPin size={15} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">Delivering to</span>
              <strong className="block max-w-36 truncate text-xs font-extrabold text-etukas-black leading-tight">
                {deliveryLabel}
              </strong>
            </div>
          </button>
          <label className="relative hidden flex-1 md:block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input className="pl-10" placeholder="Search cement, bricks, steel, tiles..." />
          </label>
          <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
            {nav.map(([label, href]) => (
              <NavLink key={href} to={href} className={({ isActive }) => `rounded-md px-3 py-2 ${isActive ? "bg-etukas-pink text-etukas-red" : "text-gray-700 hover:bg-gray-50"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          {/* Etukas Partner link - desktop */}
          <Link
            to="/partner-hub"
            className="focus-ring hidden items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-colors lg:flex"
          >
            <Handshake size={16} />
            <span>Etukas Partner</span>
          </Link>
          {currentUser ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to={currentUser.roles.includes("SELLER") ? "/seller" : currentUser.roles.includes("ADMIN") ? "/admin" : "/customer"}
                className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors"
              >
                <UserRound size={16} />
                <span className="max-w-[110px] truncate">{currentUser.name.split(" ")[0]}</span>
                {currentUser.sellerId && (
                  <span className="rounded bg-orange-200/80 px-1 text-[10px] font-mono">{currentUser.sellerId}</span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                title="Sign out of Etukas"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="focus-ring hidden rounded-md p-2 text-gray-700 hover:bg-gray-50 md:inline-flex" aria-label="Sign in">
              <UserRound size={20} />
            </Link>
          )}
          <Link to="/cart" className="focus-ring relative hidden rounded-md p-2 text-gray-700 hover:bg-gray-50 md:inline-flex" aria-label="Cart">
            <ShoppingCart size={21} />
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-etukas-red px-1 text-[11px] font-bold text-white">
              {cartCount}
            </span>
          </Link>
        </div>
        <div className={`border-t border-gray-100 px-4 py-2 md:hidden ${isMobileScrolled ? "hidden" : "block"}`}>
          <button
            onClick={() => navigate("/location")}
            className="mb-2 flex w-full items-center justify-between rounded-lg bg-etukas-pink/60 px-2.5 py-1.5 text-xs font-semibold text-gray-800 border border-etukas-red/20"
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin size={14} className="text-etukas-red shrink-0" />
              <span className="text-gray-500">Delivering to:</span>
              <strong className="text-etukas-black truncate font-bold">{deliveryLabel}</strong>
            </div>
            <span className="text-[10px] font-bold text-etukas-red underline shrink-0 ml-2">Change</span>
          </button>
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input className="h-10 pl-10" placeholder="Search building materials" />
          </label>
        </div>
      </header>

      {/* Mobile Side Navigation */}
      <MobileNav isOpen={isMobileNavOpen} onClose={closeMobileNav} />
    </>
  );
}
