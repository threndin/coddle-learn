"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SEARCH_LIMITS } from "@coddle/shared";

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(pathname === "/search" ? (searchParams.get("q") ?? "") : "");

  useEffect(() => {
    if (pathname === "/search") setValue(searchParams.get("q") ?? "");
  }, [pathname, searchParams]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!(meta && event.key.toLowerCase() === "k")) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form onSubmit={submit} className="hidden min-w-0 flex-1 justify-center md:flex">
      <label className="relative w-full max-w-md">
        <span className="sr-only">Search Coddle Learn</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          maxLength={SEARCH_LIMITS.queryMax}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search Learn"
          className="w-full rounded-xl border border-border bg-surface-subtle py-2 pr-14 pl-9 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:inline">
          ⌘K
        </kbd>
      </label>
    </form>
  );
}
