import { Link, NavLink } from "react-router-dom";
import { MapPin, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { useMobileScrollState } from "../../hooks/useMobileScrollState";
import { Logo } from "../common/Logo";
import { Input } from "../ui/Input";

const nav = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Rentals", "/rentals"],
  ["Real Estate", "/real-estate"],
  ["Designs", "/designs"]
] as const;

export function Header() {
  const isMobileScrolled = useMobileScrollState();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[height,padding] duration-300 ease-in-out lg:px-6 ${isMobileScrolled ? "h-10 py-0" : "h-16 py-0"}`}>
        <button className="focus-ring rounded-md p-2 lg:hidden" aria-label="Open menu">
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
        <button className="focus-ring hidden items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-xs md:flex">
          <MapPin size={16} className="text-etukas-red" />
          <span>
            Delivering to
            <strong className="block text-etukas-black">Hyderabad</strong>
          </span>
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
        <Link to="/login" className="focus-ring hidden rounded-md p-2 text-gray-700 hover:bg-gray-50 md:inline-flex" aria-label="My account">
          <UserRound size={20} />
        </Link>
        <Link to="/cart" className="focus-ring relative rounded-md p-2 text-gray-700 hover:bg-gray-50" aria-label="Cart">
          <ShoppingCart size={21} />
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-etukas-red px-1 text-[11px] font-bold text-white">0</span>
        </Link>
      </div>
      <div className={`border-t border-gray-100 px-4 py-2 md:hidden ${isMobileScrolled ? "hidden" : "block"}`}>
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700">
          <MapPin size={14} className="text-etukas-red" /> Delivering to Hyderabad
        </div>
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input className="h-10 pl-10" placeholder="Search building materials" />
        </label>
      </div>
    </header>
  );
}
