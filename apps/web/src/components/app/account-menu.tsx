"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAppUser } from "@/components/app/app-user-context";
import { logout } from "@/lib/auth";
import { profilePath } from "@/lib/profiles";

export function AccountMenu() {
  const user = useAppUser();
  const router = useRouter();
  const ACCOUNT_LINKS: { href: string; label: string; icon: IconName }[] = [
    {
      href: user.username ? profilePath(user.username) : "/profile",
      label: "Profile",
      icon: "users",
    },
    { href: "/credentials", label: "Credentials", icon: "checkCircle" },
    { href: "/achievements", label: "Achievements", icon: "star" },
    { href: "/notifications", label: "Notifications", icon: "message" },
    { href: "/studio", label: "Studio", icon: "layers" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!confirmOpen) return;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setConfirmOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [confirmOpen, pending]);

  async function confirmSignOut() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
      setConfirmOpen(false);
      router.replace("/");
    } catch {
      setPending(false);
    }
  }

  const dialog =
    confirmOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
            <button
              type="button"
              aria-label="Close sign out dialog"
              disabled={pending}
              onClick={() => {
                if (!pending) setConfirmOpen(false);
              }}
              className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
            >
              <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
                Sign out?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Your progress stays saved. You can sign back in anytime.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  ref={cancelRef}
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void confirmSignOut()}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {pending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface p-1 pr-2 transition hover:border-border-strong hover:bg-surface-subtle sm:pr-2.5"
        >
          <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <span className="hidden max-w-28 truncate text-sm font-semibold text-ink sm:inline">
            {user.name.split(" ")[0] ?? user.name}
          </span>
          <Icon
            name="chevronDown"
            className={[
              "hidden h-3.5 w-3.5 text-ink-muted transition sm:block",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-ink/5"
          >
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <div className="p-1.5">
              {ACCOUNT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition hover:bg-surface-subtle"
                >
                  <Icon name={item.icon} className="h-4 w-4 shrink-0 text-ink-muted" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <Icon name="arrowLeft" className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {dialog}
    </>
  );
}
