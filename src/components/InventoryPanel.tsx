import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, CloseIcon } from "./Icons";
import { GameStyleInventoryView } from "./GameStyleInventoryView";
import { ListInventoryView } from "./ListInventoryView";

const PANEL_CLOSE_MS = 480;

type PanelOption = "list-inventory" | "game-inventory" | "option3";

const PANEL_OPTIONS: { id: PanelOption; label: string }[] = [
  { id: "list-inventory", label: "List inventory" },
  { id: "game-inventory", label: "Game style inventory" },
  { id: "option3", label: "Option 3" },
];

type InventoryPanelProps = {
  open: boolean;
  onClose: () => void;
};

function PanelContent({ option }: { option: PanelOption }) {
  if (option === "list-inventory") {
    return <ListInventoryView />;
  }

  if (option === "game-inventory") {
    return <GameStyleInventoryView />;
  }

  return (
    <div className="inventory-panel__view">
      <p className="inventory-panel__view-label">Option 3</p>
      <p className="inventory-panel__view-copy">
        Placeholder for inventory concept C.
      </p>
    </div>
  );
}

export function InventoryPanel({ open, onClose }: InventoryPanelProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [option, setOption] = useState<PanelOption>("list-inventory");
  const closeTimerRef = useRef<number | null>(null);
  const selectId = useId();

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
      aria-label="Inventory"
    >
      <button
        type="button"
        className="inventory-panel__backdrop"
        aria-label="Close inventory"
        onClick={onClose}
        disabled={closing}
      />
      <div className="inventory-panel__frame">
        <div className="inventory-panel__sheet">
          <header className="inventory-panel__header">
            <div className="inventory-panel__select-wrap">
              <label className="inventory-panel__select-label" htmlFor={selectId}>
                View
              </label>
              <div className="inventory-panel__select-field">
                <select
                  id={selectId}
                  className="inventory-panel__select"
                  value={option}
                  onChange={(event) =>
                    setOption(event.target.value as PanelOption)
                  }
                  disabled={closing}
                >
                  {PANEL_OPTIONS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="inventory-panel__select-chevron" />
              </div>
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

          <div className="inventory-panel__body">
            <PanelContent option={option} />
          </div>
        </div>
      </div>
    </div>
  );
}
