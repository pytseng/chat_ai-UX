type FluidDotsSpinnerProps = {
  className?: string;
};

export function FluidDotsSpinner({ className }: FluidDotsSpinnerProps) {
  return (
    <span
      className={["fluid-dots", className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <span className="fluid-dots__drop fluid-dots__drop--1" />
      <span className="fluid-dots__drop fluid-dots__drop--2" />
      <span className="fluid-dots__drop fluid-dots__drop--3" />
    </span>
  );
}
