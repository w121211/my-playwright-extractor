// src/tasks/aichat/grok.ts
import type { Page } from "playwright";
import type { AiAssistantPageSpec } from "../../types.js";
import { BaseAiChatAutomator } from "./base.js";

type GrokMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string | null;
};

const joinParts = (parts: string[]): string =>
  parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");

const toStringParts = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    const collected: string[] = [];
    for (const entry of value) {
      collected.push(...toStringParts(entry));
    }
    return collected;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
};

export class GrokAutomator extends BaseAiChatAutomator {
  constructor(page: Page, pageSpec: AiAssistantPageSpec) {
    super(page, pageSpec);
  }

  override async getMessages(): Promise<GrokMessage[]> {
    const records = await super.getMessages();
    const messages: GrokMessage[] = [];

    for (const record of records) {
      if (!record || typeof record !== "object") continue;
      const entry = record as Record<string, unknown>;
      const userParts = toStringParts(entry["userMessage"]);
      const aiParts = toStringParts(
        entry["aiMessage"] ?? entry["assistantMessage"]
      );

      // In Grok's UI, user can send multiple messages in one block (follow-ups)
      // Each should be a separate message
      for (const userPart of userParts) {
        if (userPart.trim()) {
          messages.push({
            role: "user",
            content: userPart.trim(),
            timestamp: null,
          });
        }
      }

      // AI responses are typically one continuous response per block
      if (aiParts.length > 0) {
        messages.push({
          role: "assistant",
          content: joinParts(aiParts),
          timestamp: null,
        });
      }
    }

    return messages;
  }
}
