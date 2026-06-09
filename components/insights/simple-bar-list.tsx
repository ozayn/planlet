type SimpleBarListItem = {
  label: string;
  count: number;
};

type SimpleBarListProps = {
  title: string;
  items: SimpleBarListItem[];
  emptyMessage?: string;
};

export function SimpleBarList({
  title,
  items,
  emptyMessage = "Nothing here yet.",
}: SimpleBarListProps) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-stone-800">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-700" dir="auto">
                  {item.label}
                </span>
                <span className="shrink-0 text-stone-400">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-teal-700/70"
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
