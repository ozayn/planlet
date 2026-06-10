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

function getAvatarLabel(name?: string | null, email?: string | null): string {
  return name?.trim() || email?.trim() || "User";
}

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
}: UserAvatarProps) {
  const initials = getUserInitials(name, email);
  const label = getAvatarLabel(name, email);
  const className = `${sizeClasses[size]} shrink-0 rounded-full border border-border-soft object-cover`;

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={label} className={className} />
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={`${className} inline-flex items-center justify-center bg-accent-cream font-medium text-muted`}
    >
      {initials}
    </span>
  );
}
