type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-medium tracking-tight text-stone-900" dir="auto">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-500" dir="auto">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
