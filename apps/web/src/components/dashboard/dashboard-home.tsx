"use client";

import { useAppUser } from "@/components/app/app-user-context";
import { DashboardBanner } from "@/components/dashboard/dashboard-banner";
import { LearningActivity } from "@/components/dashboard/learning-activity";
import { NextStepsGuide } from "@/components/dashboard/next-steps";
import { OverviewSections } from "@/components/dashboard/overview-sections";

export function DashboardHome() {
  const user = useAppUser();

  return (
    <div>
      <DashboardBanner user={user} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <LearningActivity user={user} />
        <NextStepsGuide user={user} />
        <OverviewSections user={user} />
      </div>
    </div>
  );
}
