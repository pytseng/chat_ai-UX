import type { VercelRequest, VercelResponse } from "@vercel/node";
import { streamChatResponse, type ChatMessage } from "../lib/chatHandler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await streamChatResponse(
      apiKey,
      messages as ChatMessage[],
      (event) => {
        if (event.type === "status") {
          res.write(`data: ${JSON.stringify({ status: event.status })}\n\n`);
          return;
        }
        res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
      },
      {
        preferenceNote:
          typeof req.body?.preferenceNote === "string"
            ? req.body.preferenceNote
            : undefined,
      }
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
}
