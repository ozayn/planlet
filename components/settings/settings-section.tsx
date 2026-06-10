type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section className={`ui-settings-section ${className}`.trim()}>
      <h2 className="ui-settings-section-title">{title}</h2>
      <div className="ui-settings-section-body">{children}</div>
    </section>
  );
}
