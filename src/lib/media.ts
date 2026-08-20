const DEFAULT_MEDIA_BASE =
  "https://pub-e857b78d4e654544828a835e6f04f543.r2.dev";

export const MEDIA_BASE = (
  (import.meta.env.VITE_MEDIA_BASE as string | undefined) ?? DEFAULT_MEDIA_BASE
).replace(/\/$/, "");

export function mediaUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  if (!MEDIA_BASE) return `/${clean}`;
  return `${MEDIA_BASE}/${clean}`;
}
