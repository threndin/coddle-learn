"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, pending]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
      setOpen(false);
      router.replace("/");
    } catch {
      setPending(false);
    }
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
            <button
              type="button"
              aria-label="Close sign out dialog"
              disabled={pending}
              onClick={() => {
                if (!pending) setOpen(false);
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
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void confirm()}
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ?? "text-sm font-medium text-ink-muted transition hover:text-ink"
        }
      >
        Sign out
      </button>
      {dialog}
    </>
  );
}
