import type { Metadata } from "next";
import { APP_NAME } from "@coddle/shared";

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
