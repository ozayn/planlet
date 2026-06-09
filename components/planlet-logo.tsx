type PlanletLogoProps = {
  size?: number;
  className?: string;
};

export function PlanletLogo({ size = 40, className = "" }: PlanletLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#faf9f7" />
      <rect x="8" y="8" width="6" height="16" fill="#d62828" />
      <rect x="17" y="8" width="15" height="6" fill="#1d4ed8" />
      <rect x="17" y="17" width="9" height="9" fill="#faf9f7" stroke="#141210" strokeWidth="1.5" />
      <path
        d="M19.5 21.5 L21.5 23.5 L25 18.5"
        stroke="#141210"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="29" y="17" width="5" height="8" fill="#e9c46a" />
      <line x1="8" y1="30" x2="32" y2="30" stroke="#141210" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
