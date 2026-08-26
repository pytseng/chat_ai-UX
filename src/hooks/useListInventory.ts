import { useSyncExternalStore } from "react";
import {
  getListInventory,
  setListInventory,
  subscribeListInventory,
} from "../lib/listInventoryStorage";

export function useListInventory() {
  const items = useSyncExternalStore(
    subscribeListInventory,
    getListInventory,
    getListInventory
  );

  return { items, setItems: setListInventory };
}
