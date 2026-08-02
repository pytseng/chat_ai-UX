export type IntentResult =
  | { intent: "in_scope" }
  | { intent: "out_of_scope"; reason: string }
  | { intent: "unclear" };

export const REFUSAL_MESSAGE = `I'm SecretStash — I help with travel packing, clothing, and gear suggestions.

Try asking something like:
• "What should I pack for a week in Tokyo in April?"
• "Layers for hiking Patagonia in November"
• "Street style vs functional gear for Paris"`;

export const CLARIFY_MESSAGE = `I'd love to help you pack! Where are you traveling, and what kind of trip is it (city, hiking, beach, business, etc.)?`;

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(write|debug|fix|explain|create)\s+(me\s+)?(a\s+)?(python|javascript|typescript|java|c\+\+|rust|go|sql|code|script|program|function|algorithm|regex)\b/i,
  /\b(homework|essay|thesis|dissertation|assignment)\b/i,
  /\b(recipe|cook(ing)?|bake(ry)?|ingredient)\b/i,
  /\b(medical|diagnose|symptom|prescription|doctor|disease|medication)\b/i,
  /\b(legal advice|lawsuit|attorney|contract review)\b/i,
  /\b(stock price|cryptocurrency|crypto|bitcoin|invest(ment)?|portfolio)\b/i,
  /\b(who (is|was|are|were)|when did|history of|capital of)\b/i,
  /\b(translate (this|the)|poem|short story|novel)\b/i,
  /\b(politic(s|al)|election|president|vote for)\b/i,
];

const IN_SCOPE_PATTERNS: RegExp[] = [
  /\b(pack(ing)?|outfit|wear(ing)?|layer(s|ing)?|gear|luggage|suitcase|backpack)\b/i,
  /\b(bring|take|carry|what should i (pack|wear|bring))\b/i,
  /\b(trip|travel(ing|er)?|destination|vacation|holiday|weekend (away|trip)?)\b/i,
  /\b(hik(e|ing)|camp(ing)?|trek(king)?|climb(ing)?|trail|mountain|summit)\b/i,
  /\b(weather|forecast|rain(y)?|snow|cold|hot|humid|temperature|wind)\b/i,
  /\b(style|fashion|streetwear|functional|clothing|clothes|apparel)\b/i,
  /\b(jacket|coat|boot(s)?|shoe(s)?|sneaker(s)?|pant(s)?|dress|shirt|sweater|fleece|shell)\b/i,
  /\b(carry[- ]on|checked bag|one bag|minimal(ist)? pack)\b/i,
  /\b(beach|city break|business trip|airport outfit)\b/i,
  // Adventure / extreme sports prompts (starter pills often omit "pack")
  /\b(wing\s*foil|kite\s*surf|surf(ing|er)?|ski(ing|er)?|snowboard(ing)?|heli-?ski)\b/i,
  /\b(scuba|dive|diving|kayak(ing)?|raft(ing)?|paraglide|paragliding|free\s*climb)\b/i,
  /\b(canyoneer(ing)?|mountaineering|via ferrata|ice\s*climb|trail\s*run|utmb)\b/i,
  /\b(moto|motorcycle|zip-?\s*line|ice\s*cave|base\s*jump|wingsuit|volcano\s*trek)\b/i,
  /\b(cave\s*dive|ice\s*dive|backcountry|whitewater|big-?wave)\b/i,
];

/** Place + time cues that imply a packing question when paired with activity. */
const PLACE_HINT =
  /\b(maui|patagonia|kilimanjaro|iceland|banff|yosemite|chamonix|nepal|alaska|antarctica|zion|andes|interlaken|sahara|everest|torres del paine|portugal|vietnam|costa rica|grand canyon|barrier reef|tarifa|japan|mexico|bali|alps)\b/i;

const TIME_HINT =
  /\b(right now|today|this weekend|next month|next (winter|spring|summer|fall|autumn|march|april)|this (winter|spring|summer|fall|autumn)|in \d+\s*(days?|weeks?)|in (jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)|dry season)\b/i;

const GREETING_PATTERN = /^(hi|hello|hey|yo|help|thanks|thank you)[!.?\s]*$/i;

function matchesOutOfScope(text: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text));
}

function matchesInScope(text: string): boolean {
  if (IN_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) return true;
  // Starter-style prompts: "Wing foil Maui this weekend?"
  if (PLACE_HINT.test(text) && TIME_HINT.test(text)) return true;
  return false;
}

export function classifyIntent(
  message: string,
  priorMessages: { role: "user" | "assistant"; content: string }[] = []
): IntentResult {
  const text = message.trim();
  if (!text) return { intent: "unclear" };

  if (matchesOutOfScope(text)) {
    return { intent: "out_of_scope", reason: "off_topic" };
  }

  const priorUserMessages = priorMessages.filter((m) => m.role === "user");
  const inActivePackingThread =
    priorUserMessages.length > 0 &&
    priorUserMessages.some((m) => matchesInScope(m.content));

  if (inActivePackingThread && text.length <= 140 && !matchesOutOfScope(text)) {
    return { intent: "in_scope" };
  }

  if (matchesInScope(text)) {
    return { intent: "in_scope" };
  }

  if (GREETING_PATTERN.test(text)) {
    return { intent: "unclear" };
  }

  if (priorUserMessages.length === 0) {
    return { intent: "unclear" };
  }

  return { intent: "in_scope" };
}

const OFF_TOPIC_RESPONSE_MARKERS = [
  /\bpython\b/i,
  /\bjavascript\b/i,
  /\bhomework\b/i,
  /\brecipe\b/i,
  /\bmedical diagnosis\b/i,
];

export function isResponseOnTopic(response: string): boolean {
  if (!response.trim()) return true;
  return !OFF_TOPIC_RESPONSE_MARKERS.some((pattern) => pattern.test(response));
}
