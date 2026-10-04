"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { PageLoader } from "@/components/page-loader";
import { fetchMe, type PublicUser } from "@/lib/auth";

export function OnboardingScreen() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace("/login");
          return;
        }
        if (me.onboardingCompletedAt) {
          router.replace("/dashboard");
          return;
        }
        setUser(me);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!user) {
    return <PageLoader />;
  }

  return <OnboardingFlow user={user} />;
}
