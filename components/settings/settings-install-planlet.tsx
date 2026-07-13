import { SettingsPlatformDetails } from "@/components/settings/settings-platform-details";
import { SettingsSection } from "@/components/settings/settings-section";

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

type SettingsInstallPlanletProps = {
  embedded?: boolean;
};

export function SettingsInstallPlanlet({ embedded = false }: SettingsInstallPlanletProps) {
  const content = (
    <>
      <p className="text-xs leading-relaxed text-muted-light">
        Install Planlet for a more app-like experience and reliable phone
        notifications.
      </p>
      <div className="ui-settings-platform-rows">
        <SettingsPlatformDetails label="Apple / iPhone">
          <InstallSteps steps={APPLE_STEPS} />
        </SettingsPlatformDetails>
        <SettingsPlatformDetails label="Android">
          <InstallSteps steps={ANDROID_STEPS} />
        </SettingsPlatformDetails>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SettingsSection title="Install app">
      <details className="ui-settings-instruction-details group">
        <summary className="ui-settings-instruction-summary">
          <span>Add Planlet to your home screen</span>
          <span className="text-xs text-muted-light" aria-hidden="true">
            ›
          </span>
        </summary>
        <div className="space-y-2 pb-1 pt-1">{content}</div>
      </details>
    </SettingsSection>
  );
}
