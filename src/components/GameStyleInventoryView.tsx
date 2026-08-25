import type { ComponentType } from "react";
import { Backpack, Glasses, Package, Shirt } from "lucide-react";
import {
  BootIcon,
  TankTopIcon,
  TrousersIcon,
  type GarmentIconProps,
} from "./Icons";
import { getItemImageUrl } from "../lib/inventoryCatalog";
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

function ItemPhoto({
  item,
  className,
}: {
  item: ListInventoryItem;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={getItemImageUrl(item.id)}
      alt={item.name}
      loading="lazy"
      draggable={false}
    />
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
              {homeItems.length === 0
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
                <ItemPhoto item={item} className="game-inv__card-img" />
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
              aria-label={`${item.name}. Tap to leave at home.`}
            >
              <ItemPhoto item={item} className="game-inv__slot-item-img" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
