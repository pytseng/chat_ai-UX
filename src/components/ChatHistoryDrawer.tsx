import { useEffect, useRef, useState } from "react";
import { CloseIcon, PlusIcon } from "./Icons";
import { type ChatThread } from "../lib/chatHistoryStorage";
import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  type GenderPreference,
  type SizePreference,
  type StylePreference,
  type UserPreferences,
} from "../lib/userPreferences";

const DRAWER_CLOSE_MS = 500;

type ChatHistoryDrawerProps = {
  open: boolean;
  threads: ChatThread[];
  activeId: string;
  preferences?: UserPreferences | null;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onSavePreferences?: (prefs: UserPreferences) => void;
};

function profileSummary(prefs: UserPreferences | null | undefined): string {
  if (!prefs) return "Set gender, style, and size";
  const gender =
    GENDER_OPTIONS.find((o) => o.id === prefs.gender)?.label ?? prefs.gender;
  const style =
    STYLE_OPTIONS.find((o) => o.id === prefs.style)?.label ?? prefs.style;
  const size =
    SIZE_OPTIONS.find((o) => o.id === prefs.size)?.label ?? prefs.size;
  return `${gender} · ${style} · ${size}`;
}

export function ChatHistoryDrawer({
  open,
  threads,
  activeId,
  preferences = null,
  onClose,
  onNewChat,
  onOpenChat,
  onDeleteChat,
  onSavePreferences,
}: ChatHistoryDrawerProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [gender, setGender] = useState<GenderPreference | null>(
    preferences?.gender ?? null
  );
  const [style, setStyle] = useState<StylePreference | null>(
    preferences?.style ?? null
  );
  const [size, setSize] = useState<SizePreference | null>(
    preferences?.size ?? null
  );
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setGender(preferences?.gender ?? null);
    setStyle(preferences?.style ?? null);
    setSize(preferences?.size ?? null);
  }, [open, preferences]);

  useEffect(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }

    if (!rendered) return;

    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
      setEditingProfile(false);
      closeTimerRef.current = null;
    }, DRAWER_CLOSE_MS);

    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, rendered]);

  if (!rendered) return null;

  const canSaveProfile = Boolean(gender && style && size);

  const saveProfile = () => {
    if (!gender || !style || !size || !onSavePreferences) return;
    onSavePreferences({ gender, style, size });
    setEditingProfile(false);
  };

  return (
    <div
      className={["chat-drawer", closing ? "chat-drawer--closing" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <button
        type="button"
        className="chat-drawer__backdrop"
        aria-label="Close menu"
        onClick={onClose}
        disabled={closing}
      />
      <div className="chat-drawer__frame">
        <aside className="chat-drawer__panel">
          <div className="chat-drawer__header">
            <h2 className="chat-drawer__title">Menu</h2>
            <button
              type="button"
              className="chat-drawer__close"
              onClick={onClose}
              aria-label="Close"
              disabled={closing}
            >
              <CloseIcon />
            </button>
          </div>

          <section className="chat-drawer__section chat-drawer__section--top">
            <button
              type="button"
              className="chat-drawer__new"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              disabled={closing}
            >
              <PlusIcon />
              New chat
            </button>
          </section>

          <section
            className="chat-drawer__section chat-drawer__section--history"
            aria-labelledby="drawer-history-heading"
          >
            <div className="chat-drawer__section-head">
              <h3 id="drawer-history-heading" className="chat-drawer__section-title">
                Recents
              </h3>
            </div>

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
                          disabled={closing}
                        >
                          <span className="chat-drawer__item-title">
                            {thread.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="chat-drawer__item-delete"
                          onClick={() => onDeleteChat(thread.id)}
                          aria-label={`Delete chat ${thread.title}`}
                          disabled={closing}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className="chat-drawer__section chat-drawer__section--footer"
            aria-label="Profile and settings"
          >
            {editingProfile && (
              <div className="chat-drawer__footer-panel">
                <div className="chat-drawer__pref-edit">
                  <fieldset className="chat-drawer__pref-field">
                    <legend>Gender</legend>
                    <div className="chat-drawer__pref-chips">
                      {GENDER_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={[
                            "chat-drawer__pref-chip",
                            gender === option.id
                              ? "chat-drawer__pref-chip--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-pressed={gender === option.id}
                          onClick={() => setGender(option.id)}
                          disabled={closing}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="chat-drawer__pref-field">
                    <legend>Style</legend>
                    <div className="chat-drawer__pref-chips">
                      {STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={[
                            "chat-drawer__pref-chip",
                            style === option.id
                              ? "chat-drawer__pref-chip--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-pressed={style === option.id}
                          onClick={() => setStyle(option.id)}
                          disabled={closing}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="chat-drawer__pref-field">
                    <legend>Size</legend>
                    <div className="chat-drawer__pref-chips">
                      {SIZE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={[
                            "chat-drawer__pref-chip",
                            size === option.id
                              ? "chat-drawer__pref-chip--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-pressed={size === option.id}
                          onClick={() => setSize(option.id)}
                          disabled={closing}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <button
                    type="button"
                    className="chat-drawer__pref-save"
                    onClick={saveProfile}
                    disabled={closing || !canSaveProfile || !onSavePreferences}
                  >
                    Save profile
                  </button>
                </div>
              </div>
            )}

            <div className="chat-drawer__footer-row">
              <button
                type="button"
                className="chat-drawer__profile"
                onClick={() => setEditingProfile((openEdit) => !openEdit)}
                disabled={closing}
                aria-expanded={editingProfile}
              >
                <span className="chat-drawer__account-avatar" aria-hidden>
                  <img
                    className="chat-drawer__account-avatar-img"
                    src="/mock-avatar.svg"
                    alt=""
                    width={32}
                    height={32}
                  />
                </span>
                <span className="chat-drawer__account-copy">
                  <span className="chat-drawer__account-label">Profile</span>
                  <span className="chat-drawer__account-meta">
                    {profileSummary(preferences)}
                  </span>
                </span>
              </button>

            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
