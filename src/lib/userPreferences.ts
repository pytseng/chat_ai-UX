export type GenderPreference = "women" | "men" | "unisex";
export type StylePreference = "casual" | "technical" | "street";
export type SizePreference = "xs-s" | "m" | "l-xl" | "any";

export type UserPreferences = {
  gender: GenderPreference;
  style: StylePreference;
  size: SizePreference;
};

const STORAGE_KEY = "secretstash-user-preferences";

export const GENDER_OPTIONS: { id: GenderPreference; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "unisex", label: "Unisex" },
];

export const STYLE_OPTIONS: { id: StylePreference; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "technical", label: "Technical" },
  { id: "street", label: "Street" },
];

export const SIZE_OPTIONS: { id: SizePreference; label: string }[] = [
  { id: "xs-s", label: "XS–S" },
  { id: "m", label: "M" },
  { id: "l-xl", label: "L–XL" },
  { id: "any", label: "Any" },
];

export function loadUserPreferences(): UserPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    if (
      parsed.gender &&
      parsed.style &&
      parsed.size &&
      GENDER_OPTIONS.some((o) => o.id === parsed.gender) &&
      STYLE_OPTIONS.some((o) => o.id === parsed.style) &&
      SIZE_OPTIONS.some((o) => o.id === parsed.size)
    ) {
      return {
        gender: parsed.gender,
        style: parsed.style,
        size: parsed.size,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function persistUserPreferences(prefs: UserPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearUserPreferences() {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatPreferencesForPrompt(prefs: UserPreferences): string {
  const gender =
    GENDER_OPTIONS.find((o) => o.id === prefs.gender)?.label ?? prefs.gender;
  const style =
    STYLE_OPTIONS.find((o) => o.id === prefs.style)?.label ?? prefs.style;
  const size =
    SIZE_OPTIONS.find((o) => o.id === prefs.size)?.label ?? prefs.size;
  return `Shopper profile — gender: ${gender}; style: ${style}; size: ${size}. Prefer product suggestions that match this profile.`;
}

export function formatPreferencesForSearch(prefs: UserPreferences): string {
  const parts: string[] = [];
  if (prefs.gender === "women") parts.push("women's");
  if (prefs.gender === "men") parts.push("men's");
  if (prefs.style === "technical") parts.push("technical outdoor");
  if (prefs.style === "street") parts.push("streetwear");
  if (prefs.style === "casual") parts.push("casual");
  if (prefs.size === "xs-s") parts.push("small");
  if (prefs.size === "l-xl") parts.push("large");
  return parts.join(" ");
}
