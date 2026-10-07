"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = "default",
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, pending, onClose]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</div>
        ) : null}
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className={[
              "rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50",
              tone === "danger" ? "bg-rose-600" : "bg-brand",
            ].join(" ")}
          >
            {pending ? (pendingLabel ?? "Working…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
