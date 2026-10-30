import { AssistantPage } from "@/components/assistant/assistant-page";
import { loadAssistantConversation, loadAssistantStatus } from "@/lib/assistant-server";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function AssistantRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const seedQuery = first(params.q);
  const conversationId = first(params.c);
  const [initialStatus, initialConversation] = await Promise.all([
    loadAssistantStatus(),
    conversationId ? loadAssistantConversation(conversationId) : Promise.resolve(null),
  ]);

  return (
    <AssistantPage
      seedQuery={seedQuery}
      initialStatus={initialStatus}
      initialConversation={initialConversation}
    />
  );
}
