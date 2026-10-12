import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth-cookies";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Refresh a little before expiry so SSR rarely sees a dead access JWT. */
const SKEW_MS = 60_000;

type ParsedSetCookie = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  path: string;
  sameSite: "lax" | "strict" | "none";
  maxAge?: number;
};

function decodeJwtExpMs(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function accessNeedsRefresh(session: string | undefined): boolean {
  if (!session) return true;
  const exp = decodeJwtExpMs(session);
  if (exp == null) return true;
  return exp <= Date.now() + SKEW_MS;
}

function parseSetCookie(line: string): ParsedSetCookie | null {
  const parts = line.split(";").map((part) => part.trim());
  const [pair, ...attrs] = parts;
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;

  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const parsed: ParsedSetCookie = {
    name,
    value,
    httpOnly: false,
    secure: false,
    path: "/",
    sameSite: "lax",
  };

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === "httponly") parsed.httpOnly = true;
    else if (lower === "secure") parsed.secure = true;
    else if (lower.startsWith("path=")) parsed.path = attr.slice(5) || "/";
    else if (lower.startsWith("max-age=")) {
      const maxAge = Number(attr.slice(8));
      if (Number.isFinite(maxAge)) parsed.maxAge = maxAge;
    } else if (lower.startsWith("samesite=")) {
      const sameSite = attr.slice(9).toLowerCase();
      if (sameSite === "strict" || sameSite === "none" || sameSite === "lax") {
        parsed.sameSite = sameSite;
      }
    }
  }

  return parsed;
}

function cookieHeaderFromRequest(request: NextRequest, updates: Map<string, string>): string {
  const map = new Map<string, string>();
  for (const { name, value } of request.cookies.getAll()) {
    map.set(name, value);
  }
  for (const [name, value] of updates) {
    if (value) map.set(name, value);
    else map.delete(name);
  }
  return [...map.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function refreshAccess(request: NextRequest): Promise<ParsedSetCookie[] | null> {
  const refresh = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  const csrf = request.cookies.get(AUTH_COOKIES.csrf)?.value;
  if (!refresh || !csrf) return null;

  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "x-csrf-token": csrf,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const lines =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const cookies = lines
      .map(parseSetCookie)
      .filter((cookie): cookie is ParsedSetCookie => Boolean(cookie));

    return cookies.length > 0 ? cookies : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never refresh the refresh call itself, or the SSO bridge.
  if (
    pathname.startsWith("/api/auth/refresh") ||
    pathname.startsWith("/api/auth/coddle/")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIES.session)?.value;
  const refresh = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  if (!refresh || !accessNeedsRefresh(session)) {
    return NextResponse.next();
  }

  const setCookies = await refreshAccess(request);
  if (!setCookies) {
    return NextResponse.next();
  }

  const updates = new Map<string, string>();
  for (const cookie of setCookies) {
    if (cookie.maxAge === 0 || cookie.value === "") updates.set(cookie.name, "");
    else updates.set(cookie.name, cookie.value);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", cookieHeaderFromRequest(request, updates));

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const cookie of setCookies) {
    if (cookie.maxAge === 0 || cookie.value === "") {
      response.cookies.delete(cookie.name);
      continue;
    }
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      path: cookie.path,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
