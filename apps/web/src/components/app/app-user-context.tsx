"use client";

import { createContext, useContext } from "react";
import type { PublicUser } from "@/lib/auth";

const AppUserContext = createContext<PublicUser | null>(null);

export function AppUserProvider({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  return <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): PublicUser {
  const user = useContext(AppUserContext);
  if (!user) {
    throw new Error("useAppUser must be used within AppShell");
  }
  return user;
}
