import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";
import {
  EXPRESS_METHODS,
  cardBrand,
  formatCardNumber,
  formatCvc,
  formatExpiry,
  formatUsd,
  isCardComplete,
  payMethodLabel,
  type CardFields,
  type PayMethod,
} from "../lib/mockCheckout";
import {
  formatAddressLine,
  isAddressComplete,
  type ShippingAddress,
} from "../lib/shippingAddress";

type CheckoutViewProps = {
  total: number;
  address: ShippingAddress;
  card: CardFields;
  paying: boolean;
  payingMethod: PayMethod | null;
  onCardChange: (card: CardFields) => void;
  onEditAddress: () => void;
  onPay: (method: PayMethod) => void;
};

export function CheckoutView({
  total,
  address,
  card,
  paying,
  payingMethod,
  onCardChange,
  onEditAddress,
  onPay,
}: CheckoutViewProps) {
  const [cardOpen, setCardOpen] = useState(false);
  const cardReady = isCardComplete(card);
  const addressReady = isAddressComplete(address);
  const brand = cardBrand(card.number);

  return (
    <div className="checkout">
      <button
        type="button"
        className="checkout__address"
        onClick={onEditAddress}
        disabled={paying}
      >
        <span className="checkout__address-text">
          <span className="checkout__address-label">Ship to</span>
          <span className="checkout__address-name">{address.name}</span>
          <span className="checkout__address-line">
            {formatAddressLine(address)}
          </span>
        </span>
        <ChevronRightIcon />
      </button>

      {!addressReady ? (
        <p className="checkout__warning">Add a shipping address to continue.</p>
      ) : null}

      <div className="checkout__express">
        {EXPRESS_METHODS.map((method) => (
          <ExpressButton
            key={method}
            method={method}
            busy={paying && payingMethod === method}
            disabled={paying || !addressReady}
            onClick={() => onPay(method)}
          />
        ))}
      </div>

      <div className="checkout__divider">
        <span>Or pay with card</span>
      </div>

      <button
        type="button"
        className={[
          "checkout__card-toggle",
          cardOpen ? "checkout__card-toggle--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setCardOpen((open) => !open)}
        aria-expanded={cardOpen}
        disabled={paying}
      >
        <span className="checkout__card-toggle-text">
          Card details
          {brand && !cardOpen ? (
            <span className="checkout__card-brand">{brand}</span>
          ) : null}
        </span>
        <ChevronDownIcon />
      </button>

      {cardOpen ? (
        <div className="checkout__card-form">
          <label className="checkout__field">
            <span className="checkout__field-label">Card number</span>
            <span className="checkout__input-wrap">
              <input
                className="checkout__input"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                value={card.number}
                onChange={(event) =>
                  onCardChange({
                    ...card,
                    number: formatCardNumber(event.target.value),
                  })
                }
                disabled={paying}
              />
              {brand ? (
                <span className="checkout__card-brand">{brand}</span>
              ) : null}
            </span>
          </label>

          <div className="checkout__field-row">
            <label className="checkout__field">
              <span className="checkout__field-label">Expiry</span>
              <input
                className="checkout__input"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={card.expiry}
                onChange={(event) =>
                  onCardChange({
                    ...card,
                    expiry: formatExpiry(event.target.value),
                  })
                }
                disabled={paying}
              />
            </label>
            <label className="checkout__field">
              <span className="checkout__field-label">CVC</span>
              <input
                className="checkout__input"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={card.cvc}
                onChange={(event) =>
                  onCardChange({
                    ...card,
                    cvc: formatCvc(event.target.value),
                  })
                }
                disabled={paying}
              />
            </label>
          </div>

          <label className="checkout__field">
            <span className="checkout__field-label">Name on card</span>
            <input
              className="checkout__input"
              autoComplete="cc-name"
              placeholder="Alex Rivera"
              value={card.name}
              onChange={(event) =>
                onCardChange({ ...card, name: event.target.value })
              }
              disabled={paying}
            />
          </label>

          <button
            type="button"
            className="checkout__pay"
            onClick={() => onPay("card")}
            disabled={paying || !cardReady || !addressReady}
          >
            {paying && payingMethod === "card"
              ? "Processing…"
              : `Pay ${formatUsd(total)}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type AddressFormProps = {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  onDone: () => void;
};

export function AddressForm({ address, onChange, onDone }: AddressFormProps) {
  const set = (patch: Partial<ShippingAddress>) =>
    onChange({ ...address, ...patch });

  return (
    <div className="checkout">
      <label className="checkout__field">
        <span className="checkout__field-label">Full name</span>
        <input
          className="checkout__input"
          autoComplete="name"
          value={address.name}
          onChange={(event) => set({ name: event.target.value })}
        />
      </label>

      <label className="checkout__field">
        <span className="checkout__field-label">Address</span>
        <input
          className="checkout__input"
          autoComplete="address-line1"
          value={address.line1}
          onChange={(event) => set({ line1: event.target.value })}
        />
      </label>

      <label className="checkout__field">
        <span className="checkout__field-label">
          Apt, suite <span className="checkout__optional">optional</span>
        </span>
        <input
          className="checkout__input"
          autoComplete="address-line2"
          value={address.line2}
          onChange={(event) => set({ line2: event.target.value })}
        />
      </label>

      <div className="checkout__field-row">
        <label className="checkout__field checkout__field--grow">
          <span className="checkout__field-label">City</span>
          <input
            className="checkout__input"
            autoComplete="address-level2"
            value={address.city}
            onChange={(event) => set({ city: event.target.value })}
          />
        </label>
        <label className="checkout__field checkout__field--narrow">
          <span className="checkout__field-label">State</span>
          <input
            className="checkout__input"
            autoComplete="address-level1"
            value={address.state}
            onChange={(event) => set({ state: event.target.value })}
          />
        </label>
      </div>

      <div className="checkout__field-row">
        <label className="checkout__field checkout__field--narrow">
          <span className="checkout__field-label">ZIP</span>
          <input
            className="checkout__input"
            inputMode="numeric"
            autoComplete="postal-code"
            value={address.postal}
            onChange={(event) => set({ postal: event.target.value })}
          />
        </label>
        <label className="checkout__field checkout__field--grow">
          <span className="checkout__field-label">Country</span>
          <input
            className="checkout__input"
            autoComplete="country-name"
            value={address.country}
            onChange={(event) => set({ country: event.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="checkout__pay"
        onClick={onDone}
        disabled={!isAddressComplete(address)}
      >
        Save address
      </button>
    </div>
  );
}

function ExpressButton({
  method,
  busy,
  disabled,
  onClick,
}: {
  method: PayMethod;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`express-btn express-btn--${method}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Pay with ${payMethodLabel(method)}`}
    >
      {busy ? (
        <span className="express-btn__busy">Processing…</span>
      ) : (
        <ExpressMark method={method} />
      )}
    </button>
  );
}

function ExpressMark({ method }: { method: PayMethod }) {
  if (method === "apple") {
    return (
      <span className="express-btn__mark" aria-hidden>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.377-2.376-1.844-.13-3.39 1.078-4.234 1.078zm3.129-3.325c.13-1.117-.717-2.312-1.869-2.571-.35 1.194.404 2.415 1.869 2.571z" />
        </svg>
        Pay
      </span>
    );
  }

  if (method === "google") {
    return (
      <span className="express-btn__mark" aria-hidden>
        <svg viewBox="0 0 24 24" width="15" height="15">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        Pay
      </span>
    );
  }

  if (method === "coinbase") {
    return (
      <span className="express-btn__mark" aria-hidden>
        <svg viewBox="0 0 24 24" width="15" height="15">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <rect x="8.6" y="8.6" width="6.8" height="6.8" rx="1.3" fill="#0052ff" />
        </svg>
        Coinbase
      </span>
    );
  }

  return (
    <span className="express-btn__mark" aria-hidden>
      <svg viewBox="0 0 24 24" width="16" height="16">
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
        <path
          d="M8 8.5v7M12 7.5v9M16 8.5v7"
          stroke="#00d66f"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      Link
    </span>
  );
}
