"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = { top: number; left: number };

export function Menu({
  items,
  label = "More actions",
  trigger,
  align = "right",
  triggerClassName,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  align?: "left" | "right";
  /** Overrides the default bordered trigger chrome. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 192;
    const left =
      align === "right"
        ? Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
        : Math.max(8, rect.left);
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, left),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      updatePosition();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, align]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  const menu =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[120] min-w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-ink/10"
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={
          triggerClassName ??
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
        }
      >
        {trigger ?? <Icon name="more" className="h-4 w-4" />}
      </button>
      {menu}
    </div>
  );
}
