export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export async function streamChat(
  messages: Pick<Message, "role" | "content">[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as {
        text?: string;
        error?: string;
        done?: boolean;
      };
      if (payload.error) throw new Error(payload.error);
      if (payload.text) onChunk(payload.text);
    }
  }
}
