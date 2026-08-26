import {
  ArrowUp,
  Camera,
  Check,
  GripVertical,
  ImagePlus,
  Loader,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  LIST_INVENTORY_CATEGORIES,
  categoryLabel,
  classifyInventoryItem,
  insertListInventoryItem,
  loadListInventory,
  persistListInventory,
  reorderListInventoryCategory,
  type ListInventoryCategory,
  type ListInventoryItem,
} from "../lib/listInventoryStorage";

function createItemId() {
  return `li-${crypto.randomUUID()}`;
}

const SCAN_DELAY_MS = 1100;

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

type AddCategoryChoice = "auto" | ListInventoryCategory;

/** "all" lets the stash be browsed whole, not just one category at a time. */
type CategoryFilter = "all" | ListInventoryCategory;

type InventoryNotice = {
  kind: "added" | "moved";
  itemName: string;
  category: ListInventoryCategory;
  autoSorted: boolean;
};

export function ListInventoryView() {
  const [items, setItems] = useState<ListInventoryItem[]>(() =>
    loadListInventory()
  );
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [addCategory, setAddCategory] = useState<AddCategoryChoice>("auto");
  const [addNotice, setAddNotice] = useState<InventoryNotice | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [scanning, setScanning] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    persistListInventory(items);
  }, [items]);

  useEffect(() => {
    if (expandedId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [expandedId]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current != null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (scanTimerRef.current != null) {
        window.clearTimeout(scanTimerRef.current);
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!photoMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!photoRef.current?.contains(event.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPhotoMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [photoMenuOpen]);

  const showNotice = (
    kind: InventoryNotice["kind"],
    itemName: string,
    placedCategory: ListInventoryCategory,
    autoSorted = false
  ) => {
    setAddNotice({ kind, itemName, category: placedCategory, autoSorted });
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setAddNotice(null);
      noticeTimerRef.current = null;
    }, 3200);
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

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
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

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;

  /** A query searches the whole stash — the category filter only scopes browsing. */
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (query) return item.name.toLowerCase().includes(query);
      return category === "all" || item.category === category;
    });
  }, [category, items, query]);

  // Manual order only means something within a single category's own list.
  const canReorder = !searching && category !== "all";
  // The category is only worth repeating when the list itself is mixed.
  const showCategoryTag = searching || category === "all";

  const counts = useMemo(() => {
    const map = new Map<ListInventoryCategory, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const openEditor = (item: ListInventoryItem) => {
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

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeEditor();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setExpandedId(null);
      setDraftName("");
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setDraftName("");
    }
  };

  const moveItem = (id: string, next: ListInventoryCategory) => {
    // Flush first so a pending rename isn't lost by the reinsert below.
    const name = flushDraft();
    setExpandedId(null);
    setDraftName("");

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
  };

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    const autoSorted = addCategory === "auto";
    const placedCategory = autoSorted
      ? classifyInventoryItem(trimmed)
      : addCategory;

    setItems((prev) =>
      insertListInventoryItem(
        prev,
        { id: createItemId(), name: trimmed, category: placedCategory },
        autoSorted
      )
    );
    setNewItemName("");
    setSearch("");
    setCategory(placedCategory);
    showNotice("added", trimmed, placedCategory, autoSorted);
    clearPhoto();
    addInputRef.current?.focus();
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault();
    if (draggingId && draggingId !== id) {
      setDropTargetId(id);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault();
    const fromId = draggingId ?? event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDropTargetId(null);
    if (!fromId || fromId === id || category === "all") return;
    setItems((prev) =>
      reorderListInventoryCategory(prev, category, fromId, id)
    );
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const emptyMessage = searching
    ? `Nothing in your stash matches “${search.trim()}”.`
    : category === "all"
      ? "Your stash is empty. Add your first item below."
      : `No ${categoryLabel(category).toLowerCase()} items yet.`;

  return (
    <div className="list-inventory">
      <div className="list-inventory__search-wrap">
        <div className="list-inventory__search-field">
          <Search
            size={15}
            strokeWidth={2}
            className="list-inventory__search-icon"
            aria-hidden
          />
          <input
            type="text"
            className="list-inventory__search"
            placeholder="Search your whole stash"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setExpandedId(null);
            }}
            aria-label="Search your whole stash"
          />
          {search ? (
            <button
              type="button"
              className="list-inventory__search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {searching ? (
        <p className="list-inventory__scope" role="status" aria-live="polite">
          {visibleItems.length}{" "}
          {visibleItems.length === 1 ? "item" : "items"} found across all
          categories
        </p>
      ) : (
        <div
          className="pack-tabs list-inventory__tabs"
          role="tablist"
          aria-label="Inventory categories"
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={
              category === "all"
                ? "pack-tabs__tab pack-tabs__tab--active"
                : "pack-tabs__tab"
            }
            onClick={() => {
              setCategory("all");
              setExpandedId(null);
            }}
          >
            All
            {items.length > 0 ? (
              <span className="pack-tabs__count">{items.length}</span>
            ) : null}
          </button>

          {LIST_INVENTORY_CATEGORIES.map((entry) => {
            const count = counts.get(entry.id) ?? 0;
            const active = category === entry.id;
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
                onClick={() => {
                  setCategory(entry.id);
                  setExpandedId(null);
                }}
              >
                {entry.label}
                {count > 0 ? (
                  <span className="pack-tabs__count">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <ul className="list-inventory__list" aria-label="Owned items">
        {visibleItems.length === 0 ? (
          <li className="list-inventory__empty">{emptyMessage}</li>
        ) : (
          visibleItems.map((item) => {
            const isEditing = expandedId === item.id;
            const isDragging = draggingId === item.id;
            const isDropTarget = dropTargetId === item.id;

            return (
              <li
                key={item.id}
                className={[
                  "list-inventory__row",
                  isDragging ? "list-inventory__row--dragging" : "",
                  isDropTarget ? "list-inventory__row--drop-target" : "",
                  isEditing ? "list-inventory__row--editing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, item.id)}
                onDrop={(event) => handleDrop(event, item.id)}
              >
                <div className="list-inventory__row-main">
                  {canReorder ? (
                    <button
                      type="button"
                      className="list-inventory__drag"
                      draggable
                      aria-label={`Reorder ${item.name}`}
                      onDragStart={(event) => handleDragStart(event, item.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical size={16} strokeWidth={1.75} aria-hidden />
                    </button>
                  ) : null}

                  {isEditing ? (
                    <>
                      <input
                        ref={editInputRef}
                        className="list-inventory__rename"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        aria-label={`Rename ${item.name}`}
                      />
                      <button
                        type="button"
                        className="list-inventory__done"
                        onClick={closeEditor}
                        aria-label="Done editing"
                      >
                        <Check size={16} strokeWidth={2.25} aria-hidden />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="list-inventory__hit"
                      onClick={() => openEditor(item)}
                      aria-expanded={false}
                      aria-label={`Edit ${item.name}`}
                    >
                      <span className="list-inventory__name">{item.name}</span>
                      {showCategoryTag ? (
                        <span className="list-inventory__tag">
                          {categoryLabel(item.category)}
                        </span>
                      ) : null}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="list-inventory__editor">
                    <div className="list-inventory__move">
                      <span className="list-inventory__move-label">
                        Move to
                      </span>
                      <div className="list-inventory__move-chips">
                        {LIST_INVENTORY_CATEGORIES.map((entry) => {
                          const current = entry.id === item.category;
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              className={[
                                "list-inventory__move-chip",
                                current
                                  ? "list-inventory__move-chip--current"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => moveItem(item.id, entry.id)}
                              aria-current={current}
                            >
                              {current ? (
                                <Check size={12} strokeWidth={2.5} aria-hidden />
                              ) : null}
                              {entry.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="list-inventory__remove"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={14} strokeWidth={1.9} aria-hidden />
                      Remove from stash
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <div className="list-inventory__add">
        {addNotice ? (
          <p className="list-inventory__notice" role="status" aria-live="polite">
            <Check size={14} strokeWidth={2.25} aria-hidden />
            <span>
              <strong>{addNotice.itemName}</strong>{" "}
              {addNotice.kind === "moved" ? "moved to" : "added to"}{" "}
              <strong>{categoryLabel(addNotice.category)}</strong>
              {addNotice.autoSorted ? " (auto-sorted)" : ""}
            </span>
          </p>
        ) : null}

        {photoPreview ? (
          <div className="list-inventory__photo-chip">
            <img src={photoPreview} alt="Selected item photo" />
            <span className="list-inventory__photo-chip-text">
              {scanning ? "Scanning photo…" : "Detected from photo"}
              <span>{photoName}</span>
            </span>
            {scanning ? (
              <Loader
                size={16}
                strokeWidth={2}
                className="list-inventory__photo-spinner"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              className="list-inventory__photo-chip-close"
              onClick={clearPhoto}
              aria-label="Remove photo"
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="list-inventory__add-bar">
          <div className="list-inventory__photo" ref={photoRef}>
            <button
              type="button"
              className={[
                "list-inventory__photo-trigger",
                photoMenuOpen ? "list-inventory__photo-trigger--open" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setPhotoMenuOpen((open) => !open)}
              aria-label="Add item from photo"
              aria-haspopup="menu"
              aria-expanded={photoMenuOpen}
            >
              <ImagePlus size={17} strokeWidth={1.75} aria-hidden />
            </button>

            {photoMenuOpen ? (
              <div className="list-inventory__photo-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="list-inventory__photo-option"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload size={16} strokeWidth={1.75} aria-hidden />
                  Upload photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="list-inventory__photo-option"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={16} strokeWidth={1.75} aria-hidden />
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
            className="list-inventory__add-input"
            placeholder="Add an item…"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onKeyDown={handleAddKeyDown}
            aria-label="New item name"
          />
          <select
            className="list-inventory__add-select"
            value={addCategory}
            onChange={(event) =>
              setAddCategory(event.target.value as AddCategoryChoice)
            }
            aria-label="Category for the new item"
          >
            <option value="auto">Auto-sort</option>
            {LIST_INVENTORY_CATEGORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="list-inventory__add-submit"
            onClick={addItem}
            disabled={!newItemName.trim()}
            aria-label="Add item"
          >
            <ArrowUp size={17} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
