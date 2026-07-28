import { useState } from "react";
import type { PackSuggestion } from "../../lib/suggestions";
import { fetchProductImages } from "../api/productImages";
import type { ImageSearchResult } from "../../lib/imageSearch";
import { useSavedProducts } from "../hooks/useSavedProducts";
import { CheckIcon, ChevronDownIcon, PlusIcon, UndoIcon } from "./Icons";

type SuggestionItemsProps = {
  items: PackSuggestion[];
};

type ItemState = {
  loading: boolean;
  error: string | null;
  products: ImageSearchResult[];
};

export function SuggestionItems({ items }: SuggestionItemsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});
  const [ownedIds, setOwnedIds] = useState<Record<string, boolean>>({});
  const [ownedOpen, setOwnedOpen] = useState(false);
  const { add, isSaved } = useSavedProducts();

  if (items.length === 0) return null;

  const activeItems = items.filter((item) => !ownedIds[item.id]);
  const ownedItems = items.filter((item) => ownedIds[item.id]);

  const toggle = (id: string, title: string) => {
    const nextOpen = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: nextOpen }));

    if (nextOpen && !itemState[id]?.products.length && !itemState[id]?.loading) {
      void loadProducts(id, title);
    }
  };

  const markOwned = (id: string) => {
    setOwnedIds((prev) => ({ ...prev, [id]: true }));
    setExpanded((prev) => ({ ...prev, [id]: false }));
    if (ownedItems.length === 0) {
      setOwnedOpen(true);
    }
  };

  const restoreOwned = (id: string) => {
    setOwnedIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const loadProducts = async (id: string, title: string) => {
    setItemState((prev) => ({
      ...prev,
      [id]: { loading: true, error: null, products: prev[id]?.products ?? [] },
    }));

    try {
      const products = await fetchProductImages(title);
      setItemState((prev) => ({
        ...prev,
        [id]: { loading: false, error: null, products },
      }));
    } catch {
      setItemState((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          error: "Could not load images. Try again.",
          products: [],
        },
      }));
    }
  };

  return (
    <div className="pack-suggestions" aria-label="Suggested items">
      <p className="pack-suggestions__label">Suggested items</p>

      {activeItems.length > 0 ? (
        <ul className="pack-suggestions__list">
          {activeItems.map((item) => (
            <SuggestionRow
              key={item.id}
              item={item}
              isOpen={Boolean(expanded[item.id])}
              state={itemState[item.id]}
              onToggle={() => toggle(item.id, item.title)}
              onMarkOwned={() => markOwned(item.id)}
              onRetry={() => loadProducts(item.id, item.title)}
              onSave={(product) =>
                add({
                  name: product.name,
                  imageUrl: product.imageUrl,
                  categoryTitle: item.title,
                  sourceUrl: product.sourceUrl,
                })
              }
              isSaved={isSaved}
            />
          ))}
        </ul>
      ) : (
        <p className="pack-suggestions__all-owned">
          All items marked as owned — open below to review or add any back.
        </p>
      )}

      {ownedItems.length > 0 && (
        <div className="pack-suggestions__owned">
          <button
            type="button"
            className={[
              "pack-suggestions__owned-toggle",
              ownedOpen ? "pack-suggestions__owned-toggle--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setOwnedOpen((open) => !open)}
            aria-expanded={ownedOpen}
          >
            <span>Already have · {ownedItems.length}</span>
            <ChevronDownIcon />
          </button>

          {ownedOpen && (
            <ul className="pack-suggestions__list pack-suggestions__list--owned">
              {ownedItems.map((item) => (
                <li key={item.id} className="pack-suggestions__item pack-suggestions__item--owned">
                  <div className="pack-suggestions__row">
                    <span className="pack-suggestions__title pack-suggestions__title--owned">
                      {item.title}
                    </span>
                    <button
                      type="button"
                      className="pack-suggestions__restore"
                      onClick={() => restoreOwned(item.id)}
                      aria-label={`Move ${item.title} back to suggestions`}
                      title="Add back to list"
                    >
                      <UndoIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type SuggestionRowProps = {
  item: PackSuggestion;
  isOpen: boolean;
  state?: ItemState;
  onToggle: () => void;
  onMarkOwned: () => void;
  onRetry: () => void;
  onSave: (product: ImageSearchResult) => void;
  isSaved: (name: string, imageUrl: string) => boolean;
};

function SuggestionRow({
  item,
  isOpen,
  state,
  onToggle,
  onMarkOwned,
  onRetry,
  onSave,
  isSaved,
}: SuggestionRowProps) {
  const products = state?.products ?? [];

  return (
    <li className="pack-suggestions__item">
      <div className="pack-suggestions__row">
        <span className="pack-suggestions__title">{item.title}</span>
        <button
          type="button"
          className="pack-suggestions__owned-btn"
          onClick={onMarkOwned}
          aria-label={`Mark ${item.title} as already owned`}
          title="Already have this"
        >
          <CheckIcon />
          <span>Owned</span>
        </button>
        <button
          type="button"
          className={[
            "pack-suggestions__expand",
            isOpen ? "pack-suggestions__expand--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Hide" : "Show"} product options for ${item.title}`}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {isOpen && (
        <SuggestionProducts
          loading={Boolean(state?.loading)}
          error={state?.error ?? null}
          products={products}
          onRetry={onRetry}
          onSave={onSave}
          isSaved={isSaved}
        />
      )}
    </li>
  );
}

type SuggestionProductsProps = {
  loading: boolean;
  error: string | null;
  products: ImageSearchResult[];
  onRetry: () => void;
  onSave: (product: ImageSearchResult) => void;
  isSaved: (name: string, imageUrl: string) => boolean;
};

function ProductThumb({
  product,
  saved,
  onSave,
}: {
  product: ImageSearchResult;
  saved: boolean;
  onSave: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="pack-suggestions__product">
      <div className="pack-suggestions__thumb">
        {failed ? (
          <div className="pack-suggestions__placeholder" aria-hidden />
        ) : (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            width={92}
            height={92}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        )}
        <button
          type="button"
          className={[
            "pack-suggestions__save",
            saved ? "pack-suggestions__save--saved" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onSave}
          disabled={saved}
          aria-label={
            saved
              ? `${product.name} already in stash`
              : `Save ${product.name} to stash`
          }
          title={saved ? "Saved" : "Add to stash"}
        >
          <PlusIcon />
        </button>
      </div>
      <figcaption>{product.name}</figcaption>
    </figure>
  );
}

function SuggestionProducts({
  loading,
  error,
  products,
  onRetry,
  onSave,
  isSaved,
}: SuggestionProductsProps) {
  if (loading) {
    return (
      <div className="pack-suggestions__products pack-suggestions__products--loading">
        <span>Searching products…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pack-suggestions__products pack-suggestions__products--error">
        <span>{error}</span>
        <button type="button" className="pack-suggestions__retry" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="pack-suggestions__products pack-suggestions__products--error">
        <span>No images found.</span>
        <button type="button" className="pack-suggestions__retry" onClick={onRetry}>
          Search again
        </button>
      </div>
    );
  }

  return (
    <div className="pack-suggestions__products">
      {products.map((product) => {
        const saved = isSaved(product.name, product.imageUrl);
        return (
          <ProductThumb
            key={product.id}
            product={product}
            saved={saved}
            onSave={() => onSave(product)}
          />
        );
      })}
    </div>
  );
}
