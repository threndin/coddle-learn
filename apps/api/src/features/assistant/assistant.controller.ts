import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  askAssistant,
  assistantStatus,
  getAssistantConversation,
  listAssistantConversations,
} from "./assistant.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function assistantStatusHandler(req: Request, res: Response) {
  const session = requireSession(req);
  res.json({ data: await assistantStatus(session.sub) });
}

export async function assistantAskHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await askAssistant(session.sub, (req.body ?? {}) as Record<string, unknown>);
  res.json({ data });
}

export async function assistantConversationsHandler(req: Request, res: Response) {
  const session = requireSession(req);
  res.json({ data: { conversations: await listAssistantConversations(session.sub) } });
}

export async function assistantConversationHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    throw new AppError(400, "invalid_conversation", "Choose a chat to open.");
  }
  res.json({ data: await getAssistantConversation(session.sub, id) });
}
