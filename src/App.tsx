import { useCallback, useState } from "react";
import { streamChat, type Message } from "./api/chat";
import { ChatInput, MessageList } from "./components/Chat";
import "./App.css";

function createId() {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: text,
    };

    const assistantId = createId();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);
    setStreamingId(assistantId);

    try {
      await streamChat(
        [...nextMessages].map(({ role, content }) => ({ role, content })),
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }, [input, isLoading, messages]);

  return (
    <div className="app">
      <div className="phone">
        <header className="header">
          <h1 className="header__title">SecretStash</h1>
        </header>

        <MessageList
          messages={messages}
          streamingId={streamingId}
          error={error}
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
