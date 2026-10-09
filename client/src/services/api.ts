import type { ApiResponse } from "@etukas/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

let accessToken: string | null = localStorage.getItem("etukas_access_token");
let csrfToken: string | null = localStorage.getItem("etukas_csrf_token");

async function refreshCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
  const payload = (await response.json()) as ApiResponse<{ csrfToken: string }>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Unable to initialize secure session" : payload.error.message);
  }

  csrfToken = payload.data.csrfToken;
  localStorage.setItem("etukas_csrf_token", csrfToken);
  return csrfToken;
}

export function setSession(nextAccessToken: string | null, nextCsrfToken?: string | null) {
  accessToken = nextAccessToken;
  csrfToken = nextCsrfToken ?? csrfToken;
  if (nextAccessToken) localStorage.setItem("etukas_access_token", nextAccessToken);
  else localStorage.removeItem("etukas_access_token");
  if (nextCsrfToken) localStorage.setItem("etukas_csrf_token", nextCsrfToken);
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
    throw new Error(payload.error.message);
  }
  return payload.data;
}

export const marketplaceApi = {
  categories: () => api<Category[]>("/categories"),
  products: () => api<StoreProduct[]>("/products?pageSize=8"),
  stores: () => api<Store[]>("/stores/nearby?city=Hyderabad"),
  login: async (body: { email: string; password: string }) => {
    const result = await api<{ accessToken: string; csrfToken: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) });
    setSession(result.accessToken, result.csrfToken);
    return result.user;
  },
  register: (body: { name: string; email: string; mobile: string; password: string }) => api<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  cart: () => api<Cart>("/cart"),
  addToCart: (storeProductId: string, quantity: number) => api("/cart/items", { method: "POST", body: JSON.stringify({ storeProductId, quantity }) })
};

export type User = {
  id: string;
  name: string;
  email: string;
  roles: string[];
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
  stockQuantity: number;
  minOrderQuantity: number;
  deliveryEta: string;
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

export type Cart = {
  id: string;
  items: Array<{ id: string; quantity: number; storeProduct: StoreProduct }>;
  totals: { subtotalMinor: number; taxMinor: number; discountMinor: number; totalMinor: number };
};
