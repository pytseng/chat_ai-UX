import { useCallback, useSyncExternalStore } from "react";
import {
  loadSavedProducts,
  makeSavedProductId,
  persistSavedProducts,
  type SavedProduct,
} from "../lib/savedProductsStorage";

let snapshot = loadSavedProducts();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: SavedProduct[]) {
  snapshot = next;
  persistSavedProducts(next);
  emitChange();
}

export function useSavedProducts() {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isSaved = useCallback(
    (name: string, imageUrl: string) =>
      saved.some(
        (item) => item.name === name && item.imageUrl === imageUrl
      ),
    [saved]
  );

  const add = useCallback(
    (input: Omit<SavedProduct, "id" | "savedAt">) => {
      const id = makeSavedProductId(input.name, input.imageUrl);
      if (saved.some((item) => item.id === id)) return;

      setSnapshot([
        {
          ...input,
          id,
          savedAt: new Date().toISOString(),
        },
        ...saved,
      ]);
    },
    [saved]
  );

  const remove = useCallback(
    (id: string) => {
      setSnapshot(saved.filter((item) => item.id !== id));
    },
    [saved]
  );

  return {
    saved,
    count: saved.length,
    add,
    remove,
    isSaved,
  };
}
