export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function csrfHeaders(): Record<string, string> {
  const csrf = readCookie("learn_csrf");
  return csrf ? { "x-csrf-token": csrf } : {};
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  body?: BodyInit;
  contentType?: string;
  signal?: AbortSignal;
  keepalive?: boolean;
  /** Skip access-token refresh + retry (used by the refresh call itself). */
  skipRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

/** Exchange the refresh cookie for a new access session. Returns false if refresh failed. */
export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders(),
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Browser fetch through the `/api` rewrite. On 401, tries one refresh then retries.
 * Pass `skipRefresh` for the refresh endpoint itself.
 */
export async function apiFetch(
  path: string,
  init: RequestInit & { skipRefresh?: boolean } = {},
): Promise<Response> {
  const { skipRefresh, ...fetchInit } = init;
  const url = path.startsWith("/api") || path.startsWith("http") ? path : `/api${path}`;

  const res = await fetch(url, {
    ...fetchInit,
    credentials: fetchInit.credentials ?? "include",
    cache: fetchInit.cache ?? "no-store",
  });

  if (res.status !== 401 || skipRefresh || url.includes("/auth/refresh")) {
    return res;
  }

  const refreshed = await refreshSession();
  if (!refreshed) return res;

  const headers = new Headers(fetchInit.headers);
  const csrf = readCookie("learn_csrf");
  if (csrf) headers.set("x-csrf-token", csrf);

  return fetch(url, {
    ...fetchInit,
    headers,
    credentials: fetchInit.credentials ?? "include",
    cache: fetchInit.cache ?? "no-store",
  });
}

/** Browser-side call to the Learn API through the `/api` rewrite. Returns `data`. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  if (method !== "GET") Object.assign(headers, csrfHeaders());
  let body: BodyInit | undefined = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.contentType) {
    headers["Content-Type"] = options.contentType;
  } else if (body instanceof FormData) {
    // Let the browser set multipart boundary; do not force Content-Type.
  }

  const res = await apiFetch(path, {
    method,
    headers,
    body,
    signal: options.signal,
    keepalive: options.keepalive,
    skipRefresh: options.skipRefresh,
  });

  const payload = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.error?.code ?? (res.status === 401 ? "unauthenticated" : "request_failed"),
      payload?.error?.message ?? "Something went wrong",
      payload?.error?.details,
    );
  }
  return payload?.data as T;
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
