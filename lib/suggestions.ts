export type PackSuggestion = {
  id: string;
  title: string;
};

function cleanItem(raw: string): string {
  return raw.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)/;

export function splitAssistantContent(content: string): {
  prose: string;
  itemTitles: string[];
} {
  const lines = content.split("\n");
  const itemTitles: string[] = [];
  const proseLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const match = line.match(BULLET_RE);
    if (match) {
      inList = true;
      const title = cleanItem(match[1]);
      if (title) itemTitles.push(title);
    } else if (!inList) {
      proseLines.push(line);
    }
  }

  return {
    prose: proseLines.join("\n").trim(),
    itemTitles,
  };
}

export function buildPackSuggestions(itemTitles: string[]): PackSuggestion[] {
  return itemTitles.map((title, index) => ({
    id: `item-${index}-${slugify(title)}`,
    title,
  }));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);
}

export function getSuggestionsFromContent(content: string): {
  prose: string;
  suggestions: PackSuggestion[];
} {
  const { prose, itemTitles } = splitAssistantContent(content);
  return {
    prose,
    suggestions: buildPackSuggestions(itemTitles),
  };
}
