import { Check, GripVertical, Pencil, Trash2 } from "lucide-react";
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
  loadListInventory,
  persistListInventory,
  reorderListInventoryCategory,
  type ListInventoryCategory,
  type ListInventoryItem,
} from "../lib/listInventoryStorage";

function createItemId() {
  return `li-${crypto.randomUUID()}`;
}

type AddCategoryChoice = "auto" | ListInventoryCategory;

type AddNotice = {
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
  const [addNotice, setAddNotice] = useState<AddNotice | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

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
    };
  }, []);

  const showAddNotice = (
    itemName: string,
    placedCategory: ListInventoryCategory,
    autoSorted: boolean
  ) => {
    setAddNotice({ itemName, category: placedCategory, autoSorted });
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setAddNotice(null);
      noticeTimerRef.current = null;
    }, 3200);
  };

  const predictedCategory = useMemo(() => {
    const trimmed = newItemName.trim();
    if (!trimmed || addCategory !== "auto") return null;
    return classifyInventoryItem(trimmed);
  }, [newItemName, addCategory]);

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
  };

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    const autoSorted = addCategory === "auto";
    const placedCategory = autoSorted
      ? classifyInventoryItem(trimmed)
      : addCategory;

    setItems((prev) => [
      ...prev,
      { id: createItemId(), name: trimmed, category: placedCategory },
    ]);
    setNewItemName("");
    setCategory(placedCategory);
    showAddNotice(trimmed, placedCategory, autoSorted);
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

            return (
              <li
                key={item.id}
                className={[
                  "list-inventory__row",
                  isDragging ? "list-inventory__row--dragging" : "",
                  isDropTarget ? "list-inventory__row--drop-target" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, item.id)}
                onDrop={(event) => handleDrop(event, item.id)}
              >
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
                    <button
                      type="button"
                      className="list-inventory__action"
                      onClick={() => startRename(item)}
                      aria-label={`Rename ${item.name}`}
                    >
                      <Pencil size={15} strokeWidth={1.75} aria-hidden />
                    </button>
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
              <strong>{addNotice.itemName}</strong> added to{" "}
              <strong>{categoryLabel(addNotice.category)}</strong>
              {addNotice.autoSorted ? " (auto-sorted)" : ""}
            </span>
          </p>
        ) : null}

        <div className="list-inventory__add-bar">
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
          <label className="list-inventory__add-category">
            <span className="list-inventory__add-category-label">Category</span>
            <select
              className="list-inventory__add-select"
              value={addCategory}
              onChange={(event) =>
                setAddCategory(event.target.value as AddCategoryChoice)
              }
              aria-label="Item category (optional)"
            >
              <option value="auto">Auto-sort</option>
              {LIST_INVENTORY_CATEGORIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="list-inventory__add-submit"
            onClick={addItem}
            disabled={!newItemName.trim()}
          >
            Add
          </button>
        </div>
        <p className="list-inventory__add-hint">
          {addCategory === "auto"
            ? predictedCategory
              ? `Will auto-sort into ${categoryLabel(predictedCategory)}.`
              : "Type a name — we’ll pick a category for you."
            : `Will be added to ${categoryLabel(addCategory)}.`}
        </p>
      </div>
    </div>
  );
}
