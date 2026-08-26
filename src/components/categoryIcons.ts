import type { ComponentType } from "react";
import {
  IconBinoculars,
  IconShirt,
  IconShoe,
  IconTriangleSquareCircle,
} from "@tabler/icons-react";
import {
  GloveIcon,
  TankTopIcon,
  TrousersIcon,
  type GarmentIconProps,
} from "./Icons";
import type { ListInventoryCategory } from "../lib/listInventoryStorage";

/** Native Tabler grid. Smaller sizes drop 2px strokes off the pixel grid. */
export const CATEGORY_ICON_SIZE = 24;
export const CATEGORY_ICON_STROKE = 2;

/** One glyph per category, shared by the stash cards and the pack board slots. */
export const CATEGORY_ICONS: Record<
  ListInventoryCategory,
  ComponentType<GarmentIconProps>
> = {
  top: IconShirt,
  bottom: TrousersIcon,
  footwear: IconShoe,
  innerwear: TankTopIcon,
  accessories: GloveIcon,
  gear: IconBinoculars,
  other: IconTriangleSquareCircle,
};
