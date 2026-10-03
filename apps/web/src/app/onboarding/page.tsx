import type { Metadata } from "next";
import { APP_NAME } from "@coddle/shared";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";

export const metadata: Metadata = {
  title: `Get started · ${APP_NAME}`,
};

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
