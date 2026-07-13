import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/ui/action-icons";

type SettingsListRowProps = {
  href: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClick?: never;
};

type SettingsListButtonProps = {
  href?: never;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClick: () => void;
};

export function SettingsListRow(props: SettingsListRowProps | SettingsListButtonProps) {
  const content = (
    <>
      {props.icon ? (
        <span className="ui-settings-list-row-icon">{props.icon}</span>
      ) : null}
      <span className="ui-settings-list-row-content">
        <span className="ui-settings-list-row-title">{props.title}</span>
        {props.subtitle ? (
          <span className="ui-settings-list-row-subtitle">{props.subtitle}</span>
        ) : null}
      </span>
      <ChevronRightIcon
        className="ui-settings-list-row-chevron"
        aria-hidden="true"
      />
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className="ui-settings-list-row">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className="ui-settings-list-row">
      {content}
    </button>
  );
}
