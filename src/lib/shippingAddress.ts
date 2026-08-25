export type ShippingAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

const STORAGE_KEY = "secretstash-shipping-address";

export const DEFAULT_ADDRESS: ShippingAddress = {
  name: "Alex Rivera",
  line1: "1847 Market St",
  line2: "Apt 12",
  city: "San Francisco",
  state: "CA",
  postal: "94103",
  country: "United States",
};

export function loadShippingAddress(): ShippingAddress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADDRESS;
    const parsed = JSON.parse(raw) as Partial<ShippingAddress>;
    return { ...DEFAULT_ADDRESS, ...parsed };
  } catch {
    return DEFAULT_ADDRESS;
  }
}

export function persistShippingAddress(address: ShippingAddress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
}

/** One-line form for the checkout summary row. */
export function formatAddressLine(address: ShippingAddress): string {
  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal}`,
  ]
    .filter((part) => part.trim().length > 0)
    .join(" · ");
}

export function isAddressComplete(address: ShippingAddress): boolean {
  return (
    address.name.trim().length > 1 &&
    address.line1.trim().length > 2 &&
    address.city.trim().length > 1 &&
    address.postal.trim().length > 2
  );
}
