import { mediaUrl } from "./media";
import type { ListInventoryItem } from "./listInventoryStorage";

/** R2 object prefix — uploaded via scripts/seed-inventory-images.mjs */
export const INVENTORY_IMAGE_PREFIX = "secret-stash/inventory";

export function inventoryImageKey(id: string): string {
  return `${INVENTORY_IMAGE_PREFIX}/${id}.jpg`;
}

export function getItemImageUrl(id: string): string {
  return mediaUrl(inventoryImageKey(id));
}

/** Canonical owned-item catalog shared by all three inventory views */
export const INVENTORY_CATALOG: ListInventoryItem[] = [
  { id: "li-t1", name: "Wetsuit", category: "top" },
  { id: "li-t2", name: "Surf vest impact jacket", category: "top" },
  { id: "li-t3", name: "Quick-dry rashguard", category: "top" },
  { id: "li-t4", name: "Hardshell jacket", category: "top" },
  { id: "li-t5", name: "Fleece midlayer", category: "top" },
  { id: "li-t6", name: "Down puffy", category: "top" },
  { id: "li-t7", name: "Rain shell", category: "top" },
  { id: "li-t8", name: "Sun hoody", category: "top" },
  { id: "li-t9", name: "Merino hiking tee", category: "top" },
  { id: "li-b1", name: "Hiking pants", category: "bottom" },
  { id: "li-b2", name: "Trail shorts", category: "bottom" },
  { id: "li-b3", name: "Rain pants", category: "bottom" },
  { id: "li-b4", name: "Softshell pants", category: "bottom" },
  { id: "li-b5", name: "Convertible zip-off pants", category: "bottom" },
  { id: "li-b6", name: "Climbing pants", category: "bottom" },
  { id: "li-b7", name: "Travel leggings", category: "bottom" },
  { id: "li-i1", name: "Merino base layer", category: "innerwear" },
  { id: "li-i2", name: "Hiking socks (3 pairs)", category: "innerwear" },
  { id: "li-i3", name: "Underwear", category: "innerwear" },
  { id: "li-i4", name: "Sports bra", category: "innerwear" },
  { id: "li-i5", name: "Thermal long johns", category: "innerwear" },
  { id: "li-i6", name: "Liner socks", category: "innerwear" },
  { id: "li-a1", name: "Sun hat", category: "accessories" },
  { id: "li-a2", name: "Buff neck gaiter", category: "accessories" },
  { id: "li-a3", name: "Sunglasses", category: "accessories" },
  { id: "li-a4", name: "Liner gloves", category: "accessories" },
  { id: "li-a5", name: "Insulated gloves", category: "accessories" },
  { id: "li-a6", name: "Beanie", category: "accessories" },
  { id: "li-a7", name: "Belt", category: "accessories" },
  { id: "li-a8", name: "Watch", category: "accessories" },
  { id: "li-g1", name: "40L backpack", category: "gear" },
  { id: "li-g2", name: "Trekking poles", category: "gear" },
  { id: "li-g3", name: "Headlamp", category: "gear" },
  { id: "li-g4", name: "Water filter", category: "gear" },
  { id: "li-g5", name: "Sleeping bag", category: "gear" },
  { id: "li-g6", name: "Ultralight tent", category: "gear" },
  { id: "li-g7", name: "Dry bag set", category: "gear" },
  { id: "li-g8", name: "Camp stove", category: "gear" },
  { id: "li-g9", name: "Insulated water bottle", category: "gear" },
  { id: "li-g10", name: "Trail knife", category: "gear" },
  { id: "li-o1", name: "iPhone charger", category: "other" },
  { id: "li-o2", name: "USB-C cable", category: "other" },
  { id: "li-o3", name: "Power bank", category: "other" },
  { id: "li-o4", name: "Travel camera", category: "other" },
  { id: "li-o5", name: "Travel meds", category: "other" },
  { id: "li-o6", name: "Prescription pills", category: "other" },
  { id: "li-o7", name: "Passport wallet", category: "other" },
  { id: "li-o8", name: "Universal power adapter", category: "other" },
  { id: "li-o9", name: "Sunscreen SPF 50", category: "other" },
  { id: "li-o10", name: "Insect repellent", category: "other" },
  { id: "li-o11", name: "Toiletry kit", category: "other" },
  { id: "li-o12", name: "Kindle", category: "other" },
];

export function catalogItemById(id: string): ListInventoryItem | undefined {
  return INVENTORY_CATALOG.find((item) => item.id === id);
}
