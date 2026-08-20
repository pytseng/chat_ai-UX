import type { ComponentType } from "react";
import {
  ChestIcon,
  GlovesIcon,
  InventoryIcon,
  PantsIcon,
} from "./Icons";
import { getItemImageUrl } from "../lib/inventoryCatalog";
import {
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

const SLOT_ICONS: Record<GameSlotId, ComponentType<{ className?: string }>> = {
  headGear: GlovesIcon,
  top: ChestIcon,
  bottom: PantsIcon,
  backpack: InventoryIcon,
  footwear: FootwearIcon,
  innerwear: InnerwearIcon,
  other: MiscSlotIcon,
};

function FootwearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 14.5c0-1.5 1-2.5 3-2.5h10c2 0 3 1 3 2.5V18H4v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 12V9a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InnerwearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h8l2 6-4 2v8H10v-8L6 10l2-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiscSlotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="7"
        width="16"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 7V5a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        <div className="game-inv__slot game-inv__slot--other">
          <LoadoutSlot
            slot="other"
            itemIds={loadout.other}
            ownedById={ownedById}
            highlighted={highlightSlot === "other"}
            onUnpack={(id) => unpackItem("other", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--innerwear">
          <LoadoutSlot
            slot="innerwear"
            itemIds={loadout.innerwear}
            ownedById={ownedById}
            highlighted={highlightSlot === "innerwear"}
            onUnpack={(id) => unpackItem("innerwear", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--head">
          <LoadoutSlot
            slot="headGear"
            itemIds={loadout.headGear}
            ownedById={ownedById}
            highlighted={highlightSlot === "headGear"}
            onUnpack={(id) => unpackItem("headGear", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--top">
          <LoadoutSlot
            slot="top"
            itemIds={loadout.top}
            ownedById={ownedById}
            highlighted={highlightSlot === "top"}
            onUnpack={(id) => unpackItem("top", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--bottom">
          <LoadoutSlot
            slot="bottom"
            itemIds={loadout.bottom}
            ownedById={ownedById}
            highlighted={highlightSlot === "bottom"}
            onUnpack={(id) => unpackItem("bottom", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--backpack">
          <LoadoutSlot
            slot="backpack"
            itemIds={loadout.backpack}
            ownedById={ownedById}
            highlighted={highlightSlot === "backpack"}
            onUnpack={(id) => unpackItem("backpack", id)}
          />
        </div>
        <div className="game-inv__slot game-inv__slot--footwear">
          <LoadoutSlot
            slot="footwear"
            itemIds={loadout.footwear}
            ownedById={ownedById}
            highlighted={highlightSlot === "footwear"}
            onUnpack={(id) => unpackItem("footwear", id)}
          />
        </div>
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
          <SlotIcon className="game-inv__slot-icon" />
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
