import type { ReasoningSegment } from "../../lib/reasoning";
import { FluidDotsSpinner } from "./FluidDotsSpinner";

type ReasoningUIProps = {
  segments: ReasoningSegment[];
  stepKey: string;
};

function Segment({ segment }: { segment: ReasoningSegment }) {
  if (segment.bold && segment.italic) {
    return (
      <strong>
        <em>{segment.text}</em>
      </strong>
    );
  }
  if (segment.bold) return <strong>{segment.text}</strong>;
  if (segment.italic) return <em>{segment.text}</em>;
  return <>{segment.text}</>;
}

export function ReasoningUI({ segments, stepKey }: ReasoningUIProps) {
  return (
    <div className="reasoning" role="status" aria-live="polite" aria-atomic="true">
      <div className="reasoning__trail" aria-hidden>
        <span className="reasoning__footstep reasoning__footstep--1" />
        <span className="reasoning__footstep reasoning__footstep--2" />
        <span className="reasoning__footstep reasoning__footstep--3" />
        <span className="reasoning__leaf">🍃</span>
      </div>
      <p className="reasoning__text" key={stepKey}>
        {segments.map((segment, index) => (
          <Segment key={`${stepKey}-${index}`} segment={segment} />
        ))}
        <FluidDotsSpinner className="fluid-dots--reasoning" />
      </p>
    </div>
  );
}
