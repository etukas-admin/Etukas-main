import type { User } from "../services/api";

export function isAdminUser(user?: User | null): boolean {
  return Boolean(user?.roles?.includes("ADMIN"));
}

/**
 * Returns true for authenticated Seller / Manufacturer / Technician Partner accounts
 * (excluding Admins, who operate in the Admin Dashboard).
 */
export function isPartnerUser(user?: User | null): boolean {
  if (!user || isAdminUser(user)) return false;
  return Boolean(
    user.roles?.includes("SELLER") ||
      user.roles?.includes("MANUFACTURER") ||
      user.roles?.includes("PARTNER") ||
      user.sellerId
  );
}

export function getDefaultHomeForUser(user?: User | null): string {
  if (!user) return "/";
  if (isAdminUser(user)) return "/admin-dashboard";
  if (isPartnerUser(user)) return "/partner-dashboard";
  return "/customer";
}

export function getTrackingReturnTarget(
  user: User | null | undefined,
  orderId: string
): { path: string; label: string; secondaryPath: string; secondaryLabel: string } {
  if (isPartnerUser(user)) {
    return {
      path: "/partner-dashboard?tab=orders",
      label: "Partner Orders",
      secondaryPath: "/partner-dashboard",
      secondaryLabel: "Go to Partner Dashboard"
    };
  }
  if (isAdminUser(user)) {
    return {
      path: "/admin-dashboard",
      label: "Admin Dashboard",
      secondaryPath: "/admin-dashboard",
      secondaryLabel: "Go to Admin Dashboard"
    };
  }
  return {
    path: `/orders/${encodeURIComponent(orderId)}`,
    label: "Order Steps",
    secondaryPath: "/orders",
    secondaryLabel: "Go to My Orders"
  };
}
