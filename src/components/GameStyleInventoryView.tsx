import type { ComponentType } from "react";
import { Backpack, Glasses, Package, Shirt } from "lucide-react";
import {
  BootIcon,
  TankTopIcon,
  TrousersIcon,
  type GarmentIconProps,
} from "./Icons";
import {
  GAME_SLOTS,
  GAME_SLOT_LABELS,
  loadGameLoadout,
  persistGameLoadout,
  slotForItem,
  allLoadoutIds,
  type GameLoadout,
  type GameSlotId,
} from "../lib/gameLoadoutStorage";
import {
  LIST_INVENTORY_CATEGORIES,
  loadListInventory,
  type ListInventoryCategory,
  type ListInventoryItem,
} from "../lib/listInventoryStorage";
import { useMemo, useState } from "react";

const SLOT_ICONS: Record<GameSlotId, ComponentType<GarmentIconProps>> = {
  innerwear: TankTopIcon,
  footwear: BootIcon,
  top: Shirt,
  bottom: TrousersIcon,
  gear: Backpack,
  accessories: Glasses,
  other: Package,
};

/** Items carry no photo, so a card leans on its category icon plus the name. */
function ItemGlyph({ item }: { item: ListInventoryItem }) {
  const Icon = SLOT_ICONS[item.category];
  return (
    <span className="game-inv__card-glyph" aria-hidden>
      <Icon size={22} strokeWidth={1.75} />
    </span>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/**
 * Packed slots are too small for a name, and every item in a slot shares one
 * category icon — initials are the only thing that tells them apart.
 */
function ItemInitials({ item }: { item: ListInventoryItem }) {
  return (
    <span className="game-inv__slot-item-initials" aria-hidden>
      {initials(item.name)}
    </span>
  );
}

export function GameStyleInventoryView() {
  const [ownedItems] = useState(() => loadListInventory());
  const [loadout, setLoadout] = useState<GameLoadout>(() => loadGameLoadout());
  const [activeStashCategory, setActiveStashCategory] =
    useState<ListInventoryCategory>("top");
  const [highlightSlot, setHighlightSlot] = useState<GameSlotId | null>(null);

  const ownedById = useMemo(
    () => new Map(ownedItems.map((item) => [item.id, item])),
    [ownedItems]
  );

  const packedIds = useMemo(() => allLoadoutIds(loadout), [loadout]);

  const homeItems = useMemo(
    () => ownedItems.filter((item) => !packedIds.has(item.id)),
    [ownedItems, packedIds]
  );

  const stashItems = useMemo(
    () => homeItems.filter((item) => item.category === activeStashCategory),
    [homeItems, activeStashCategory]
  );

  const updateLoadout = (next: GameLoadout) => {
    setLoadout(next);
    persistGameLoadout(next);
  };

  const packItem = (item: ListInventoryItem) => {
    const slot = slotForItem(item);
    updateLoadout({
      ...loadout,
      [slot]: [...loadout[slot], item.id],
    });
    setHighlightSlot(slot);
    window.setTimeout(() => setHighlightSlot(null), 600);
  };

  const unpackItem = (slot: GameSlotId, itemId: string) => {
    updateLoadout({
      ...loadout,
      [slot]: loadout[slot].filter((id) => id !== itemId),
    });
  };

  return (
    <div className="game-inv">
      <section className="game-inv__loadout" aria-label="Trip loadout">
        {GAME_SLOTS.map((slot) => (
          <div
            key={slot}
            className={`game-inv__slot game-inv__slot--${slot}`}
          >
            <LoadoutSlot
              slot={slot}
              itemIds={loadout[slot]}
              ownedById={ownedById}
              highlighted={highlightSlot === slot}
              onUnpack={(id) => unpackItem(slot, id)}
            />
          </div>
        ))}
      </section>

      <section className="game-inv__stash" aria-label="Items at home">
        <p className="game-inv__stash-hint">Tap an item to pack it for your trip.</p>
        <div
          className="pack-tabs game-inv__tabs"
          role="tablist"
          aria-label="Home inventory categories"
        >
          {LIST_INVENTORY_CATEGORIES.map((entry) => {
            const count = homeItems.filter((item) => item.category === entry.id)
              .length;
            const active = activeStashCategory === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? "pack-tabs__tab pack-tabs__tab--active"
                    : "pack-tabs__tab"
                }
                onClick={() => setActiveStashCategory(entry.id)}
              >
                {entry.label}
                {count > 0 ? (
                  <span className="pack-tabs__count">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="game-inv__grid">
          {stashItems.length === 0 ? (
            <p className="game-inv__empty">
              {ownedItems.length === 0
                ? "Add items to your stash first, then pack them here."
                : homeItems.length === 0
                  ? "Everything is packed for your trip."
                  : "No items in this category at home."}
            </p>
          ) : (
            stashItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="game-inv__card"
                onClick={() => packItem(item)}
                aria-label={`Pack ${item.name} for trip`}
              >
                <ItemGlyph item={item} />
                <span className="game-inv__card-name">{item.name}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function LoadoutSlot({
  slot,
  itemIds,
  ownedById,
  highlighted,
  onUnpack,
}: {
  slot: GameSlotId;
  itemIds: string[];
  ownedById: Map<string, ListInventoryItem>;
  highlighted: boolean;
  onUnpack: (itemId: string) => void;
}) {
  const items = itemIds
    .map((id) => ownedById.get(id))
    .filter(Boolean) as ListInventoryItem[];
  const filled = items.length > 0;
  const SlotIcon = SLOT_ICONS[slot];
  const density =
    items.length >= 5 ? "dense" : items.length >= 3 ? "compact" : "normal";

  return (
    <div
      className={[
        "game-inv__equip",
        filled ? "game-inv__equip--filled" : "",
        highlighted ? "game-inv__equip--highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${GAME_SLOT_LABELS[slot]}${filled ? `: ${items.length} packed` : ", empty"}`}
    >
      {!filled ? (
        <div className="game-inv__slot-empty">
          <SlotIcon
            className="game-inv__slot-icon"
            size={24}
            strokeWidth={1.75}
          />
          <span className="game-inv__slot-label">{GAME_SLOT_LABELS[slot]}</span>
        </div>
      ) : (
        <div className={`game-inv__slot-items game-inv__slot-items--${density}`}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="game-inv__slot-item"
              onClick={() => onUnpack(item.id)}
              title={item.name}
              aria-label={`${item.name}. Tap to leave at home.`}
            >
              <ItemInitials item={item} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
