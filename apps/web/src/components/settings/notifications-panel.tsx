"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREF_OPTIONS,
  type NotificationPrefs,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { useAppUser, useAppUserActions } from "@/components/app/app-user-context";
import { errorMessage } from "@/lib/api-client";
import { updateSettings } from "@/lib/auth";

export function NotificationsPanel() {
  const user = useAppUser();
  const { patchUser } = useAppUserActions();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    () => user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  );
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await updateSettings({ notificationPrefs: prefs });
        patchUser(next);
        setPrefs(next.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS);
        pushToast("Notification preferences saved", "success");
      } catch (err) {
        const message = errorMessage(err, "Could not save notification preferences");
        setError(message);
        pushToast(message, "error");
      }
    });
  }

  return (
    <div>
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Inbox
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          In-app notifications
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          Choose which updates land in your inbox. Turning a group off skips new notifications;
          anything already there stays until you read or clear it.
        </p>

        <ul className="mt-6 divide-y divide-border border-y border-border">
          {NOTIFICATION_PREF_OPTIONS.map((option) => {
            const on = prefs[option.id];
            return (
              <li
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{option.label}</p>
                  <p className="mt-1 text-sm text-ink-muted">{option.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${option.label}: ${on ? "on" : "off"}`}
                  onClick={() => toggle(option.id)}
                  className={[
                    "relative h-7 w-12 shrink-0 rounded-full transition",
                    on ? "bg-brand" : "bg-border-strong",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                      on ? "left-[1.35rem]" : "left-0.5",
                    ].join(" ")}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <Link
          href="/notifications"
          className="mt-6 inline-flex text-sm font-semibold text-brand transition hover:text-brand-deep"
        >
          Open inbox →
        </Link>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" role="status">
          {error ? <span className="text-rose-600">{error}</span> : null}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
