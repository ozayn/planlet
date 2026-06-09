import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
      >
        Sign out
      </button>
    </form>
  );
}
