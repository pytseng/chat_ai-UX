import {
  reasoningPillLabel,
  type ReasoningStatus,
} from "../../lib/reasoning";

type ReasoningUIProps = {
  steps: ReasoningStatus[];
};

export function ReasoningUI({ steps }: ReasoningUIProps) {
  if (steps.length === 0) return null;

  const activeLabel = reasoningPillLabel(steps[steps.length - 1]);

  return (
    <div
      className="reasoning-pills"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={activeLabel}
    >
      {steps.map((step, index) => {
        const isActive = index === steps.length - 1;
        const isCompleted = index < steps.length - 1;

        return (
          <span key={step.id} className="reasoning-pills__item">
            {index > 0 && (
              <span className="reasoning-pills__arrow" aria-hidden>
                →
              </span>
            )}
            <span
              className={[
                "reasoning-pill",
                isActive ? "reasoning-pill--active" : "",
                isCompleted ? "reasoning-pill--completed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {reasoningPillLabel(step)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
