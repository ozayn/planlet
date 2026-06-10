type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="ui-page-header mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-[1.625rem] font-semibold tracking-tight text-foreground"
            dir="auto"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-muted" dir="auto">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </header>
  );
}
