import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Message, ReasoningStatus } from "../api/chat";
import { ReasoningUI } from "./ReasoningUI";
import { FluidDotsSpinner } from "./FluidDotsSpinner";
import {
  ArrowUpIcon,
  CodeIcon,
  ImageIcon,
  MicIcon,
} from "./Icons";

export const SUGGESTION_PROMPTS = [
  "What to pack for Tokyo in spring?",
  "Layers for hiking Patagonia",
  "Street style for a Paris weekend",
] as const;

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="input-area">
      <div className="chat-box">
        <textarea
          ref={textareaRef}
          className="chat-box__field"
          placeholder="e.g. What to pack for hiking in Patagonia?"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Message"
        />
        <div className="chat-box__toolbar">
          <div className="chat-box__actions">
            <button
              type="button"
              className="icon-btn"
              disabled
              aria-label="Attach image (coming soon)"
              title="Coming soon"
            >
              <ImageIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled
              aria-label="Code mode (coming soon)"
              title="Coming soon"
            >
              <CodeIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled
              aria-label="Voice input (coming soon)"
              title="Coming soon"
            >
              <MicIcon />
            </button>
          </div>
          <button
            type="button"
            className="send-btn"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <ArrowUpIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

type MessageListProps = {
  messages: Message[];
  streamingId: string | null;
  reasoning: ReasoningStatus | null;
  error: string | null;
  onSuggestion?: (text: string) => void;
  suggestionsDisabled?: boolean;
};

export function MessageList({
  messages,
  streamingId,
  reasoning,
  error,
  onSuggestion,
  suggestionsDisabled = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingId, reasoning, error]);

  const streamingMessage = streamingId
    ? messages.find((m) => m.id === streamingId)
    : undefined;
  const showReasoning =
    Boolean(reasoning) &&
    Boolean(streamingId) &&
    !streamingMessage?.content;

  return (
    <div className="messages">
      {messages.length === 0 && !error && (
        <div className="messages__empty-state">
          <p className="messages__empty">
            Ask about what to pack for a trip, street style for a destination, or
            functional layers for the weather.
          </p>
          {onSuggestion && (
            <div className="suggestions" role="group" aria-label="Suggested questions">
              {SUGGESTION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="suggestion-chip"
                  disabled={suggestionsDisabled}
                  onClick={() => onSuggestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.id === streamingId && showReasoning && reasoning && (
            <ReasoningUI segments={reasoning.segments} stepKey={reasoning.id} />
          )}
          <div
            className={[
              "message",
              msg.role === "user" ? "message--user" : "message--assistant",
              msg.id === streamingId ? "message--streaming" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {msg.content}
            {msg.id === streamingId && !showReasoning && (
              <FluidDotsSpinner className="fluid-dots--message" />
            )}
          </div>
        </div>
      ))}
      {error && <div className="message message--error">{error}</div>}
      <div ref={bottomRef} />
    </div>
  );
}
