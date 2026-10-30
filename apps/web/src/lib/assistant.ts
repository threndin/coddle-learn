import type {
  AssistantAskResult,
  AssistantConversationDetail,
  AssistantConversationSummary,
  AssistantQuota,
  AssistantStatus,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export async function fetchAssistantStatus(signal?: AbortSignal): Promise<AssistantStatus> {
  return apiRequest<AssistantStatus>("/assistant/status", { signal });
}

export async function fetchAssistantConversations(
  signal?: AbortSignal,
): Promise<AssistantConversationSummary[]> {
  const data = await apiRequest<{ conversations: AssistantConversationSummary[] }>(
    "/assistant/conversations",
    { signal },
  );
  return data.conversations ?? [];
}

export async function fetchAssistantConversation(
  id: string,
  signal?: AbortSignal,
): Promise<AssistantConversationDetail> {
  return apiRequest<AssistantConversationDetail>(
    `/assistant/conversations/${encodeURIComponent(id)}`,
    { signal },
  );
}

export async function askAssistant(
  message: string,
  conversationId: string | null,
  signal?: AbortSignal,
): Promise<AssistantAskResult> {
  return apiRequest<AssistantAskResult>("/assistant/ask", {
    method: "POST",
    json: { message, conversationId },
    signal,
  });
}

export function isAssistantQuota(value: unknown): value is AssistantQuota {
  if (!value || typeof value !== "object") return false;
  const row = value as AssistantQuota;
  return (
    typeof row.limit === "number" &&
    typeof row.used === "number" &&
    typeof row.remaining === "number" &&
    typeof row.resetsAt === "string"
  );
}

export function quotaRemainingLabel(quota: AssistantQuota): string {
  if (quota.remaining === 0) {
    return `You’ve used all ${quota.limit} messages this week`;
  }
  if (quota.remaining === 1) return `1 of ${quota.limit} messages left this week`;
  return `${quota.remaining} of ${quota.limit} messages left this week`;
}

export function quotaResetLabel(resetsAt: string): string {
  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
