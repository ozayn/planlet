import { SignOutButton } from "@/components/sign-out-button";
import { SettingsSection } from "@/components/settings/settings-section";
import { UserAvatar } from "@/components/user-avatar";

type SettingsProfileProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function SettingsProfile({
  name,
  email,
  image,
}: SettingsProfileProps) {
  return (
    <SettingsSection title="Profile">
      <div className="ui-settings-profile flex items-center gap-3">
        <UserAvatar name={name} email={email} image={image} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" dir="auto">
            {name?.trim() || "Signed in"}
          </p>
          {email ? (
            <p className="truncate text-xs text-muted" dir="auto">
              {email}
            </p>
          ) : null}
        </div>
      </div>
      <SignOutButton variant="quiet" />
    </SettingsSection>
  );
}
