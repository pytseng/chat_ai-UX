import type {
  ListInventoryCategory,
  ListInventoryItem,
} from "./listInventoryStorage";

export const DEMO_STASH_IMAGE_PREFIX = "secret-stash/demo";

export type DemoStashSpec = {
  id: string;
  name: string;
  category: ListInventoryCategory;
  /** Search query aimed at a men's technical, size-M packshot. */
  query: string;
  /** Every token must appear in the result title or URL. */
  mustMatch: string[];
  /** Skip search and use this packshot URL when set. */
  imageUrl?: string;
};

/** Men's technical wardrobe, size M — at most three items per category. */
export const DEMO_STASH_SPECS: DemoStashSpec[] = [
  {
    id: "demo-nano-puff",
    name: "Nano Puff insulated jacket",
    category: "top",
    query: "Patagonia Nano Puff Jacket men's",
    mustMatch: ["nano", "puff"],
  },
  {
    id: "demo-rain-shell",
    name: "Rain shell",
    category: "top",
    query: "Patagonia Torrentshell 3L Jacket men's",
    mustMatch: ["torrentshell"],
    imageUrl:
      "https://www.outsidesports.co.nz/cdn/shop/files/85241_BLK_1200x1200.webp?v=1770091377",
  },
  {
    id: "demo-hiking-pants",
    name: "Softshell hiking pants",
    category: "bottom",
    query: "Arc'teryx Gamma Pant men's",
    mustMatch: ["gamma", "pant"],
    imageUrl:
      "https://www.paddypallin.com.au/media/catalog/product/a/r/arcteryx_gamma_pant_mens_forage.png",
  },
  {
    id: "demo-trail-shorts",
    name: "Trail running shorts",
    category: "bottom",
    query: "Patagonia Strider Pro Shorts men's",
    mustMatch: ["short"],
  },
  {
    id: "demo-trail-shoes",
    name: "Trail running shoes",
    category: "footwear",
    query: "Salomon Speedcross 6 men's trail running shoe",
    mustMatch: ["speedcross"],
  },
  {
    id: "demo-camp-sandals",
    name: "Camp sandals",
    category: "footwear",
    query: "Bedrock Cairn adventure sandal",
    mustMatch: ["cairn"],
  },
  {
    id: "demo-merino-base",
    name: "Merino base layer",
    category: "innerwear",
    query: "Smartwool merino base layer crew men's",
    mustMatch: ["crew"],
    imageUrl:
      "https://backpackersshop.com/cdn/shop/files/Screenshot_2025-10-25_at_6.38.37_pm_1200x1200.png?v=1761432010",
  },
  {
    id: "demo-merino-socks",
    name: "Merino hiking socks",
    category: "innerwear",
    query: "Darn Tough Hiker Micro Crew sock men's",
    mustMatch: ["darn", "tough"],
  },
  {
    id: "demo-sun-cap",
    name: "Sun cap",
    category: "accessories",
    query: "Outdoor Research Sun Runner Cap product",
    mustMatch: ["sun", "runner"],
    imageUrl:
      "https://www.outdoorresearch.com/cdn/shop/files/3002992288E1.png?v=1770250443",
  },
  {
    id: "demo-light-gloves",
    name: "Lightweight gloves",
    category: "accessories",
    query: "Outdoor Research Vigor Lightweight Sensor Gloves",
    mustMatch: ["glove"],
    imageUrl:
      "https://www.outdoorresearch.com/cdn/shop/files/3005600890_E1_grande.png?v=1786463104",
  },
  {
    id: "demo-daypack",
    name: "22L daypack",
    category: "gear",
    query: "Osprey Talon 22 backpack",
    mustMatch: ["talon", "22"],
    imageUrl:
      "https://www.osprey.com/gb/media/catalog/product/cache/cf9bfa9b71b0c213f1d92bcd5e9e941f/t/a/talon22_s25_front_scoriabluenightshift.jpg",
  },
  {
    id: "demo-headlamp",
    name: "Rechargeable headlamp",
    category: "gear",
    query: "Petzl Actik Core headlamp product",
    mustMatch: ["actik"],
    imageUrl:
      "https://vertigogear.co.za/cdn/shop/files/actik-600-red_f2afc4d2-e9e7-46a1-8e9e-13d949ce36ab_2000x.webp?v=1765447134",
  },
  {
    id: "demo-water-filter",
    name: "Squeeze water filter",
    category: "gear",
    query: "Sawyer Squeeze water filter product packshot",
    mustMatch: ["squeeze"],
  },
  {
    id: "demo-power-bank",
    name: "Power bank",
    category: "other",
    query: "Anker PowerCore 10000 power bank",
    mustMatch: ["powercore"],
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0595/4034/0926/products/A1263011_3840x.jpg?v=1654744958",
  },
];

export function demoItemImageKey(id: string): string {
  return `${DEMO_STASH_IMAGE_PREFIX}/${id}.jpg`;
}

export function demoStashItems(): ListInventoryItem[] {
  return DEMO_STASH_SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    category: spec.category,
    imageKey: demoItemImageKey(spec.id),
  }));
}
