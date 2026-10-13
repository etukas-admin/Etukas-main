import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  Handshake,
  Headphones,
  Home,
  LogIn,
  LogOut,
  Menu,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound
} from "lucide-react";
import { PartnerMobileNav } from "./PartnerMobileNav";
import { PartnerLoginModal } from "../auth/PartnerLoginModal";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";

const partnerNavItems = [
  { label: "Overview", targetId: "overview" },
  { label: "Categories", targetId: "categories" },
  { label: "Benefits", targetId: "benefits" },
  { label: "How It Works", targetId: "how-it-works" },
  { label: "Stories", targetId: "stories" },
  { label: "FAQs", targetId: "faqs" }
];

export function PartnerHeader() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  // Listen to open_partner_login custom event from anywhere in the app
  useEffect(() => {
    const handleOpenLogin = () => setIsLoginModalOpen(true);
    window.addEventListener("open_partner_login", handleOpenLogin);
    return () => window.removeEventListener("open_partner_login", handleOpenLogin);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/partner-hub");
  };

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Top micro-bar for Partner Network */}
      <div className="bg-slate-950 text-slate-300 text-xs border-b border-slate-800 hidden sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold tracking-wide text-orange-400">
              <Handshake size={14} /> ETUKAS PARTNER NETWORK
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 hidden md:inline">Grow Your Business with India's Construction Network</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="tel:18001234567"
              className="flex items-center gap-1 text-slate-400 hover:text-orange-400 transition-colors"
            >
              <Phone size={12} className="text-orange-400" />
              <span>Partner Help: 1800-XXX-XXXX</span>
            </a>
            <span className="text-slate-700">|</span>
            <Link
              to="/"
              className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Home size={12} className="text-red-400" />
              <span>Customer Marketplace</span>
              <ExternalLink size={10} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Partner Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-900/95 shadow-xl backdrop-blur-md border-b border-slate-800"
            : "bg-slate-900 border-b border-slate-800/80"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          {/* Left: Mobile hamburger & Partner Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileNav}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden transition-colors"
              aria-label="Open partner menu"
            >
              <Menu size={22} />
            </button>

            <Link to="/partner-hub" className="flex items-center gap-2 group">
              <img
                src="/etukas-partner-logo.png"
                alt="Etukas Partner — BUILD • CONNECT • GROW"
                className="h-10 sm:h-12 w-auto object-contain brightness-105 group-hover:scale-[1.02] transition-transform"
              />
            </Link>
          </div>

          {/* Center: Partner Navigation links (Desktop) */}
          <nav className="hidden items-center gap-1 lg:flex">
            {partnerNavItems.map(({ label, targetId }) => (
              <button
                key={targetId}
                onClick={() => scrollToSection(targetId)}
                className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-orange-400 transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right: Partner Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Link back to Customer Store */}
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors sm:flex"
              title="Return to Buyer Store"
            >
              <ShoppingBag size={14} className="text-orange-400" />
              <span>Etukas Store</span>
            </Link>

            {/* Partner Auth State */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/seller"
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all"
                >
                  <UserRound size={15} />
                  <span className="hidden sm:inline">Partner Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                  {currentUser.sellerId && (
                    <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-mono">
                      {currentUser.sellerId}
                    </span>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800/80 transition-colors"
                  title="Sign out of Partner Network"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Sign In opens dedicated popup window for partners */}
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  onClick={() => scrollToSection("partner-registration")}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition-all"
                >
                  <span>Register as Partner</span>
                  <ArrowRight size={14} />
                </button>
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
