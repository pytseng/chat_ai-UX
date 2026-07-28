export type SavedProduct = {
  id: string;
  name: string;
  imageUrl: string;
  categoryTitle: string;
  sourceUrl?: string;
  savedAt: string;
};

const STORAGE_KEY = "secretstash-saved-products";

export function loadSavedProducts(): SavedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedProducts(products: SavedProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function makeSavedProductId(name: string, imageUrl: string): string {
  return `${slugify(name)}-${hashString(imageUrl)}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
