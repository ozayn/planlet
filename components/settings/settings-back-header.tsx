import Link from "next/link";

import { ChevronLeftIcon } from "@/components/ui/action-icons";

type SettingsBackHeaderProps = {
  title: string;
};

export function SettingsBackHeader({ title }: SettingsBackHeaderProps) {
  return (
    <header className="ui-settings-subheader">
      <Link href="/settings" className="ui-settings-back-link">
        <ChevronLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Settings</span>
      </Link>
      <h1 className="ui-settings-subheader-title">{title}</h1>
    </header>
  );
}
