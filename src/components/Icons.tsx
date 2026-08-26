/** Custom glyphs on Tabler’s 24×24 / stroke-2 grid — same round caps,
 *  1px hem radii, and ~4px padding as `shirt`. Only used when Tabler
 *  has no matching outline (tank, trousers, glove). */
export type GarmentIconProps = {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
};

function GarmentIcon({
  size = 24,
  strokeWidth = 2,
  className,
  children,
}: GarmentIconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Sleeveless tank — same neck and hem language as Tabler’s `shirt`. */
export function TankTopIcon(props: GarmentIconProps) {
  return (
    <GarmentIcon {...props}>
      <path d="M15 4l3 3v12a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-12l3 -3a3 3 0 0 0 6 0" />
    </GarmentIcon>
  );
}

/** Trousers — Tabler has no pants glyph. Shirt hem radii, two legs. */
export function TrousersIcon(props: GarmentIconProps) {
  return (
    <GarmentIcon {...props}>
      <path d="M5 4h14l-1 4v12a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-7h-2v7a1 1 0 0 1 -1 1H7a1 1 0 0 1 -1 -1V8z" />
      <path d="M6 8h12" />
    </GarmentIcon>
  );
}

/** Winter glove — Tabler has no glove. Thumb is an open bump, not a retrace. */
export function GloveIcon(props: GarmentIconProps) {
  return (
    <GarmentIcon {...props}>
      <path d="M8 7a4 4 0 0 1 8 0v10a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z" />
      <path d="M8 12H6a2 2 0 1 1 0 -4h2" />
      <path d="M10 17h4" />
    </GarmentIcon>
  );
}
