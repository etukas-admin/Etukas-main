import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Handshake,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X
} from "lucide-react";
import { useHeaderHeightCssVar, useHeaderScroll } from "../../hooks/useMobileScrollState";
import { useCartQuery } from "../../features/cart/useCart";
import { Logo } from "../common/Logo";
import { MobileNav } from "./MobileNav";
import { OPEN_SUPPORT_CHAT_EVENT } from "../chat/UserChatWidget";
import { CustomerSupportIcon } from "../icons/CustomerSupportIcon";
import { CustomerSupportPillButton } from "./CustomerSupportPillButton";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { getDefaultHomeForUser } from "../../lib/authRoles";
import { ADDRESS_CHANGE_EVENT, getDeliveryLabel } from "../../features/location/locationStore";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Stores", href: "/stores" },
  { label: "Rentals", href: "/rentals" },
  { label: "Real Estate", href: "/real-estate" },
  { label: "Designs", href: "/designs" }
] as const;

type HeaderProps = {
  className?: string;
};

function formatCartCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function getFirstName(user: User): string {
  const first = user.name?.trim().split(/\s+/)[0];
  return first || "Account";
}

export function Header({ className }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return location.pathname === "/products" ? params.get("q") ?? "" : "";
  });

  const { isScrolled, isCompact } = useHeaderScroll({
    paused: isMobileNavOpen || isSearchFocused
  });

  useHeaderHeightCssVar(headerRef);

  const cartQuery = useCartQuery();
  const cartCount = cartQuery.data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  // Keep search input synchronized with the /products?q=... query parameter.
  useEffect(() => {
    if (location.pathname === "/products") {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get("q") ?? "");
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("etukas_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const updateDeliveryLabel = () => setDeliveryLabel(getDeliveryLabel());
    window.addEventListener(ADDRESS_CHANGE_EVENT, updateDeliveryLabel);
    window.addEventListener("storage", updateDeliveryLabel);
    return () => {
      window.removeEventListener(ADDRESS_CHANGE_EVENT, updateDeliveryLabel);
      window.removeEventListener("storage", updateDeliveryLabel);
    };
  }, []);

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    mobileSearchInputRef.current?.blur();
    desktopSearchInputRef.current?.blur();
    setIsSearchFocused(false);

    if (trimmed) {
      navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/products");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (location.pathname === "/products") {
      const params = new URLSearchParams(location.search);
      params.delete("q");
      const qs = params.toString();
      navigate(qs ? `/products?${qs}` : "/products");
    }
  };

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const openSupportChat = useCallback(() => {
    window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
  }, []);

  const accountHref = currentUser ? getDefaultHomeForUser(currentUser) : "/login";

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-300",
          isScrolled
            ? "border-gray-200/90 shadow-[0_4px_18px_-6px_rgba(17,17,17,0.12)]"
            : "border-gray-100 shadow-none",
          className
        )}
      >
        {/* ================= MOBILE HEADER (< md) ================= */}
        <div className="md:hidden">
          {/* Collapsible Brand + Delivery Location Band (smoothly minimizes on scroll like Flipkart/Amazon) */}
          <div className="header-collapse-band" data-collapsed={isCompact ? "true" : "false"}>
            <div className="header-collapse-inner">
              {/* Row 1: Menu + Brand Logo + Customer Support */}
              <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-800 transition-colors hover:bg-gray-100 active:scale-95"
                    aria-label="Open menu"
                    aria-expanded={isMobileNavOpen}
                    aria-controls="mobile-navigation-drawer"
                    onClick={openMobileNav}
                  >
                    <Menu size={22} />
                  </button>
                  <Link
                    to="/"
                    className="focus-ring flex min-w-0 shrink-0 items-center rounded-md"
                    aria-label="Etukas.com home"
                  >
                    <Logo className="h-10 max-w-[185px] sm:h-11 sm:max-w-[215px]" />
                  </Link>
                </div>

                <div className="flex shrink-0 items-center">
                  <CustomerSupportPillButton onClick={openSupportChat} size={30} animateOnLoad />
                </div>
              </div>

              {/* Row 2: Delivery Location Pill */}
              <div className="px-3 pb-1.5 sm:px-4">
                <button
                  type="button"
                  onClick={() => navigate("/location")}
                  className="focus-ring flex w-full items-center justify-between gap-2 rounded-xl border border-etukas-red/20 bg-etukas-pink/65 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-etukas-red/40 hover:bg-etukas-pink active:scale-[0.99]"
                  title="Change construction site or delivery location"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MapPin size={14} className="shrink-0 text-etukas-red" />
                    <span className="shrink-0 text-[11px] font-medium text-gray-500">Delivering to:</span>
                    <strong className="truncate text-[11px] font-extrabold text-etukas-black sm:text-xs">
                      {deliveryLabel}
                    </strong>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-etukas-red">
                    <span>Change</span>
                    <ChevronRight size={13} />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Always-Pinned Mobile Search Bar (never unmounts; compact Menu, Mini-Logo & Cart glide smoothly in) */}
          <div
            className={cn(
              "flex items-center px-3 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4",
              isCompact ? "py-1.5" : "pb-2.5 pt-0.5"
            )}
          >
            {/* Compact Left Slot: Menu + Mini Logo */}
            <div
              className={cn("header-compact-slot shrink-0", isCompact ? "mr-2" : "mr-0")}
              data-visible={isCompact ? "true" : "false"}
              aria-hidden={!isCompact}
            >
              <div className="header-compact-slot-inner flex items-center gap-1">
                <button
                  type="button"
                  tabIndex={isCompact ? 0 : -1}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-800 transition-colors hover:bg-gray-100 active:scale-95"
                  aria-label="Open menu"
                  aria-expanded={isMobileNavOpen}
                  aria-controls="mobile-navigation-drawer"
                  onClick={openMobileNav}
                >
                  <Menu size={20} />
                </button>
                <Link
                  to="/"
                  tabIndex={isCompact ? 0 : -1}
                  className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  aria-label="Etukas.com home"
                >
                  <Logo compact className="h-8 w-8" />
                </Link>
              </div>
            </div>

            {/* Persistent Mobile Search Form */}
            <form onSubmit={handleSearchSubmit} role="search" className="relative min-w-0 flex-1">
              <label className="relative flex w-full items-center">
                <span className="sr-only">Search building materials</span>
                <Search
                  className="pointer-events-none absolute left-3 text-gray-400"
                  size={17}
                  aria-hidden="true"
                />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search cement, bricks, steel, tiles..."
                  enterKeyHint="search"
                  className={cn(
                    "w-full rounded-xl border border-gray-200/90 bg-gray-50/90 pl-9 pr-9 text-sm text-etukas-black outline-none placeholder:text-gray-400 transition-[height,background-color,border-color,box-shadow] duration-200 focus:border-etukas-red focus:bg-white focus:ring-2 focus:ring-etukas-red/15 [&::-webkit-search-cancel-button]:hidden",
                    isCompact ? "h-9 text-[13px]" : "h-10 text-sm"
                  )}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>
            </form>

            {/* Compact Right Slot: Quick Location (sm+) & Customer Support */}
            <div
              className={cn("header-compact-slot shrink-0", isCompact ? "ml-1.5" : "ml-0")}
              data-visible={isCompact ? "true" : "false"}
              aria-hidden={!isCompact}
            >
              <div className="header-compact-slot-inner flex items-center gap-0.5">
                <button
                  type="button"
                  tabIndex={isCompact ? 0 : -1}
                  onClick={() => navigate("/location")}
                  className="focus-ring hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-etukas-red transition-colors hover:bg-etukas-pink sm:inline-flex"
                  aria-label={`Change location: ${deliveryLabel}`}
                  title={deliveryLabel}
                >
                  <MapPin size={18} />
                </button>
                <button
                  type="button"
                  tabIndex={isCompact ? 0 : -1}
                  onClick={openSupportChat}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 hover:bg-etukas-pink/60 active:scale-95"
                  aria-label="Customer Support"
                  title="Chat with Etukas Support Team"
                >
                  <CustomerSupportIcon size={26} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= TABLET & DESKTOP HEADER (md+) ================= */}
        <div className="hidden md:block">
          {/* Primary Pinned Row (smoothly compacts height on scroll) */}
          <div
            className={cn(
              "mx-auto flex max-w-7xl items-center gap-2.5 px-4 transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:gap-4 lg:px-6",
              isCompact ? "h-14" : "h-16"
            )}
          >
            {/* Left: Tablet Menu + Logo + Delivery Location */}
            <div className="flex shrink-0 items-center gap-2 lg:gap-3">
              <button
                type="button"
                className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
                aria-label="Open menu"
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-navigation-drawer"
                onClick={openMobileNav}
              >
                <Menu size={21} />
              </button>

              <Link
                to="/"
                className="focus-ring flex shrink-0 items-center rounded-md"
                aria-label="Etukas.com home"
              >
                <Logo
                  className={cn(
                    "transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isCompact
                      ? "h-9 max-w-[175px] lg:h-10 lg:max-w-[200px]"
                      : "h-10 max-w-[195px] lg:h-11 lg:max-w-[225px] xl:h-12 xl:max-w-[245px]"
                  )}
                />
              </Link>

              <button
                type="button"
                onClick={() => navigate("/location")}
                className="focus-ring flex max-w-[155px] shrink-0 items-center gap-2 rounded-xl border border-gray-200/80 bg-stone-50/70 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-etukas-red/50 hover:bg-etukas-pink/50 lg:max-w-[185px] xl:max-w-[215px]"
                title={`Change delivery location (${deliveryLabel})`}
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-etukas-pink text-etukas-red">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase leading-tight text-gray-400">
                    Delivering to
                  </span>
                  <strong className="block truncate text-xs font-extrabold leading-tight text-etukas-black">
                    {deliveryLabel}
                  </strong>
                </div>
              </button>
            </div>

            {/* Center: Spacious Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="mx-auto flex min-w-[180px] max-w-2xl flex-1 items-center"
            >
              <div className="relative flex w-full items-center rounded-xl border border-gray-200/90 bg-gray-50/80 transition-all focus-within:border-etukas-red focus-within:bg-white focus-within:ring-2 focus-within:ring-etukas-red/15">
                <Search
                  className="pointer-events-none absolute left-3 text-gray-400"
                  size={17}
                  aria-hidden="true"
                />
                <input
                  ref={desktopSearchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search cement, bricks, steel, tiles..."
                  aria-label="Search products"
                  className={cn(
                    "w-full bg-transparent pl-9 pr-9 text-sm text-etukas-black outline-none placeholder:text-gray-400 transition-[height] duration-300 [&::-webkit-search-cancel-button]:hidden",
                    isCompact ? "h-9" : "h-10"
                  )}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                ) : null}
                <button
                  type="submit"
                  className={cn(
                    "hidden shrink-0 items-center justify-center rounded-r-[11px] bg-etukas-red px-4 text-xs font-bold text-white transition-colors hover:bg-red-700 lg:inline-flex",
                    isCompact ? "h-9" : "h-10"
                  )}
                >
                  Search
                </button>
              </div>
            </form>

            {/* Right: Partner CTA + Account/Auth + Cart */}
            <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
              <Link
                to="/partner-hub"
                className="focus-ring hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-100 lg:inline-flex"
              >
                <Handshake size={15} />
                <span>Etukas Partner</span>
              </Link>

              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    to={accountHref}
                    className="focus-ring flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    <UserRound size={15} className="shrink-0" />
                    <span className="max-w-[90px] truncate xl:max-w-[110px]">
                      {getFirstName(currentUser)}
                    </span>
                    {currentUser.sellerId ? (
                      <span className="hidden rounded bg-orange-200/80 px-1 text-[10px] font-mono xl:inline">
                        {currentUser.sellerId}
                      </span>
                    ) : null}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="focus-ring flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 xl:px-2.5"
                    title="Sign out of Etukas"
                    aria-label="Logout"
                  >
                    <LogOut size={15} />
                    <span className="hidden xl:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 hover:text-etukas-red"
                  aria-label="Account"
                  title="Sign in"
                >
                  <UserRound size={20} />
                </Link>
              )}

              <Link
                to="/cart"
                className="focus-ring relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-gray-800 transition-colors hover:bg-gray-100 xl:px-2.5"
                aria-label={cartCount > 0 ? `Cart with ${cartCount} items` : "Cart"}
              >
                <span className="relative inline-flex">
                  <ShoppingCart size={20} />
                  {cartCount > 0 ? (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-etukas-red px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
                      {formatCartCount(cartCount)}
                    </span>
                  ) : null}
                </span>
                <span className="hidden text-xs font-bold xl:inline">Cart</span>
              </Link>
            </div>
          </div>

          {/* Collapsible Secondary Navigation Bar (minimizes smoothly on scroll down, returns on scroll up/top) */}
          <div
            className="header-collapse-band bg-gray-50/75"
            data-collapsed={isCompact ? "true" : "false"}
            aria-hidden={isCompact}
          >
            <div className="header-collapse-inner">
              <div className="border-t border-gray-100">
                <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
                <nav
                  aria-label="Primary navigation"
                  className="no-scrollbar flex items-center gap-1 overflow-x-auto text-xs font-semibold lg:gap-1.5 lg:text-[13px]"
                >
                  {NAV_ITEMS.map(({ label, href }) => (
                    <NavLink
                      key={href}
                      to={href}
                      end={href === "/"}
                      tabIndex={isCompact ? -1 : 0}
                      className={({ isActive }) =>
                        cn(
                          "whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors",
                          isActive
                            ? "bg-etukas-pink font-bold text-etukas-red"
                            : "text-gray-700 hover:bg-white hover:text-etukas-black"
                        )
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to="/partner-hub"
                    tabIndex={isCompact ? -1 : 0}
                    className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600 transition-colors hover:bg-orange-100 lg:hidden"
                  >
                    <Handshake size={14} />
                    <span>Etukas Partner</span>
                  </Link>
                  {currentUser ? (
                    <Link
                      to="/orders"
                      tabIndex={isCompact ? -1 : 0}
                      className="hidden whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-etukas-red lg:inline-flex"
                    >
                      My Orders
                    </Link>
                  ) : null}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Side Navigation Drawer */}
      <MobileNav isOpen={isMobileNavOpen} onClose={closeMobileNav} />
    </>
  );
}
