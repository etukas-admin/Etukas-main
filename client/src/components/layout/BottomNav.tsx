import { NavLink } from "react-router-dom";
import { Grid3X3, Home, ReceiptText, UserRound } from "lucide-react";

const items = [
  ["Home", "/", Home],
  ["Categories", "/categories", Grid3X3],
  ["Orders", "/orders", ReceiptText],
  ["Account", "/login", UserRound]
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white pb-safe md:hidden">
      {items.map(([label, href, Icon]) => (
        <NavLink key={href} to={href} className={({ isActive }) => `flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold ${isActive ? "text-etukas-red" : "text-gray-600"}`}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
