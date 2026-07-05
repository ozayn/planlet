import type { LifeLabAvailability } from "@/lib/life-lab/constants";
import { LIFE_LAB_UNAVAILABLE_MESSAGE } from "@/lib/life-lab/constants";

type LifeLabStatusPanelProps = {
  availability: LifeLabAvailability;
  isAdmin: boolean;
  emptyMessage?: string;
};

export function LifeLabStatusPanel({
  availability,
  isAdmin,
  emptyMessage,
}: LifeLabStatusPanelProps) {
  if (availability.status === "unconfigured") {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">
          {isAdmin
            ? availability.adminMessage
            : "Life Lab is unavailable right now."}
        </p>
        {isAdmin ? (
          <p className="mt-2 text-xs text-muted-light">
            Required: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, LIFE_LAB_DRIVE_FOLDER_ID
          </p>
        ) : null}
      </div>
    );
  }

  if (availability.status === "unavailable") {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">{availability.message}</p>
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <div className="ui-card-padded">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return null;
}
