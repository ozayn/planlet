import { signOut } from "@/auth";

type SignOutButtonProps = {
  className?: string;
  variant?: "default" | "quiet";
};

export function SignOutButton({
  className = "",
  variant = "default",
}: SignOutButtonProps) {
  const buttonClass =
    variant === "quiet"
      ? `ui-settings-sign-out ${className}`.trim()
      : `ui-btn-secondary ${className}`.trim();

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className={buttonClass}>
        Sign out
      </button>
    </form>
  );
}
