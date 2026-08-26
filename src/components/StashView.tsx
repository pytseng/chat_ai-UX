import {
  IconAdjustmentsHorizontal,
  IconArrowUp,
  IconBackpack,
  IconCamera,
  IconCheck,
  IconGripVertical,
  IconInfoCircle,
  IconLayoutGrid,
  IconList,
  IconLoader2,
  IconPhotoPlus,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { PackBoard } from "./PackBoard";
import { ItemPhoto } from "./ItemPhoto";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_SIZE,
  CATEGORY_ICON_STROKE,
} from "./categoryIcons";
import { useListInventory } from "../hooks/useListInventory";
import { demoStashItems } from "../lib/demoStash";
import {
  allLoadoutIds,
  loadGameLoadout,
  persistGameLoadout,
  slotForItem,
  type GameLoadout,
  type GameSlotId,
} from "../lib/gameLoadoutStorage";
import {
  LIST_INVENTORY_CATEGORIES,
  categoryLabel,
  classifyInventoryItem,
  insertListInventoryItem,
  reorderListInventoryCategory,
  type ListInventoryCategory,
  type ListInventoryItem,
} from "../lib/listInventoryStorage";

function createItemId() {
  return `li-${crypto.randomUUID()}`;
}

const SCAN_DELAY_MS = 1100;
const NOTICE_MS = 3200;

/** Stand-in for a real image-recognition call. */
const MOCK_DETECTED_ITEMS = [
  "Nano Puff insulated jacket",
  "Merino wool base layer",
  "Softshell hiking pants",
  "Gore-Tex rain shell",
  "Wool crew socks",
  "Trail running shoes",
  "Fleece quarter-zip",
  "Packable down vest",
];

function mockDetectFromPhoto() {
  const index = Math.floor(Math.random() * MOCK_DETECTED_ITEMS.length);
  return MOCK_DETECTED_ITEMS[index];
}

type ItemsView = "list" | "card";

type InventoryNotice = {
  kind: "added" | "moved";
  itemName: string;
  category: ListInventoryCategory;
};

/** Shared dismiss behaviour for the two popovers in the toolbar and add bar. */
function useDismissOnOutside(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  close: () => void
) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open, ref]);
}

export function StashView() {
  const { items, setItems } = useListInventory();
  const [loadout, setLoadout] = useState<GameLoadout>(() => loadGameLoadout());
  const [packOpen, setPackOpen] = useState(false);
  const [view, setView] = useState<ItemsView>("list");
  const [categoryFilters, setCategoryFilters] = useState<
    ListInventoryCategory[]
  >([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [addNotice, setAddNotice] = useState<InventoryNotice | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [highlightSlot, setHighlightSlot] = useState<GameSlotId | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [scanning, setScanning] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      for (const timer of [
        noticeTimerRef.current,
        scanTimerRef.current,
        highlightTimerRef.current,
      ]) {
        if (timer != null) window.clearTimeout(timer);
      }
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const closeFilter = useCallback(() => setFilterOpen(false), []);
  const closePhotoMenu = useCallback(() => setPhotoMenuOpen(false), []);
  useDismissOnOutside(filterOpen, filterRef, closeFilter);
  useDismissOnOutside(photoMenuOpen, photoRef, closePhotoMenu);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;
  const categorySet = useMemo(
    () => new Set(categoryFilters),
    [categoryFilters]
  );
  const filtering = categoryFilters.length > 0;
  const singleCategory =
    categoryFilters.length === 1 ? categoryFilters[0] : null;

  /** Empty category selection means the whole stash; several means OR. */
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (filtering && !categorySet.has(item.category)) return false;
      return !query || item.name.toLowerCase().includes(query);
    });
  }, [categorySet, filtering, items, query]);

  const packedIds = useMemo(() => allLoadoutIds(loadout), [loadout]);
  const packedCount = useMemo(
    () => items.filter((item) => packedIds.has(item.id)).length,
    [items, packedIds]
  );

  // Manual order only means something within a single category's own list.
  const canReorder = !searching && Boolean(singleCategory) && view === "list";

  const showNotice = (
    kind: InventoryNotice["kind"],
    itemName: string,
    placedCategory: ListInventoryCategory
  ) => {
    setAddNotice({ kind, itemName, category: placedCategory });
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setAddNotice(null);
      noticeTimerRef.current = null;
    }, NOTICE_MS);
  };

  const updateLoadout = (next: GameLoadout) => {
    setLoadout(next);
    persistGameLoadout(next);
  };

  const togglePack = (item: ListInventoryItem) => {
    const slot = slotForItem(item);
    if (packedIds.has(item.id)) {
      updateLoadout({
        ...loadout,
        [slot]: loadout[slot].filter((id) => id !== item.id),
      });
      return;
    }

    updateLoadout({ ...loadout, [slot]: [...loadout[slot], item.id] });
    setHighlightSlot(slot);
    if (highlightTimerRef.current != null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightSlot(null);
      highlightTimerRef.current = null;
    }, 600);
  };

  const unpackFromSlot = (slot: GameSlotId, itemId: string) => {
    updateLoadout({
      ...loadout,
      [slot]: loadout[slot].filter((id) => id !== itemId),
    });
  };

  const dropFromLoadout = (itemId: string) => {
    const next = { ...loadout };
    for (const slot of Object.keys(next) as GameSlotId[]) {
      next[slot] = next[slot].filter((id) => id !== itemId);
    }
    updateLoadout(next);
  };

  const openEditor = (item: ListInventoryItem) => {
    if (expandedId && expandedId !== item.id) flushDraft();
    setExpandedId(item.id);
    setDraftName(item.name);
  };

  /** Write the pending name into state; returns the name that will be stored. */
  const flushDraft = (): string | null => {
    if (!expandedId) return null;
    const current = items.find((entry) => entry.id === expandedId);
    if (!current) return null;

    const trimmed = draftName.trim();
    if (!trimmed || trimmed === current.name) return current.name;

    setItems((prev) =>
      prev.map((entry) =>
        entry.id === expandedId ? { ...entry, name: trimmed } : entry
      )
    );
    return trimmed;
  };

  const closeEditor = () => {
    flushDraft();
    setExpandedId(null);
    setDraftName("");
  };

  const cancelEditor = () => {
    setExpandedId(null);
    setDraftName("");
  };

  useEffect(() => {
    if (!expandedId) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (node.closest("[data-stash-editing]")) return;
      closeEditor();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expandedId, draftName, items]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    dropFromLoadout(id);
    if (expandedId === id) cancelEditor();
  };

  const moveItem = (id: string, next: ListInventoryCategory) => {
    // Flush first so a pending rename isn't lost by the reinsert below.
    const name = flushDraft();

    setItems((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (!target || target.category === next) return prev;
      return insertListInventoryItem(
        prev.filter((entry) => entry.id !== id),
        { ...target, category: next },
        true
      );
    });

    if (name) showNotice("moved", name, next);
    if (categoryFilters.length > 0 && !categoryFilters.includes(next)) {
      cancelEditor();
    }
  };

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    const placedCategory = classifyInventoryItem(trimmed);

    setItems((prev) =>
      insertListInventoryItem(
        prev,
        { id: createItemId(), name: trimmed, category: placedCategory },
        true
      )
    );
    setNewItemName("");
    setSearch("");
    setCategoryFilters((prev) => {
      if (prev.length === 0 || prev.includes(placedCategory)) return prev;
      return [...prev, placedCategory];
    });
    showNotice("added", trimmed, placedCategory);
    clearPhoto();
    addInputRef.current?.focus();
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  const clearPhoto = () => {
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPhotoPreview(null);
    setPhotoName("");
    setScanning(false);
  };

  const handlePhotoPicked = (file: File | undefined) => {
    if (!file) return;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;

    setPhotoPreview(url);
    setPhotoName(file.name);
    setPhotoMenuOpen(false);
    setScanning(true);

    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current);
    }
    scanTimerRef.current = window.setTimeout(() => {
      setScanning(false);
      setNewItemName(mockDetectFromPhoto());
      addInputRef.current?.focus();
      scanTimerRef.current = null;
    }, SCAN_DELAY_MS);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault();
    if (draggingId && draggingId !== id) setDropTargetId(id);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault();
    const fromId = draggingId ?? event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDropTargetId(null);
    if (!fromId || fromId === id || !singleCategory) return;
    setItems((prev) =>
      reorderListInventoryCategory(prev, singleCategory, fromId, id)
    );
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const loadSampleKit = () => {
    setItems(demoStashItems());
    setSearch("");
    setCategoryFilters([]);
    setExpandedId(null);
  };

  const emptyMessage = searching
    ? `Nothing here matches “${search.trim()}”.`
    : filtering
      ? "Nothing in your stash matches those filters."
      : "Nothing here yet. Add your first item below, or start with a sample kit.";

  const toggleCategoryFilter = (id: ListInventoryCategory) => {
    setCategoryFilters((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
    setExpandedId(null);
  };

  return (
    <div className="stash">
      <div className="stash__toolbar">
        <button
          type="button"
          className={[
            "stash__tool",
            packOpen ? "stash__tool--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setPackOpen((open) => !open)}
          aria-expanded={packOpen}
          aria-controls="stash-pack"
          aria-label={packOpen ? "Hide pack" : "Show pack"}
        >
          <IconBackpack size={17} stroke={1.85} aria-hidden />
          {packedCount > 0 ? (
            <span className="stash__tool-badge">{packedCount}</span>
          ) : null}
        </button>

        <div className="stash__search" ref={filterRef}>
          <IconSearch
            size={16}
            stroke={2}
            className="stash__search-icon"
            aria-hidden
          />
          <input
            type="text"
            className="stash__search-input"
            placeholder="Search stash"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setExpandedId(null);
            }}
            aria-label="Search your stash"
          />
          {search ? (
            <button
              type="button"
              className="stash__search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <IconX size={13} stroke={2.25} aria-hidden />
            </button>
          ) : null}

          <button
            type="button"
            className={[
              "stash__filter",
              filtering ? "stash__filter--set" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setFilterOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={filterOpen}
            aria-label={
              filtering
                ? `Filters, ${categoryFilters.length} selected`
                : "Filters"
            }
          >
            <IconAdjustmentsHorizontal size={14} stroke={2} aria-hidden />
            {filtering ? (
              <span className="stash__filter-badge">
                {categoryFilters.length}
              </span>
            ) : null}
          </button>

          {filterOpen ? (
            <div
              className="stash__filter-panel"
              role="dialog"
              aria-label="Filters"
            >
              {/* Extra groups (packed, season, etc.) slot in as siblings. */}
              <FilterGroup
                label="Category"
                options={LIST_INVENTORY_CATEGORIES}
                selected={categoryFilters}
                onToggle={toggleCategoryFilter}
                onReset={() => {
                  setCategoryFilters([]);
                  setExpandedId(null);
                }}
              />
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="stash__tool"
          onClick={() => {
            setView((current) => (current === "list" ? "card" : "list"));
            setExpandedId(null);
          }}
          aria-label={
            view === "list" ? "Switch to card view" : "Switch to list view"
          }
        >
          {view === "list" ? (
            <IconLayoutGrid size={17} stroke={1.85} aria-hidden />
          ) : (
            <IconList size={17} stroke={1.85} aria-hidden />
          )}
        </button>
      </div>

      {packOpen ? (
        <section className="stash__pack" id="stash-pack" aria-label="Pack">
          <PackBoard
            items={items}
            loadout={loadout}
            highlightSlot={highlightSlot}
            onUnpack={unpackFromSlot}
          />
          <button
            type="button"
            className="stash__pack-info"
            aria-label={
              packedCount === 0
                ? "Tap + on an item below to pack it."
                : `${packedCount} packed. Tap an item on the board to leave it home.`
            }
          >
            <IconInfoCircle size={14} stroke={1.75} aria-hidden />
            <span className="stash__pack-info-tip" role="tooltip">
              {packedCount === 0
                ? "Tap + on an item below to pack it."
                : `${packedCount} packed — tap an item on the board to leave it home.`}
            </span>
          </button>
        </section>
      ) : null}

      <ul
        className={
          view === "card" ? "stash__items stash__items--cards" : "stash__items"
        }
        aria-label="Stash items"
      >
        {visibleItems.length === 0 ? (
          <li className="stash__empty">
            {items.length === 0 ? (
              <>
                <p className="stash__empty-copy">{emptyMessage}</p>
                <button
                  type="button"
                  className="stash__empty-action"
                  onClick={loadSampleKit}
                >
                  Start with a sample kit
                </button>
              </>
            ) : (
              emptyMessage
            )}
          </li>
        ) : (
          visibleItems.map((item, index) => {
            const Icon = CATEGORY_ICONS[item.category];
            const isEditing = expandedId === item.id;
            const isPacked = packedIds.has(item.id);
            const showSection =
              index === 0 ||
              visibleItems[index - 1]!.category !== item.category;
            const section = showSection ? (
              <li className="stash-section">
                <span className="stash-section__label">
                  {categoryLabel(item.category)}
                </span>
                <span className="stash-section__rule" aria-hidden />
              </li>
            ) : null;
            const editor = isEditing ? (
              <ItemEditor
                item={item}
                draftName={draftName}
                onDraftChange={setDraftName}
                onDone={closeEditor}
                onCancel={cancelEditor}
                onMove={(next) => moveItem(item.id, next)}
                onRemove={() => removeItem(item.id)}
              />
            ) : null;

            const packToggle =
              packOpen && !expandedId ? (
              <button
                type="button"
                className={[
                  "stash-pack-toggle",
                  isPacked ? "stash-pack-toggle--on" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => togglePack(item)}
                aria-pressed={isPacked}
                aria-label={
                  isPacked ? `Unpack ${item.name}` : `Pack ${item.name}`
                }
              >
                {isPacked ? (
                  <IconCheck size={16} stroke={2.4} aria-hidden />
                ) : (
                  <IconPlus size={16} stroke={2.25} aria-hidden />
                )}
              </button>
            ) : null;

            if (view === "card") {
              return (
                <Fragment key={item.id}>
                  {section}
                  <li
                    className="stash-card-cell"
                    {...(isEditing ? { "data-stash-editing": "" } : {})}
                  >
                  {isEditing ? (
                    <div className="stash-card stash-card--editing">
                      <span className="stash-card__glyph" aria-hidden>
                        <ItemPhoto
                          item={item}
                          className="stash-card__photo"
                          fallback={
                            <Icon
                              size={CATEGORY_ICON_SIZE}
                              strokeWidth={CATEGORY_ICON_STROKE}
                            />
                          }
                        />
                      </span>
                      {editor}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="stash-card"
                        onClick={() => openEditor(item)}
                        aria-expanded={false}
                        aria-label={`Edit ${item.name}`}
                      >
                        <span className="stash-card__glyph" aria-hidden>
                          <ItemPhoto
                            item={item}
                            className="stash-card__photo"
                            fallback={
                            <Icon
                              size={CATEGORY_ICON_SIZE}
                              strokeWidth={CATEGORY_ICON_STROKE}
                            />
                          }
                          />
                        </span>
                        <span className="stash-card__name">{item.name}</span>
                      </button>
                      {packToggle}
                    </>
                  )}
                </li>
                </Fragment>
              );
            }

            return (
              <Fragment key={item.id}>
                {section}
                <li
                className={[
                  "stash-row",
                  draggingId === item.id ? "stash-row--dragging" : "",
                  dropTargetId === item.id ? "stash-row--drop-target" : "",
                  isEditing ? "stash-row--editing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, item.id)}
                onDrop={(event) => handleDrop(event, item.id)}
                {...(isEditing ? { "data-stash-editing": "" } : {})}
              >
                <div className="stash-row__main">
                  {canReorder ? (
                    <button
                      type="button"
                      className="stash-row__drag"
                      draggable={!isEditing}
                      aria-label={`Reorder ${item.name}`}
                      onDragStart={(event) => {
                        if (isEditing) {
                          event.preventDefault();
                          return;
                        }
                        handleDragStart(event, item.id);
                      }}
                      onDragEnd={handleDragEnd}
                    >
                      <IconGripVertical size={16} stroke={1.75} aria-hidden />
                    </button>
                  ) : null}

                  {isEditing ? (
                    <div className="stash-row__body">
                      <span className="stash-row__thumb" aria-hidden>
                        <ItemPhoto
                          item={item}
                          fallback={
                          <Icon
                            size={CATEGORY_ICON_SIZE}
                            strokeWidth={CATEGORY_ICON_STROKE}
                          />
                        }
                        />
                      </span>
                      {editor}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="stash-row__hit"
                        onClick={() => openEditor(item)}
                        aria-expanded={false}
                        aria-label={`Edit ${item.name}`}
                      >
                        <span className="stash-row__thumb" aria-hidden>
                          <ItemPhoto
                            item={item}
                            fallback={
                          <Icon
                            size={CATEGORY_ICON_SIZE}
                            strokeWidth={CATEGORY_ICON_STROKE}
                          />
                        }
                          />
                        </span>
                        <span className="stash-row__name">{item.name}</span>
                      </button>
                      {packToggle}
                    </>
                  )}
                </div>
              </li>
              </Fragment>
            );
          })
        )}
      </ul>

      {packOpen ? null : (
        <div className="stash__add">
        {addNotice ? (
          <p className="stash__notice" role="status" aria-live="polite">
            <IconCheck size={14} stroke={2.25} aria-hidden />
            <span>
              <strong>{addNotice.itemName}</strong>{" "}
              {addNotice.kind === "moved" ? "moved to" : "added to"}{" "}
              <strong>{categoryLabel(addNotice.category)}</strong>
            </span>
          </p>
        ) : null}

        {photoPreview ? (
          <div className="stash__photo-chip">
            <img src={photoPreview} alt="Selected item photo" />
            <span className="stash__photo-chip-text">
              {scanning ? "Scanning photo…" : "Detected from photo"}
              <span>{photoName}</span>
            </span>
            {scanning ? (
              <IconLoader2
                size={16}
                stroke={2}
                className="stash__photo-spinner"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              className="stash__photo-chip-close"
              onClick={clearPhoto}
              aria-label="Remove photo"
            >
              <IconX size={14} stroke={2} aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="stash__add-bar">
          <div className="stash__photo" ref={photoRef}>
            <button
              type="button"
              className={[
                "stash__photo-trigger",
                photoMenuOpen ? "stash__photo-trigger--open" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setPhotoMenuOpen((open) => !open)}
              aria-label="Add item from photo"
              aria-haspopup="menu"
              aria-expanded={photoMenuOpen}
            >
            <IconPhotoPlus size={18} stroke={1.75} aria-hidden />
            </button>

            {photoMenuOpen ? (
              <div className="stash__photo-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="stash__photo-option"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <IconUpload size={16} stroke={1.75} aria-hidden />
                  Upload photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="stash__photo-option"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <IconCamera size={16} stroke={1.75} aria-hidden />
                  Take a photo
                </button>
              </div>
            ) : null}

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                handlePhotoPicked(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                handlePhotoPicked(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          <input
            ref={addInputRef}
            type="text"
            className="stash__add-input"
            placeholder="Add an item…"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onKeyDown={handleAddKeyDown}
            aria-label="New item name"
          />
          <button
            type="button"
            className="send-btn"
            onClick={addItem}
            disabled={!newItemName.trim()}
            aria-label="Add item"
          >
            <IconArrowUp size={17} stroke={2.25} aria-hidden />
          </button>
        </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  onReset,
}: {
  label: string;
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
  onReset: () => void;
}) {
  const active = selected.length > 0;

  return (
    <div className="stash__filter-group">
      <div className="stash__filter-group-head">
        <span className="stash__filter-group-label">{label}</span>
        <button
          type="button"
          className="stash__filter-reset"
          onClick={onReset}
          disabled={!active}
        >
          Reset
        </button>
      </div>
      <div className="stash__filter-pills">
        {options.map((entry) => {
          const on = selected.includes(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              className={[
                "stash__filter-pill",
                on ? "stash__filter-pill--on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={on}
              onClick={() => onToggle(entry.id)}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** In-row editor: name field, category select, trash. */
function ItemEditor({
  item,
  draftName,
  onDraftChange,
  onDone,
  onCancel,
  onMove,
  onRemove,
}: {
  item: ListInventoryItem;
  draftName: string;
  onDraftChange: (value: string) => void;
  onDone: () => void;
  onCancel: () => void;
  onMove: (next: ListInventoryCategory) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onDone();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="stash-editor">
      <input
        ref={inputRef}
        className="stash-editor__input"
        value={draftName}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={`Rename ${item.name}`}
      />
      <select
        className="stash-editor__select"
        value={item.category}
        onChange={(event) => {
          const next = event.target.value as ListInventoryCategory;
          if (next !== item.category) onMove(next);
        }}
        aria-label={`Category for ${item.name}`}
      >
        {LIST_INVENTORY_CATEGORIES.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="stash-editor__remove"
        onClick={onRemove}
        aria-label={`Remove ${item.name} from stash`}
      >
        <IconTrash size={16} stroke={1.9} aria-hidden />
      </button>
    </div>
  );
}
