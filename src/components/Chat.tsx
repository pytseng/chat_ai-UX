import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { getSuggestionsFromContent } from "../../lib/suggestions";
import type { Message, ReasoningStatus } from "../api/chat";
import { ReasoningUI } from "./ReasoningUI";
import { FluidDotsSpinner } from "./FluidDotsSpinner";
import { MessageProse } from "./MessageProse";
import { SuggestionItems } from "./SuggestionItems";
import { PreferencePrompt } from "./PreferencePrompt";
import { WeatherWidget } from "./WeatherWidget";
import type { UserPreferences } from "../lib/userPreferences";
import {
  ArrowUpIcon,
  CodeIcon,
  ImageIcon,
  MicIcon,
  StopIcon,
} from "./Icons";

/** Current / immediate timing. */
const SUGGESTIONS_NOW = [
  "Iceland ice caves right now?",
  "Kite surf Tarifa right now?",
  "Wing foil Maui this weekend?",
  "Big-wave surf Portugal this weekend?",
  "Ski tour Chamonix today?",
] as const;

/** Trip length / duration (hard packing call for multi-day journeys). */
const SUGGESTIONS_NEAR = [
  "20-day Patagonia trek?",
  "2-week Zion canyoneering trip?",
  "18-day Grand Canyon raft?",
  "3-week Banff ice climb?",
  "20-day Vietnam moto trip?",
] as const;

/** Further-out season, month, or specific later timing. */
const SUGGESTIONS_LATER = [
  "Kilimanjaro summit in January?",
  "Torres del Paine in March?",
  "Sahara dune trek in November?",
  "Everest base camp in April?",
  "Alps via ferrata in September?",
  "Scuba the Barrier Reef in July?",
  "Paraglide Interlaken this summer?",
  "Whitewater kayak Nepal in October?",
  "Free climb Yosemite in spring?",
  "Backcountry snowboard Japan in Feb?",
  "Andes mountaineering this fall?",
  "Ice dive Antarctica in December?",
  "UTMB trail run in August?",
  "Heli-ski Alaska next March?",
  "Volcano trek Bali in dry season?",
  "Cave dive Mexico next spring?",
] as const;

export const SUGGESTION_PROMPTS = [
  ...SUGGESTIONS_NOW,
  ...SUGGESTIONS_NEAR,
  ...SUGGESTIONS_LATER,
] as const;

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Always one now, one trip-duration, one further season/month. */
function pickRandomSuggestions(): string[] {
  return [pickOne(SUGGESTIONS_NOW), pickOne(SUGGESTIONS_NEAR), pickOne(SUGGESTIONS_LATER)];
}

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isGenerating && !disabled;

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
          placeholder={
            disabled
              ? "Finish preferences above to continue…"
              : "What would you like to know?"
          }
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isGenerating}
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
  awaitingPreferences?: boolean;
  onPreferencesSubmit?: (prefs: UserPreferences) => void;
  preferences?: UserPreferences | null;
};

export function MessageList({
  messages,
  streamingId,
  reasoningSteps,
  error,
  onSuggestion,
  suggestionsDisabled = false,
  awaitingPreferences = false,
  onPreferencesSubmit,
  preferences = null,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const starterPrompts = useMemo(() => pickRandomSuggestions(), []);

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
            Ask what to pack for a trek, summit, desert crossing, or any wild
            adventure. Layers and gear for the trail ahead.
          </p>
          {onSuggestion && (
            <div className="suggestions" role="group" aria-label="Suggested questions">
              {starterPrompts.map((prompt) => (
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
        const hasTextAnswer = Boolean(
          assistantParsed?.prose?.trim() ||
            (msg.role === "assistant" && msg.content.trim()),
        );
        // Reveal widgets only after the turn finishes so order stays:
        // reasoning → text → weather → items
        const revealExtras = !isStreaming && hasTextAnswer;

        const showSuggestions =
          revealExtras &&
          assistantParsed &&
          assistantParsed.suggestions.length > 0;

        const showWeather =
          revealExtras && msg.role === "assistant" && Boolean(msg.weather);

        const showAssistantBubble =
          msg.role === "user" ||
          hasTextAnswer ||
          msg.stopped ||
          (isStreaming && !showReasoning);

        const stoppedWithContent =
          msg.role === "assistant" &&
          msg.stopped &&
          hasTextAnswer;

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
                    <MessageProse
                      text={assistantParsed?.prose || msg.content}
                    />
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
            {showWeather && msg.weather && (
              <WeatherWidget weather={msg.weather} />
            )}
            {showSuggestions && (
              <SuggestionItems
                items={assistantParsed.suggestions}
                preferences={preferences}
              />
            )}
          </div>
        );
      })}
      {awaitingPreferences && onPreferencesSubmit && (
        <PreferencePrompt onSubmit={onPreferencesSubmit} />
      )}
      {error && <div className="message message--error">{error}</div>}
      <div ref={bottomRef} />
    </div>
  );
}
