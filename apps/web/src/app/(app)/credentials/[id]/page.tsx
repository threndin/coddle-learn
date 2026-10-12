import { CredentialDetailView } from "@/components/credentials/credential-detail";
import { loadCredential } from "@/lib/credentials-server";

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const credential = await loadCredential(id);
  return <CredentialDetailView initialCredential={credential} />;
}
