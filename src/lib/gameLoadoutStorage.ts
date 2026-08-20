import type { ListInventoryItem } from "./listInventoryStorage";

export type GameSlotId =
  | "headGear"
  | "top"
  | "bottom"
  | "backpack"
  | "footwear"
  | "innerwear"
  | "other";

export const GAME_SLOT_LABELS: Record<GameSlotId, string> = {
  headGear: "Head gear",
  top: "Top",
  bottom: "Bottom",
  backpack: "Backpack",
  footwear: "Footwear",
  innerwear: "Innerwear",
  other: "Other",
};

export const GAME_SLOTS: GameSlotId[] = [
  "other",
  "innerwear",
  "headGear",
  "top",
  "bottom",
  "backpack",
  "footwear",
];

const LOADOUT_KEY = "secretstash-game-loadout-v2";

export type GameLoadout = Record<GameSlotId, string[]>;

export function emptyLoadout(): GameLoadout {
  return {
    headGear: [],
    top: [],
    bottom: [],
    backpack: [],
    footwear: [],
    innerwear: [],
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
  if (item.category === "innerwear") return "innerwear";
  if (item.category === "other") return "other";

  if (item.category === "gear") return "backpack";

  if (item.category === "accessories") {
    if (/\b(boot|shoe|sandal|footwear|hiking boot)\b/.test(n)) return "footwear";
    return "headGear";
  }

  return "other";
}
