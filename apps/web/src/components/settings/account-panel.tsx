"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { USER_ROLE_LABELS } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { logout, logoutAll } from "@/lib/auth";
import {
  THEME_OPTIONS,
  applyThemePreference,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";

const coddleAppUrl = `${process.env.NEXT_PUBLIC_CODDLE_APP_URL ?? "https://www.coddle.dev"}/settings`;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function AccountPanel() {
  const user = useAppUser();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  useEffect(() => {
    function sync() {
      setTheme(readThemePreference());
    }
    sync();
    return subscribeTheme(sync);
  }, []);

  function onTheme(next: ThemePreference) {
    applyThemePreference(next);
    setTheme(next);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Coddle account
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          Name, email, and photo sync from your Coddle account.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
            <p className="mt-1 font-mono text-xs text-ink-muted">@{user.username}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Role
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{USER_ROLE_LABELS[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Member since
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>

        <a
          href={coddleAppUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
        >
          Manage on Coddle →
        </a>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Appearance
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">Theme</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Applies on this device. The header toggle switches between light and dark.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((option) => {
            const selected = option.id === theme;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onTheme(option.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  selected
                    ? "border-brand bg-brand-soft ring-2 ring-brand"
                    : "border-border bg-surface hover:border-brand/40"
                }`}
              >
                <p className="text-sm font-semibold text-ink">{option.label}</p>
                <p className="mt-1 text-sm text-ink-muted">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Session
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">Sign out</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Signing out clears your Learn session only. Your Coddle account stays signed in, and
          your progress stays saved.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setSignOutAllOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong hover:bg-surface-subtle"
          >
            Sign out all devices
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out?"
        description="Your progress stays saved. You can sign back in anytime."
        confirmLabel="Sign out"
        pendingLabel="Signing out…"
        onClose={() => setSignOutOpen(false)}
        onConfirm={async () => {
          await logout();
          router.replace("/");
        }}
      />
      <ConfirmDialog
        open={signOutAllOpen}
        title="Sign out everywhere?"
        description="This ends your Learn session on this device and any others. Your Coddle account stays signed in."
        confirmLabel="Sign out all devices"
        pendingLabel="Signing out…"
        tone="danger"
        onClose={() => setSignOutAllOpen(false)}
        onConfirm={async () => {
          await logoutAll();
          router.replace("/");
        }}
      />
    </div>
  );
}
