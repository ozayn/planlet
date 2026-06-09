import { signOut } from "@/auth";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className = "" }: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className={`ui-btn-secondary ${className}`.trim()}
      >
        Sign out
      </button>
    </form>
  );
}
