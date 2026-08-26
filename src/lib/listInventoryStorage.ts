export type ListInventoryCategory =
  | "top"
  | "bottom"
  | "footwear"
  | "innerwear"
  | "accessories"
  | "gear"
  | "other";

export type ListInventoryItem = {
  id: string;
  name: string;
  category: ListInventoryCategory;
  /** R2 object key for a product photo, when the item has one. */
  imageKey?: string;
  /** Absolute photo URL from a purchased search result. */
  imageUrl?: string;
};

/** Canonical taxonomy — shared by the inventory views, the loadout grid and
 *  the chat suggestion parser. Keep these in sync with SuggestionCategoryId. */
export const LIST_INVENTORY_CATEGORIES: {
  id: ListInventoryCategory;
  label: string;
}[] = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "footwear", label: "Footwear" },
  { id: "innerwear", label: "Innerwear" },
  { id: "accessories", label: "Accessories" },
  { id: "gear", label: "Gear" },
  { id: "other", label: "Other" },
];

export function categoryLabel(id: ListInventoryCategory): string {
  return LIST_INVENTORY_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
}

const STORAGE_KEY = "secretstash-list-inventory-v4";

/** The stash starts empty — every item is one the user actually added. */
const DEFAULT_ITEMS: ListInventoryItem[] = [];

/** Keyword scoring — highest score wins; ties break by CATEGORY_PRIORITY. */
const CATEGORY_PRIORITY: ListInventoryCategory[] = [
  "footwear",
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

  // Footwear — beats accessories so shoes never land in the wrong tab
  { category: "footwear", pattern: /\b(hiking boot?s|approach shoe?s|trail runner?s|running shoe?s|camp shoe?s|water shoe?s)\b/i, weight: 5 },
  { category: "footwear", pattern: /\b(boot?s|shoe?s|sandal?s|sneaker?s|trainer?s|footwear|slipper?s|flip.?flop?s|clog?s)\b/i, weight: 4 },

  // Accessories
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

export function insertListInventoryItem(
  items: ListInventoryItem[],
  newItem: ListInventoryItem,
  sortInCategory = false
): ListInventoryItem[] {
  if (!sortInCategory) return [...items, newItem];

  const categoryItems = items.filter((item) => item.category === newItem.category);
  const insertAt = categoryItems.findIndex(
    (item) =>
      item.name.localeCompare(newItem.name, undefined, {
        sensitivity: "base",
      }) > 0
  );

  if (insertAt === -1) {
    if (categoryItems.length === 0) return [...items, newItem];

    const lastCategoryItem = categoryItems[categoryItems.length - 1]!;
    const lastIndex = items.findIndex((item) => item.id === lastCategoryItem.id);
    const next = [...items];
    next.splice(lastIndex + 1, 0, newItem);
    return next;
  }

  const anchor = categoryItems[insertAt]!;
  const anchorIndex = items.findIndex((item) => item.id === anchor.id);
  const next = [...items];
  next.splice(anchorIndex, 0, newItem);
  return next;
}

export function loadListInventory(): ListInventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw) as ListInventoryItem[];
    // An empty stored array is a real state — the user removed everything.
    if (!Array.isArray(parsed)) return DEFAULT_ITEMS;
    return parsed;
  } catch {
    return DEFAULT_ITEMS;
  }
}

export function persistListInventory(items: ListInventoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let liveItems = loadListInventory();
const inventoryListeners = new Set<() => void>();

export function subscribeListInventory(listener: () => void) {
  inventoryListeners.add(listener);
  return () => {
    inventoryListeners.delete(listener);
  };
}

export function getListInventory(): ListInventoryItem[] {
  return liveItems;
}

export function setListInventory(
  next:
    | ListInventoryItem[]
    | ((prev: ListInventoryItem[]) => ListInventoryItem[])
) {
  liveItems = typeof next === "function" ? next(liveItems) : next;
  persistListInventory(liveItems);
  inventoryListeners.forEach((listener) => listener());
}

export function addListInventoryItems(items: ListInventoryItem[]) {
  if (items.length === 0) return;
  setListInventory((prev) => {
    let next = prev;
    for (const item of items) {
      next = insertListInventoryItem(next, item, true);
    }
    return next;
  });
}

const PURCHASE_CATEGORY_ALIASES: Record<string, ListInventoryCategory> = {
  "top layer": "top",
  "bottom layer": "bottom",
  "more items": "other",
};

function categoryFromPurchaseHint(hint?: string): ListInventoryCategory | undefined {
  const raw = hint?.split(/[·•|]/)[0]?.trim().toLowerCase() ?? "";
  if (!raw) return undefined;

  const exact = LIST_INVENTORY_CATEGORIES.find(
    (entry) => entry.label.toLowerCase() === raw || entry.id === raw
  );
  if (exact) return exact.id;

  const aliased = PURCHASE_CATEGORY_ALIASES[raw];
  if (aliased) return aliased;

  return LIST_INVENTORY_CATEGORIES.find(
    (entry) =>
      raw.startsWith(entry.label.toLowerCase()) || raw.startsWith(entry.id)
  )?.id;
}

/** Map a purchased search product onto the owned stash list. */
export function inventoryItemFromPurchase(input: {
  name: string;
  categoryId?: string;
  categoryHint?: string;
  imageUrl?: string;
}): ListInventoryItem {
  const fromId = LIST_INVENTORY_CATEGORIES.find(
    (entry) => entry.id === input.categoryId
  )?.id;

  return {
    id: `buy-${crypto.randomUUID()}`,
    name: input.name,
    category:
      fromId ??
      categoryFromPurchaseHint(input.categoryHint) ??
      classifyInventoryItem(input.name),
    imageUrl: input.imageUrl || undefined,
  };
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
