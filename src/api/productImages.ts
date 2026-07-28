import type { ImageSearchResult } from "../../lib/imageSearch";

export async function fetchProductImages(
  query: string,
  signal?: AbortSignal
): Promise<ImageSearchResult[]> {
  const url = new URL("/api/product-images", window.location.origin);
  url.searchParams.set("q", query);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Could not load product images");
  }

  const data = (await response.json()) as { products?: ImageSearchResult[] };
  return data.products ?? [];
}
