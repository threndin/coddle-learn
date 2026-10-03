import { randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { config, COOKIE } from "../../config.js";

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

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE.session, token, {
    ...base,
    maxAge: config.jwtExpiryHours * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE.session, base);
}

export function setCsrfCookie(res: Response): string {
  const token = randomBytes(24).toString("hex");
  res.cookie(COOKIE.csrf, token, {
    ...csrfBase,
    maxAge: config.jwtExpiryHours * 60 * 60 * 1000,
  });
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(COOKIE.csrf, csrfBase);
}

export function readCsrfCookie(req: { cookies?: Record<string, unknown> }): string | null {
  const value = req.cookies?.[COOKIE.csrf];
  return typeof value === "string" && value.length > 0 ? value : null;
}
