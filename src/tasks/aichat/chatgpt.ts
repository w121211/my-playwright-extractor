// src/tasks/aichat/chatgpt.ts
import type { Page } from "playwright";
import type { AiAssistantPageSpec } from "../../types.js";
import { BaseAiChatAutomator } from "./base.js";

export class ChatGPTAutomator extends BaseAiChatAutomator {
  constructor(page: Page, pageSpec: AiAssistantPageSpec) {
    super(page, pageSpec);
  }
}
