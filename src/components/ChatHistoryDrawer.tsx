import { CloseIcon, PlusIcon } from "./Icons";
import {
  formatChatTime,
  type ChatThread,
} from "../lib/chatHistoryStorage";

type ChatHistoryDrawerProps = {
  open: boolean;
  threads: ChatThread[];
  activeId: string;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
};

export function ChatHistoryDrawer({
  open,
  threads,
  activeId,
  onClose,
  onNewChat,
  onOpenChat,
  onDeleteChat,
}: ChatHistoryDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="chat-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Chat history"
    >
      <button
        type="button"
        className="chat-drawer__backdrop"
        aria-label="Close chat history"
        onClick={onClose}
      />
      <div className="chat-drawer__frame">
        <aside className="chat-drawer__panel">
          <div className="chat-drawer__header">
            <h2 className="chat-drawer__title">Chats</h2>
            <button
              type="button"
              className="chat-drawer__close"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          <button
            type="button"
            className="chat-drawer__new"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          >
            <PlusIcon />
            New chat
          </button>

          {threads.length === 0 ? (
            <p className="chat-drawer__empty">
              Past chats will show up here once you start a conversation.
            </p>
          ) : (
            <ul className="chat-drawer__list">
              {threads.map((thread) => {
                const active = thread.id === activeId;
                return (
                  <li key={thread.id}>
                    <div
                      className={[
                        "chat-drawer__item",
                        active ? "chat-drawer__item--active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className="chat-drawer__item-main"
                        onClick={() => {
                          onOpenChat(thread.id);
                          onClose();
                        }}
                      >
                        <span className="chat-drawer__item-title">
                          {thread.title}
                        </span>
                        <span className="chat-drawer__item-time">
                          {formatChatTime(thread.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="chat-drawer__item-delete"
                        onClick={() => onDeleteChat(thread.id)}
                        aria-label={`Delete chat ${thread.title}`}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
