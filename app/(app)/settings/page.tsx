import { SettingsHub } from "@/components/settings/settings-hub";
import { SettingsShell } from "@/components/settings/settings-shell";
import { loadSettingsAccessContext } from "@/lib/settings/load-context";
import {
  buildSettingsSearchIndex,
  getAvailableCategories,
} from "@/lib/settings/registry";

export default async function SettingsPage() {
  const access = await loadSettingsAccessContext();
  const categories = getAvailableCategories(access);
  const searchIndex = buildSettingsSearchIndex(access);

  return (
    <SettingsShell>
      <SettingsHub categories={categories} searchIndex={searchIndex} />
    </SettingsShell>
  );
}
