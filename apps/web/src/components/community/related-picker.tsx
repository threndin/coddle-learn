"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  COMMUNITY_TOPIC_LABELS,
  type CommunityTopic,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { fetchRelatedOptions, type RelatedOption } from "@/lib/community";

type CatalogTopic = Exclude<CommunityTopic, "general">;

export function RelatedPicker({
  topic,
  value,
  onChange,
  disabled,
}: {
  topic: CatalogTopic;
  value: RelatedOption | null;
  onChange: (option: RelatedOption | null) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<RelatedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChange(null);
    setQuery("");
    setOpen(false);
    // Reset selection when the topic changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only topic
  }, [topic]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setLoading(true);
      fetchRelatedOptions(topic, query, controller.signal)
        .then((data) => {
          setOptions(data.options);
          setError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(errorMessage(err, "Could not load options"));
          setOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [open, topic, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = COMMUNITY_TOPIC_LABELS[topic];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm transition hover:border-border-strong disabled:opacity-50"
      >
        <span className="min-w-0">
          {value ? (
            <>
              <span className="block truncate font-semibold text-ink">{value.title}</span>
              {value.subtitle ? (
                <span className="block truncate text-xs text-ink-muted">{value.subtitle}</span>
              ) : null}
            </>
          ) : (
            <span className="text-ink-muted">Select a {label.toLowerCase()}…</span>
          )}
        </span>
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>

      {value ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="mt-2 text-xs font-semibold text-ink-muted transition hover:text-ink"
        >
          Clear selection
        </button>
      ) : null}

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border p-2">
            <label className="relative block">
              <span className="sr-only">Search {label.toLowerCase()}s</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}s`}
                className="w-full rounded-lg border border-border bg-surface-subtle py-2 pl-8 pr-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
              />
            </label>
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <li className="px-3 py-3 text-xs text-ink-muted">Loading…</li>
            ) : error ? (
              <li className="px-3 py-3 text-xs text-rose-600">{error}</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-3 text-xs text-ink-muted">No matches.</li>
            ) : (
              options.map((option) => {
                const active = value?.slug === option.slug;
                return (
                  <li key={option.slug}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                      }}
                      className={[
                        "flex w-full flex-col rounded-lg px-3 py-2 text-left transition",
                        active ? "bg-brand-soft text-brand" : "hover:bg-surface-subtle",
                      ].join(" ")}
                    >
                      <span className="text-sm font-semibold text-ink">{option.title}</span>
                      {option.subtitle ? (
                        <span className="text-xs text-ink-muted">{option.subtitle}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
