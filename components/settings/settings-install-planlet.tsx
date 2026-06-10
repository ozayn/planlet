const APPLE_STEPS = [
  "Open Planlet in Safari.",
  "Tap Share.",
  "Tap Add to Home Screen.",
  "Open Planlet from the new icon.",
] as const;

const ANDROID_STEPS = [
  "Open Planlet in Chrome.",
  "Tap the three-dot menu.",
  "Tap Add to Home screen or Install app.",
  "Open Planlet from the new icon.",
] as const;

function InstallSteps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="list-decimal space-y-1 ps-4 text-xs leading-relaxed text-muted">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function InstallPlatformDetails({
  label,
  steps,
}: {
  label: string;
  steps: readonly string[];
}) {
  return (
    <details className="ui-settings-instruction-details group">
      <summary className="ui-settings-instruction-summary">
        <span>{label}</span>
        <span className="text-muted-light" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="pb-2 pt-1">
        <InstallSteps steps={steps} />
      </div>
    </details>
  );
}

export function SettingsInstallPlanlet() {
  return (
    <div className="ui-settings-row-block">
      <p className="text-sm font-medium text-foreground">Install Planlet</p>
      <p className="text-xs text-muted-light">
        Add Planlet to your phone for a more app-like experience.
      </p>

      <div className="mt-2 space-y-0">
        <InstallPlatformDetails label="Apple / iPhone" steps={APPLE_STEPS} />
        <InstallPlatformDetails label="Android" steps={ANDROID_STEPS} />
      </div>

      <p className="mt-2 text-xs text-muted-light">
        <span className="text-muted">Note:</span> On iPhone, install Planlet to
        your Home Screen before enabling phone notifications.
      </p>
    </div>
  );
}
