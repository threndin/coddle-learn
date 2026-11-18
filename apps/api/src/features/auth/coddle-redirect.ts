/** Retain Learn's state and callback while starting sign-in directly at Coddle Account. */
export function buildLearnSignInUrl(authOrigin: string, state: string, returnTo: string, screen: "login" | "signup" = "login"): string {
  const url = new URL("/sso/learn", authOrigin);
  url.searchParams.set("state", state);
  url.searchParams.set("return", returnTo);
  if (screen === "signup") url.searchParams.set("screen", "signup");
  return url.href;
}
