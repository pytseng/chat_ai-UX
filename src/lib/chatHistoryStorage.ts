import type { Message } from "../api/chat";

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

const STORAGE_KEY = "secretstash-chat-history";
const ACTIVE_KEY = "secretstash-active-chat-id";

export function loadChatThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatThread[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          Array.isArray(t.messages)
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

export function persistChatThreads(threads: ChatThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function loadActiveChatId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function persistActiveChatId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function titleFromMessages(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "New chat";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
