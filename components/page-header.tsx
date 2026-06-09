type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1
        className="text-[1.75rem] font-semibold tracking-tight text-foreground"
        dir="auto"
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-muted" dir="auto">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
