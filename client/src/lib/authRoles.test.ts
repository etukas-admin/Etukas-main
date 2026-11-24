import { describe, expect, it } from "vitest";
import {
  getDefaultHomeForUser,
  getTrackingReturnTarget,
  isAdminUser,
  isPartnerUser
} from "./authRoles";
import type { User } from "../services/api";

const customerUser: User = {
  id: "u-cust",
  name: "Raju",
  email: "raju@example.com",
  roles: ["CUSTOMER"]
};

const sellerUser: User = {
  id: "u-sell",
  name: "Ragava Bricks",
  email: "ragava@example.com",
  roles: ["SELLER"],
  sellerId: "SEA12345"
};

const manufacturerUser: User = {
  id: "u-mfg",
  name: "Deccan Cement",
  email: "deccan@example.com",
  roles: ["MANUFACTURER"]
};

const adminUser: User = {
  id: "u-adm",
  name: "Admin",
  email: "admin@etukas.com",
  roles: ["ADMIN"]
};

describe("authRoles portal isolation helpers", () => {
  it("correctly classifies partners, admins, and customers", () => {
    expect(isPartnerUser(sellerUser)).toBe(true);
    expect(isPartnerUser(manufacturerUser)).toBe(true);
    expect(isPartnerUser(customerUser)).toBe(false);
    expect(isPartnerUser(adminUser)).toBe(false);
    expect(isPartnerUser(null)).toBe(false);

    expect(isAdminUser(adminUser)).toBe(true);
    expect(isAdminUser(sellerUser)).toBe(false);
  });

  it("resolves default portal home per role", () => {
    expect(getDefaultHomeForUser(sellerUser)).toBe("/partner-dashboard");
    expect(getDefaultHomeForUser(adminUser)).toBe("/admin-dashboard");
    expect(getDefaultHomeForUser(customerUser)).toBe("/customer");
    expect(getDefaultHomeForUser(null)).toBe("/");
  });

  it("routes tracking Back buttons back to the user's own portal without leaking partners to customer marketplace", () => {
    const partnerTarget = getTrackingReturnTarget(sellerUser, "ETORD944676");
    expect(partnerTarget.path).toBe("/partner-dashboard?tab=orders");
    expect(partnerTarget.label).toBe("Partner Orders");

    const adminTarget = getTrackingReturnTarget(adminUser, "ETORD944676");
    expect(adminTarget.path).toBe("/admin-dashboard");

    const customerTarget = getTrackingReturnTarget(customerUser, "ETORD944676");
    expect(customerTarget.path).toBe("/orders/ETORD944676");
    expect(customerTarget.label).toBe("Order Steps");
  });
});
