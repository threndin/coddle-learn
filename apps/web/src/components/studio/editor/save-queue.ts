"use client";

import { useState, useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api-client";

type Patch = Record<string, unknown>;

type Entry = {
  patch: Patch;
  send: (patch: Patch) => Promise<void>;
  timer: ReturnType<typeof setTimeout> | null;
  inflight: Promise<void> | null;
};

export type SaveSnapshot = {
  status: "idle" | "pending" | "saving" | "saved" | "error";
  error: string | null;
  lastSavedAt: number | null;
};

/**
 * Debounced, per-key autosave. Patches for the same key merge; one request per
 * key is in flight at a time. Network failures keep the patch for retry;
 * validation failures drop it so the queue never loops on bad input.
 */
export class SaveQueue {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private error: string | null = null;
  private lastSavedAt: number | null = null;
  private snapshot: SaveSnapshot = { status: "idle", error: null, lastSavedAt: null };

  constructor(private delay = 800) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    let status: SaveSnapshot["status"] = this.lastSavedAt ? "saved" : "idle";
    const entries = [...this.entries.values()];
    if (this.error) status = "error";
    if (entries.some((entry) => entry.timer || Object.keys(entry.patch).length > 0)) {
      status = this.error ? "error" : "pending";
    }
    if (entries.some((entry) => entry.inflight)) status = "saving";
    this.snapshot = { status, error: this.error, lastSavedAt: this.lastSavedAt };
    for (const listener of this.listeners) listener();
  }

  schedule(key: string, patch: Patch, send: (patch: Patch) => Promise<void>, delay = this.delay) {
    const entry = this.entries.get(key) ?? { patch: {}, send, timer: null, inflight: null };
    entry.patch = { ...entry.patch, ...patch };
    entry.send = send;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => void this.fire(key), delay);
    this.entries.set(key, entry);
    this.emit();
  }

  /** Pending (not yet acknowledged) fields for a key. */
  pending(key: string): Patch | null {
    const entry = this.entries.get(key);
    return entry && Object.keys(entry.patch).length > 0 ? entry.patch : null;
  }

  keys() {
    return [...this.entries.keys()];
  }

  hasUnsaved() {
    return [...this.entries.values()].some(
      (entry) => entry.timer || entry.inflight || Object.keys(entry.patch).length > 0,
    );
  }

  /** Drop queued work for a key (e.g. the item was deleted). */
  discard(key: string) {
    const entry = this.entries.get(key);
    if (entry?.timer) clearTimeout(entry.timer);
    this.entries.delete(key);
    this.emit();
  }

  private async fire(key: string): Promise<boolean> {
    const entry = this.entries.get(key);
    if (!entry) return true;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.inflight) await entry.inflight.catch(() => undefined);
    const patch = entry.patch;
    if (Object.keys(patch).length === 0) {
      if (!entry.timer && !entry.inflight) this.entries.delete(key);
      this.emit();
      return true;
    }
    entry.patch = {};

    let ok = true;
    const run = entry
      .send(patch)
      .then(() => {
        this.error = null;
        this.lastSavedAt = Date.now();
      })
      .catch((error: unknown) => {
        ok = false;
        const retryable =
          !(error instanceof ApiError) || error.status >= 500 || error.status === 0;
        if (retryable) entry.patch = { ...patch, ...entry.patch };
        this.error = error instanceof Error ? error.message : "Could not save changes";
      });
    entry.inflight = run;
    this.emit();
    await run;
    entry.inflight = null;
    if (!entry.timer && Object.keys(entry.patch).length === 0) this.entries.delete(key);
    this.emit();
    return ok;
  }

  async flush(): Promise<boolean> {
    const results = await Promise.all(this.keys().map((key) => this.fire(key)));
    return results.every(Boolean);
  }
}

export function useSaveQueue() {
  const [queue] = useState(() => new SaveQueue());
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  return { queue, snapshot };
}
