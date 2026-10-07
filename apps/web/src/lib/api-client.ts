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
};

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
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body,
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    keepalive: options.keepalive,
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
