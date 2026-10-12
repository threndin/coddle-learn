import type { Metadata } from "next";
import { CredentialVerifyView } from "@/components/credentials/credential-verify";
import { loadVerifiedCredential } from "@/lib/credentials-server";

export const metadata: Metadata = {
  title: "Verify credential · Coddle Learn",
  description: "Public verification for a Coddle Learn credential.",
  robots: { index: false, follow: false },
};

export default async function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const credential = await loadVerifiedCredential(code);
  return <CredentialVerifyView credential={credential} />;
}
