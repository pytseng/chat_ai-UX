import { useCallback, useState } from "react";
import { streamChat, type Message, type ReasoningStatus } from "./api/chat";
import { ChatInput, MessageList } from "./components/Chat";
import { SavedStashPanel } from "./components/SavedStashPanel";
import { useSavedProducts } from "./hooks/useSavedProducts";
import "./App.css";

function createId() {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stashOpen, setStashOpen] = useState(false);
  const { saved, count, remove } = useSavedProducts();

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
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
      setReasoningSteps([]);
      setIsLoading(true);
      setStreamingId(assistantId);

      try {
        await streamChat(
          [...nextMessages].map(({ role, content }) => ({ role, content })),
          {
            onStatus: (status) => {
              setReasoningSteps((prev) => {
                const existing = prev.findIndex((s) => s.id === status.id);
                if (existing >= 0) {
                  return prev.map((s, i) => (i === existing ? status : s));
                }
                return [...prev, status];
              });
            },
            onText: (chunk) => {
              setReasoningSteps([]);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk }
                    : m
                )
              );
            },
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
        setReasoningSteps([]);
      }
    },
    [input, isLoading, messages]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      setInput(prompt);
      void sendMessage(prompt);
    },
    [sendMessage]
  );

  return (
    <div className="app">
      <div className="phone">
        <header className="header">
          <h1 className="header__title">SecretStash</h1>
          <button
            type="button"
            className="header__stash-btn"
            onClick={() => setStashOpen(true)}
            aria-label={`Open saved stash, ${count} items`}
          >
            Stash{count > 0 ? ` · ${count}` : ""}
          </button>
        </header>

        <MessageList
          messages={messages}
          streamingId={streamingId}
          reasoningSteps={reasoningSteps}
          error={error}
          onSuggestion={handleSuggestion}
          suggestionsDisabled={isLoading}
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={isLoading}
        />

        <SavedStashPanel
          open={stashOpen}
          items={saved}
          onClose={() => setStashOpen(false)}
          onRemove={remove}
        />
      </div>
    </div>
  );
}
