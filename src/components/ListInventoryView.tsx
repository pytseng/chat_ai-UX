import {
  ArrowUp,
  Camera,
  Check,
  GripVertical,
  ImagePlus,
  Loader,
  Pencil,
  Tag,
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
  const [category, setCategory] = useState<ListInventoryCategory>("top");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [addCategory, setAddCategory] = useState<AddCategoryChoice>("auto");
  const [addNotice, setAddNotice] = useState<InventoryNotice | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
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
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.category !== category) return false;
      if (!query) return true;
      return item.name.toLowerCase().includes(query);
    });
  }, [category, items, search]);

  const startRename = (item: ListInventoryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (!editingId) return;
    if (trimmed) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, name: trimmed } : item
        )
      );
    }
    setEditingId(null);
    setEditName("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) cancelRename();
    if (movingId === id) setMovingId(null);
  };

  const moveItem = (item: ListInventoryItem, next: ListInventoryCategory) => {
    setMovingId(null);
    if (item.category === next) return;

    setItems((prev) =>
      insertListInventoryItem(
        prev.filter((entry) => entry.id !== item.id),
        { ...item, category: next },
        true
      )
    );
    showNotice("moved", item.name, next);
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
    if (!fromId || fromId === id) return;
    setItems((prev) =>
      reorderListInventoryCategory(prev, category, fromId, id)
    );
    setDraggingId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  return (
    <div className="list-inventory">
      <div className="list-inventory__search-wrap">
        <input
          type="search"
          className="list-inventory__search"
          placeholder="Search items"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search inventory items"
        />
      </div>

      <div
        className="pack-tabs list-inventory__tabs"
        role="tablist"
        aria-label="Inventory categories"
      >
        {LIST_INVENTORY_CATEGORIES.map((entry) => {
          const count = items.filter((item) => item.category === entry.id).length;
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
              onClick={() => setCategory(entry.id)}
            >
              {entry.label}
              {count > 0 ? (
                <span className="pack-tabs__count">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ul className="list-inventory__list" aria-label="Owned items">
        {visibleItems.length === 0 ? (
          <li className="list-inventory__empty">
            {search.trim()
              ? "No items match your search."
              : "No items in this category yet."}
          </li>
        ) : (
          visibleItems.map((item) => {
            const isEditing = editingId === item.id;
            const isDragging = draggingId === item.id;
            const isDropTarget = dropTargetId === item.id;
            const isMoving = movingId === item.id;

            return (
              <li
                key={item.id}
                className={[
                  "list-inventory__row",
                  isDragging ? "list-inventory__row--dragging" : "",
                  isDropTarget ? "list-inventory__row--drop-target" : "",
                  isMoving ? "list-inventory__row--moving" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, item.id)}
                onDrop={(event) => handleDrop(event, item.id)}
              >
                <div className="list-inventory__row-main">
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

                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      className="list-inventory__rename"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleRenameKeyDown}
                      aria-label="Rename item"
                    />
                  ) : (
                    <span className="list-inventory__name">{item.name}</span>
                  )}

                  <div className="list-inventory__actions">
                    {!isEditing ? (
                      <>
                        <button
                          type="button"
                          className="list-inventory__action"
                          onClick={() => startRename(item)}
                          aria-label={`Rename ${item.name}`}
                        >
                          <Pencil size={15} strokeWidth={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={[
                            "list-inventory__action",
                            isMoving ? "list-inventory__action--on" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            setMovingId(isMoving ? null : item.id)
                          }
                          aria-label={`Change category for ${item.name}`}
                          aria-expanded={isMoving}
                        >
                          <Tag size={15} strokeWidth={1.75} aria-hidden />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="list-inventory__action list-inventory__action--danger"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </div>

                {isMoving ? (
                  <div
                    className="list-inventory__move"
                    role="group"
                    aria-label={`Move ${item.name} to category`}
                  >
                    <span className="list-inventory__move-label">Move to</span>
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
                            onClick={() => moveItem(item, entry.id)}
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
