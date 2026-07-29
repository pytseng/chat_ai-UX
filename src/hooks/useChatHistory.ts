import { useCallback, useEffect, useState } from "react";
import type { Message } from "../api/chat";
import {
  loadActiveChatId,
  loadChatThreads,
  persistActiveChatId,
  persistChatThreads,
  titleFromMessages,
  type ChatThread,
} from "../lib/chatHistoryStorage";

function createId() {
  return crypto.randomUUID();
}

function saveThread(chatId: string, messages: Message[], prev: ChatThread[]) {
  if (messages.length === 0) {
    const next = prev.filter((t) => t.id !== chatId);
    persistChatThreads(next);
    return next;
  }

  const thread: ChatThread = {
    id: chatId,
    title: titleFromMessages(messages),
    messages,
    updatedAt: new Date().toISOString(),
  };

  const next = [thread, ...prev.filter((t) => t.id !== chatId)].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  persistChatThreads(next);
  return next;
}

export function useChatHistory() {
  const [threads, setThreads] = useState<ChatThread[]>(() => loadChatThreads());
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = loadActiveChatId();
    const existing = loadChatThreads();
    if (saved && existing.some((t) => t.id === saved)) return saved;
    return createId();
  });
  const [messages, setMessagesState] = useState<Message[]>(() => {
    const saved = loadActiveChatId();
    const existing = loadChatThreads();
    const match = existing.find((t) => t.id === saved);
    return match?.messages ?? [];
  });

  useEffect(() => {
    persistActiveChatId(activeId);
  }, [activeId]);

  const setMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setMessagesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setThreads((threadsPrev) => saveThread(activeId, next, threadsPrev));
        return next;
      });
    },
    [activeId]
  );

  const startNewChat = useCallback(() => {
    setMessagesState((current) => {
      if (current.length > 0) {
        setThreads((prev) => saveThread(activeId, current, prev));
      }
      return [];
    });
    setActiveId(createId());
  }, [activeId]);

  const openChat = useCallback(
    (id: string) => {
      if (id === activeId) return;

      setMessagesState((current) => {
        if (current.length > 0) {
          setThreads((prev) => saveThread(activeId, current, prev));
        }
        const thread = threads.find((t) => t.id === id);
        return thread?.messages ?? [];
      });
      setActiveId(id);
    },
    [activeId, threads]
  );

  const deleteChat = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persistChatThreads(next);
        return next;
      });
      if (id === activeId) {
        setActiveId(createId());
        setMessagesState([]);
      }
    },
    [activeId]
  );

  return {
    threads,
    activeId,
    messages,
    setMessages,
    startNewChat,
    openChat,
    deleteChat,
  };
}
