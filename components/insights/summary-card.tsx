type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </article>
  );
}
