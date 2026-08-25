import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronLeftIcon, CloseIcon } from "./Icons";
import { AddressForm, CheckoutView } from "./Checkout";
import type { SavedProduct } from "../lib/savedProductsStorage";
import {
  EMPTY_CARD,
  formatUsd,
  mockOrderId,
  payMethodLabel,
  type CardFields,
  type PayMethod,
} from "../lib/mockCheckout";
import {
  loadShippingAddress,
  persistShippingAddress,
  type ShippingAddress,
} from "../lib/shippingAddress";

const PANEL_CLOSE_MS = 280;
const PAY_DELAY_MS = 1400;

type CartStep = "cart" | "pay" | "address" | "success";

const STEP_TITLES: Record<CartStep, string> = {
  cart: "Cart",
  pay: "Checkout",
  address: "Shipping address",
  success: "Paid",
};

type SavedStashPanelProps = {
  open: boolean;
  items: SavedProduct[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function SavedStashPanel({
  open,
  items,
  onClose,
  onRemove,
  onClear,
}: SavedStashPanelProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState<CartStep>("cart");
  const [card, setCard] = useState<CardFields>(EMPTY_CARD);
  const [address, setAddress] = useState<ShippingAddress>(() =>
    loadShippingAddress()
  );
  const [payingMethod, setPayingMethod] = useState<PayMethod | null>(null);
  const [paidMethod, setPaidMethod] = useState<PayMethod>("card");
  const [orderId, setOrderId] = useState("");
  const [paidTotal, setPaidTotal] = useState(0);
  const closeTimerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);
  const payTimerRef = useRef<number | null>(null);

  const paying = payingMethod !== null;

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (typeof item.price === "number" ? item.price : 0),
        0
      ),
    [items]
  );

  useEffect(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setRendered(true);
      setClosing(false);
      setStep("cart");
      setPayingMethod(null);
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

  useEffect(() => {
    return () => {
      if (removeTimerRef.current != null) {
        window.clearTimeout(removeTimerRef.current);
      }
      if (payTimerRef.current != null) {
        window.clearTimeout(payTimerRef.current);
      }
    };
  }, []);

  const handleRemove = (id: string) => {
    if (closing || paying) return;

    if (items.length === 1) {
      onClose();
      removeTimerRef.current = window.setTimeout(() => {
        onRemove(id);
        removeTimerRef.current = null;
      }, PANEL_CLOSE_MS);
      return;
    }

    onRemove(id);
  };

  const handlePay = (method: PayMethod) => {
    if (paying || items.length === 0) return;
    setPayingMethod(method);
    payTimerRef.current = window.setTimeout(() => {
      setPaidTotal(total);
      setPaidMethod(method);
      setOrderId(mockOrderId());
      setPayingMethod(null);
      setStep("success");
      setCard(EMPTY_CARD);
      onClear();
      payTimerRef.current = null;
    }, PAY_DELAY_MS);
  };

  const handleAddressSave = () => {
    persistShippingAddress(address);
    setStep("pay");
  };

  if (!rendered) return null;

  const title = STEP_TITLES[step];
  const backStep: CartStep | null =
    step === "pay" ? "cart" : step === "address" ? "pay" : null;

  return (
    <div
      className={["stash-panel", closing ? "stash-panel--closing" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="stash-panel__backdrop"
        aria-label="Close cart"
        onClick={onClose}
        disabled={closing || paying}
      />
      <div className="stash-panel__sheet">
        <div className="stash-panel__header">
          {backStep ? (
            <button
              type="button"
              className="stash-panel__back"
              onClick={() => setStep(backStep)}
              aria-label={`Back to ${STEP_TITLES[backStep].toLowerCase()}`}
              disabled={paying}
            >
              <ChevronLeftIcon />
            </button>
          ) : null}
          <h2 className="stash-panel__title">
            {title}
            {step !== "cart" ? (
              <span className="stash-panel__demo">Demo only</span>
            ) : null}
          </h2>
          <button
            type="button"
            className="stash-panel__close"
            onClick={onClose}
            aria-label="Close"
            disabled={closing || paying}
          >
            <CloseIcon />
          </button>
        </div>

        {step === "cart" ? (
          items.length === 0 ? (
            <p className="stash-panel__empty">
              Tap <strong>+</strong> on any product suggestion to save it here.
            </p>
          ) : (
            <>
              <ul className="stash-panel__list" aria-label="Saved items">
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
                      <p className="stash-panel__category">
                        {item.categoryTitle}
                      </p>
                    </div>
                    <p className="stash-panel__price">
                      {typeof item.price === "number"
                        ? formatUsd(item.price)
                        : "—"}
                    </p>
                    <button
                      type="button"
                      className="stash-panel__remove"
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      disabled={closing}
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="stash-checkout">
                <div className="stash-checkout__row">
                  <span>Subtotal</span>
                  <strong>{formatUsd(total)}</strong>
                </div>
                <button
                  type="button"
                  className="stash-checkout__cta"
                  onClick={() => setStep("pay")}
                >
                  Checkout
                </button>
              </div>
            </>
          )
        ) : null}

        {step === "pay" ? (
          <CheckoutView
            total={total}
            address={address}
            card={card}
            paying={paying}
            payingMethod={payingMethod}
            onCardChange={setCard}
            onEditAddress={() => setStep("address")}
            onPay={handlePay}
          />
        ) : null}

        {step === "address" ? (
          <AddressForm
            address={address}
            onChange={setAddress}
            onDone={handleAddressSave}
          />
        ) : null}

        {step === "success" ? (
          <div className="stash-success">
            <div className="stash-success__mark" aria-hidden>
              <CheckIcon />
            </div>
            <p className="stash-success__title">Payment received</p>
            <p className="stash-success__copy">
              {formatUsd(paidTotal)} via {payMethodLabel(paidMethod)}
            </p>
            <p className="stash-success__order">
              Order {orderId} · ships to {address.city}
            </p>
            <button
              type="button"
              className="stash-checkout__cta"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
