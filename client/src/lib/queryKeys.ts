/**
 * Centralized Query Keys Factory
 * Provides consistent, type-safe query keys across the entire application
 * to guarantee cache deduplication and predictable cache invalidation.
 */

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const
  },
  categories: {
    all: ["categories"] as const
  },
  products: {
    all: ["products"] as const,
    list: (params?: Record<string, unknown>) => ["products", params ?? {}] as const,
    detail: (id: string) => ["products", "detail", id] as const
  },
  stores: {
    all: ["stores"] as const,
    nearby: (city?: string) => ["stores", city ?? ""] as const
  },
  technicians: {
    all: ["technicians"] as const,
    list: (params?: Record<string, unknown>) => ["technicians", params ?? {}] as const,
    detail: (id: string) => ["technician-profile", id] as const,
    myBookings: () => ["technician-bookings", "me"] as const,
    sellerBookings: (sellerId: string) => ["technician-bookings", sellerId] as const,
    customerBookings: () => ["customer-service-bookings"] as const
  },
  cart: {
    all: ["cart"] as const
  },
  orders: {
    customer: () => ["customer-orders"] as const,
    detail: (id: string) => ["order-details", id] as const,
    seller: () => ["partner-orders"] as const,
    admin: () => ["admin", "orders"] as const
  },
  banners: {
    public: () => ["home", "banners"] as const,
    publicAds: () => ["home", "ad-banners"] as const,
    admin: () => ["admin", "banners"] as const,
    adminAds: () => ["admin", "ad-banners"] as const
  },
  seller: {
    dashboard: () => ["seller-dashboard"] as const,
    profile: () => ["seller-profile"] as const,
    products: () => ["seller-products"] as const
  },
  admin: {
    me: () => ["admin", "me"] as const,
    sellers: () => ["admin", "sellers"] as const,
    enquiries: () => ["admin", "seller-enquiries"] as const,
    enquiry: (id: string) => ["admin", "seller-enquiries", id] as const,
    chatSessions: () => ["admin", "chat", "sessions"] as const,
    chatMessages: (sessionId: string) => ["admin", "chat", "messages", sessionId] as const,
    notifications: () => ["admin", "notifications"] as const,
    notificationsCount: () => ["admin", "notifications", "count"] as const
  },
  chat: {
    mySessions: () => ["chat", "my-sessions"] as const,
    messages: (sessionId: string) => ["chat", "messages", sessionId] as const
  }
} as const;

