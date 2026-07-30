import type { ImageSearchResult } from "../../lib/imageSearch";

export async function fetchProductImages(
  query: string,
  signal?: AbortSignal,
  preferenceHint?: string
): Promise<ImageSearchResult[]> {
  const url = new URL("/api/product-images", window.location.origin);
  const q = preferenceHint?.trim()
    ? `${preferenceHint.trim()} ${query}`.trim()
    : query;
  url.searchParams.set("q", q);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Could not load product images");
  }

  const data = (await response.json()) as { products?: ImageSearchResult[] };
  return data.products ?? [];
}
