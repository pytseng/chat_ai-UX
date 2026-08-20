import { INVENTORY_CATALOG } from "./inventoryCatalog";

export type ListInventoryCategory =
  | "top"
  | "bottom"
  | "innerwear"
  | "accessories"
  | "gear"
  | "other";

export type ListInventoryItem = {
  id: string;
  name: string;
  category: ListInventoryCategory;
};

export const LIST_INVENTORY_CATEGORIES: {
  id: ListInventoryCategory;
  label: string;
}[] = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "innerwear", label: "Innerwear" },
  { id: "accessories", label: "Accessories" },
  { id: "gear", label: "Gears" },
  { id: "other", label: "Others" },
];

export function categoryLabel(id: ListInventoryCategory): string {
  return LIST_INVENTORY_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
}

const STORAGE_KEY = "secretstash-list-inventory-v3";

const DEFAULT_ITEMS: ListInventoryItem[] = INVENTORY_CATALOG;

/** Keyword scoring — highest score wins; ties break by CATEGORY_PRIORITY. */
const CATEGORY_PRIORITY: ListInventoryCategory[] = [
  "innerwear",
  "bottom",
  "top",
  "accessories",
  "gear",
  "other",
];

type ClassifyRule = {
  category: ListInventoryCategory;
  pattern: RegExp;
  weight?: number;
};

const CLASSIFY_RULES: ClassifyRule[] = [
  // Innerwear — specific phrases beat generic "merino" / "layer"
  { category: "innerwear", pattern: /\b(base layer|long john?s|liner sock?s|sports bra)\b/i, weight: 4 },
  { category: "innerwear", pattern: /\b(underwear|briefs?|boxers?|sock?s|thermal|innerwear)\b/i, weight: 3 },
  { category: "innerwear", pattern: /\bmerino\b/i, weight: 1 },

  // Bottom
  { category: "bottom", pattern: /\b(rain pant?s|softshell pant?s|hiking pant?s|climbing pant?s|zip-off pant?s|convertible pant?s)\b/i, weight: 4 },
  { category: "bottom", pattern: /\b(pant?s|shorts?|trousers?|leggings?|skirt|jeans|joggers?|chinos?|bottoms?)\b/i, weight: 3 },

  // Top — merino + top garment
  { category: "top", pattern: /\bmerino\b.*\b(tee|shirt|top)\b/i, weight: 5 },
  { category: "top", pattern: /\b(wetsuit|rashguard|impact jacket|hardshell|midlayer|fleece|puffy|rain shell|sun hoody|hoodie?|windbreaker|anorak|parka)\b/i, weight: 4 },
  { category: "top", pattern: /\b(jacket|shell|vest|fleece|pullover|blouse|t-shirt|tshirt|tee|shirt|top|down|insul)\b/i, weight: 2 },

  // Accessories (includes footwear — no dedicated list tab)
  { category: "accessories", pattern: /\b(hiking boot?s|trail runner?s|running shoe?s|boot?s|shoe?s|sandal?s|footwear|slipper?s)\b/i, weight: 4 },
  { category: "accessories", pattern: /\b(sun hat|beanie|buff|gaiter|neck gaiter|sunglass(?:es)?|gloves?|mittens?|scarf|belt|watch|cap|hat)\b/i, weight: 3 },

  // Gear
  { category: "gear", pattern: /\b(backpack|daypack|pack\b|rucksack|trekking pole?s|headlamp|water filter|sleeping bag|tent|dry bag|camp stove|water bottle|trail knife|carabiner|harness|helmet|trekking|poles?)\b/i, weight: 3 },
  { category: "gear", pattern: /\b(stove|lantern|binoculars?|multitool|rope|crampon|gps|compass|filter|knife)\b/i, weight: 2 },

  // Travel / misc — checked last via low weight + priority
  { category: "other", pattern: /\b(charger|cable|adapter|power bank|battery|iphone|android|camera|gopro|kindle|tablet|laptop|medicine|meds|medication|pill?s|prescription|epipen|first aid|passport|wallet|visa|ticket|toilet(?:ry)?|sunscreen|repellent|snack|nut bar|earbuds?|headphones?|sim card|insurance|document)\b/i, weight: 3 },
];

export function classifyInventoryItem(name: string): ListInventoryCategory {
  const n = name.trim().toLowerCase();
  if (!n) return "other";

  const scores = Object.fromEntries(
    CATEGORY_PRIORITY.map((cat) => [cat, 0])
  ) as Record<ListInventoryCategory, number>;

  for (const rule of CLASSIFY_RULES) {
    if (rule.pattern.test(n)) {
      scores[rule.category] += rule.weight ?? 1;
    }
  }

  let best: ListInventoryCategory = "other";
  let bestScore = 0;

  for (const category of CATEGORY_PRIORITY) {
    const score = scores[category];
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return best;
}

export function loadListInventory(): ListInventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw) as ListInventoryItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ITEMS;
    return parsed;
  } catch {
    return DEFAULT_ITEMS;
  }
}

export function persistListInventory(items: ListInventoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function reorderListInventoryCategory(
  items: ListInventoryItem[],
  category: ListInventoryCategory,
  fromId: string,
  toId: string
): ListInventoryItem[] {
  if (fromId === toId) return items;

  const categoryItems = items.filter((item) => item.category === category);
  const fromIndex = categoryItems.findIndex((item) => item.id === fromId);
  const toIndex = categoryItems.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0) return items;

  const reordered = [...categoryItems];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  let inserted = false;
  return items.flatMap((item) => {
    if (item.category !== category) return [item];
    if (inserted) return [];
    inserted = true;
    return reordered;
  });
}
