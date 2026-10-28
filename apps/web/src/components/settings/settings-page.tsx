"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS, type SettingsTab } from "@coddle/shared";
import { AccountPanel } from "@/components/settings/account-panel";
import { LearningPanel } from "@/components/settings/learning-panel";
import { NotificationsPanel } from "@/components/settings/notifications-panel";

const TAB_LABELS: Record<SettingsTab, string> = {
  account: "Account",
  notifications: "Notifications",
  learning: "Learning",
};

function hrefForTab(tab: SettingsTab) {
  return tab === DEFAULT_SETTINGS_TAB ? "/settings" : `/settings?tab=${tab}`;
}

export function SettingsPage({ initialTab }: { initialTab: SettingsTab }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  function onTab(next: SettingsTab) {
    setTab(next);
    startTransition(() => {
      router.replace(hrefForTab(next), { scroll: false });
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Settings
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          Update your daily goal, notification preferences, and how Coddle Learn looks on this device.
        </p>
      </div>

      <div
        className="mt-4 inline-flex rounded-xl border border-border bg-surface p-0.5"
        role="tablist"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
            className={[
              "inline-flex items-center rounded-[10px] px-3 py-1.5 text-xs font-semibold transition",
              tab === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "account" ? <AccountPanel /> : null}
        {tab === "notifications" ? <NotificationsPanel /> : null}
        {tab === "learning" ? <LearningPanel /> : null}
      </div>
    </div>
  );
}
