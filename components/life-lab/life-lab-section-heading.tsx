type LifeLabSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

export function LifeLabSectionHeading({
  children,
  className = "",
}: LifeLabSectionHeadingProps) {
  return (
    <h2
      className={`text-base font-medium text-foreground ${className}`.trim()}
    >
      {children}
    </h2>
  );
}

type LifeLabSubsectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

export function LifeLabSubsectionHeading({
  children,
  className = "",
}: LifeLabSubsectionHeadingProps) {
  return (
    <h3
      className={`text-base font-medium text-foreground ${className}`.trim()}
    >
      {children}
    </h3>
  );
}
