import { useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { StashView } from "./StashView";

const PANEL_CLOSE_MS = 480;

type InventoryPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function InventoryPanel({ open, onClose }: InventoryPanelProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

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
      closeTimerRef.current = null;
    }, PANEL_CLOSE_MS);

    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, rendered]);

  if (!rendered) return null;

  return (
    <div
      className={["inventory-panel", closing ? "inventory-panel--closing" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Stash"
    >
      <button
        type="button"
        className="inventory-panel__backdrop"
        aria-label="Close stash"
        onClick={onClose}
        disabled={closing}
      />
      <div className="inventory-panel__frame">
        <div className="inventory-panel__sheet">
          <header className="inventory-panel__header">
            <h2 className="inventory-panel__title">Stash</h2>

            <button
              type="button"
              className="inventory-panel__close"
              onClick={onClose}
              aria-label="Close"
              disabled={closing}
            >
              <IconX aria-hidden />
            </button>
          </header>

          <div className="inventory-panel__body">
            <StashView />
          </div>
        </div>
      </div>
    </div>
  );
}
