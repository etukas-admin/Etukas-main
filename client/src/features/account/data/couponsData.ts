import type { CouponOffer } from "../types";

export const ETUKAS_COUPONS: CouponOffer[] = [
  {
    id: "etukas-welcome-10",
    code: "ETUKAS10",
    title: "Flat 10% OFF on Building Materials",
    subtitle: "Save up to ₹1,500 on your material order",
    description: "Applicable across Cement, Steel, Bricks, Sand, and Electricals from verified nearby suppliers.",
    discountBadge: "10% OFF",
    minOrderText: "Min. order ₹3,000",
    validTill: "Valid till 31 Dec 2026",
    category: "first_order",
    terms: [
      "Maximum instant discount up to ₹1,500 per order.",
      "Valid on orders placed with verified Etukas stores.",
      "Cannot be combined with other promo codes on the same order."
    ],
    applicableHref: "/products"
  },
  {
    id: "etukas-bulk-500",
    code: "BULK500",
    title: "Extra ₹500 OFF on Bulk Site Orders",
    subtitle: "Designed for contractors & full-load deliveries",
    description: "Order 50+ bags of Cement or bulk TMT bars and unlock direct wholesale savings.",
    discountBadge: "₹500 OFF",
    minOrderText: "Min. order ₹15,000",
    validTill: "Valid till 31 Dec 2026",
    category: "bulk",
    terms: [
      "Valid on single-store bulk orders of ₹15,000 or more.",
      "Applicable on Cement, TMT Steel, Red Bricks & Aggregates.",
      "Instant discount applied at checkout."
    ],
    applicableHref: "/products?category=cement"
  },
  {
    id: "etukas-free-delivery",
    code: "FREEDEL",
    title: "Zero Delivery Charge on Local Orders",
    subtitle: "Free transport within 15 km radius",
    description: "Waive standard vehicle delivery charges on eligible building supplies within your nearby radius.",
    discountBadge: "FREE DELIVERY",
    minOrderText: "Min. order ₹5,000",
    validTill: "Valid till 31 Dec 2026",
    category: "delivery",
    terms: [
      "Valid on stores within 15 km of your construction site location.",
      "Unloading charges (if any) are handled directly on site.",
      "Auto-eligible for verified delivery pins."
    ],
    applicableHref: "/stores"
  },
  {
    id: "etukas-cement-150",
    code: "CEMENT150",
    title: "₹150 Instant OFF on Cement Orders",
    subtitle: "OPC 43, OPC 53 & PPC top brands",
    description: "Save instantly when buying UltraTech, Ramco, Dalmia, Bharathi, or Maha Cement.",
    discountBadge: "₹150 OFF",
    minOrderText: "Min. 10 bags",
    validTill: "Valid till 31 Dec 2026",
    category: "bulk",
    terms: [
      "Valid on all listed cement brands in your active delivery radius.",
      "Fresh factory-batch stock guaranteed by Etukas partner stores."
    ],
    applicableHref: "/products?category=cement"
  },
  {
    id: "etukas-festive-build",
    code: "BUILD250",
    title: "₹250 OFF on Paints, Tiles & Plumbing",
    subtitle: "Finishing & renovation special",
    description: "Upgrade your interiors and plumbing essentials with flat savings on finishing supplies.",
    discountBadge: "₹250 OFF",
    minOrderText: "Min. order ₹4,000",
    validTill: "Valid till 31 Dec 2026",
    category: "festive",
    terms: [
      "Applicable on Tiles, Sanitaryware, Paints, and Electrical supplies.",
      "Valid once per user per month."
    ],
    applicableHref: "/categories"
  }
];
