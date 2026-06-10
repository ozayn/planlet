import { getUserInitials } from "@/lib/user-display";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "xs" | "sm" | "md";
};

const sizeClasses = {
  xs: "h-7 w-7 text-[0.625rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
}: UserAvatarProps) {
  const initials = getUserInitials(name, email);

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-accent-cream font-medium text-foreground`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
