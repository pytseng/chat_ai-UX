export type SuggestionCategoryId =
  | "top"
  | "bottom"
  | "accessories"
  | "gear"
  | "other";

export type PackSuggestion = {
  id: string;
  title: string;
  categoryId: SuggestionCategoryId;
  categoryLabel: string;
};

export type SuggestionCategory = {
  id: SuggestionCategoryId;
  label: string;
  items: PackSuggestion[];
};

export const CATEGORY_ORDER: SuggestionCategoryId[] = [
  "top",
  "bottom",
  "accessories",
  "gear",
  "other",
];

const CATEGORY_LABELS: Record<SuggestionCategoryId, string> = {
  top: "Top layer",
  bottom: "Bottom layer",
  accessories: "Accessories",
  gear: "Gear",
  other: "More items",
};

function cleanItem(raw: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)/;

/** Matches "## Top layer", "**Top layer**", "Top layer:", "### Bottom layer" */
const HEADING_RE =
  /^\s*(?:#{1,3}\s+|\*\*)?([A-Za-z][A-Za-z0-9 &/+-]{1,40}?)(?:\*\*)?\s*:?\s*$/;

function normalizeCategoryKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchCategoryId(heading: string): SuggestionCategoryId | null {
  const key = normalizeCategoryKey(heading);
  if (!key) return null;

  if (
    key === "top" ||
    key === "top layer" ||
    key === "tops" ||
    key === "upper" ||
    key === "upper layer" ||
    key === "base layer" ||
    key === "base layers" ||
    key === "mid layer" ||
    key === "mid layers" ||
    key === "midlayer" ||
    key === "outer layer" ||
    key === "outerwear" ||
    key === "jackets" ||
    key === "layers" ||
    key.includes("top layer") ||
    key.includes("base layer") ||
    key.includes("mid layer") ||
    key.includes("outer layer") ||
    key.startsWith("top ")
  ) {
    return "top";
  }
  if (
    key === "bottom" ||
    key === "bottom layer" ||
    key === "bottoms" ||
    key === "lower" ||
    key === "lower layer" ||
    key === "pants" ||
    key === "trousers" ||
    key.includes("bottom layer") ||
    key.startsWith("bottom ")
  ) {
    return "bottom";
  }
  if (
    key === "accessories" ||
    key === "accessory" ||
    key.includes("accessor")
  ) {
    return "accessories";
  }
  if (
    key === "gear" ||
    key === "gears" ||
    key === "equipment" ||
    key === "kit" ||
    key.includes("gear")
  ) {
    return "gear";
  }
  return null;
}

/**
 * Infer category from product title when heading is missing/unknown.
 * Prefer specific matches (bottom/accessories/gear) before broad "top" words.
 */
export function inferCategoryFromTitle(
  title: string
): SuggestionCategoryId | null {
  const t = title.toLowerCase();

  if (
    /\b(legging|leggings|bottoms?|pants?|trousers?|shorts?|skirt|skirts|chinos?|jeans?)\b/.test(
      t
    )
  ) {
    return "bottom";
  }

  if (
    /\b(gloves?|mittens?|hat|hats|beanie|scarves|scarf|buff|gaiter|socks?|sunglasses?|watch|watches|belt|belts|balaclava|earmuffs?|necklace|jewelry)\b/.test(
      t
    )
  ) {
    return "accessories";
  }

  if (
    /\b(backpack|daypack|pack\b|rucksack|tent|stove|bottle|hydration|poles?|headlamp|flashlight|sleeping|trekking|duffel|luggage|suitcase|crampons?|gaiters)\b/.test(
      t
    )
  ) {
    return "gear";
  }

  if (
    /\b(jacket|jackets|fleece|hoodie|sweater|shirt|shirts|tee\b|t-shirt|tops?|vest|shell|down\b|mid-?layer|base.?layer|long-?sleeve|pullover|parka|coat|anorak|windbreaker|insulated|midweight)\b/.test(
      t
    )
  ) {
    return "top";
  }

  return null;
}

function resolveItemCategory(
  title: string,
  headingCategory: SuggestionCategoryId
): { id: SuggestionCategoryId; label: string } {
  // Title keywords win — AI often dumps mixed items under one heading
  const inferred = inferCategoryFromTitle(title);
  if (inferred) {
    return { id: inferred, label: CATEGORY_LABELS[inferred] };
  }
  if (headingCategory !== "other") {
    return { id: headingCategory, label: CATEGORY_LABELS[headingCategory] };
  }
  return { id: "other", label: CATEGORY_LABELS.other };
}

export function categoryLabelFor(
  id: SuggestionCategoryId,
  fallbackHeading?: string
): string {
  if (id === "other" && fallbackHeading) return fallbackHeading;
  return CATEGORY_LABELS[id];
}

function tryParseHeading(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || BULLET_RE.test(trimmed)) return null;

  const cleaned = cleanItem(trimmed).replace(/:$/, "").trim();
  if (!cleaned || cleaned.length > 48) return null;

  // Reject long prose sentences
  if (cleaned.split(/\s+/).length > 6) return null;
  if (/[.!?]$/.test(cleaned)) return null;

  const match = trimmed.match(HEADING_RE);
  if (match) return cleanItem(match[1]).replace(/:$/, "").trim();

  // Bare short title line that maps to a known category
  if (matchCategoryId(cleaned)) return cleaned;

  return null;
}

export function splitAssistantContent(content: string): {
  prose: string;
  suggestions: PackSuggestion[];
} {
  const lines = content.split("\n");
  const suggestions: PackSuggestion[] = [];
  const proseLines: string[] = [];
  let inList = false;
  let currentCategoryId: SuggestionCategoryId = "other";
  let itemIndex = 0;

  for (const line of lines) {
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      inList = true;
      const title = cleanItem(bullet[1]);
      if (title) {
        const resolved = resolveItemCategory(title, currentCategoryId);
        suggestions.push({
          id: `item-${itemIndex}-${slugify(title)}`,
          title,
          categoryId: resolved.id,
          categoryLabel: resolved.label,
        });
        itemIndex += 1;
      }
      continue;
    }

    const heading = tryParseHeading(line);
    if (heading) {
      inList = true;
      const matched = matchCategoryId(heading);
      currentCategoryId = matched ?? "other";
      continue;
    }

    if (!inList) {
      proseLines.push(line);
    }
  }

  return {
    prose: proseLines.join("\n").trim(),
    suggestions,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);
}

export function groupSuggestionsByCategory(
  suggestions: PackSuggestion[]
): SuggestionCategory[] {
  const buckets = new Map<SuggestionCategoryId, PackSuggestion[]>();

  for (const item of suggestions) {
    const inferred = inferCategoryFromTitle(item.title);
    const id =
      inferred ?? (item.categoryId !== "other" ? item.categoryId : null);
    if (!id || id === "other") continue;

    const list = buckets.get(id) ?? [];
    list.push({
      ...item,
      categoryId: id,
      categoryLabel: CATEGORY_LABELS[id],
    });
    buckets.set(id, list);
  }

  const groups: SuggestionCategory[] = [];

  for (const id of CATEGORY_ORDER) {
    if (id === "other") continue;
    const items = buckets.get(id);
    if (items?.length) {
      groups.push({ id, label: CATEGORY_LABELS[id], items });
    }
  }

  return groups;
}

export function getSuggestionsFromContent(content: string): {
  prose: string;
  suggestions: PackSuggestion[];
} {
  return splitAssistantContent(content);
}
