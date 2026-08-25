import type { ListInventoryItem } from "./listInventoryStorage";

export type GameSlotId =
  | "innerwear"
  | "footwear"
  | "top"
  | "bottom"
  | "gear"
  | "accessories"
  | "other";

export const GAME_SLOT_LABELS: Record<GameSlotId, string> = {
  innerwear: "Innerwear",
  footwear: "Footwear",
  top: "Top",
  bottom: "Bottom",
  gear: "Gear",
  accessories: "Accessories",
  other: "Other",
};

/** Reading order of the loadout grid: left column, centre column, right column. */
export const GAME_SLOTS: GameSlotId[] = [
  "innerwear",
  "footwear",
  "top",
  "bottom",
  "gear",
  "accessories",
  "other",
];

const LOADOUT_KEY = "secretstash-game-loadout-v3";

export type GameLoadout = Record<GameSlotId, string[]>;

export function emptyLoadout(): GameLoadout {
  return {
    innerwear: [],
    footwear: [],
    top: [],
    bottom: [],
    gear: [],
    accessories: [],
    other: [],
  };
}

export function loadGameLoadout(): GameLoadout {
  try {
    const raw = localStorage.getItem(LOADOUT_KEY);
    if (!raw) return emptyLoadout();
    const parsed = JSON.parse(raw) as Partial<GameLoadout>;
    const base = emptyLoadout();
    for (const slot of GAME_SLOTS) {
      const ids = parsed[slot];
      base[slot] = Array.isArray(ids) ? ids.filter(Boolean) : [];
    }
    return base;
  } catch {
    return emptyLoadout();
  }
}

export function persistGameLoadout(loadout: GameLoadout) {
  localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadout));
}

export function allLoadoutIds(loadout: GameLoadout): Set<string> {
  const ids = new Set<string>();
  for (const slot of GAME_SLOTS) {
    for (const id of loadout[slot]) ids.add(id);
  }
  return ids;
}

/** Which trip slot an owned item packs into */
export function slotForItem(item: ListInventoryItem): GameSlotId {
  const n = item.name.toLowerCase();

  if (item.category === "top") return "top";
  if (item.category === "bottom") return "bottom";
  if (item.category === "footwear") return "footwear";
  if (item.category === "innerwear") return "innerwear";
  if (item.category === "gear") return "gear";
  if (item.category === "other") return "other";

  if (item.category === "accessories") {
    // Legacy fallback: items saved before "footwear" became its own category.
    if (/\b(boot|shoe|sandal|sneaker|trainer|footwear|slipper)s?\b/.test(n)) {
      return "footwear";
    }
    return "accessories";
  }

  return "other";
}
