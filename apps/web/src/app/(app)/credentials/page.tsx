import { CredentialsCatalog } from "@/components/credentials/credentials-catalog";
import { loadCredentials } from "@/lib/credentials-server";

export default async function CredentialsPage() {
  const credentials = await loadCredentials();
  return <CredentialsCatalog initialCredentials={credentials} />;
}
