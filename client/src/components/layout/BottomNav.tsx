import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Grid3X3, Home, ShoppingCart, UserRound } from "lucide-react";
import { getStoredUser, type User } from "../../services/api";
import { getDefaultHomeForUser } from "../../lib/authRoles";
import { useCartQuery } from "../../features/cart/useCart";
import { useTmtCart } from "../../features/tmt/tmtCartStore";

export function BottomNav() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const cartQuery = useCartQuery();
  const tmtCart = useTmtCart();
  const cartCount =
    (cartQuery.data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0) +
    tmtCart.summary.totalBundles;

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("etukas_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const accountHref = currentUser ? getDefaultHomeForUser(currentUser) : "/login";

  const items = [
    { label: "Home", href: "/", Icon: Home, end: true },
    { label: "Categories", href: "/categories", Icon: Grid3X3, end: false },
    { label: "Account", href: accountHref, Icon: UserRound, end: false },
    { label: "Cart", href: "/cart", Icon: ShoppingCart, end: false, badge: cartCount }
  ] as const;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white/95 backdrop-blur-md pb-safe md:hidden"
    >
      {items.map((item) => {
        const Icon = item.Icon;
        const badgeCount = "badge" in item ? item.badge : 0;
        return (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-semibold transition-colors ${
                isActive ? "text-etukas-red" : "text-gray-600 hover:text-gray-900"
              }`
            }
          >
            <span className="relative inline-flex">
              <Icon size={20} />
              {badgeCount > 0 ? (
                <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-etukas-red px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
