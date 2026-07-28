import { useCallback, useRef, useState } from "react";
import { streamChat, type Message, type ReasoningStatus } from "./api/chat";
import { ChatInput, MessageList } from "./components/Chat";
import { SavedStashPanel } from "./components/SavedStashPanel";
import { useSavedProducts } from "./hooks/useSavedProducts";
import "./App.css";

function createId() {
  return crypto.randomUUID();
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "AbortError") ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

export default function App() {
  const abortRef = useRef<AbortController | null>(null);
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

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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
          },
          controller.signal
        );
      } catch (err) {
        if (isAbortError(err)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, stopped: true } : m
            )
          );
          return;
        }
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsLoading(false);
        setStreamingId(null);
        setReasoningSteps([]);
      }
    },
    [input, isLoading, messages]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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
          onStop={stopGeneration}
          isGenerating={isLoading}
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
