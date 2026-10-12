import { randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { config, COOKIE } from "../../config.js";
import type { SessionTokens } from "./session.js";

const base: CookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax",
  path: "/",
};

const csrfBase: CookieOptions = {
  httpOnly: false,
  secure: config.cookieSecure,
  sameSite: "lax",
  path: "/",
};

function accessMaxAgeMs() {
  return config.jwtAccessExpiryMinutes * 60 * 1000;
}

function refreshMaxAgeMs() {
  return config.jwtRefreshExpiryDays * 24 * 60 * 60 * 1000;
}

export function setSessionCookie(res: Response, accessToken: string) {
  res.cookie(COOKIE.session, accessToken, {
    ...base,
    maxAge: accessMaxAgeMs(),
  });
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(COOKIE.refresh, refreshToken, {
    ...base,
    maxAge: refreshMaxAgeMs(),
  });
}

export function setAuthCookies(res: Response, tokens: SessionTokens) {
  setSessionCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE.session, base);
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE.refresh, base);
}

export function setCsrfCookie(res: Response): string {
  const token = randomBytes(24).toString("hex");
  res.cookie(COOKIE.csrf, token, {
    ...csrfBase,
    // Match refresh lifetime so CSRF still works when access JWT expires.
    maxAge: refreshMaxAgeMs(),
  });
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(COOKIE.csrf, csrfBase);
}

export function clearAuthCookies(res: Response) {
  clearSessionCookie(res);
  clearRefreshCookie(res);
  clearCsrfCookie(res);
}

export function readCsrfCookie(req: { cookies?: Record<string, unknown> }): string | null {
  const value = req.cookies?.[COOKIE.csrf];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readRefreshCookie(req: { cookies?: Record<string, unknown> }): string | null {
  const value = req.cookies?.[COOKIE.refresh];
  return typeof value === "string" && value.length > 0 ? value : null;
}
