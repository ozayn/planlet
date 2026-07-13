"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SettingsCategoryIcon } from "@/components/settings/settings-category-icon";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import type { ClientSettingsCategory, ClientSettingsSearchEntry } from "@/lib/settings/types";
import type { SettingsSearchResult } from "@/lib/settings/types";
import { searchSettings } from "@/lib/settings/search";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type SettingsHubProps = {
  categories: ClientSettingsCategory[];
  searchIndex: ClientSettingsSearchEntry[];
};

export function SettingsHub({ categories, searchIndex }: SettingsHubProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchSettings(searchIndex, query),
    [searchIndex, query],
  );

  const showCategories = query.trim().length === 0;

  return (
    <div className="ui-settings-hub">
      <header className="ui-settings-hub-header">
        <h1 className="ui-settings-hub-title">Settings</h1>
      </header>

      <label className="ui-settings-search-label" htmlFor="settings-search">
        <span className="sr-only">Search settings</span>
        <input
          id="settings-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings"
          className="ui-settings-search"
          {...passwordManagerSafeControlProps}
        />
      </label>

      {showCategories ? (
        <SettingsCategoryList categories={categories} />
      ) : (
        <SettingsSearchResults query={query} results={results} />
      )}
    </div>
  );
}

function SettingsCategoryList({
  categories,
}: {
  categories: ClientSettingsCategory[];
}) {
  return (
    <div className="ui-settings-group">
      {categories.map((category) => (
        <SettingsListRow
          key={category.slug}
          href={`/settings/${category.slug}`}
          title={category.title}
          subtitle={category.subtitle}
          icon={
            <SettingsCategoryIcon
              name={category.icon}
              className="h-[1.125rem] w-[1.125rem]"
            />
          }
        />
      ))}
    </div>
  );
}

function SettingsSearchResults({
  query,
  results,
}: {
  query: string;
  results: SettingsSearchResult[];
}) {
  if (results.length === 0) {
    return (
      <p className="ui-settings-search-empty" role="status">
        No settings found for “{query.trim()}”.
      </p>
    );
  }

  return (
    <div className="ui-settings-group" role="list" aria-label="Search results">
      {results.map((result) => (
        <Link
          key={`${result.id}-${result.matchedField}`}
          href={result.href}
          className="ui-settings-list-row"
          role="listitem"
        >
          <span className="ui-settings-list-row-content">
            <span className="ui-settings-list-row-title">{result.title}</span>
            <span className="ui-settings-list-row-subtitle">
              {result.categoryTitle}
              {result.subtitle ? ` · ${result.subtitle}` : ""}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
