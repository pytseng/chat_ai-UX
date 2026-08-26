import { useEffect, useState, type ReactNode } from "react";
import { mediaUrl } from "../lib/media";
import type { ListInventoryItem } from "../lib/listInventoryStorage";

export function itemPhotoSrc(item: ListInventoryItem): string | null {
  if (item.imageUrl) return item.imageUrl;
  return item.imageKey ? mediaUrl(item.imageKey) : null;
}

/** Product photo when the item has one; otherwise the caller’s glyph. */
export function ItemPhoto({
  item,
  className,
  fallback,
}: {
  item: ListInventoryItem;
  className?: string;
  fallback: ReactNode;
}) {
  const src = itemPhotoSrc(item);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      className={className}
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
