import type { ApiResponse } from "@etukas/shared";
import type { SellerEnquiryInput } from "@etukas/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

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

function detailsToMessage(error: ApiErrorPayload) {
  if (error.code === "VALIDATION_ERROR" && error.details && typeof error.details === "object" && "fieldErrors" in error.details) {
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const messages = Object.entries(fieldErrors ?? {})
      .flatMap(([field, values]) => values.map((value) => `${field}: ${value}`))
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }

  return error.message;
}

let accessToken: string | null = localStorage.getItem("etukas_access_token");
let csrfToken: string | null = localStorage.getItem("etukas_csrf_token");

async function refreshCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
  const payload = (await response.json()) as ApiResponse<{ csrfToken: string }>;

  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.ok ? "Unable to initialize secure session" : payload.error.message, payload.ok ? "CSRF_INIT_FAILED" : payload.error.code, response.status, payload.ok ? undefined : payload.error.details);
  }

  csrfToken = payload.data.csrfToken;
  localStorage.setItem("etukas_csrf_token", csrfToken);
  return csrfToken;
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("etukas_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(nextAccessToken: string | null, nextCsrfToken?: string | null, nextUser?: User | null) {
  accessToken = nextAccessToken;
  csrfToken = nextCsrfToken ?? csrfToken;
  if (nextAccessToken) localStorage.setItem("etukas_access_token", nextAccessToken);
  else localStorage.removeItem("etukas_access_token");
  if (nextCsrfToken) localStorage.setItem("etukas_csrf_token", nextCsrfToken);
  if (nextUser !== undefined) {
    if (nextUser) localStorage.setItem("etukas_user", JSON.stringify(nextUser));
    else localStorage.removeItem("etukas_user");
  }
  window.dispatchEvent(new Event("etukas_auth_change"));
}

export function clearSession() {
  setSession(null, null, null);
  localStorage.removeItem("etukas_access_token");
  localStorage.removeItem("etukas_user");
  window.dispatchEvent(new Event("etukas_auth_change"));
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const requiresCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (requiresCsrf && !csrfToken) await refreshCsrfToken();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (csrfToken && init.method && init.method !== "GET") headers.set("x-csrf-token", csrfToken);

  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });
  let payload = (await response.json()) as ApiResponse<T>;
  if (requiresCsrf && !payload.ok && payload.error.code === "CSRF_FAILED") {
    headers.set("x-csrf-token", await refreshCsrfToken());
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include"
    });
    payload = (await response.json()) as ApiResponse<T>;
  }

  if (!payload.ok) {
    throw new ApiError(detailsToMessage(payload.error), payload.error.code, response.status, payload.error.details);
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
  cart: () => api<Cart>("/cart"),
  addToCart: (storeProductId: string, quantity: number) => api("/cart/items", { method: "POST", body: JSON.stringify({ storeProductId, quantity }) }),
  sellerRegStep1: (body: { contactPerson: string; mobile: string; email: string }) =>
    api<SellerRegistrationResult>("/seller-registration/step1", { method: "POST", body: JSON.stringify(body) }),
  sellerRegStep2: (body: Record<string, unknown>) =>
    api<SellerRegistrationResult>("/seller-registration/step2", { method: "POST", body: JSON.stringify(body) }),
  sellerDashboard: () => api<SellerDashboardData>("/seller/dashboard"),
  sellerProfile: () => api<SellerProfileFull>("/seller/profile"),
  sellerProducts: () => api<SellerProductListing[]>("/seller/products"),
  sellerOrders: () => api<SellerOrder[]>("/seller/orders")
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
    images: { url: string; altText: string }[];
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
