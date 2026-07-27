import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Message } from "../api/chat";
import {
  ArrowUpIcon,
  CodeIcon,
  ImageIcon,
  MicIcon,
} from "./Icons";

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
          placeholder="What would you like to know?"
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
  error: string | null;
};

export function MessageList({
  messages,
  streamingId,
  error,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingId, error]);

  return (
    <div className="messages">
      {messages.length === 0 && !error && (
        <p className="messages__empty">
          Ask about what to pack for a trip, street style for a destination, or
          functional layers for the weather.
        </p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={[
            "message",
            msg.role === "user" ? "message--user" : "message--assistant",
            msg.id === streamingId ? "message--streaming" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {msg.content || (msg.id === streamingId ? "" : "…")}
        </div>
      ))}
      {error && <div className="message message--error">{error}</div>}
      <div ref={bottomRef} />
    </div>
  );
}
