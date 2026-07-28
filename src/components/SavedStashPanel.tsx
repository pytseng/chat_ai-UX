import { CloseIcon } from "./Icons";
import type { SavedProduct } from "../lib/savedProductsStorage";

type SavedStashPanelProps = {
  open: boolean;
  items: SavedProduct[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function SavedStashPanel({
  open,
  items,
  onClose,
  onRemove,
}: SavedStashPanelProps) {
  if (!open) return null;

  return (
    <div className="stash-panel" role="dialog" aria-modal="true" aria-label="Saved stash">
      <button
        type="button"
        className="stash-panel__backdrop"
        aria-label="Close saved stash"
        onClick={onClose}
      />
      <div className="stash-panel__sheet">
        <div className="stash-panel__header">
          <h2 className="stash-panel__title">Your stash</h2>
          <button
            type="button"
            className="stash-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="stash-panel__empty">
            Tap <strong>+</strong> on any product suggestion to save it here.
          </p>
        ) : (
          <ul className="stash-panel__list">
            {items.map((item) => (
              <li key={item.id} className="stash-panel__item">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  width={56}
                  height={56}
                  referrerPolicy="no-referrer"
                />
                <div className="stash-panel__meta">
                  <p className="stash-panel__name">{item.name}</p>
                  <p className="stash-panel__category">{item.categoryTitle}</p>
                </div>
                <button
                  type="button"
                  className="stash-panel__remove"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
