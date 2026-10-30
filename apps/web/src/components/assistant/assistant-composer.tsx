"use client";

import type { KeyboardEvent, RefObject } from "react";
import { Icon } from "@/components/ui/icon";

export function AssistantComposer({
  id,
  value,
  onChange,
  onSubmit,
  disabled,
  pending,
  placeholder,
  autoFocus,
  composerRef,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  pending: boolean;
  placeholder: string;
  autoFocus?: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
}) {
  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Message the learning assistant
      </label>
      <div className="flex items-end gap-2 rounded-[1.75rem] border border-border bg-surface px-3 py-2 shadow-[0_8px_30px_rgb(15_23_42_/_0.06)] focus-within:border-brand">
        <textarea
          ref={composerRef}
          id={id}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={2000}
          onChange={(event) => {
            onChange(event.target.value);
            resize(event.target);
          }}
          onKeyDown={onKeyDown}
          className="max-h-52 min-h-12 w-full resize-none bg-transparent px-2 py-3 text-base text-ink placeholder:text-ink-muted focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || disabled || !value.trim()}
          className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand/90 disabled:opacity-40"
          aria-label="Send"
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
