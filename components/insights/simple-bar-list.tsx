type SimpleBarListItem = {
  label: string;
  count: number;
};

type SimpleBarListProps = {
  title: string;
  items: SimpleBarListItem[];
  emptyMessage?: string;
  accent?: "red" | "blue" | "yellow";
};

const BAR_COLORS = {
  red: "bg-accent-red/80",
  blue: "bg-accent-blue/80",
  yellow: "bg-accent-yellow/90",
} as const;

export function SimpleBarList({
  title,
  items,
  emptyMessage = "Nothing here yet.",
  accent = "blue",
}: SimpleBarListProps) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="ui-card-padded">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground" dir="auto">
                  {item.label}
                </span>
                <span className="shrink-0 text-muted-light">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[accent]}`}
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
