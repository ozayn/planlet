import { notFound } from "next/navigation";

import { SettingsBackHeader } from "@/components/settings/settings-back-header";
import { SettingsCategoryContent } from "@/components/settings/settings-category-content";
import { SettingsHashScroll } from "@/components/settings/settings-hash-scroll";
import { SettingsShell } from "@/components/settings/settings-shell";
import { resolveSettingsCategoryBackLink } from "@/lib/settings/back-link";
import { loadSettingsPageData } from "@/lib/settings/load-context";
import {
  getSettingsCategory,
  isSettingsCategorySlug,
} from "@/lib/settings/registry";

type SettingsCategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function SettingsCategoryPage({
  params,
  searchParams,
}: SettingsCategoryPageProps) {
  const { category } = await params;
  const { from } = await searchParams;

  if (!isSettingsCategorySlug(category)) {
    notFound();
  }

  const data = await loadSettingsPageData();
  const definition = getSettingsCategory(category);

  if (!definition || !definition.isAvailable(data.access)) {
    notFound();
  }

  const back = resolveSettingsCategoryBackLink({ category, from });

  return (
    <SettingsShell>
      <SettingsBackHeader
        title={definition.title}
        backHref={back.href}
        backLabel={back.label}
      />
      <SettingsHashScroll />
      <SettingsCategoryContent slug={category} data={data} />
    </SettingsShell>
  );
}
