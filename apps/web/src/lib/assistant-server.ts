import type {
  AssistantConversationDetail,
  AssistantStatus,
} from "@coddle/shared";
import { serverApiFetch } from "@/lib/server-api";

export async function loadAssistantStatus(): Promise<AssistantStatus | null> {
  try {
    const res = await serverApiFetch("/assistant/status");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: AssistantStatus };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadAssistantConversation(
  id: string,
): Promise<AssistantConversationDetail | null> {
  if (!id) return null;
  try {
    const res = await serverApiFetch(`/assistant/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: AssistantConversationDetail };
    return body.data;
  } catch {
    return null;
  }
}
