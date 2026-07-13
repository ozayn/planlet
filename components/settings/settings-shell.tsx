import type { ReactNode } from "react";

type SettingsShellProps = {
  children: ReactNode;
};

export function SettingsShell({ children }: SettingsShellProps) {
  return (
    <section className="ui-settings-page mx-auto w-full max-w-lg">{children}</section>
  );
}
