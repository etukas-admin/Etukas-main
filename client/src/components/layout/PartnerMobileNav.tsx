import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  Factory,
  Handshake,
  HelpCircle,
  Home,
  LogIn,
  LogOut,
  Phone,
  Settings2,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";

interface PartnerMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLoginModal?: () => void;
}

const partnerCategories = [
  { id: "seller", label: "Seller", icon: Store, desc: "Building Materials Retail & Wholesale" },
  { id: "technician", label: "Technician", icon: Wrench, desc: "Plumbing, Electrical & Civil Experts" },
  { id: "manufacturer", label: "Manufacturer", icon: Factory, desc: "Direct Bulk Material Supply" },
  { id: "equipment-owner", label: "Equipment Owner", icon: Settings2, desc: "Construction Machinery Rentals" }
];

export function PartnerMobileNav({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onOpenLoginModal
}: PartnerMobileNavProps) {
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Lock body scroll when drawer is open
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

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const scrollToSection = (id: string) => {
    onClose();
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-visibility duration-300 ${
        isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 flex w-full max-w-xs sm:max-w-sm flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-4">
          <Link to="/partner-hub" onClick={onClose} className="flex items-center gap-2">
            <img
              src="/etukas-partner-logo.png"
              alt="Etukas Partner"
              className="h-9 w-auto object-contain brightness-110"
              onError={(e) => {
                // Fallback if image failed
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-orange-400 uppercase">
                Partner Network
              </span>
              <span className="text-[10px] text-slate-400">Build • Connect • Grow</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* User Status Card */}
          {currentUser ? (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-sm">
                    {currentUser.name?.[0] || "P"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{currentUser.name}</div>
                    <div className="text-xs text-orange-300 font-mono">
                      Partner ID: {currentUser.sellerId || "Active"}
                    </div>
                  </div>
                </div>
                <BadgeCheck size={20} className="text-orange-400" />
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to="/seller"
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-orange-500 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-xs font-semibold text-slate-300">
                Join 500+ building material suppliers & service pros.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => scrollToSection("partner-registration")}
                  className="rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-3 py-2 text-center text-xs font-bold text-white hover:opacity-95 shadow-md shadow-orange-500/20"
                >
                  Register Now
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenLoginModal?.();
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Partner Sign In
                </button>
              </div>
            </div>
          )}

          {/* Partner Quick Nav */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Partner Hub Navigation
            </h4>
            <div className="space-y-1">
              <button
                onClick={() => scrollToSection("overview")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <Sparkles size={16} className="text-orange-400" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => scrollToSection("categories")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <Building2 size={16} className="text-orange-400" />
                <span>Partner Categories</span>
              </button>
              <button
                onClick={() => scrollToSection("benefits")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <TrendingUp size={16} className="text-orange-400" />
                <span>Benefits & Growth</span>
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <BadgeCheck size={16} className="text-orange-400" />
                <span>How It Works</span>
              </button>
              <button
                onClick={() => scrollToSection("stories")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <Handshake size={16} className="text-orange-400" />
                <span>Success Stories</span>
              </button>
              <button
                onClick={() => scrollToSection("faqs")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <HelpCircle size={16} className="text-orange-400" />
                <span>Partner FAQs</span>
              </button>
            </div>
          </div>

          {/* Partner Categories List */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Who Can Partner?
            </h4>
            <div className="space-y-1.5">
              {partnerCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                    <cat.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-200">{cat.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{cat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Helpline */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <div className="text-xs font-semibold text-slate-300">Partner Support Helpline</div>
            <a
              href="tel:18001234567"
              className="mt-1.5 flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300"
            >
              <Phone size={14} /> 1800-XXX-XXXX
            </a>
            <p className="mt-1 text-[11px] text-slate-400">Mon - Sat, 9:00 AM to 9:00 PM</p>
          </div>
        </div>

        {/* Drawer Footer: Back to Customer Marketplace */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Home size={16} className="text-orange-400" />
              <span>Back to Customer Marketplace</span>
            </span>
            <ExternalLink size={14} className="text-slate-400" />
          </Link>
          <div className="mt-2 text-center text-[10px] text-slate-400">
            Etukas Partner Network © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
