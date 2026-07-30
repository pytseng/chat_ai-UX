import type { VercelRequest, VercelResponse } from "@vercel/node";
import { searchProductImages } from "../lib/imageSearch.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    res.status(400).json({ error: "q query parameter is required" });
    return;
  }

  try {
    const products = await searchProductImages(query, 4);
    res.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image search failed";
    res.status(500).json({ error: message });
  }
}
