import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_SIZE,
  CATEGORY_ICON_STROKE,
} from "./categoryIcons";
import { ItemPhoto } from "./ItemPhoto";
import {
  GAME_SLOTS,
  GAME_SLOT_LABELS,
  type GameLoadout,
  type GameSlotId,
} from "../lib/gameLoadoutStorage";
import type { ListInventoryItem } from "../lib/listInventoryStorage";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

type PackBoardProps = {
  items: ListInventoryItem[];
  loadout: GameLoadout;
  highlightSlot: GameSlotId | null;
  onUnpack: (slot: GameSlotId, itemId: string) => void;
};

/**
 * The trip board on its own — items are packed from the stash list below it, so
 * this only ever shows what is already in the bag.
 */
export function PackBoard({
  items,
  loadout,
  highlightSlot,
  onUnpack,
}: PackBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  // Slots are flex-centered in fractional CSS pixels, which antialiases 2px
  // strokes into a blur. Snap each 24×24 glyph onto the device pixel grid.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const snap = () => {
      const dpr = window.devicePixelRatio || 1;
      board.querySelectorAll<HTMLElement>(".pack-board__empty-icon").forEach((el) => {
        // Layout offset (not transform) so the SVG re-rasterizes on whole pixels.
        el.style.left = "0px";
        el.style.top = "0px";
        const { x, y } = el.getBoundingClientRect();
        const dx = Math.round(x * dpr) / dpr - x;
        const dy = Math.round(y * dpr) / dpr - y;
        el.style.left = `${dx}px`;
        el.style.top = `${dy}px`;
      });
    };

    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(board);
    window.addEventListener("resize", snap);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", snap);
    };
  }, [loadout, items]);

  return (
    <div ref={boardRef} className="pack-board" aria-label="Trip loadout">
      {GAME_SLOTS.map((slot) => (
        <div key={slot} className={`pack-board__cell pack-board__cell--${slot}`}>
          <PackSlot
            slot={slot}
            itemIds={loadout[slot]}
            itemsById={itemsById}
            highlighted={highlightSlot === slot}
            onUnpack={(id) => onUnpack(slot, id)}
          />
        </div>
      ))}
    </div>
  );
}

function PackSlot({
  slot,
  itemIds,
  itemsById,
  highlighted,
  onUnpack,
}: {
  slot: GameSlotId;
  itemIds: string[];
  itemsById: Map<string, ListInventoryItem>;
  highlighted: boolean;
  onUnpack: (itemId: string) => void;
}) {
  const items = itemIds
    .map((id) => itemsById.get(id))
    .filter(Boolean) as ListInventoryItem[];
  const filled = items.length > 0;
  const SlotIcon = CATEGORY_ICONS[slot];
  const density =
    items.length >= 5 ? "dense" : items.length >= 3 ? "compact" : "normal";

  return (
    <div
      className={[
        "pack-board__slot",
        filled ? "pack-board__slot--filled" : "",
        highlighted ? "pack-board__slot--highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${GAME_SLOT_LABELS[slot]}${filled ? `: ${items.length} packed` : ", empty"}`}
    >
      {!filled ? (
        <div className="pack-board__empty">
          <span className="pack-board__empty-icon" aria-hidden>
            <SlotIcon
              size={CATEGORY_ICON_SIZE}
              strokeWidth={CATEGORY_ICON_STROKE}
            />
          </span>
          <span className="pack-board__empty-label">
            {GAME_SLOT_LABELS[slot]}
          </span>
        </div>
      ) : (
        <div className="pack-board__packed">
          <span className="pack-board__packed-label">
            {GAME_SLOT_LABELS[slot]}
          </span>
          <div className={`pack-board__items pack-board__items--${density}`}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pack-board__item"
                onClick={() => onUnpack(item.id)}
                title={item.name}
                aria-label={`${item.name}. Tap to leave at home.`}
              >
                <ItemPhoto
                  item={item}
                  fallback={<span aria-hidden>{initials(item.name)}</span>}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
