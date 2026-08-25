export type PayMethod = "link" | "apple" | "google" | "coinbase" | "card";

export const EXPRESS_METHODS: PayMethod[] = [
  "link",
  "apple",
  "google",
  "coinbase",
];

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function mockOrderId(): string {
  return `SS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function payMethodLabel(method: PayMethod): string {
  switch (method) {
    case "link":
      return "Link";
    case "apple":
      return "Apple Pay";
    case "google":
      return "Google Pay";
    case "coinbase":
      return "Coinbase Wallet";
    case "card":
      return "card";
  }
}

export type CardFields = {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
};

export const EMPTY_CARD: CardFields = {
  number: "",
  expiry: "",
  cvc: "",
  name: "",
};

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatCvc(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function cardBrand(number: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 2) return null;
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(011|5)/.test(digits)) return "Discover";
  return null;
}

/** Shape check only — a mock checkout has no reason to reject past dates. */
function isExpiryValid(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  return month >= 1 && month <= 12;
}

export function isCardComplete(card: CardFields): boolean {
  return (
    card.number.replace(/\D/g, "").length === 16 &&
    isExpiryValid(card.expiry) &&
    card.cvc.length >= 3 &&
    card.name.trim().length > 1
  );
}
