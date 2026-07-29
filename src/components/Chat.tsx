import { useEffect, useRef, type KeyboardEvent } from "react";
import { getSuggestionsFromContent } from "../../lib/suggestions";
import type { Message, ReasoningStatus } from "../api/chat";
import { ReasoningUI } from "./ReasoningUI";
import { FluidDotsSpinner } from "./FluidDotsSpinner";
import { SuggestionItems } from "./SuggestionItems";
import {
  ArrowUpIcon,
  CodeIcon,
  ImageIcon,
  MicIcon,
  StopIcon,
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
  onStop?: () => void;
  isGenerating?: boolean;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isGenerating;

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
          {isGenerating ? (
            <button
              type="button"
              className="send-btn send-btn--stop"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              className="send-btn"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUpIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StoppedNotice({ variant }: { variant: "early" | "partial" }) {
  if (variant === "early") {
    return (
      <p className="message__stopped message__stopped--solo">
        <span className="message__stopped-mark" aria-hidden>
          ···
        </span>
        Got it — I'll hold here. Ask whenever you're ready.
      </p>
    );
  }

  return (
    <p className="message__stopped">
      <span className="message__stopped-mark" aria-hidden>
        ···
      </span>
      I'll pause here — just say the word if you want me to keep going.
    </p>
  );
}

type MessageListProps = {
  messages: Message[];
  streamingId: string | null;
  reasoningSteps: ReasoningStatus[];
  error: string | null;
  onSuggestion?: (text: string) => void;
  suggestionsDisabled?: boolean;
};

export function MessageList({
  messages,
  streamingId,
  reasoningSteps,
  error,
  onSuggestion,
  suggestionsDisabled = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingId, reasoningSteps, error]);

  const streamingMessage = streamingId
    ? messages.find((m) => m.id === streamingId)
    : undefined;
  const showReasoning =
    reasoningSteps.length > 0 &&
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
      {messages.map((msg) => {
        const isStreaming = msg.id === streamingId;
        const assistantParsed =
          msg.role === "assistant"
            ? getSuggestionsFromContent(msg.content)
            : null;
        const showSuggestions =
          assistantParsed &&
          assistantParsed.suggestions.length > 0 &&
          !isStreaming;

        const showAssistantBubble =
          msg.role === "user" ||
          Boolean(assistantParsed?.prose) ||
          Boolean(msg.content) ||
          msg.stopped ||
          (isStreaming && !showReasoning);

        const stoppedWithContent =
          msg.role === "assistant" &&
          msg.stopped &&
          Boolean(assistantParsed?.prose || msg.content.trim());

        const stoppedEarly =
          msg.role === "assistant" && msg.stopped && !msg.content.trim();

        return (
          <div key={msg.id} className="message-stack">
            {isStreaming && showReasoning && (
              <ReasoningUI steps={reasoningSteps} />
            )}
            {showAssistantBubble && (
              <div
                className={[
                  "message",
                  msg.role === "user" ? "message--user" : "message--assistant",
                  isStreaming ? "message--streaming" : "",
                  msg.stopped ? "message--stopped" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : stoppedEarly ? (
                  <StoppedNotice variant="early" />
                ) : (
                  <>
                    {assistantParsed?.prose || msg.content}
                    {isStreaming && !showReasoning && (
                      <FluidDotsSpinner className="fluid-dots--message" />
                    )}
                    {stoppedWithContent && !isStreaming && (
                      <StoppedNotice variant="partial" />
                    )}
                  </>
                )}
              </div>
            )}
            {showSuggestions && (
              <SuggestionItems items={assistantParsed.suggestions} />
            )}
          </div>
        );
      })}
      {error && <div className="message message--error">{error}</div>}
      <div ref={bottomRef} />
    </div>
  );
}
