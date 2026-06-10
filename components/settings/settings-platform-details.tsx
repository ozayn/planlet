import type { ReactNode } from "react";

type SettingsPlatformDetailsProps = {
  label: string;
  children: ReactNode;
};

export function SettingsPlatformDetails({
  label,
  children,
}: SettingsPlatformDetailsProps) {
  return (
    <details className="ui-settings-instruction-details group">
      <summary className="ui-settings-instruction-summary">
        <span>{label}</span>
        <span className="text-muted-light" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="pb-2 pt-1">{children}</div>
    </details>
  );
}
