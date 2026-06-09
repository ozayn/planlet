type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "red" | "blue" | "yellow";
};

const ACCENTS = {
  red: "ui-accent-bar-red",
  blue: "ui-accent-bar-blue",
  yellow: "ui-accent-bar-yellow",
} as const;

export function SummaryCard({
  label,
  value,
  hint,
  accent = "blue",
}: SummaryCardProps) {
  return (
    <article className="ui-card relative overflow-hidden p-5">
      <span
        className={`absolute inset-y-5 start-0 w-1 rounded-full ${ACCENTS[accent]}`}
        aria-hidden="true"
      />
      <p className="ps-3 text-xs font-medium tracking-wider text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 ps-3 text-[1.75rem] font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 ps-3 text-xs text-muted-light">{hint}</p> : null}
    </article>
  );
}
