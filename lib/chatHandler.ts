import Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are SecretStash, a concise travel and fashion styling assistant.
Help users plan clothing for trips: weather-aware layers, functional gear, and street style direction.
Be honest when you don't have live product data — give style guidance and what to look for.
Keep replies short and scannable unless the user asks for detail.`;

export const CHAT_MODEL = "claude-sonnet-4-5-20250929";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function streamChatResponse(
  apiKey: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}
