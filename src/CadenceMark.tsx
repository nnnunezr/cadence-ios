// Cadence brand mark: a rounded diamond (brand DNA) holding three ascending
// rhythm bars — the daily "cadence" of tasks/goals/streaks building momentum.
// Single-colour (currentColor) so it adapts to the active highlight + theme.
export function CadenceMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="11"
        y="11"
        width="26"
        height="26"
        rx="7"
        transform="rotate(45 24 24)"
        stroke="currentColor"
        strokeWidth="3"
      />
      <g fill="currentColor">
        <rect x="16" y="25" width="4" height="9" rx="2" />
        <rect x="22" y="20" width="4" height="14" rx="2" />
        <rect x="28" y="15" width="4" height="19" rx="2" />
      </g>
    </svg>
  );
}
