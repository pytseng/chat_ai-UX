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
  return /\b(weather|rain|snow|cold|hot|humid|forecast|temperature|wind|layer)\b/i.test(
    message
  );
}

export function messageHintsWeb(message: string): boolean {
  return /\b(news|event|store|release|brand|shop|buy|hours|latest)\b/i.test(message);
}
