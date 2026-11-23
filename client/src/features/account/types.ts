export type WishlistItem = {
  id: string; // storeProductId
  productId: string;
  name: string;
  priceMinor: number;
  discountMinor?: number;
  unit: string;
  minOrderQuantity: number;
  stockQuantity: number;
  imageUrl: string;
  storeId: string;
  storeName: string;
  categoryName?: string;
  addedAt: string;
};

export type RecentlyViewedItem = {
  id: string;
  type: "product" | "store";
  title: string;
  subtitle?: string;
  imageUrl: string;
  href: string;
  priceMinor?: number;
  unit?: string;
  viewedAt: string;
};

export type CouponCategory = "all" | "bulk" | "first_order" | "delivery" | "festive";

export type CouponOffer = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  discountBadge: string;
  minOrderText: string;
  validTill: string;
  category: Exclude<CouponCategory, "all">;
  terms: string[];
  applicableHref: string;
};

export type SponsorBannerItem = {
  id: string;
  sponsorName: string;
  tagline: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string;
  accentGradient: string;
  isPlaceholder?: boolean;
};

export type SupportedLanguage = "English" | "తెలుగు" | "हिन्दी" | "தமிழ்";

export type NotificationPreferences = {
  orderUpdates: boolean;
  driverAlerts: boolean;
  couponsAndOffers: boolean;
  technicianReminders: boolean;
};

export type AccountPreferences = {
  language: SupportedLanguage;
  notifications: NotificationPreferences;
  claimedCouponIds: string[];
};
