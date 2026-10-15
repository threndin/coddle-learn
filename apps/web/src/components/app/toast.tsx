"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  onClick?: () => void;
};

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  sticky?: boolean;
  action?: ToastAction;
};

type PushToastOptions = {
  tone?: ToastTone;
  sticky?: boolean;
  durationMs?: number;
  action?: ToastAction;
};

type ToastContextValue = {
  pushToast: (message: string, toneOrOptions?: ToastTone | PushToastOptions) => number;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, toneOrOptions: ToastTone | PushToastOptions = "info") => {
      const options: PushToastOptions =
        typeof toneOrOptions === "string" ? { tone: toneOrOptions } : toneOrOptions;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const tone = options.tone ?? "info";
      const sticky = options.sticky ?? false;
      setToasts((prev) => [
        ...prev,
        { id, message, tone, sticky, action: options.action },
      ]);
      if (!sticky) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, options.durationMs ?? (options.action ? 6500 : 3200));
      }
      return id;
    },
    [],
  );

  const value = useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
              toast.tone === "success"
                ? "border-brand/30 bg-brand text-white"
                : toast.tone === "error"
                  ? "border-border bg-ink text-white"
                  : "border-border bg-surface text-ink",
            ].join(" ")}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1">{toast.message}</p>
              {toast.sticky ? (
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismissToast(toast.id)}
                  className="shrink-0 text-xs font-semibold opacity-70 transition hover:opacity-100"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  dismissToast(toast.id);
                }}
                className={[
                  "mt-2 text-sm font-semibold underline underline-offset-2 transition",
                  toast.tone === "success" || toast.tone === "error"
                    ? "text-white/95 hover:text-white"
                    : "text-ink hover:text-brand",
                ].join(" ")}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
