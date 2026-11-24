import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Handshake,
  Home,
  LogOut,
  Mail,
  Menu,
  ShoppingBag,
  UserRound
} from "lucide-react";
import { PartnerMobileNav } from "./PartnerMobileNav";
import { PartnerLoginModal } from "../auth/PartnerLoginModal";
import { CustomerSupportPillButton } from "./CustomerSupportPillButton";
import { OPEN_SUPPORT_CHAT_EVENT } from "../chat/UserChatWidget";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { isPartnerUser } from "../../lib/authRoles";
import { useHeaderHeightCssVar, useHeaderScroll } from "../../hooks/useMobileScrollState";
import { cn } from "../../lib/utils";

const PARTNER_NAV_ITEMS = [
  { label: "Overview", targetId: "overview" },
  { label: "Categories", targetId: "categories" },
  { label: "Benefits", targetId: "benefits" },
  { label: "How It Works", targetId: "how-it-works" },
  { label: "Stories", targetId: "stories" },
  { label: "FAQs", targetId: "faqs" }
] as const;

export function PartnerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const { isScrolled, isCompact } = useHeaderScroll({
    paused: isMobileNavOpen || isLoginModalOpen
  });
  useHeaderHeightCssVar(headerRef);

  const signedInPartner = isPartnerUser(currentUser);
  const isDashboardView = location.pathname === "/partner-dashboard";

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("etukas_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Listen to open_partner_login custom event from anywhere in the app
  useEffect(() => {
    const handleOpenLogin = () => setIsLoginModalOpen(true);
    window.addEventListener("open_partner_login", handleOpenLogin);
    return () => window.removeEventListener("open_partner_login", handleOpenLogin);
  }, []);

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/partner-hub");
  };

  const handleSwitchToCustomerMarketplace = async () => {
    await marketplaceApi.logout();
    navigate("/login");
  };

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const openSupportChat = useCallback(() => {
    window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
  }, []);

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-[box-shadow,background-color,border-color] duration-300",
          isScrolled
            ? "border-slate-800 bg-slate-900/95 shadow-xl backdrop-blur-md"
            : "border-slate-800/80 bg-slate-900"
        )}
      >
        {/* Top micro-bar for Partner Network (smoothly collapses on scroll) */}
        <div
          className="header-collapse-band hidden bg-slate-950 text-xs text-slate-300 sm:grid"
          data-collapsed={isCompact ? "true" : "false"}
          aria-hidden={isCompact}
        >
          <div className="header-collapse-inner">
            <div className="border-b border-slate-800">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex shrink-0 items-center gap-1.5 font-bold tracking-wide text-orange-400">
                  <Handshake size={14} /> ETUKAS PARTNER NETWORK
                </span>
                <span className="hidden text-slate-600 md:inline">|</span>
                <span className="hidden truncate text-slate-400 md:inline">
                  Grow Your Business with India&apos;s Construction Network
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-[11px] lg:gap-4">
                <a
                  href="mailto:partners@etukas.com"
                  tabIndex={isCompact ? -1 : 0}
                  className="hidden items-center gap-1 text-slate-400 transition-colors hover:text-orange-400 md:flex"
                >
                  <Mail size={12} className="text-orange-400" />
                  <span>partners@etukas.com</span>
                </a>
                <span className="hidden text-slate-700 md:inline">|</span>
                {signedInPartner ? (
                  <button
                    type="button"
                    tabIndex={isCompact ? -1 : 0}
                    onClick={() => void handleSwitchToCustomerMarketplace()}
                    className="flex items-center gap-1 whitespace-nowrap font-semibold text-slate-300 transition-colors hover:text-orange-300"
                    title="Sign out of your Partner account to sign in as a Customer"
                  >
                    <LogOut size={12} className="text-orange-400" />
                    <span>Switch to Customer Login</span>
                  </button>
                ) : (
                  <Link
                    to="/"
                    tabIndex={isCompact ? -1 : 0}
                    className="flex items-center gap-1 whitespace-nowrap font-semibold text-slate-300 transition-colors hover:text-white"
                  >
                    <Home size={12} className="text-red-400" />
                    <span>Customer Marketplace</span>
                    <ExternalLink size={10} className="text-slate-400" />
                  </Link>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Partner Bar (compacts padding & logo smoothly on scroll) */}
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-4 sm:px-4 lg:px-6",
            isCompact ? "py-2" : "py-2.5 sm:py-3"
          )}
        >
          {/* Left: Mobile hamburger & Partner Logo */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openMobileNav}
              aria-expanded={isMobileNavOpen}
              className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Open partner menu"
            >
              <Menu size={21} />
            </button>

            <Link
              to={signedInPartner ? "/partner-dashboard" : "/partner-hub"}
              className="group flex min-w-0 items-center gap-2"
            >
              {logoError ? (
                <span className="truncate text-sm font-black tracking-wide text-orange-400 sm:text-base">
                  ETUKAS PARTNER
                </span>
              ) : (
                <img
                  src="/etukas-partner-logo.png"
                  alt="Etukas Partner — BUILD • CONNECT • GROW"
                  onError={() => setLogoError(true)}
                  className={cn(
                    "w-auto object-contain brightness-105 transition-[height,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]",
                    isCompact ? "h-7 sm:h-9" : "h-8 sm:h-10 lg:h-11"
                  )}
                />
              )}
            </Link>
          </div>

          {/* Center: Partner Hub Navigation links (only on landing page, not inside Dashboard) */}
          {!isDashboardView && !signedInPartner ? (
            <nav aria-label="Partner hub sections" className="hidden items-center gap-0.5 lg:flex xl:gap-1">
              {PARTNER_NAV_ITEMS.map(({ label, targetId }) => (
                <button
                  key={targetId}
                  type="button"
                  onClick={() => scrollToSection(targetId)}
                  className="whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-orange-400 xl:px-3"
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : null}

          {/* Right: Partner Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {!signedInPartner ? (
              <Link
                to="/"
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white md:flex"
                title="Return to Buyer Store"
              >
                <ShoppingBag size={14} className="text-orange-400" />
                <span>Etukas Store</span>
              </Link>
            ) : null}

            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Link
                  to="/partner-dashboard"
                  className={cn(
                    "items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-600 sm:gap-2 sm:px-3 sm:py-2",
                    isDashboardView ? "hidden sm:flex" : "flex"
                  )}
                >
                  <UserRound size={15} className="shrink-0" />
                  <span className="hidden sm:inline">Partner Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                  {currentUser.sellerId ? (
                    <span className="hidden rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-mono md:inline">
                      {currentUser.sellerId}
                    </span>
                  ) : null}
                </Link>

                {/* Partner Support Live Chat icon (opens shared UserChatWidget wired to Admin Enquiries) */}
                <CustomerSupportPillButton
                  onClick={openSupportChat}
                  label="Partner Support"
                  variant="dark"
                  size={28}
                  animateOnLoad
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden items-center gap-1 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-red-800/80 hover:bg-red-950/60 hover:text-red-300 sm:flex"
                  title="Sign out of Partner Network"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white sm:px-3 sm:py-2 sm:text-xs"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("partner-registration")}
                  className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:opacity-95 sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-xs"
                >
                  <span className="sm:hidden">Register</span>
                  <span className="hidden sm:inline">Register as Partner</span>
                  <ArrowRight size={13} className="shrink-0 sm:h-3.5 sm:w-3.5" />
                </button>

                <CustomerSupportPillButton
                  onClick={openSupportChat}
                  label="Partner Support"
                  variant="dark"
                  size={26}
                  animateOnLoad={false}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dedicated Partner Mobile Navigation Drawer */}
      <PartnerMobileNav
        isOpen={isMobileNavOpen}
        onClose={closeMobileNav}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchToCustomer={handleSwitchToCustomerMarketplace}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Dedicated Partner Sign In Popup Window Modal */}
      <PartnerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onRegisterClick={() => scrollToSection("partner-registration")}
      />
    </>
  );
}
