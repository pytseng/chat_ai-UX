import { useState } from "react";
import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  type GenderPreference,
  type SizePreference,
  type StylePreference,
  type UserPreferences,
} from "../lib/userPreferences";

type PreferencePromptProps = {
  onSubmit: (prefs: UserPreferences) => void;
};

export function PreferencePrompt({ onSubmit }: PreferencePromptProps) {
  const [gender, setGender] = useState<GenderPreference | null>(null);
  const [style, setStyle] = useState<StylePreference | null>(null);
  const [size, setSize] = useState<SizePreference | null>(null);

  const canContinue = Boolean(gender && style && size);

  return (
    <div className="pref-prompt" role="group" aria-label="Personalize suggestions">
      <p className="pref-prompt__title">Quick preferences</p>
      <p className="pref-prompt__subtitle">
        Pick once so product picks fit you better.
      </p>

      <fieldset className="pref-prompt__field">
        <legend>Gender</legend>
        <div className="pref-prompt__chips">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[
                "pref-prompt__chip",
                gender === option.id ? "pref-prompt__chip--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={gender === option.id}
              onClick={() => setGender(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pref-prompt__field">
        <legend>Style</legend>
        <div className="pref-prompt__chips">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[
                "pref-prompt__chip",
                style === option.id ? "pref-prompt__chip--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={style === option.id}
              onClick={() => setStyle(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pref-prompt__field">
        <legend>Size</legend>
        <div className="pref-prompt__chips">
          {SIZE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[
                "pref-prompt__chip",
                size === option.id ? "pref-prompt__chip--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={size === option.id}
              onClick={() => setSize(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className="pref-prompt__continue"
        disabled={!canContinue}
        onClick={() => {
          if (!gender || !style || !size) return;
          onSubmit({ gender, style, size });
        }}
      >
        Continue
      </button>
    </div>
  );
}
