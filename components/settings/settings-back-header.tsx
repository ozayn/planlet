import Link from "next/link";

import { ChevronLeftIcon } from "@/components/ui/action-icons";

type SettingsBackHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
};

export function SettingsBackHeader({
  title,
  backHref = "/settings",
  backLabel = "Settings",
}: SettingsBackHeaderProps) {
  return (
    <header className="ui-settings-subheader">
      <Link href={backHref} className="ui-settings-back-link">
        <ChevronLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{backLabel}</span>
      </Link>
      <h1 className="ui-settings-subheader-title">{title}</h1>
    </header>
  );
}
