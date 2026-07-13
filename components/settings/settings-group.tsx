import type { ReactNode } from "react";

type SettingsGroupProps = {
  children: ReactNode;
  labelledBy?: string;
};

export function SettingsGroup({ children, labelledBy }: SettingsGroupProps) {
  return (
    <div
      className="ui-settings-group"
      role="group"
      {...(labelledBy ? { "aria-labelledby": labelledBy } : {})}
    >
      {children}
    </div>
  );
}

type SettingsBlockProps = {
  id?: string;
  title?: string;
  description?: string;
  children: ReactNode;
};

export function SettingsBlock({
  id,
  title,
  description,
  children,
}: SettingsBlockProps) {
  return (
    <section id={id} className="ui-settings-block scroll-mt-4">
      {title ? <h2 className="ui-settings-block-title">{title}</h2> : null}
      {description ? (
        <p className="ui-settings-block-description">{description}</p>
      ) : null}
      <div className="ui-settings-block-body">{children}</div>
    </section>
  );
}
