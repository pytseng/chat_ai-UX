import Anthropic from "@anthropic-ai/sdk";
import {
  classifyIntent,
  CLARIFY_MESSAGE,
  isResponseOnTopic,
  REFUSAL_MESSAGE,
} from "./guardrails.js";
import { fetchWeather, type WeatherResult } from "./weather.js";
import {
  guessMonthsFromMessage,
  guessPlaceFromMessage,
  messageHintsWeb,
  messageNeedsClimateFirst,
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
- get_weather: ALWAYS use for temperature, rain, wind, humidity, forecast, or packing-by-season.
  Live fields are "right now + 5 days" only — never describe them as October/February trip weather.
  When the user names travel months/seasons, pass months as calendar numbers (1–12), e.g. October+February → [10, 2].
  Use the returned months[] climate normals for packing advice about those travel dates.
  For mountains/hiking, pass elevation_m and/or coordinates when known (Everest base camp ~5364m). Never guess temperatures.
- web_search: news, events, store hours, gear releases — NOT for weather.

Never narrate tool use. Do not say you will check the weather, look something up, or "hang on" before calling a tool — call the tool with no preamble, then write the user-facing answer after results return.

Be honest when you lack live product prices or stock. Default to a quick guide — short over thorough unless the user asks for detail.

Formatting (the UI renders this):
- Lead with 1 short sentence (or 2 max). No essay.
- Then dash bullets under only the categories that matter. Skip empty categories.
- Use **double asterisks** for a short emphasized phrase only.
- Prefer bullets over paragraphs for packing advice. Weather details belong in the widget — do not restate full temp tables in prose.

When listing gear, use these headings with short bullets. Format each bullet as:
- Product name: one short trait
Example: - Hardshell jacket: waterproof hood, taped seams
Never use em dashes (—) in bullets. Keep the name short; put detail after the colon.

Top layer:
- item: trait
Bottom layer:
- item: trait
Accessories:
- item: trait
Gear:
- item: trait

Cap each category at 4 bullets unless asked for a full expedition list. Do not put packing items in the intro.
Every item MUST go under Top layer, Bottom layer, Accessories, or Gear — never "More items" or "Other".
Jackets, fleeces, shirts, base/mid layers → Top layer. Pants, leggings, shorts → Bottom layer. Gloves, hats, socks, scarves → Accessories. Packs, bottles, poles, tents → Gear.`;

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
    "Get Open-Meteo weather: always returns live now + 5-day forecast. When months[] is set, also returns multi-year climate normals for those travel months. Required for weather or hiking packing questions.",
  input_schema: {
    type: "object",
    properties: {
      place_name: {
        type: "string",
        description:
          "Place to search: city, trail, mountain, park, e.g. Mount Everest, Yosemite Valley, Chamonix",
      },
      country_code: {
        type: "string",
        description: "Optional ISO country code to disambiguate, e.g. JP, US, FR, NP",
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
      months: {
        type: "array",
        items: { type: "integer", minimum: 1, maximum: 12 },
        description:
          "Travel months as 1–12. Pass whenever the user names months/seasons (e.g. October and February → [10, 2]). Omit only for live/current questions.",
      },
    },
  },
};

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "text_clear" }
  | { type: "status"; status: ReasoningStatus }
  | { type: "weather"; weather: WeatherResult };

export type ChatStreamHandler = (event: ChatStreamEvent) => void;

function emitStatus(handler: ChatStreamHandler, status: ReasoningStatus) {
  handler({ type: "status", status });
}

function emitText(handler: ChatStreamHandler, text: string) {
  handler({ type: "text", text });
}

function emitWeather(handler: ChatStreamHandler, weather: WeatherResult) {
  handler({ type: "weather", weather });
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildInitialReasoning(userMessage: string): ReasoningStatus {
  const place = guessPlaceFromMessage(userMessage);
  // Climate before layers: packing answers need weather/season context first.
  if (messageNeedsClimateFirst(userMessage)) {
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

function lastUserText(messages: Anthropic.MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter(
          (block): block is Anthropic.TextBlockParam => block.type === "text"
        )
        .map((block) => block.text)
        .join("\n");
    }
  }
  return "";
}

async function runWeatherTool(
  input: unknown,
  fallbackMonths: number[] = []
): Promise<string> {
  const parsed = input as {
    place_name?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    elevation_m?: number;
    months?: number[];
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

  const months =
    parsed.months && parsed.months.length > 0
      ? parsed.months
      : fallbackMonths;

  // Prefer Nepal for Everest when the model omits country.
  const country_code =
    parsed.country_code ||
    (/everest/i.test(parsed.place_name ?? "") ? "NP" : undefined);

  try {
    const data = await fetchWeather({
      place_name: parsed.place_name,
      country_code,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      elevation_m: parsed.elevation_m,
      months,
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
  const inferredMonths = guessMonthsFromMessage(lastUserText(messages));

  const tools: Anthropic.Messages.Tool[] = [
    WEB_SEARCH_TOOL,
    GET_WEATHER_TOOL,
  ];

  let afterToolRound = false;

  while (true) {
    const toolInputs = new Map<number, string>();
    // Drop any "I'll check the weather…" preamble from the UI when tools run.
    let suppressText = false;
    let emittedText = false;

    // Weather/tools first, then layers, then the written answer.
    if (afterToolRound) {
      emitStatus(onEvent, REASONING.packingAnswer());
      afterToolRound = false;
    }

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
          suppressText = true;
          if (emittedText) {
            onEvent({ type: "text_clear" });
            emittedText = false;
          }
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
        if (!suppressText) {
          emitText(onEvent, event.delta.text);
          emittedText = true;
        }
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
        const content = await runWeatherTool(toolUse.input, inferredMonths);
        try {
          const parsed = JSON.parse(content) as WeatherResult & {
            error?: string;
          };
          if (!parsed.error && parsed.current && parsed.location) {
            emitWeather(onEvent, parsed);
          }
        } catch {
          /* ignore malformed tool payload */
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content,
        });
      }
    }

    if (toolResults.length === 0) break;

    // Climate is in; next step is layer matching before the final answer streams.
    emitStatus(onEvent, REASONING.matchingLayers());
    afterToolRound = true;

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
    } else if (event.type === "text_clear") {
      fullResponse = "";
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
