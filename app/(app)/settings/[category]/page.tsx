import { notFound } from "next/navigation";

import { SettingsBackHeader } from "@/components/settings/settings-back-header";
import { SettingsCategoryContent } from "@/components/settings/settings-category-content";
import { SettingsHashScroll } from "@/components/settings/settings-hash-scroll";
import { SettingsShell } from "@/components/settings/settings-shell";
import { loadSettingsPageData } from "@/lib/settings/load-context";
import {
  getSettingsCategory,
  isSettingsCategorySlug,
} from "@/lib/settings/registry";

type SettingsCategoryPageProps = {
  params: Promise<{ category: string }>;
};

export default async function SettingsCategoryPage({
  params,
}: SettingsCategoryPageProps) {
  const { category } = await params;

  if (!isSettingsCategorySlug(category)) {
    notFound();
  }

  const data = await loadSettingsPageData();
  const definition = getSettingsCategory(category);

  if (!definition || !definition.isAvailable(data.access)) {
    notFound();
  }

  return (
    <SettingsShell>
      <SettingsBackHeader title={definition.title} />
      <SettingsHashScroll />
      <SettingsCategoryContent slug={category} data={data} />
    </SettingsShell>
  );
}
