import { DEFAULT_SETTINGS_TAB, isSettingsTab, type SettingsTab } from "@coddle/shared";
import { SettingsPage } from "@/components/settings/settings-page";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const tab = first((await searchParams).tab);
  const initialTab: SettingsTab = isSettingsTab(tab) ? tab : DEFAULT_SETTINGS_TAB;
  return <SettingsPage initialTab={initialTab} />;
}
