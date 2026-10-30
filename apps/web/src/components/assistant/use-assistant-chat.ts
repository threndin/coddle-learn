"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSISTANT_WEEKLY_LIMIT,
  type AssistantConversationDetail,
  type AssistantProvider,
  type AssistantQuota,
  type AssistantStatus,
  type AssistantThreadMessage,
  type SearchHit,
} from "@coddle/shared";
import { ApiError, errorMessage } from "@/lib/api-client";
import {
  askAssistant,
  fetchAssistantConversation,
  fetchAssistantStatus,
  isAssistantQuota,
  quotaResetLabel,
} from "@/lib/assistant";

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hits?: SearchHit[];
  followUps?: string[];
  provider?: AssistantProvider;
};

const LAST_KEY = "coddle.assistant.lastConversationId";

const EMPTY_QUOTA: AssistantQuota = {
  limit: ASSISTANT_WEEKLY_LIMIT,
  used: 0,
  remaining: ASSISTANT_WEEKLY_LIMIT,
  resetsAt: "",
};

function fromThread(row: AssistantThreadMessage): AssistantChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    hits: row.hits,
    followUps: row.followUps,
    provider: row.provider ?? undefined,
  };
}

function applyConversation(detail: AssistantConversationDetail) {
  return {
    id: detail.id,
    messages: detail.messages.map(fromThread),
  };
}

export function useAssistantChat({
  initialStatus,
  initialConversation,
  restoreLast = true,
}: {
  initialStatus?: AssistantStatus | null;
  initialConversation?: AssistantConversationDetail | null;
  restoreLast?: boolean;
}) {
  const router = useRouter();
  const started = initialConversation ? applyConversation(initialConversation) : null;
  const [provider, setProvider] = useState<AssistantProvider>(
    initialStatus?.provider ?? "search",
  );
  const [quota, setQuota] = useState<AssistantQuota>(initialStatus?.quota ?? EMPTY_QUOTA);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantChatMessage[]>(started?.messages ?? []);
  const [conversationId, setConversationId] = useState<string | null>(started?.id ?? null);
  const [pending, setPending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const depleted = quota.remaining <= 0;
  const low = quota.remaining > 0 && quota.remaining <= 3;
  const resetDay = quota.resetsAt ? quotaResetLabel(quota.resetsAt) : "next Monday";

  const syncUrl = useCallback(
    (id: string | null) => {
      const href = id ? `/assistant?c=${encodeURIComponent(id)}` : "/assistant";
      router.replace(href, { scroll: false });
      if (typeof window === "undefined") return;
      if (id) window.localStorage.setItem(LAST_KEY, id);
      else window.localStorage.removeItem(LAST_KEY);
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAssistantStatus(controller.signal)
      .then((status) => {
        setProvider(status.provider);
        setQuota(status.quota);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      setLoadingChat(true);
      setError(null);
      try {
        const detail = await fetchAssistantConversation(id);
        setConversationId(detail.id);
        setMessages(detail.messages.map(fromThread));
        syncUrl(detail.id);
      } catch (err) {
        if (typeof window !== "undefined") window.localStorage.removeItem(LAST_KEY);
        setError(errorMessage(err, "Could not open that chat."));
      } finally {
        setLoadingChat(false);
      }
    },
    [syncUrl],
  );

  useEffect(() => {
    if (!restoreLast || initialConversation || conversationId) return;
    if (typeof window === "undefined") return;
    const last = window.localStorage.getItem(LAST_KEY);
    if (last) void openConversation(last);
  }, [restoreLast, initialConversation, conversationId, openConversation]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
    syncUrl(null);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending || depleted) return;
    setInput("");
    setError(null);
    if (composer.current) {
      composer.current.style.height = "auto";
    }
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setPending(true);
    try {
      const result = await askAssistant(message, conversationId);
      setConversationId(result.conversationId);
      if (result.conversationId) syncUrl(result.conversationId);
      setProvider(result.provider);
      setQuota(result.quota);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          hits: result.hits.slice(0, 6),
          followUps: result.followUps ?? [],
          provider: result.provider,
        },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.code === "assistant_quota" && isAssistantQuota(err.details)) {
        setQuota(err.details);
      }
      setError(errorMessage(err, "The assistant could not answer just now."));
    } finally {
      setPending(false);
      composer.current?.focus();
    }
  }

  return {
    provider,
    quota,
    input,
    setInput,
    messages,
    conversationId,
    pending,
    loadingChat,
    error,
    depleted,
    low,
    resetDay,
    scroller,
    composer,
    send,
    newChat,
    openConversation,
  };
}
