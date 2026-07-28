export type ImageSearchResult = {
  id: string;
  name: string;
  imageUrl: string;
  sourceUrl?: string;
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect fill="#eef2ee" width="240" height="240"/><path fill="#b8c4ba" d="M72 168l40-52 32 40 24-28 40 40H72z"/><circle fill="#b8c4ba" cx="92" cy="88" r="16"/></svg>'
  );

const cache = new Map<string, ImageSearchResult[]>();

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function searchQuery(raw: string): string {
  const base = raw.replace(/\*\*/g, "").trim();
  if (/\bproduct\b/i.test(base)) return base;
  return `${base} product buy`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
}

function isAllowedImageUrl(url: string): boolean {
  if (!url.startsWith("http")) return false;
  if (/\.pdf/i.test(url)) return false;
  if (/\/page1-\d+px-.*\.pdf\./i.test(url)) return false;
  return true;
}

function isTrustedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".wikimedia.org") ||
      host === "external-content.duckduckgo.com"
    );
  } catch {
    return false;
  }
}

async function isImageReachable(url: string): Promise<boolean> {
  if (!isAllowedImageUrl(url)) return false;
  if (isTrustedHost(url)) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Range: "bytes=0-256",
        Accept: "image/*,*/*",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.startsWith("image/") || contentType === "application/octet-stream";
  } catch {
    return false;
  }
}

async function filterReachableImages(
  items: ImageSearchResult[]
): Promise<ImageSearchResult[]> {
  const checks = await Promise.all(
    items.map(async (item) => ({
      item,
      ok: await isImageReachable(item.imageUrl),
    }))
  );
  return checks.filter((entry) => entry.ok).map((entry) => entry.item);
}

async function searchSerpApi(query: string, limit: number): Promise<ImageSearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", `${query} product`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(limit));

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    images_results?: Array<{
      title?: string;
      original?: string;
      thumbnail?: string;
      link?: string;
    }>;
  };

  return (data.images_results ?? [])
    .slice(0, limit)
    .map((item, index) => ({
      id: `serp-${index}-${slugify(item.title ?? query)}`,
      name: (item.title ?? query).slice(0, 48),
      imageUrl: item.thumbnail ?? item.original ?? "",
      sourceUrl: item.link,
    }))
    .filter((item) => isAllowedImageUrl(item.imageUrl));
}

async function searchDuckDuckGo(query: string, limit: number): Promise<ImageSearchResult[]> {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!searchRes.ok) return [];

    const html = await searchRes.text();
    const vqdMatch =
      html.match(/vqd=['"]([^'"]+)['"]/) ?? html.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return [];

    const imgUrl = new URL("https://duckduckgo.com/i.js");
    imgUrl.searchParams.set("l", "us-en");
    imgUrl.searchParams.set("o", "json");
    imgUrl.searchParams.set("q", query);
    imgUrl.searchParams.set("vqd", vqdMatch[1]);
    imgUrl.searchParams.set("p", "1");

    const imgRes = await fetch(imgUrl.toString(), {
      headers: {
        "User-Agent": UA,
        Referer: "https://duckduckgo.com/",
        Accept: "application/json",
      },
    });
    if (!imgRes.ok) return [];

    const data = (await imgRes.json()) as {
      results?: Array<{
        title?: string;
        image?: string;
        thumbnail?: string;
        url?: string;
      }>;
    };

    return (data.results ?? [])
      .slice(0, limit)
      .map((item, index) => ({
        id: `ddg-${index}-${slugify(item.title ?? query)}`,
        name: (item.title ?? query).slice(0, 48),
        imageUrl: item.thumbnail ?? item.image ?? "",
        sourceUrl: item.url,
      }))
      .filter((item) => isAllowedImageUrl(item.imageUrl));
  } catch {
    return [];
  }
}

async function searchWikimedia(query: string, limit: number): Promise<ImageSearchResult[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrlimit", String(limit * 2));
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrmediatype", "image");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("iiurlwidth", "240");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            descriptionurl?: string;
          }>;
        }
      >;
    };
  };

  const pages = data.query?.pages ?? {};
  const results: ImageSearchResult[] = [];

  Object.values(pages).forEach((page, index) => {
    const info = page.imageinfo?.[0];
    const imageUrl = info?.thumburl ?? info?.url;
    if (!imageUrl || !isAllowedImageUrl(imageUrl)) return;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(imageUrl)) return;
    const title = (page.title ?? query).replace(/^File:/i, "").replace(/\.[^.]+$/, "");
    results.push({
      id: `wiki-${index}-${slugify(title)}`,
      name: title.slice(0, 48),
      imageUrl,
      sourceUrl: info?.descriptionurl,
    });
  });

  return results.slice(0, limit);
}

function mergeResults(
  primary: ImageSearchResult[],
  extra: ImageSearchResult[],
  limit: number
): ImageSearchResult[] {
  const seen = new Set(primary.map((item) => item.imageUrl));
  const merged = [...primary];

  for (const item of extra) {
    if (merged.length >= limit) break;
    if (seen.has(item.imageUrl)) continue;
    seen.add(item.imageUrl);
    merged.push(item);
  }

  return merged;
}

export async function searchProductImages(
  rawQuery: string,
  limit = 4
): Promise<ImageSearchResult[]> {
  const query = searchQuery(rawQuery);
  const cacheKey = `v5:${query}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let live: ImageSearchResult[] = [];
  live = mergeResults(live, await searchSerpApi(query, limit), limit);
  live = mergeResults(live, await searchDuckDuckGo(query, limit), limit);
  live = mergeResults(live, await searchWikimedia(query, limit), limit);

  let results = await filterReachableImages(live);

  while (results.length < limit) {
    results.push({
      id: `placeholder-${results.length}`,
      name: rawQuery.slice(0, 48),
      imageUrl: PLACEHOLDER_IMAGE,
    });
  }

  cache.set(cacheKey, results.slice(0, limit));
  return results.slice(0, limit);
}
