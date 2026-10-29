import type { ApiResponse } from "@etukas/shared";
import type { SellerEnquiryInput } from "@etukas/shared";

export function normalizeApiBase(rawUrl?: string): string {
  const trimmed = (rawUrl ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "/api/v1";
  }
  if (!trimmed.endsWith("/api/v1")) {
    if (trimmed.endsWith("/api")) {
      return `${trimmed}/v1`;
    }
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
  }
}

export async function parseJsonResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    const trimmed = text.trim();
    const isHtml =
      trimmed.toLowerCase().startsWith("<!doctype") ||
      trimmed.toLowerCase().startsWith("<html") ||
      contentType.includes("text/html");

    if (isHtml) {
      throw new ApiError(
        `Backend API returned an HTML page (HTTP ${response.status}) instead of JSON for ${url}. Ensure VITE_API_URL is configured in your Vercel deployment to point to your backend service.`,
        "NON_JSON_RESPONSE",
        response.status,
        { contentType, preview: trimmed.slice(0, 200) }
      );
    }

    throw new ApiError(
      `Invalid JSON response (HTTP ${response.status}) from ${url}: ${trimmed.slice(0, 100) || "empty response"}`,
      "INVALID_JSON",
      response.status,
      { contentType, preview: trimmed.slice(0, 200) }
    );
  }
}

function detailsToMessage(error?: ApiErrorPayload) {
  if (!error) return "Unknown server error";
  if (error.code === "VALIDATION_ERROR" && error.details && typeof error.details === "object" && "fieldErrors" in error.details) {
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const messages = Object.entries(fieldErrors ?? {})
      .flatMap(([field, values]) => values.map((value) => `${field}: ${value}`))
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }

  return error.message || "Unknown server error";
}

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

let accessToken: string | null = getStorageItem("etukas_access_token");
let csrfToken: string | null = getStorageItem("etukas_csrf_token");

async function refreshCsrfToken(): Promise<string> {
  const url = `${API_BASE}/auth/csrf`;
  const response = await fetch(url, { credentials: "include" });
  const payload = await parseJsonResponse<{ csrfToken: string }>(response, url);

  if (!response.ok || !payload.ok) {
    throw new ApiError(
      payload.ok ? `Unable to initialize secure session (HTTP ${response.status})` : payload.error.message,
      payload.ok ? "CSRF_INIT_FAILED" : payload.error.code,
      response.status,
      payload.ok ? undefined : payload.error.details
    );
  }

  csrfToken = payload.data.csrfToken;
  setStorageItem("etukas_csrf_token", csrfToken);
  return csrfToken;
}

export function getStoredUser(): User | null {
  try {
    const raw = getStorageItem("etukas_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(nextAccessToken: string | null, nextCsrfToken?: string | null, nextUser?: User | null) {
  accessToken = nextAccessToken;
  csrfToken = nextCsrfToken ?? csrfToken;
  if (nextAccessToken) setStorageItem("etukas_access_token", nextAccessToken);
  else removeStorageItem("etukas_access_token");
  if (nextCsrfToken) setStorageItem("etukas_csrf_token", nextCsrfToken);
  if (nextUser !== undefined) {
    if (nextUser) setStorageItem("etukas_user", JSON.stringify(nextUser));
    else removeStorageItem("etukas_user");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("etukas_auth_change"));
  }
}

export function clearSession() {
  setSession(null, null, null);
  removeStorageItem("etukas_access_token");
  removeStorageItem("etukas_user");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("etukas_auth_change"));
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const requiresCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (requiresCsrf && !csrfToken) await refreshCsrfToken();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (csrfToken && init.method && init.method !== "GET") headers.set("x-csrf-token", csrfToken);

  const url = `${API_BASE}${path}`;
  let response = await fetch(url, {
    ...init,
    headers,
    credentials: "include"
  });
  let payload = await parseJsonResponse<T>(response, url);

  if (requiresCsrf && !payload.ok && payload.error?.code === "CSRF_FAILED") {
    headers.set("x-csrf-token", await refreshCsrfToken());
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "include"
    });
    payload = await parseJsonResponse<T>(response, url);
  }

  if (!payload.ok) {
    throw new ApiError(
      detailsToMessage(payload.error),
      payload.error?.code || `HTTP_${response.status}`,
      response.status,
      payload.error?.details
    );
  }
  return payload.data;
}

export const marketplaceApi = {
  categories: () => api<Category[]>("/categories"),
  products: (params?: { category?: string; pageSize?: number; q?: string }) => {
    const query = new URLSearchParams();
    query.set("pageSize", String(params?.pageSize ?? 24));
    if (params?.category) query.set("category", params.category);
    if (params?.q) query.set("q", params.q);
    return api<StoreProduct[]>(`/products?${query.toString()}`);
  },
  stores: () => api<Store[]>("/stores/nearby?city=Hyderabad"),
  login: async (body: { email?: string; identifier?: string; password: string }) => {
    const result = await api<{ accessToken: string; csrfToken: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) });
    setSession(result.accessToken, result.csrfToken, result.user);
    return result.user;
  },
  resetPassword: (body: { identifier: string; newPassword: string }) =>
    api<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    clearSession();
  },
  me: () => api<User>("/auth/me"),
  register: (body: { name: string; email: string; mobile: string; password: string }) => api<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  submitSellerEnquiry: (body: SellerEnquiryInput) => api<SellerEnquiry>("/seller-enquiries", { method: "POST", body: JSON.stringify(body) }),
  adminSellerEnquiries: () => api<SellerEnquiry[]>("/admin/seller-enquiries"),
  adminSellerEnquiry: (id: string) => api<SellerEnquiry>(`/admin/seller-enquiries/${encodeURIComponent(id)}`),
  adminSellers: () => api<AdminSeller[]>("/admin/sellers"),
  adminUpdateSellerStatus: (id: string, status: "PENDING" | "APPROVED" | "REJECTED", rejectionReason?: string) =>
    api<AdminSeller>(`/admin/sellers/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, rejectionReason })
    }),
  publicBanners: () => api<HomepageBanner[]>("/banners"),
  publicAdBanners: async () => (await api<AdBannerImage[]>("/banners/ad-banners")).map((image) => ({
    ...image,
    imageUrl: image.imageUrl || `${API_BASE}/banners/ad-banners/${encodeURIComponent(image.id)}/image`
  })),
  adminBanners: () => api<HomepageBanner[]>("/admin/banners"),
  adminAdBanners: async () => (await api<AdBannerImage[]>("/admin/ad-banners")).map((image) => ({
    ...image,
    imageUrl: image.imageUrl || `${API_BASE}/banners/ad-banners/${encodeURIComponent(image.id)}/image`
  })),
  adminCreateAdBanner: (body: { section: number; bannerNumber: number; contentType: string; imageData: string }) =>
    api<AdBannerImage>("/admin/ad-banners", { method: "POST", body: JSON.stringify(body) }),
  adminDeleteAdBanner: (id: string) =>
    api<{ id: string }>(`/admin/ad-banners/${encodeURIComponent(id)}`, { method: "DELETE" }),
  adminUploadBannerImage: (body: { contentType: string; imageData: string }) =>
    api<{ url: string }>("/admin/banners/upload", { method: "POST", body: JSON.stringify(body) }),
  adminCreateBanner: (body: HomepageBannerInput) =>
    api<HomepageBanner>("/admin/banners", { method: "POST", body: JSON.stringify(body) }),
  adminUpdateBanner: (id: string, body: HomepageBannerInput) =>
    api<HomepageBanner>(`/admin/banners/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminDeleteBanner: (id: string) =>
    api<{ id: string }>(`/admin/banners/${encodeURIComponent(id)}`, { method: "DELETE" }),
  cart: () => api<Cart>("/cart"),
  addToCart: (storeProductId: string, quantity: number) => api("/cart/items", { method: "POST", body: JSON.stringify({ storeProductId, quantity }) }),
  sellerRegStep1: (body: { contactPerson: string; mobile: string; email: string }) =>
    api<SellerRegistrationResult>("/seller-registration/step1", { method: "POST", body: JSON.stringify(body) }),
  sellerRegStep2: (body: Record<string, unknown>) =>
    api<SellerRegistrationResult>("/seller-registration/step2", { method: "POST", body: JSON.stringify(body) }),
  sellerDashboard: () => api<SellerDashboardData>("/seller/dashboard"),
  sellerProfile: () => api<SellerProfileFull>("/seller/profile"),
  sellerProducts: () => api<SellerProductListing[]>("/seller/products"),
  sellerAddProduct: (body: { name: string; category: string; unit: string; priceMinor: number; stockQuantity: number; imageBase64?: string }) =>
    api<SellerProductListing>("/seller/products", { method: "POST", body: JSON.stringify(body) }),
  sellerUpdateProduct: (id: string, body: { isActive?: boolean; priceMinor?: number; stockQuantity?: number; minOrderQuantity?: number }) =>
    api<SellerProductListing>(`/seller/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  sellerAddProductImage: (listingId: string, imageBase64: string) =>
    api<{ id: string; productId: string; altText: string; sortOrder: number; sizeBytes: number; mimeType: string }>(`/seller/products/${encodeURIComponent(listingId)}/images`, { method: "POST", body: JSON.stringify({ imageBase64 }) }),
  sellerDeleteProductImage: (listingId: string, imageId: string) =>
    api<{ id: string }>(`/seller/products/${encodeURIComponent(listingId)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE" }),
  sellerProductImageUrl: (listingId: string, imageId: string) =>
    `${API_BASE}/seller/products/${encodeURIComponent(listingId)}/images/${encodeURIComponent(imageId)}/data`,
  sellerOrders: () => api<SellerOrder[]>("/seller/orders"),

  // ─── Chat (User) ───────────────────────────────────────────────────────────
  chatStartSession: (subject?: string) =>
    api<ChatSession>("/chat/sessions", { method: "POST", body: JSON.stringify({ subject }) }),
  chatMySessions: () => api<ChatSession[]>("/chat/sessions"),
  chatMessages: (sessionId: string) =>
    api<ChatMessage[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`),
  chatSendMessage: (sessionId: string, content: string) =>
    api<ChatMessage>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ content })
    }),

  // ─── Admin chat ────────────────────────────────────────────────────────────
  adminChatSessions: () => api<ChatSession[]>("/admin/chat/sessions"),
  adminChatMessages: (sessionId: string) =>
    api<ChatMessage[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`),
  adminChatSendMessage: (sessionId: string, content: string) =>
    api<ChatMessage>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ content })
    }),
  adminCloseSession: (sessionId: string) =>
    api<ChatSession>(`/admin/chat/sessions/${encodeURIComponent(sessionId)}/close`, { method: "PATCH" }),
  adminMarkSessionRead: (sessionId: string) =>
    api<{ success: boolean }>(`/admin/chat/sessions/${encodeURIComponent(sessionId)}/read`, { method: "PATCH" }),

  // ─── Admin notifications ───────────────────────────────────────────────────
  adminNotifications: (unreadOnly?: boolean) =>
    api<AdminNotification[]>(`/admin/chat/notifications${unreadOnly ? "?unread=true" : ""}`),
  adminNotificationCount: () => api<{ count: number }>("/admin/chat/notifications/count"),
  adminMarkNotificationsRead: (ids?: string[]) =>
    api<{ success: boolean }>("/admin/chat/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ ids })
    })
};

export type User = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  roles: string[];
  sellerId?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

export type Store = {
  id: string;
  name: string;
  city: string;
  state: string;
  serviceRadiusKm: number;
  sellerProfile?: { businessName: string; verificationStatus: string };
};

export type StoreProduct = {
  id: string;
  priceMinor: number;
  currency: string;
  discountMinor?: number;
  stockQuantity: number;
  minOrderQuantity: number;
  deliveryEta: string;
  updatedAt?: string;
  store: Store;
  product: {
    id: string;
    name: string;
    description: string;
    unit: string;
    images: { url: string; altText: string }[];
    category: Category;
  };
};

export type SellerEnquiry = Omit<SellerEnquiryInput, "latitude" | "longitude"> & {
  id: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status: "NEW" | "CONTACTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
};

export type AdminSeller = {
  id: string;
  sellerId?: string | null;
  contactPerson: string;
  businessName: string;
  businessType: string;
  gstin?: string | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  user: { name: string; email: string; mobile: string };
  stores: Array<{
    id: string;
    name: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    isActive: boolean;
  }>;
};

export type HomepageBanner = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HomepageBannerInput = Omit<HomepageBanner, "id" | "createdAt" | "updatedAt">;

export type AdBannerImage = {
  id: string;
  section: number;
  bannerNumber: number;
  imageUrl: string;
  contentType: string;
  sizeBytes: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Cart = {
  id: string;
  items: Array<{ id: string; quantity: number; storeProduct: StoreProduct }>;
  totals: { subtotalMinor: number; taxMinor: number; discountMinor: number; totalMinor: number };
};

export type SellerRegistrationResult = {
  userId?: string;
  sellerId: string;
  email?: string;
  tempPassword?: string;
  username?: string;
  businessName?: string;
  storeName?: string;
  storeCity?: string;
  registrationStep: number;
  message: string;
};

export type SellerDashboardData = {
  sellerId?: string;
  businessName?: string;
  contactPerson?: string;
  totalOrders: number;
  productsListed: number;
  lowStockProducts: number;
  revenueMinor: number;
  verificationStatus: string;
};

export type SellerProfileFull = {
  id: string;
  sellerId: string;
  contactPerson: string;
  businessName: string;
  businessType: string;
  gstin?: string | null;
  verificationStatus: string;
  registrationStep: number;
  user: {
    name: string;
    email: string;
    mobile: string;
  };
  stores: Array<{
    id: string;
    name: string;
    slug: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number | null;
    longitude?: number | null;
    storeImageUrl?: string | null;
    isActive: boolean;
  }>;
};

export type SellerProductListing = {
  id: string;
  sku: string;
  priceMinor: number;
  stockQuantity: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    description: string;
    unit: string;
    images: { id: string; url: string; altText: string; sortOrder: number; metadata?: { imageData?: string; mimeType?: string; sizeBytes?: number } | null }[];
    category: Category;
  };
  store: Store;
};

export type SellerOrder = {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  customer: { name: string; mobile: string };
  items: Array<{ productName: string; quantity: number; priceMinorSnapshot: number }>;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: "USER" | "ADMIN";
  content: string;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; name: string; roles: string[] };
};

export type ChatSession = {
  id: string;
  userId: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  user?: { id: string; name: string; email: string; roles: string[] };
};

export type AdminNotification = {
  id: string;
  type: "CHAT_MESSAGE" | "NEW_PARTNER" | "PARTNER_ENQUIRY" | "SYSTEM";
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};
