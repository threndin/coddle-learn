export const CREDENTIAL_KINDS = ["assessment", "project"] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export function isCredentialKind(value: unknown): value is CredentialKind {
  return (
    typeof value === "string" &&
    (CREDENTIAL_KINDS as readonly string[]).includes(value)
  );
}

export const CREDENTIAL_KIND_LABELS: Record<CredentialKind, string> = {
  assessment: "Assessment",
  project: "Project",
};
