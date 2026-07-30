import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Backpack, ChevronDown, Shirt } from "lucide-react";
import type {
  PackSuggestion,
  SuggestionCategory,
  SuggestionCategoryId,
} from "../../lib/suggestions";
import { groupSuggestionsByCategory } from "../../lib/suggestions";
import { fetchProductImages } from "../api/productImages";
import type { ImageSearchResult } from "../../lib/imageSearch";
import { useSavedProducts } from "../hooks/useSavedProducts";
import {
  formatPreferencesForSearch,
  type UserPreferences,
} from "../lib/userPreferences";
import {
  CheckIcon,
  ChevronDownIcon,
  GlovesIcon,
  PantsIcon,
  PlusIcon,
  UndoIcon,
} from "./Icons";

type SuggestionItemsProps = {
  items: PackSuggestion[];
  preferences?: UserPreferences | null;
};

type ItemState = {
  loading: boolean;
  error: string | null;
  products: ImageSearchResult[];
};

type CategoryIcon = ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<SuggestionCategoryId, CategoryIcon> = {
  top: ({ className }) => <Shirt className={className} strokeWidth={1.75} aria-hidden />,
  bottom: ({ className }) => <PantsIcon className={className} />,
  accessories: ({ className }) => <GlovesIcon className={className} />,
  gear: ({ className }) => <Backpack className={className} strokeWidth={1.75} aria-hidden />,
  other: ({ className }) => <Backpack className={className} strokeWidth={1.75} aria-hidden />,
};

export function SuggestionItems({
  items,
  preferences = null,
}: SuggestionItemsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});
  const [ownedIds, setOwnedIds] = useState<Record<string, boolean>>({});
  const [ownedOpen, setOwnedOpen] = useState(false);
  const { add, isSaved } = useSavedProducts();

  const activeItems = useMemo(
    () => items.filter((item) => !ownedIds[item.id]),
    [items, ownedIds]
  );
  const ownedItems = useMemo(
    () => items.filter((item) => ownedIds[item.id]),
    [items, ownedIds]
  );
  const activeCategories = useMemo(
    () => groupSuggestionsByCategory(activeItems),
    [activeItems]
  );

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    const first = activeCategories[0];
    if (!first) return;
    const key = sectionKey(first);
    setOpenCategories((prev) =>
      Object.keys(prev).length === 0 ? { [key]: true } : prev
    );
  }, [activeCategories]);

  if (items.length === 0) return null;

  const toggle = (id: string, title: string) => {
    const nextOpen = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: nextOpen }));

    if (nextOpen && !itemState[id]?.products.length && !itemState[id]?.loading) {
      void loadProducts(id, title);
    }
  };

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
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
      const hint = preferences
        ? formatPreferencesForSearch(preferences)
        : undefined;
      const products = await fetchProductImages(title, undefined, hint);
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

      {activeCategories.length > 0 ? (
        <div className="pack-suggestions__sections">
          {activeCategories.map((section) => {
            const key = sectionKey(section);
            const isOpen = Boolean(openCategories[key]);
            const Icon = CATEGORY_ICONS[section.id];
            return (
              <section key={key} className="pack-section">
                <button
                  type="button"
                  className={[
                    "pack-section__toggle",
                    isOpen ? "pack-section__toggle--open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => toggleCategory(key)}
                  aria-expanded={isOpen}
                >
                  <span className="pack-section__leading">
                    <Icon className="pack-section__icon" />
                    <span className="pack-section__title">{section.label}</span>
                    <span className="pack-section__count">{section.items.length}</span>
                  </span>
                  <ChevronDown className="pack-section__chevron" aria-hidden size={18} strokeWidth={1.75} />
                </button>

                <div
                  className={[
                    "pack-section__body",
                    isOpen ? "pack-section__body--open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden={!isOpen}
                >
                  <ul className="pack-suggestions__list">
                    {section.items.map((item) => (
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
                            categoryTitle: `${item.categoryLabel} · ${item.title}`,
                            sourceUrl: product.sourceUrl,
                          })
                        }
                        isSaved={isSaved}
                      />
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
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

function sectionKey(section: SuggestionCategory): string {
  return `${section.id}:${section.label}`;
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
  const [openedOnce, setOpenedOnce] = useState(false);

  useEffect(() => {
    if (isOpen) setOpenedOnce(true);
  }, [isOpen]);

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

      <div
        className={[
          "pack-suggestions__detail",
          isOpen ? "pack-suggestions__detail--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!isOpen}
      >
        <div className="pack-suggestions__detail-inner">
          {openedOnce ? (
            <SuggestionProducts
              loading={Boolean(state?.loading)}
              error={state?.error ?? null}
              products={products}
              onRetry={onRetry}
              onSave={onSave}
              isSaved={isSaved}
            />
          ) : null}
        </div>
      </div>
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
