import { useCallback, useState } from "react";
import { streamChat, type Message, type ReasoningStatus } from "./api/chat";
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
  const [reasoning, setReasoning] = useState<ReasoningStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setReasoning(null);
      setIsLoading(true);
      setStreamingId(assistantId);

      try {
        await streamChat(
          [...nextMessages].map(({ role, content }) => ({ role, content })),
          {
            onStatus: setReasoning,
            onText: (chunk) => {
              setReasoning(null);
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
        setReasoning(null);
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
        </header>

        <MessageList
          messages={messages}
          streamingId={streamingId}
          reasoning={reasoning}
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
      </div>
    </div>
  );
}
