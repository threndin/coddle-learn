"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { fetchMe, type PublicUser } from "@/lib/auth";

type AppUserContextValue = {
  user: PublicUser;
  refreshUser: () => Promise<void>;
  patchUser: (patch: Partial<PublicUser>) => void;
};

const AppUserContext = createContext<AppUserContextValue | null>(null);

export function AppUserProvider({
  user: initialUser,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(initialUser);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    if (me) setUser(me);
  }, []);

  const patchUser = useCallback((patch: Partial<PublicUser>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ user, refreshUser, patchUser }),
    [user, refreshUser, patchUser],
  );

  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): PublicUser {
  const ctx = useContext(AppUserContext);
  if (!ctx) {
    throw new Error("useAppUser must be used within AppShell");
  }
  return ctx.user;
}

export function useAppUserActions() {
  const ctx = useContext(AppUserContext);
  if (!ctx) {
    throw new Error("useAppUserActions must be used within AppShell");
  }
  return { refreshUser: ctx.refreshUser, patchUser: ctx.patchUser };
}
