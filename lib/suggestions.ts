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
    key.includes("top layer") ||
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
  let currentCategoryLabel = CATEGORY_LABELS.other;
  let itemIndex = 0;

  for (const line of lines) {
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      inList = true;
      const title = cleanItem(bullet[1]);
      if (title) {
        suggestions.push({
          id: `item-${itemIndex}-${slugify(title)}`,
          title,
          categoryId: currentCategoryId,
          categoryLabel: currentCategoryLabel,
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
      currentCategoryLabel =
        matched != null
          ? CATEGORY_LABELS[matched]
          : heading;
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
  const otherLabels = new Map<string, PackSuggestion[]>();

  for (const item of suggestions) {
    if (item.categoryId === "other") {
      const label = item.categoryLabel || CATEGORY_LABELS.other;
      const list = otherLabels.get(label) ?? [];
      list.push(item);
      otherLabels.set(label, list);
      continue;
    }
    const list = buckets.get(item.categoryId) ?? [];
    list.push(item);
    buckets.set(item.categoryId, list);
  }

  const groups: SuggestionCategory[] = [];

  for (const id of CATEGORY_ORDER) {
    if (id === "other") continue;
    const items = buckets.get(id);
    if (items?.length) {
      groups.push({ id, label: CATEGORY_LABELS[id], items });
    }
  }

  for (const [label, items] of otherLabels) {
    if (items.length) {
      groups.push({ id: "other", label, items });
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
