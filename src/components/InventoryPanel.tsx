import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./Icons";
import { GameStyleInventoryView } from "./GameStyleInventoryView";
import { ListInventoryView } from "./ListInventoryView";

const PANEL_CLOSE_MS = 480;

/**
 * Two contexts over the same owned items: Stash to view and edit them, Pack to
 * try them against a trip. Future contexts (saved packs, bag sizes) slot in as
 * additional tabs rather than separate screens.
 */
type PanelTab = "stash" | "pack";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "stash", label: "Stash" },
  { id: "pack", label: "Pack" },
];

type InventoryPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function InventoryPanel({ open, onClose }: InventoryPanelProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<PanelTab>("stash");
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setRendered(true);
      setClosing(false);
      setTab("stash");
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
            <div
              className="inventory-panel__tabs"
              role="tablist"
              aria-label="Stash views"
            >
              {PANEL_TABS.map((entry) => {
                const active = tab === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={
                      active
                        ? "inventory-panel__tab inventory-panel__tab--active"
                        : "inventory-panel__tab"
                    }
                    onClick={() => setTab(entry.id)}
                    disabled={closing}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="inventory-panel__close"
              onClick={onClose}
              aria-label="Close"
              disabled={closing}
            >
              <CloseIcon />
            </button>
          </header>

          <div className="inventory-panel__body" role="tabpanel">
            {tab === "pack" ? <GameStyleInventoryView /> : <ListInventoryView />}
          </div>
        </div>
      </div>
    </div>
  );
}
