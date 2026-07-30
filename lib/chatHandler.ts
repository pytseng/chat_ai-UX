import Anthropic from "@anthropic-ai/sdk";
import {
  classifyIntent,
  CLARIFY_MESSAGE,
  isResponseOnTopic,
  REFUSAL_MESSAGE,
} from "./guardrails.js";
import { fetchWeather } from "./weather.js";
import {
  guessPlaceFromMessage,
  messageHintsWeather,
  messageHintsWeb,
  REASONING,
  type ReasoningStatus,
} from "./reasoning.js";

const SUBJECT_SYSTEM_PROMPT = `You are SecretStash, a concise travel packing and gear assistant.
You ONLY help with travel clothing, layers, luggage, and equipment suggestions.

IN SCOPE — answer these:
- What to wear or pack for a destination, season, or activity
- Weather-aware layering (city, hiking, beach, business, cold/rain)
- Functional gear vs street style for a trip
- What to look for in jackets, boots, bags, etc. (no live prices unless from tools)

OUT OF SCOPE — politely refuse and redirect:
- Coding, homework, recipes, general trivia, politics, health diagnosis, finance
- Non-travel shopping or unrelated lifestyle topics
- Trip booking, visas, or full itineraries (packing only)

If a question is off-topic, reply briefly:
"I'm SecretStash — I help with travel packing and gear. Try asking what to pack for [destination] or [activity]."
Never act as a general-purpose assistant.

Tools (only for in-scope travel/packing questions):
- get_weather: ALWAYS use for temperature, rain, wind, humidity, or forecast. Open-Meteo live data.
  For mountains/hiking, pass elevation_m and/or coordinates when known. Never guess temperatures.
- web_search: news, events, store hours, gear releases — NOT for weather.

Be honest when you lack live product prices or stock. Keep replies short and scannable unless asked for detail.

When listing gear to pack, use a short intro paragraph (2–3 sentences max), then organize items into these category headings with dash bullets under each:

Top layer:
- item
Bottom layer:
- item
Accessories:
- item
Gear:
- item

Only include categories that apply. Keep each bullet to a short product name (no long descriptions). Do not put packing items in the intro paragraph.`;

/** Plain chat — no subject guardrails, no tools. Set RECORDING_MODE=true in .env.local */
const RECORDING_SYSTEM_PROMPT = `You are a helpful assistant. Answer naturally and conversationally.`;

export const CHAT_MODEL = "claude-sonnet-4-5-20250929";

export function isRecordingMode(): boolean {
  return process.env.RECORDING_MODE === "true";
}

export const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search",
  max_uses: 3,
  allowed_callers: ["direct"] as const,
};

export const GET_WEATHER_TOOL: Anthropic.Tool = {
  name: "get_weather",
  description:
    "Get live outdoor weather and 5-day forecast from Open-Meteo. Supports places, coordinates, and mountain elevation (meters). Required for any weather or hiking packing question.",
  input_schema: {
    type: "object",
    properties: {
      place_name: {
        type: "string",
        description:
          "Place to search: city, trail, mountain, park, e.g. Mount Fuji, Yosemite Valley, Chamonix",
      },
      country_code: {
        type: "string",
        description: "Optional ISO country code to disambiguate, e.g. JP, US, FR",
      },
      latitude: {
        type: "number",
        description: "WGS84 latitude — use for precise trail/outdoor locations",
      },
      longitude: {
        type: "number",
        description: "WGS84 longitude — use with latitude",
      },
      elevation_m: {
        type: "number",
        description:
          "Elevation in meters above sea level — use for summits/trail height (Open-Meteo downscales to this altitude)",
      },
    },
  },
};

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "status"; status: ReasoningStatus };

export type ChatStreamHandler = (event: ChatStreamEvent) => void;

function emitStatus(handler: ChatStreamHandler, status: ReasoningStatus) {
  handler({ type: "status", status });
}

function emitText(handler: ChatStreamHandler, text: string) {
  handler({ type: "text", text });
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildInitialReasoning(userMessage: string): ReasoningStatus {
  const place = guessPlaceFromMessage(userMessage);
  if (messageHintsWeather(userMessage)) {
    return REASONING.checkingWeather(place);
  }
  if (messageHintsWeb(userMessage)) {
    return REASONING.scoutingWeb();
  }
  return REASONING.matchingLayers();
}

function buildSystemPrompt(
  timeZone = "Asia/Taipei",
  preferenceNote?: string
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });

  const base = isRecordingMode()
    ? `${RECORDING_SYSTEM_PROMPT}\n\nToday's date: ${today} (${timeZone}).`
    : `${SUBJECT_SYSTEM_PROMPT}\n\nToday's date: ${today} (${timeZone}).`;

  if (preferenceNote?.trim()) {
    return `${base}\n\n${preferenceNote.trim()}`;
  }
  return base;
}

function parsePlaceFromToolInput(inputJson: string): string | undefined {
  try {
    const parsed = JSON.parse(inputJson) as { place_name?: string };
    return parsed.place_name?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function runWeatherTool(input: unknown): Promise<string> {
  const parsed = input as {
    place_name?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    elevation_m?: number;
  };

  const hasCoords =
    parsed.latitude != null &&
    parsed.longitude != null &&
    Number.isFinite(parsed.latitude) &&
    Number.isFinite(parsed.longitude);

  if (!hasCoords && !parsed.place_name?.trim()) {
    return JSON.stringify({
      error: "Provide place_name or both latitude and longitude",
    });
  }

  try {
    const data = await fetchWeather({
      place_name: parsed.place_name,
      country_code: parsed.country_code,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      elevation_m: parsed.elevation_m,
    });
    return JSON.stringify(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Weather fetch failed";
    return JSON.stringify({ error: message });
  }
}

async function streamPlainChat(
  client: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  onEvent: ChatStreamHandler
): Promise<void> {
  emitStatus(onEvent, REASONING.packingAnswer());

  const stream = client.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 2048,
    system,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      emitText(onEvent, event.delta.text);
    }
  }
}

async function streamWithTools(
  client: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  onEvent: ChatStreamHandler
): Promise<void> {
  let conversationMessages = messages;

  const tools: Anthropic.Messages.Tool[] = [
    WEB_SEARCH_TOOL,
    GET_WEATHER_TOOL,
  ];

  while (true) {
    const toolInputs = new Map<number, string>();

    const stream = client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 2048,
      system,
      messages: conversationMessages,
      tools,
    });

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "tool_use") {
          if (block.name === "get_weather") {
            emitStatus(onEvent, REASONING.checkingWeather());
          } else if (block.name === "web_search") {
            emitStatus(onEvent, REASONING.scoutingWeb());
          }
        }
      }

      if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta"
      ) {
        const prev = toolInputs.get(event.index) ?? "";
        toolInputs.set(event.index, prev + event.delta.partial_json);
      }

      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        emitText(onEvent, event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason !== "tool_use") break;

    const toolUses = final.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      if (toolUse.name === "get_weather") {
        const place =
          (toolUse.input as { place_name?: string }).place_name ??
          parsePlaceFromToolInput(
            [...toolInputs.values()].join("") || JSON.stringify(toolUse.input)
          );
        emitStatus(onEvent, REASONING.checkingWeather(place));
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: await runWeatherTool(toolUse.input),
        });
      }
    }

    if (toolResults.length === 0) break;

    emitStatus(onEvent, REASONING.packingAnswer());

    conversationMessages = [
      ...conversationMessages,
      { role: "assistant", content: final.content },
      { role: "user", content: toolResults },
    ];
  }
}

function emitGuardrailMessage(message: string, onEvent: ChatStreamHandler) {
  emitText(onEvent, message);
}

async function streamGuardedChat(
  client: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  onEvent: ChatStreamHandler
): Promise<void> {
  let fullResponse = "";

  const captureEvent: ChatStreamHandler = (event) => {
    if (event.type === "text") {
      fullResponse += event.text;
    }
    onEvent(event);
  };

  await streamWithTools(client, system, messages, captureEvent);

  if (fullResponse && !isResponseOnTopic(fullResponse)) {
    console.warn("[guardrails] Off-topic model response detected");
  }
}

export async function streamChatResponse(
  apiKey: string,
  messages: ChatMessage[],
  onEvent: ChatStreamHandler,
  options?: { timeZone?: string; preferenceNote?: string }
): Promise<void> {
  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(options?.timeZone, options?.preferenceNote);

  const conversationMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  if (isRecordingMode()) {
    emitStatus(onEvent, REASONING.readingTrip());
    await streamPlainChat(client, system, conversationMessages, onEvent);
    return;
  }

  if (lastUser) {
    emitStatus(onEvent, REASONING.readingTrip());

    const prior = messages.slice(0, messages.lastIndexOf(lastUser));
    const intent = classifyIntent(lastUser.content, prior);

    if (intent.intent === "out_of_scope") {
      emitGuardrailMessage(REFUSAL_MESSAGE, onEvent);
      return;
    }

    if (intent.intent === "unclear") {
      emitStatus(onEvent, REASONING.clarifying());
      emitGuardrailMessage(CLARIFY_MESSAGE, onEvent);
      return;
    }

    emitStatus(onEvent, buildInitialReasoning(lastUser.content));
  }

  await streamGuardedChat(client, system, conversationMessages, onEvent);
}
