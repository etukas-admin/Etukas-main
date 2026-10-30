export type AddressLabel = "Construction Site" | "Home" | "Office" | "Other";
export type PricingScope = "radius_25km" | "district";

export type DeliveryAddress = {
  id: string;
  label: AddressLabel;
  recipient: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  district?: string;
  state?: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  siteName?: string;
  pricingScope?: PricingScope;
  radiusKm?: number;
};

const ADDRESSES_KEY = "etukas_delivery_addresses";
const SELECTED_KEY = "etukas_selected_address";
export const ADDRESS_CHANGE_EVENT = "etukas_delivery_address_change";

// Default starter site for user's construction project
export const DEFAULT_CONSTRUCTION_SITE: DeliveryAddress = {
  id: "kakinada-construction-site",
  label: "Construction Site",
  recipient: "Site Supervisor",
  siteName: "Home Construction Site",
  line1: "Karapa Village, Kakinada Rural",
  line2: "Near Gram Panchayat Bhavan",
  landmark: "Main Road",
  city: "Kakinada Rural",
  district: "Kakinada",
  state: "Andhra Pradesh",
  postalCode: "533462",
  latitude: 16.9891,
  longitude: 82.2475,
  pricingScope: "radius_25km",
  radiusKm: 25
};

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getDeliveryAddresses(): DeliveryAddress[] {
  const addresses = read<DeliveryAddress[]>(ADDRESSES_KEY, []);
  if (!addresses || addresses.length === 0) {
    saveDeliveryAddresses([DEFAULT_CONSTRUCTION_SITE], DEFAULT_CONSTRUCTION_SITE.id);
    return [DEFAULT_CONSTRUCTION_SITE];
  }
  return addresses;
}

export function getSelectedAddressId(): string | null {
  const selected = read<string | null>(SELECTED_KEY, null);
  if (!selected) {
    const list = read<DeliveryAddress[]>(ADDRESSES_KEY, []);
    return list.length > 0 ? list[0].id : DEFAULT_CONSTRUCTION_SITE.id;
  }
  return selected;
}

export function getSelectedAddress(): DeliveryAddress {
  const addresses = getDeliveryAddresses();
  const selectedId = getSelectedAddressId();
  const found = addresses.find((addr) => addr.id === selectedId);
  return found || addresses[0] || DEFAULT_CONSTRUCTION_SITE;
}

export function saveDeliveryAddresses(addresses: DeliveryAddress[], selectedId: string | null) {
  try {
    window.localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
    if (selectedId) window.localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedId));
    else window.localStorage.removeItem(SELECTED_KEY);
  } catch {
    // Keep the picker usable when browser storage is disabled.
  }
  window.dispatchEvent(new Event(ADDRESS_CHANGE_EVENT));
}

export function setSelectedAddressId(id: string) {
  const addresses = getDeliveryAddresses();
  if (addresses.some((a) => a.id === id)) {
    saveDeliveryAddresses(addresses, id);
  }
}

export function getDeliveryLabel(): string {
  const selected = getSelectedAddress();
  if (!selected) return "Set location";
  const city = selected.city || selected.line1 || selected.label;
  if (selected.pricingScope === "district" && selected.district) {
    return `${selected.district} Dist.`;
  }
  if (selected.pricingScope === "radius_25km") {
    return `${city} (25km)`;
  }
  return city;
}

export function getDeliverySummary() {
  const selected = getSelectedAddress();
  return {
    city: selected?.city || "Set location",
    district: selected?.district || selected?.city || "Local",
    scope: selected?.pricingScope || "radius_25km",
    radiusKm: selected?.radiusKm || 25,
    isConstructionSite: selected?.label === "Construction Site",
    latitude: selected?.latitude,
    longitude: selected?.longitude
  };
}
