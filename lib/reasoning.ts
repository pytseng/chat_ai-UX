export type ReasoningSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type ReasoningStatus = {
  id: string;
  segments: ReasoningSegment[];
};

export function rs(
  text: string,
  opts?: { bold?: boolean; italic?: boolean }
): ReasoningSegment {
  return { text, bold: opts?.bold, italic: opts?.italic };
}

export function status(id: string, segments: ReasoningSegment[]): ReasoningStatus {
  return { id, segments };
}

const PILL_LABELS: Record<string, string> = {
  "reading-trip": "Reading question",
  "matching-layers": "Matching layers",
  "checking-weather": "Checking weather",
  "scouting-web": "Searching web",
  "packing-answer": "Packing answer",
  clarifying: "Clarifying details",
};

export function reasoningPillLabel(status: ReasoningStatus): string {
  return (
    PILL_LABELS[status.id] ??
    status.segments
      .map((s) => s.text)
      .join("")
      .replace(/…$/, "")
      .trim()
  );
}

export const REASONING = {
  readingTrip: () =>
    status("reading-trip", [
      rs("Reading your "),
      rs("trip", { bold: true, italic: true }),
      rs(" question…"),
    ]),

  matchingLayers: () =>
    status("matching-layers", [
      rs("Matching "),
      rs("layers", { bold: true }),
      rs(" to your "),
      rs("route", { italic: true }),
      rs("…"),
    ]),

  checkingWeather: (place?: string) =>
    status("checking-weather", [
      rs("Checking live "),
      rs("weather", { bold: true }),
      rs(" for "),
      rs(place?.trim() || "your destination", { italic: true }),
      rs("…"),
    ]),

  scoutingWeb: () =>
    status("scouting-web", [
      rs("Scouting "),
      rs("trail", { bold: true }),
      rs(" notes across the "),
      rs("web", { italic: true }),
      rs("…"),
    ]),

  packingAnswer: () =>
    status("packing-answer", [
      rs("Packing your "),
      rs("gear list", { bold: true, italic: true }),
      rs("…"),
    ]),

  clarifying: () =>
    status("clarifying", [
      rs("Need a few "),
      rs("trip", { bold: true }),
      rs(" details first…"),
    ]),
} as const;

export function guessPlaceFromMessage(message: string): string | undefined {
  const patterns = [
    /\b(?:for|in|to)\s+([A-Z][a-zA-Z\s'-]{2,40})/,
    /\b([A-Z][a-zA-Z\s'-]{2,30})\s+(?:in|during|this)\s+/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const place = match?.[1]?.trim();
    if (place && place.length > 2) {
      return place.replace(/\s+(spring|summer|fall|autumn|winter|hiking|trip)$/i, "").trim();
    }
  }

  return undefined;
}

export function messageHintsWeather(message: string): boolean {
  return /\b(weather|rain|snow|cold|hot|humid|forecast|temperature|wind)\b/i.test(
    message
  );
}

/** Packing / adventure asks that should check climate before choosing layers. */
export function messageNeedsClimateFirst(message: string): boolean {
  if (messageHintsWeather(message)) return true;
  if (guessPlaceFromMessage(message)) return true;
  return /\b(pack|trek|hike|climb|ski|surf|dive|raft|camp|trip|trail|summit|foil|kayak|paraglide|canyoneer|mountaineering|moto|via ferrata)\b/i.test(
    message
  );
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const SEASON_TO_MONTHS: Record<string, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

/** Pull travel months mentioned in a user message (e.g. "October and February"). */
export function guessMonthsFromMessage(message: string): number[] {
  const found = new Set<number>();
  const lower = message.toLowerCase();

  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(lower)) found.add(num);
  }

  for (const [season, months] of Object.entries(SEASON_TO_MONTHS)) {
    const re = new RegExp(`\\b${season}\\b`, "i");
    if (re.test(lower)) months.forEach((m) => found.add(m));
  }

  return [...found].slice(0, 4);
}

export function messageHintsWeb(message: string): boolean {
  return /\b(news|event|store|release|brand|shop|buy|hours|latest)\b/i.test(message);
}
