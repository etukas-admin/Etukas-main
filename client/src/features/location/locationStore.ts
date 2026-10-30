export type DeliveryAddress = {
  id: string;
  label: "Home" | "Office" | "Other";
  recipient: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
};

const ADDRESSES_KEY = "etukas_delivery_addresses";
const SELECTED_KEY = "etukas_selected_address";
export const ADDRESS_CHANGE_EVENT = "etukas_delivery_address_change";

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getDeliveryAddresses(): DeliveryAddress[] {
  return read<DeliveryAddress[]>(ADDRESSES_KEY, []);
}

export function getSelectedAddressId(): string | null {
  return read<string | null>(SELECTED_KEY, null);
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

export function getDeliveryLabel() {
  const addresses = getDeliveryAddresses();
  const selected = addresses.find((address) => address.id === getSelectedAddressId());
  return selected ? selected.city || selected.label : "Set location";
}
