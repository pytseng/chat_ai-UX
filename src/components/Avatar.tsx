import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { mediaUrl } from "../lib/media";

/** R2 object — uploaded via scripts/upload-default-avatar.mjs */
export const DEFAULT_AVATAR_KEY = "secret-stash/avatar/default.png";

export const DEFAULT_AVATAR_URL = mediaUrl(DEFAULT_AVATAR_KEY);

type AvatarProps = {
  /** A specific profile picture; falls back to the shared default when absent. */
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
};

/**
 * Profile picture that degrades in two steps — the given src, then the shared
 * R2 default, then a neutral glyph — so a missing file never leaves a broken
 * image icon in the UI.
 */
export function Avatar({ src, alt = "", size = 32, className }: AvatarProps) {
  const preferred = src?.trim() ? src.trim() : DEFAULT_AVATAR_URL;
  const [current, setCurrent] = useState(preferred);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setCurrent(preferred);
    setExhausted(false);
  }, [preferred]);

  if (exhausted) {
    return <User className="avatar__fallback" strokeWidth={2} aria-hidden />;
  }

  return (
    <img
      className={className}
      src={current}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      onError={() =>
        current === DEFAULT_AVATAR_URL
          ? setExhausted(true)
          : setCurrent(DEFAULT_AVATAR_URL)
      }
    />
  );
}
