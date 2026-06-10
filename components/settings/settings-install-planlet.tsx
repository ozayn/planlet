import { SettingsPlatformDetails } from "@/components/settings/settings-platform-details";

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

export function SettingsInstallPlanlet() {
  return (
    <div className="ui-settings-row-block">
      <p className="ui-settings-subsection-title">Install Planlet</p>
      <p className="ui-settings-subsection-helper">
        Add Planlet to your phone for a more app-like experience.
      </p>

      <div className="ui-settings-platform-rows">
        <SettingsPlatformDetails label="Apple / iPhone">
          <InstallSteps steps={APPLE_STEPS} />
        </SettingsPlatformDetails>
        <SettingsPlatformDetails label="Android">
          <InstallSteps steps={ANDROID_STEPS} />
        </SettingsPlatformDetails>
      </div>
    </div>
  );
}
