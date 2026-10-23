import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Grid3X3, Home, ShoppingCart, UserRound } from "lucide-react";
import { getStoredUser, type User } from "../../services/api";

export function BottomNav() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  const accountHref = currentUser
    ? currentUser.roles.includes("SELLER")
      ? "/seller"
      : currentUser.roles.includes("ADMIN")
      ? "/admin"
      : "/customer"
    : "/login";

  const items = [
    ["Home", "/", Home],
    ["Categories", "/categories", Grid3X3],
    ["Account", accountHref, UserRound],
    ["Cart", "/cart", ShoppingCart]
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white pb-safe md:hidden">
      {items.map(([label, href, Icon]) => (
        <NavLink
          key={label}
          to={href}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold ${
              isActive ? "text-etukas-red" : "text-gray-600"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
