export function EditItemIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M10 5H3M21 5h-7M10 19H3M21 19h-7M17 12H3M21 12h-7" />
      <circle cx="14" cy="5" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="19" r="2" />
    </svg>
  );
}

export function AddSubtaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M11 12H3M16 6H3M16 18H3M19 10v6M22 13h-6" />
    </svg>
  );
}
