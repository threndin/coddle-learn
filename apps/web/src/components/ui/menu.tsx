"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

export type MenuItem =
  | {
      label: string;
      icon?: IconName;
      onSelect: () => void;
      tone?: "default" | "danger";
      disabled?: boolean;
    }
  | { label: string; icon?: IconName; href: string; external?: boolean }
  | "divider";

export function Menu({
  items,
  label = "More actions",
  trigger,
  align = "right",
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
      >
        {trigger ?? <Icon name="more" className="h-4 w-4" />}
      </button>
      {open ? (
        <div
          role="menu"
          className={[
            "absolute top-full z-40 mt-1.5 min-w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-ink/5",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {items.map((item, index) => {
            if (item === "divider") {
              return <div key={`divider-${index}`} className="my-1 h-px bg-border" />;
            }
            const content = (
              <>
                {item.icon ? <Icon name={item.icon} className="h-4 w-4 shrink-0" /> : null}
                <span className="flex-1">{item.label}</span>
                {"external" in item && item.external ? (
                  <Icon name="external" className="h-3.5 w-3.5 text-ink-muted" />
                ) : null}
              </>
            );
            if ("href" in item) {
              return (
                <Link
                  key={item.label}
                  role="menuitem"
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  onClick={() => setOpen(false)}
                  className={`${itemClass} text-ink hover:bg-surface-subtle`}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={[
                  itemClass,
                  item.tone === "danger"
                    ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    : "text-ink hover:bg-surface-subtle",
                ].join(" ")}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
